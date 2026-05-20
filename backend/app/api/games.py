from flask import Blueprint, request, jsonify
from app import db, socketio
from app.models.game import Game, GamePlayer
from app.game.engine import GameEngine
from app.websocket import broadcast_lobby_update
from app.room_code import assign_unique_room_code

games_bp = Blueprint('games', __name__)


def _get_game_by_code(room_code: str):
    return Game.query.filter_by(room_code=room_code).first_or_404()


def _get_participant(game_id: int, device_id: str):
    return GamePlayer.query.filter_by(game_id=game_id, device_id=device_id).first()


def _join_game_participant(game: Game, device_id: str, display_name: str):
    existing = _get_participant(game.id, device_id)
    if existing:
        if display_name:
            existing.display_name = display_name
        db.session.commit()
        return existing, 200

    if len(game.game_players) >= game.max_players:
        return None, ('Game is full', 400)

    positions = {gp.position for gp in game.game_players}
    position = next(i for i in range(game.max_players) if i not in positions)

    game_player = GamePlayer(
        game_id=game.id,
        device_id=device_id,
        display_name=display_name,
        position=position,
    )
    db.session.add(game_player)
    db.session.commit()
    return game_player, 201


@games_bp.route('', methods=['POST'])
def create_game():
    """Create a new room and add the creator as first participant."""
    data = request.get_json() or {}
    max_players = data.get('max_players', 6)
    name = data.get('name')
    is_private = bool(data.get('is_private', False))
    device_id = data.get('device_id')
    display_name = data.get('display_name')

    if max_players < 2 or max_players > 6:
        return jsonify({'error': 'Max players must be between 2 and 6'}), 400

    if not device_id or not display_name:
        return jsonify({'error': 'device_id and display_name are required'}), 400

    game = Game(max_players=max_players, name=name, is_private=is_private)
    assign_unique_room_code(game)
    db.session.add(game)
    db.session.flush()

    owner = GamePlayer(
        game_id=game.id,
        device_id=device_id,
        display_name=display_name,
        position=0,
    )
    db.session.add(owner)
    db.session.flush()
    game.owner_id = owner.id
    db.session.commit()

    return jsonify(game.to_dict()), 201


@games_bp.route('/by-code/<room_code>', methods=['GET'])
def get_game_by_code(room_code):
    """Get room by shareable code."""
    game = _get_game_by_code(room_code)
    include_state = request.args.get('include_state', 'false').lower() == 'true'
    return jsonify(game.to_dict(include_state=include_state))


@games_bp.route('/<int:game_id>', methods=['GET'])
def get_game(game_id):
    """Get game by ID"""
    game = Game.query.get_or_404(game_id)
    include_state = request.args.get('include_state', 'false').lower() == 'true'
    return jsonify(game.to_dict(include_state=include_state))


@games_bp.route('', methods=['GET'])
def list_games():
    """List public waiting rooms (private rooms are link-only)."""
    status = request.args.get('status')
    query = Game.query.filter_by(is_private=False)

    if status:
        query = query.filter_by(status=status)

    games = query.all()
    return jsonify([g.to_dict() for g in games])


@games_bp.route('/by-code/<room_code>/join', methods=['POST'])
def join_game_by_code(room_code):
    """Join a room via shareable code."""
    game = _get_game_by_code(room_code)
    return _join_game_handler(game)


@games_bp.route('/<int:game_id>/join', methods=['POST'])
def join_game(game_id):
    """Join a game by numeric ID."""
    game = Game.query.get_or_404(game_id)
    return _join_game_handler(game)


def _join_game_handler(game: Game):
    data = request.get_json() or {}
    device_id = data.get('device_id')
    display_name = data.get('display_name')

    if not device_id or not display_name:
        return jsonify({'error': 'device_id and display_name are required'}), 400

    result, status_or_error = _join_game_participant(game, device_id, display_name)
    if result is None:
        message, code = status_or_error
        return jsonify({'error': message}), code

    status_code = status_or_error
    broadcast_lobby_update(socketio, game.id)
    return jsonify(result.to_dict()), status_code


@games_bp.route('/<int:game_id>/ready', methods=['POST'])
def set_ready(game_id):
    """Toggle ready status for a participant."""
    data = request.get_json() or {}
    device_id = data.get('device_id')

    if not device_id:
        return jsonify({'error': 'device_id is required'}), 400

    game_player = GamePlayer.query.filter_by(game_id=game_id, device_id=device_id).first()
    if not game_player:
        return jsonify({'error': 'Player not in game'}), 404

    game_player.is_ready = not game_player.is_ready
    db.session.commit()

    broadcast_lobby_update(socketio, game_id)
    return jsonify({'success': True, 'is_ready': game_player.is_ready}), 200


@games_bp.route('/<int:game_id>/settings', methods=['PATCH'])
def update_room_settings(game_id):
    """Update room settings (owner only)."""
    data = request.get_json() or {}
    device_id = data.get('device_id')

    if not device_id:
        return jsonify({'error': 'device_id is required'}), 400

    game = Game.query.get_or_404(game_id)
    requester = _get_participant(game_id, device_id)
    if not requester or game.owner_id != requester.id:
        return jsonify({'error': 'Only the room owner can update settings'}), 403

    if 'name' in data:
        game.name = data['name']

    db.session.commit()
    broadcast_lobby_update(socketio, game_id)
    return jsonify(game.to_dict()), 200


@games_bp.route('/<int:game_id>/kick', methods=['POST'])
def kick_player(game_id):
    """Kick a participant from the game (owner only)."""
    data = request.get_json() or {}
    device_id = data.get('device_id')
    target_device_id = data.get('target_device_id')

    if not device_id or not target_device_id:
        return jsonify({'error': 'device_id and target_device_id are required'}), 400

    game = Game.query.get_or_404(game_id)
    requester = _get_participant(game_id, device_id)
    if not requester or game.owner_id != requester.id:
        return jsonify({'error': 'Only the room owner can kick players'}), 403

    if device_id == target_device_id:
        return jsonify({'error': 'Cannot kick yourself'}), 400

    game_player = _get_participant(game_id, target_device_id)
    if not game_player:
        return jsonify({'error': 'Player not in game'}), 404

    db.session.delete(game_player)
    db.session.commit()

    broadcast_lobby_update(socketio, game_id)
    return jsonify({'message': 'Player kicked successfully', 'game': game.to_dict()}), 200


@games_bp.route('/<int:game_id>/start', methods=['POST'])
def start_game(game_id):
    """Start a game (initialize first round)."""
    data = request.get_json() or {}
    device_id = data.get('device_id')

    if not device_id:
        return jsonify({'error': 'device_id is required'}), 400

    game = Game.query.get_or_404(game_id)
    requester = _get_participant(game_id, device_id)
    if not requester or game.owner_id != requester.id:
        return jsonify({'error': 'Only the room owner can start the game'}), 403

    if game.status != 'waiting':
        return jsonify({'error': 'Game is not in waiting status'}), 400

    if len(game.game_players) < 2:
        return jsonify({'error': 'Need at least 2 players to start'}), 400

    if not all(gp.is_ready for gp in game.game_players):
        return jsonify({'error': 'All players must be ready to start'}), 400

    participant_ids = [gp.id for gp in game.game_players]
    engine = GameEngine(game_id, participant_ids)
    engine.start_round()

    game.status = 'active'
    game.game_state = engine.to_dict()
    db.session.commit()

    room = f'game_{game_id}'
    for gp in game.game_players:
        player_state = engine.get_game_state(requesting_player_id=gp.id)
        socketio.emit('game_state', player_state, room=room)

    return jsonify(engine.get_game_state()), 200
