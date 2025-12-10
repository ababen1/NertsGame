import pytest
import json
from app.models.player import Player
from app.models.game import Game, GamePlayer


def test_create_player(client):
    """Test creating a player"""
    response = client.post(
        '/api/players',
        data=json.dumps({'username': 'testuser'}),
        content_type='application/json'
    )
    
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['username'] == 'testuser'
    assert data['email'] is None


def test_get_player(client, sample_player):
    """Test getting a player"""
    response = client.get(f'/api/players/{sample_player.id}')
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['id'] == sample_player.id
    assert data['username'] == 'testuser'


def test_create_game(client):
    """Test creating a game"""
    response = client.post(
        '/api/games',
        data=json.dumps({'max_players': 6}),
        content_type='application/json'
    )
    
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['max_players'] == 6
    assert data['status'] == 'waiting'


def test_join_game(client, sample_game, sample_player):
    """Test joining a game"""
    # Create another player
    player2 = Player(username='player2')
    from app import db
    db.session.add(player2)
    db.session.commit()
    
    response = client.post(
        f'/api/games/{sample_game.id}/join',
        data=json.dumps({'player_id': player2.id}),
        content_type='application/json'
    )
    
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['game_id'] == sample_game.id
    assert data['player_id'] == player2.id

