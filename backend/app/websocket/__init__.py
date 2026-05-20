from flask_socketio import SocketIO, emit, join_room, leave_room
from app import db
from app.models.game import Game, GamePlayer
from app.game.engine import GameEngine
from sqlalchemy.orm import joinedload


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
        pass

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
        emit('joined_game', {'game_id': game_id, 'room': room, 'player_id': participant_id})

        game = Game.query.options(joinedload(Game.game_players)).get(game_id)

        if game and game.status == 'waiting':
            emit('lobby_state', _lobby_state(game))
        elif game and game.game_state and isinstance(game.game_state, dict) and len(game.game_state) > 0:
            engine = GameEngine.from_dict(game.game_state)
            emit('game_state', engine.get_game_state(requesting_player_id=participant_id))

    @socketio.on('leave_game')
    def handle_leave_game(data):
        game_id = data.get('game_id')
        if game_id:
            leave_room(f'game_{game_id}')
            emit('left_game', {'game_id': game_id})

    def _resolve_participant(game_id, data):
        device_id = data.get('device_id')
        if not device_id:
            return None, 'device_id is required'
        gp = _get_participant(game_id, device_id)
        if not gp:
            return None, 'Player not in game'
        return gp.id, None

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

        game = Game.query.get_or_404(game_id)
        if not game.game_state:
            emit('error', {'message': 'Game not started'})
            return

        engine = GameEngine.from_dict(game.game_state)
        if engine.draw_deck(participant_id):
            game.game_state = engine.to_dict()
            db.session.commit()
            socketio.emit(
                'game_state',
                engine.get_game_state(requesting_player_id=participant_id),
                room=f'game_{game_id}',
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

        game = Game.query.get_or_404(game_id)
        if not game.game_state:
            emit('error', {'message': 'Game not started'})
            return

        engine = GameEngine.from_dict(game.game_state)
        from app.game.card import Card, Suit

        card = Card.from_dict(card_data)
        success = False
        message = ""

        if target_type == 'center':
            success, message = engine.play_card_to_center(participant_id, card, Suit(target))
        elif target_type == 'personal':
            success, message = engine.play_card_to_personal_stack(
                participant_id, card, int(target)
            )
        else:
            emit('error', {'message': 'Invalid target_type'})
            return

        if success:
            game.game_state = engine.to_dict()
            db.session.commit()
            room = f'game_{game_id}'
            for gp in game.game_players:
                socketio.emit(
                    'game_state',
                    engine.get_game_state(requesting_player_id=gp.id),
                    room=room,
                )
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

        game = Game.query.get_or_404(game_id)
        if not game.game_state:
            emit('error', {'message': 'Game not started'})
            return

        engine = GameEngine.from_dict(game.game_state)
        success, message = engine.call_nerts(participant_id)

        if success:
            game.game_state = engine.to_dict()
            game.status = engine.status
            game.current_round = engine.current_round
            game.winner_id = engine.winner_id
            db.session.commit()

            room = f'game_{game_id}'
            for gp in game.game_players:
                socketio.emit(
                    'game_state',
                    engine.get_game_state(requesting_player_id=gp.id),
                    room=room,
                )
            socketio.emit(
                'round_ended',
                {
                    'round': engine.current_round - 1,
                    'winner_id': engine.winner_id,
                    'message': message,
                },
                room=room,
            )
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

        game = Game.query.get_or_404(game_id)
        if not game.game_state:
            emit('error', {'message': 'Game not started'})
            return

        engine = GameEngine.from_dict(game.game_state)
        success, message = engine.move_stack_sequence(
            participant_id, from_stack, to_stack, count
        )

        if success:
            game.game_state = engine.to_dict()
            db.session.commit()
            room = f'game_{game_id}'
            for gp in game.game_players:
                socketio.emit(
                    'game_state',
                    engine.get_game_state(requesting_player_id=gp.id),
                    room=room,
                )
        else:
            emit('error', {'message': message})
