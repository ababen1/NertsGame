from flask import Blueprint, request, jsonify
from app import db
from app.models.player import Player
from sqlalchemy.exc import IntegrityError

players_bp = Blueprint('players', __name__)


@players_bp.route('', methods=['POST'])
def create_player():
    """Create or get a player by device_id"""
    data = request.get_json()
    
    if not data or 'device_id' not in data:
        return jsonify({'error': 'device_id is required'}), 400
    
    if not data or 'username' not in data:
        return jsonify({'error': 'Username is required'}), 400
    
    device_id = data['device_id']
    username = data['username']
    
    # Find existing player by device_id, or create new one
    player = Player.query.filter_by(device_id=device_id).first()
    
    if player:
        # Update username if provided
        if username:
            player.username = username
        db.session.commit()
        return jsonify(player.to_dict()), 200
    else:
        # Create new player
        player = Player(
            device_id=device_id,
            username=username,
            email=data.get('email')
        )
        db.session.add(player)
        db.session.commit()
        return jsonify(player.to_dict()), 201


@players_bp.route('/<int:player_id>', methods=['GET'])
def get_player(player_id):
    """Get player by ID"""
    player = Player.query.get_or_404(player_id)
    return jsonify(player.to_dict())


@players_bp.route('/device/<device_id>', methods=['GET'])
def get_player_by_device(device_id):
    """Get player by device_id"""
    player = Player.query.filter_by(device_id=device_id).first()
    if not player:
        return jsonify({'error': 'Player not found'}), 404
    return jsonify(player.to_dict())


@players_bp.route('/<int:player_id>', methods=['PATCH'])
def update_player(player_id):
    """Update player display name by ID"""
    player = Player.query.get_or_404(player_id)
    data = request.get_json() or {}
    if 'username' in data and data['username']:
        player.username = data['username']
    db.session.commit()
    return jsonify(player.to_dict())


@players_bp.route('/device/<device_id>', methods=['PATCH'])
def update_player_by_device(device_id):
    """Update player display name by device_id"""
    player = Player.query.filter_by(device_id=device_id).first()
    if not player:
        return jsonify({'error': 'Player not found'}), 404
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

