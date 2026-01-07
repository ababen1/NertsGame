import pytest
from app import create_app, db
from app.models.player import Player
from app.models.game import Game, GamePlayer


@pytest.fixture
def app():
    """Create application for testing"""
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['WTF_CSRF_ENABLED'] = False
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture
def sample_player(app):
    """Create a sample player for testing"""
    with app.app_context():
        player = Player(username='testuser', device_id='test-device-id-sample')
        db.session.add(player)
        db.session.commit()
        return player


@pytest.fixture
def sample_game(app, sample_player):
    """Create a sample game for testing"""
    with app.app_context():
        game = Game(max_players=6)
        db.session.add(game)
        db.session.commit()
        
        game_player = GamePlayer(
            game_id=game.id,
            player_id=sample_player.id,
            position=0
        )
        db.session.add(game_player)
        db.session.commit()
        
        return game

