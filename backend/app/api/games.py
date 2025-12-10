from flask import Blueprint, request, jsonify
from app import db
from app.models.game import Game, GamePlayer
from app.models.player import Player
from app.game.engine import GameEngine
import json

games_bp = Blueprint('games', __name__)


@games_bp.route('', methods=['POST'])
def create_game():
    """Create a new game"""
    data = request.get_json() or {}
    max_players = data.get('max_players', 6)
    
    if max_players < 2 or max_players > 6:
        return jsonify({'error': 'Max players must be between 2 and 6'}), 400
    
    game = Game(max_players=max_players)
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


@games_bp.route('/<int:game_id>/start', methods=['POST'])
def start_game(game_id):
    """Start a game (initialize first round)"""
    game = Game.query.get_or_404(game_id)
    
    if game.status != 'waiting':
        return jsonify({'error': 'Game is not in waiting status'}), 400
    
    if len(game.game_players) < 2:
        return jsonify({'error': 'Need at least 2 players to start'}), 400
    
    # Create game engine
    player_ids = [gp.player_id for gp in game.game_players]
    engine = GameEngine(game_id, player_ids)
    engine.start_round()
    
    # Save game state
    game.status = 'active'
    game.game_state = engine.to_dict()
    db.session.commit()
    
    return jsonify(engine.get_game_state()), 200

