import os

import pytest
from app import create_app, db
from app.models.game import Game, GamePlayer
from app.room_code import assign_unique_room_code


@pytest.fixture
def app():
    """Create application for testing (in-memory SQLite, isolated from .env DB)."""
    os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['WTF_CSRF_ENABLED'] = False

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture
def sample_game(app):
    """Create a sample public room with owner participant."""
    with app.app_context():
        game = Game(max_players=6, is_private=False)
        assign_unique_room_code(game)
        db.session.add(game)
        db.session.flush()

        owner = GamePlayer(
            game_id=game.id,
            device_id='owner-device',
            display_name='Owner',
            position=0,
        )
        db.session.add(owner)
        db.session.flush()
        game.owner_id = owner.id
        db.session.commit()
        # Return plain values so tests don't touch a detached ORM instance
        return type('GameRef', (), {'id': game.id, 'room_code': game.room_code})()
