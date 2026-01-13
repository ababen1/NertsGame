from flask import Blueprint, request, jsonify
from app import db, socketio
from app.models.game import Game, GamePlayer
from app.models.player import Player
from app.game.engine import GameEngine
from app.websocket import broadcast_lobby_update
import json

games_bp = Blueprint('games', __name__)


@games_bp.route('', methods=['POST'])
def create_game():
    """Create a new game"""
    data = request.get_json() or {}
    max_players = data.get('max_players', 6)
    owner_id = data.get('owner_id')
    name = data.get('name')
    
    if max_players < 2 or max_players > 6:
        return jsonify({'error': 'Max players must be between 2 and 6'}), 400
    
    if not owner_id:
        return jsonify({'error': 'owner_id is required'}), 400
    
    game = Game(max_players=max_players, owner_id=owner_id, name=name)
    db.session.add(game)
    db.session.commit()
    
    return jsonify(game.to_dict()), 201


@games_bp.route('/<int:game_id>', methods=['GET'])
def get_game(game_id):
    """Get game by ID"""
    game = Game.query.get_or_404(game_id)
    include_state = request.args.get('include_state', 'false').lower() == 'true'
    return jsonify(game.to_dict(include_state=include_state))


@games_bp.route('', methods=['GET'])
def list_games():
    """List all games"""
    status = request.args.get('status')
    query = Game.query
    
    if status:
        query = query.filter_by(status=status)
    
    games = query.all()
    return jsonify([g.to_dict() for g in games])


@games_bp.route('/<int:game_id>/join', methods=['POST'])
def join_game(game_id):
    """Join a game"""
    data = request.get_json()
    player_id = data.get('player_id')
    
    if not player_id:
        return jsonify({'error': 'player_id is required'}), 400
    
    game = Game.query.get_or_404(game_id)
    player = Player.query.get_or_404(player_id)
    
    # Check if game is full
    if len(game.game_players) >= game.max_players:
        return jsonify({'error': 'Game is full'}), 400
    
    # Check if player is already in the game
    existing = GamePlayer.query.filter_by(game_id=game_id, player_id=player_id).first()
    if existing:
        return jsonify({'error': 'Player already in game'}), 400
    
    # Find next available position
    positions = {gp.position for gp in game.game_players}
    position = next(i for i in range(game.max_players) if i not in positions)
    
    game_player = GamePlayer(
        game_id=game_id,
        player_id=player_id,
        position=position
    )
    db.session.add(game_player)
    db.session.commit()
    
    return jsonify(game_player.to_dict()), 201


@games_bp.route('/<int:game_id>/ready', methods=['POST'])
def set_ready(game_id):
    """Toggle ready status for a player"""
    data = request.get_json() or {}
    player_id = data.get('player_id')
    
    if not player_id:
        return jsonify({'error': 'player_id is required'}), 400
    
    # Use a single query with join to get both game and game_player
    game_player = GamePlayer.query.filter_by(game_id=game_id, player_id=player_id).first()
    
    if not game_player:
        return jsonify({'error': 'Player not in game'}), 404
    
    # Toggle ready status
    game_player.is_ready = not game_player.is_ready
    db.session.commit()
    
    # Broadcast lobby update (this will query the game, but it's async)
    broadcast_lobby_update(socketio, game_id)
    
    # Return minimal response - WebSocket will send full update
    return jsonify({'success': True, 'is_ready': game_player.is_ready}), 200


@games_bp.route('/<int:game_id>/settings', methods=['PATCH'])
def update_room_settings(game_id):
    """Update room settings (owner only)"""
    data = request.get_json() or {}
    player_id = data.get('player_id')
    
    if not player_id:
        return jsonify({'error': 'player_id is required'}), 400
    
    game = Game.query.get_or_404(game_id)
    
    # Verify requester is owner
    if game.owner_id != player_id:
        return jsonify({'error': 'Only the room owner can update settings'}), 403
    
    # Update settings
    if 'name' in data:
        game.name = data['name']
    
    db.session.commit()
    
    # Broadcast lobby update
    broadcast_lobby_update(socketio, game_id)
    
    return jsonify(game.to_dict()), 200


@games_bp.route('/<int:game_id>/kick', methods=['POST'])
def kick_player(game_id):
    """Kick a player from the game (owner only)"""
    data = request.get_json() or {}
    player_id = data.get('player_id')  # Owner making the request
    target_player_id = data.get('target_player_id')  # Player to kick
    
    if not player_id or not target_player_id:
        return jsonify({'error': 'player_id and target_player_id are required'}), 400
    
    game = Game.query.get_or_404(game_id)
    
    # Verify requester is owner
    if game.owner_id != player_id:
        return jsonify({'error': 'Only the room owner can kick players'}), 403
    
    # Cannot kick yourself
    if player_id == target_player_id:
        return jsonify({'error': 'Cannot kick yourself'}), 400
    
    # Find and remove the target player
    game_player = GamePlayer.query.filter_by(game_id=game_id, player_id=target_player_id).first()
    if not game_player:
        return jsonify({'error': 'Player not in game'}), 404
    
    db.session.delete(game_player)
    db.session.commit()
    
    # Broadcast lobby update
    broadcast_lobby_update(socketio, game_id)
    
    return jsonify({'message': 'Player kicked successfully', 'game': game.to_dict()}), 200


@games_bp.route('/<int:game_id>/start', methods=['POST'])
def start_game(game_id):
    """Start a game (initialize first round)"""
    data = request.get_json() or {}
    player_id = data.get('player_id')
    
    if not player_id:
        return jsonify({'error': 'player_id is required'}), 400
    
    game = Game.query.get_or_404(game_id)
    
    # Verify requester is owner
    if game.owner_id != player_id:
        return jsonify({'error': 'Only the room owner can start the game'}), 403
    
    if game.status != 'waiting':
        return jsonify({'error': 'Game is not in waiting status'}), 400
    
    if len(game.game_players) < 2:
        return jsonify({'error': 'Need at least 2 players to start'}), 400
    
    # Check all players are ready
    all_ready = all(gp.is_ready for gp in game.game_players)
    if not all_ready:
        return jsonify({'error': 'All players must be ready to start'}), 400
    
    # Create game engine
    player_ids = [gp.player_id for gp in game.game_players]
    engine = GameEngine(game_id, player_ids)
    engine.start_round()
    
    # Save game state
    game.status = 'active'
    game.game_state = engine.to_dict()
    db.session.commit()
    
    # Broadcast game_state to all players in the room
    room = f'game_{game_id}'
    for gp in game.game_players:
        player_state = engine.get_game_state(requesting_player_id=gp.player_id)
        socketio.emit('game_state', player_state, room=room)
    
    return jsonify(engine.get_game_state()), 200

