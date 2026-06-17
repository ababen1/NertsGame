from flask import request
from flask_socketio import SocketIO, emit, join_room, leave_room
from app.models.game import Game, GamePlayer
from app.game.engine import GameEngine
from app.game.cache import (
    get_engine,
    require_session,
    resolve_participant_id,
    persist_game_end,
)
from app.game.card import Card
from sqlalchemy.orm import joinedload

# (game_id, participant_id) -> socket session id
_participant_sids: dict[tuple[int, int], str] = {}
_sid_lookup: dict[str, tuple[int, int]] = {}


def _register_participant(game_id: int, participant_id: int, sid: str) -> None:
    key = (game_id, participant_id)
    old_sid = _participant_sids.get(key)
    if old_sid:
        _sid_lookup.pop(old_sid, None)
    _participant_sids[key] = sid
    _sid_lookup[sid] = key


def _unregister_sid(sid: str) -> None:
    key = _sid_lookup.pop(sid, None)
    if key:
        _participant_sids.pop(key, None)


def broadcast_game_state(socketio: SocketIO, game_id: int, engine: GameEngine) -> None:
    """Emit one personalized game_state per connected participant."""
    for player_id in engine.players:
        sid = _participant_sids.get((game_id, player_id))
        if sid:
            socketio.emit(
                'game_state',
                engine.get_game_state(requesting_player_id=player_id),
                to=sid,
            )


def _lobby_player_dict(gp: GamePlayer) -> dict:
    return {
        'player_id': gp.id,
        'device_id': gp.device_id,
        'display_name': gp.display_name,
        'username': gp.display_name,
        'is_ready': gp.is_ready,
        'position': gp.position,
    }


def _lobby_state(game: Game) -> dict:
    return {
        'game_id': game.id,
        'room_code': game.room_code,
        'name': game.name,
        'owner_id': game.owner_id,
        'players': [_lobby_player_dict(gp) for gp in game.game_players],
    }


def _get_participant(game_id: int, device_id: str) -> GamePlayer | None:
    return GamePlayer.query.filter_by(game_id=game_id, device_id=device_id).first()


def _load_game(game_id: int) -> Game:
    return Game.query.options(joinedload(Game.game_players)).get_or_404(game_id)


def broadcast_lobby_update(socketio: SocketIO, game_id: int):
    """Broadcast lobby state updates to all participants in a game room."""
    game = Game.query.options(joinedload(Game.game_players)).get(game_id)
    if game and game.status == 'waiting':
        socketio.emit('lobby_update', _lobby_state(game), room=f'game_{game_id}')


def register_socketio_events(socketio: SocketIO):
    """Register all WebSocket event handlers"""

    @socketio.on_error_default
    def default_error_handler(e):
        print(f"Socket.IO error: {e}")

    @socketio.on('connect')
    def handle_connect():
        emit('connected', {'message': 'Connected to Nerts server'})

    @socketio.on('disconnect')
    def handle_disconnect():
        _unregister_sid(request.sid)

    @socketio.on('join_game')
    def handle_join_game(data):
        game_id = data.get('game_id')
        device_id = data.get('device_id')

        if not game_id or not device_id:
            emit('error', {'message': 'game_id and device_id are required'})
            return

        game_player = _get_participant(game_id, device_id)
        if not game_player:
            emit('error', {'message': 'Player not in game'})
            return

        participant_id = game_player.id
        room = f'game_{game_id}'
        join_room(room)
        _register_participant(game_id, participant_id, request.sid)
        emit('joined_game', {'game_id': game_id, 'room': room, 'player_id': participant_id})

        game = _load_game(game_id)

        if game.status == 'waiting':
            emit('lobby_state', _lobby_state(game))
            return

        engine = get_engine(game_id)
        if engine:
            emit('game_state', engine.get_game_state(requesting_player_id=participant_id))
        elif game.status == 'active':
            emit('error', {'message': 'Game session not available; wait for host to restart'})
        else:
            emit('lobby_state', _lobby_state(game))

    @socketio.on('leave_game')
    def handle_leave_game(data):
        game_id = data.get('game_id')
        if game_id:
            leave_room(f'game_{game_id}')
        _unregister_sid(request.sid)
        emit('left_game', {'game_id': game_id})

    def _resolve_participant(game_id, data):
        device_id = data.get('device_id')
        if not device_id:
            return None, 'device_id is required'
        participant_id = resolve_participant_id(game_id, device_id)
        if participant_id is None:
            return None, 'Player not in game or game not active'
        return participant_id, None

    @socketio.on('draw_deck')
    def handle_draw_deck(data):
        game_id = data.get('game_id')
        if not game_id:
            emit('error', {'message': 'game_id is required'})
            return

        participant_id, err = _resolve_participant(game_id, data)
        if err:
            emit('error', {'message': err})
            return

        try:
            session = require_session(game_id)
        except KeyError:
            emit('error', {'message': 'Game not in progress'})
            return

        engine = session.engine
        if engine.draw_deck(participant_id):
            emit(
                'game_state',
                engine.get_game_state(requesting_player_id=participant_id),
                to=request.sid,
            )
        else:
            emit('error', {'message': 'Cannot draw from deck'})

    @socketio.on('play_card')
    def handle_play_card(data):
        game_id = data.get('game_id')
        card_data = data.get('card')
        target_type = data.get('target_type')
        target = data.get('target')

        if not all([game_id, card_data, target_type, target is not None]):
            emit('error', {'message': 'Missing required parameters'})
            return

        participant_id, err = _resolve_participant(game_id, data)
        if err:
            emit('error', {'message': err})
            return

        try:
            session = require_session(game_id)
        except KeyError:
            emit('error', {'message': 'Game not in progress'})
            return

        engine = session.engine
        card = Card.from_dict(card_data)
        success = False
        message = ''

        if target_type == 'center':
            success, message = engine.play_card_to_center(
                participant_id, card, int(target)
            )
        elif target_type == 'personal':
            success, message = engine.play_card_to_personal_stack(
                participant_id, card, int(target)
            )
        else:
            emit('error', {'message': 'Invalid target_type'})
            return

        if success:
            broadcast_game_state(socketio, game_id, engine)
        else:
            emit('error', {'message': message})

    @socketio.on('call_nerts')
    def handle_call_nerts(data):
        game_id = data.get('game_id')
        if not game_id:
            emit('error', {'message': 'game_id is required'})
            return

        participant_id, err = _resolve_participant(game_id, data)
        if err:
            emit('error', {'message': err})
            return

        try:
            session = require_session(game_id)
        except KeyError:
            emit('error', {'message': 'Game not in progress'})
            return

        engine = session.engine
        success, message = engine.call_nerts(participant_id)

        if success:
            broadcast_game_state(socketio, game_id, engine)
            room = f'game_{game_id}'
            socketio.emit(
                'round_ended',
                {
                    'round': engine.current_round - 1,
                    'winner_id': engine.winner_id,
                    'message': message,
                },
                room=room,
            )
            if engine.status == 'finished':
                game = _load_game(game_id)
                persist_game_end(game, engine)
        else:
            emit('error', {'message': message})

    @socketio.on('move_stack')
    def handle_move_stack(data):
        game_id = data.get('game_id')
        from_stack = data.get('from_stack')
        to_stack = data.get('to_stack')
        count = data.get('count', 1)

        if not all([game_id, from_stack is not None, to_stack is not None]):
            emit('error', {'message': 'Missing required parameters'})
            return

        participant_id, err = _resolve_participant(game_id, data)
        if err:
            emit('error', {'message': err})
            return

        try:
            session = require_session(game_id)
        except KeyError:
            emit('error', {'message': 'Game not in progress'})
            return

        engine = session.engine
        success, message = engine.move_stack_sequence(
            participant_id, from_stack, to_stack, count
        )

        if success:
            broadcast_game_state(socketio, game_id, engine)
        else:
            emit('error', {'message': message})
