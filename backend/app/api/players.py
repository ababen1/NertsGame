from flask import Blueprint, request, jsonify
from app import db
from app.models.player import Player
from sqlalchemy.exc import IntegrityError

players_bp = Blueprint('players', __name__)


@players_bp.route('', methods=['POST'])
def create_player():
    """Create a new player"""
    data = request.get_json()
    
    if not data or 'username' not in data:
        return jsonify({'error': 'Username is required'}), 400
    
    player = Player(username=data['username'], email=data.get('email'))
    db.session.add(player)
    db.session.commit()
    return jsonify(player.to_dict()), 201


@players_bp.route('/<int:player_id>', methods=['GET'])
def get_player(player_id):
    """Get player by ID"""
    player = Player.query.get_or_404(player_id)
    return jsonify(player.to_dict())


@players_bp.route('/<int:player_id>', methods=['PATCH'])
def update_player(player_id):
    """Update player display name"""
    player = Player.query.get_or_404(player_id)
    data = request.get_json() or {}
    if 'username' in data and data['username']:
        player.username = data['username']
    db.session.commit()
    return jsonify(player.to_dict())


@players_bp.route('', methods=['GET'])
def list_players():
    """List all players"""
    players = Player.query.all()
    return jsonify([p.to_dict() for p in players])

