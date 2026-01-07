from flask_socketio import SocketIO, emit, join_room, leave_room
from flask import request
from app import db
from app.models.game import Game, GamePlayer
from app.game.engine import GameEngine
import json


def broadcast_lobby_update(socketio: SocketIO, game_id: int):
    """Helper function to broadcast lobby state updates to all players in a game room"""
    game = Game.query.get(game_id)
    if game and game.status == 'waiting':
        lobby_state = {
            'game_id': game.id,
            'name': game.name,
            'owner_id': game.owner_id,
            'players': [
                {
                    'player_id': gp.player_id,
                    'username': gp.player.username if gp.player else None,
                    'is_ready': gp.is_ready,
                    'position': gp.position
                }
                for gp in game.game_players
            ]
        }
        room = f'game_{game_id}'
        socketio.emit('lobby_update', lobby_state, room=room)


def register_socketio_events(socketio: SocketIO):
    """Register all WebSocket event handlers"""
    
    @socketio.on_error_default
    def default_error_handler(e):
        print(f"Socket.IO error: {e}")
    
    @socketio.on('connect')
    def handle_connect():
        """Handle client connection"""
        emit('connected', {'message': 'Connected to Nerts server'})
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection"""
        pass
    
    @socketio.on('join_game')
    def handle_join_game(data):
        """Join a game room"""
        import json
        game_id = data.get('game_id')
        player_id = data.get('player_id')
        
        # #region agent log
        with open('/home/ben/Documents/Projects/Nerts/.cursor/debug.log', 'a') as f:
            f.write(json.dumps({"location":"websocket/__init__.py:27","message":"join_game handler called","data":{"game_id":game_id,"player_id":player_id},"timestamp":int(__import__('time').time()*1000),"sessionId":"debug-session","runId":"run1","hypothesisId":"1,4,5"}) + '\n')
        # #endregion
        
        if not game_id or not player_id:
            # #region agent log
            with open('/home/ben/Documents/Projects/Nerts/.cursor/debug.log', 'a') as f:
                f.write(json.dumps({"location":"websocket/__init__.py:32","message":"Missing game_id or player_id","data":{"game_id":game_id,"player_id":player_id},"timestamp":int(__import__('time').time()*1000),"sessionId":"debug-session","runId":"run1","hypothesisId":"5"}) + '\n')
            # #endregion
            emit('error', {'message': 'game_id and player_id are required'})
            return
        
        # Verify player is in the game
        game_player = GamePlayer.query.filter_by(
            game_id=game_id,
            player_id=player_id
        ).first()
        
        # #region agent log
        with open('/home/ben/Documents/Projects/Nerts/.cursor/debug.log', 'a') as f:
            f.write(json.dumps({"location":"websocket/__init__.py:40","message":"GamePlayer lookup result","data":{"found":game_player is not None,"game_id":game_id,"player_id":player_id},"timestamp":int(__import__('time').time()*1000),"sessionId":"debug-session","runId":"run1","hypothesisId":"4,5"}) + '\n')
        # #endregion
        
        if not game_player:
            # #region agent log
            with open('/home/ben/Documents/Projects/Nerts/.cursor/debug.log', 'a') as f:
                f.write(json.dumps({"location":"websocket/__init__.py:43","message":"Player not in game","data":{"game_id":game_id,"player_id":player_id},"timestamp":int(__import__('time').time()*1000),"sessionId":"debug-session","runId":"run1","hypothesisId":"4,5"}) + '\n')
            # #endregion
            emit('error', {'message': 'Player not in game'})
            return
        
        room = f'game_{game_id}'
        join_room(room)
        emit('joined_game', {'game_id': game_id, 'room': room})
        
        # #region agent log
        with open('/home/ben/Documents/Projects/Nerts/.cursor/debug.log', 'a') as f:
            f.write(json.dumps({"location":"websocket/__init__.py:48","message":"Joined room, emitting joined_game","data":{"room":room},"timestamp":int(__import__('time').time()*1000),"sessionId":"debug-session","runId":"run1","hypothesisId":"2"}) + '\n')
        # #endregion
        
        # Get game and check status
        game = Game.query.get(game_id)
        
        if game and game.status == 'waiting':
            # Send lobby state for waiting games
            lobby_state = {
                'game_id': game.id,
                'name': game.name,
                'owner_id': game.owner_id,
                'players': [
                    {
                        'player_id': gp.player_id,
                        'username': gp.player.username if gp.player else None,
                        'is_ready': gp.is_ready,
                        'position': gp.position
                    }
                    for gp in game.game_players
                ]
            }
            emit('lobby_state', lobby_state)
        elif game and game.game_state is not None and (isinstance(game.game_state, dict) and len(game.game_state) > 0):
            # Send game state for active games
            # #region agent log
            game_state_type = type(game.game_state).__name__ if game and game.game_state is not None else None
            game_state_bool = bool(game.game_state) if game and game.game_state is not None else False
            game_state_len = len(game.game_state) if game and game.game_state is not None and hasattr(game.game_state, '__len__') else None
            with open('/home/ben/Documents/Projects/Nerts/.cursor/debug.log', 'a') as f:
                f.write(json.dumps({"location":"websocket/__init__.py:52","message":"Game lookup result","data":{"found":game is not None,"has_game_state":game.game_state is not None if game else False,"game_state_type":game_state_type,"game_state_bool":game_state_bool,"game_state_len":game_state_len,"game_state_keys":list(game.game_state.keys()) if game and game.game_state and isinstance(game.game_state, dict) else None},"timestamp":int(__import__('time').time()*1000),"sessionId":"debug-session","runId":"run1","hypothesisId":"1,5"}) + '\n')
            # #endregion
            # #region agent log
            with open('/home/ben/Documents/Projects/Nerts/.cursor/debug.log', 'a') as f:
                f.write(json.dumps({"location":"websocket/__init__.py:66","message":"Entering game_state emit block","data":{"game_state_type":type(game.game_state).__name__},"timestamp":int(__import__('time').time()*1000),"sessionId":"debug-session","runId":"run1","hypothesisId":"1"}) + '\n')
            # #endregion
            engine = GameEngine.from_dict(game.game_state)
            state = engine.get_game_state(requesting_player_id=player_id)
            # #region agent log
            with open('/home/ben/Documents/Projects/Nerts/.cursor/debug.log', 'a') as f:
                f.write(json.dumps({"location":"websocket/__init__.py:69","message":"Emitting game_state","data":{"hasState":state is not None,"stateKeys":list(state.keys()) if state else None,"hasPlayers":state.get('players') is not None if state else False,"playerIdInState":str(player_id) in (state.get('players',{}) if state else {})},"timestamp":int(__import__('time').time()*1000),"sessionId":"debug-session","runId":"run1","hypothesisId":"1,2,3,4"}) + '\n')
            # #endregion
            emit('game_state', state)
        else:
            # #region agent log
            with open('/home/ben/Documents/Projects/Nerts/.cursor/debug.log', 'a') as f:
                f.write(json.dumps({"location":"websocket/__init__.py:75","message":"No game state to send - condition failed","data":{"game_exists":game is not None,"has_state":game.game_state is not None if game else False,"game_state_bool":bool(game.game_state) if game and game.game_state is not None else False,"game_state_type":type(game.game_state).__name__ if game and game.game_state is not None else None,"game_state_is_empty_dict":game.game_state == {} if game and game.game_state is not None else None,"game_state_len":len(game.game_state) if game and game.game_state is not None and isinstance(game.game_state, dict) else None},"timestamp":int(__import__('time').time()*1000),"sessionId":"debug-session","runId":"run1","hypothesisId":"1"}) + '\n')
            # #endregion
    
    @socketio.on('leave_game')
    def handle_leave_game(data):
        """Leave a game room"""
        game_id = data.get('game_id')
        if game_id:
            room = f'game_{game_id}'
            leave_room(room)
            emit('left_game', {'game_id': game_id})
    
    @socketio.on('draw_deck')
    def handle_draw_deck(data):
        """Handle drawing from deck"""
        game_id = data.get('game_id')
        player_id = data.get('player_id')
        
        if not game_id or not player_id:
            emit('error', {'message': 'game_id and player_id are required'})
            return
        
        game = Game.query.get_or_404(game_id)
        if not game.game_state:
            emit('error', {'message': 'Game not started'})
            return
        
        engine = GameEngine.from_dict(game.game_state)
        success = engine.draw_deck(player_id)
        
        if success:
            game.game_state = engine.to_dict()
            db.session.commit()
            
            room = f'game_{game_id}'
            socketio.emit('game_state', engine.get_game_state(requesting_player_id=player_id), room=room)
        else:
            emit('error', {'message': 'Cannot draw from deck'})
    
    @socketio.on('play_card')
    def handle_play_card(data):
        """Handle playing a card"""
        game_id = data.get('game_id')
        player_id = data.get('player_id')
        card_data = data.get('card')
        target_type = data.get('target_type')  # 'center' or 'personal'
        target = data.get('target')  # suit for center, stack_index for personal
        
        if not all([game_id, player_id, card_data, target_type, target]):
            emit('error', {'message': 'Missing required parameters'})
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
            suit = Suit(target)
            success, message = engine.play_card_to_center(player_id, card, suit)
        elif target_type == 'personal':
            stack_index = int(target)
            success, message = engine.play_card_to_personal_stack(player_id, card, stack_index)
        else:
            emit('error', {'message': 'Invalid target_type'})
            return
        
        if success:
            game.game_state = engine.to_dict()
            db.session.commit()
            
            room = f'game_{game_id}'
            # Send full state to all players (each sees their own private cards)
            for gp in game.game_players:
                player_state = engine.get_game_state(requesting_player_id=gp.player_id)
                socketio.emit('game_state', player_state, room=room)
        else:
            emit('error', {'message': message})
    
    @socketio.on('call_nerts')
    def handle_call_nerts(data):
        """Handle calling NERTS!"""
        game_id = data.get('game_id')
        player_id = data.get('player_id')
        
        if not game_id or not player_id:
            emit('error', {'message': 'game_id and player_id are required'})
            return
        
        game = Game.query.get_or_404(game_id)
        if not game.game_state:
            emit('error', {'message': 'Game not started'})
            return
        
        engine = GameEngine.from_dict(game.game_state)
        success, message = engine.call_nerts(player_id)
        
        if success:
            game.game_state = engine.to_dict()
            game.status = engine.status
            game.current_round = engine.current_round
            game.winner_id = engine.winner_id
            db.session.commit()
            
            room = f'game_{game_id}'
            # Send updated state to all players
            for gp in game.game_players:
                player_state = engine.get_game_state(requesting_player_id=gp.player_id)
                socketio.emit('game_state', player_state, room=room)
            
            socketio.emit('round_ended', {
                'round': engine.current_round - 1,
                'winner_id': engine.winner_id,
                'message': message
            }, room=room)
        else:
            emit('error', {'message': message})
    
    @socketio.on('move_stack')
    def handle_move_stack(data):
        """Handle moving a stack sequence"""
        game_id = data.get('game_id')
        player_id = data.get('player_id')
        from_stack = data.get('from_stack')
        to_stack = data.get('to_stack')
        count = data.get('count', 1)
        
        if not all([game_id, player_id, from_stack is not None, to_stack is not None]):
            emit('error', {'message': 'Missing required parameters'})
            return
        
        game = Game.query.get_or_404(game_id)
        if not game.game_state:
            emit('error', {'message': 'Game not started'})
            return
        
        engine = GameEngine.from_dict(game.game_state)
        success, message = engine.move_stack_sequence(player_id, from_stack, to_stack, count)
        
        if success:
            game.game_state = engine.to_dict()
            db.session.commit()
            
            room = f'game_{game_id}'
            for gp in game.game_players:
                player_state = engine.get_game_state(requesting_player_id=gp.player_id)
                socketio.emit('game_state', player_state, room=room)
        else:
            emit('error', {'message': message})

