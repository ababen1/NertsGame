import secrets

from app import db
from app.models.game import Game


def generate_room_code(length: int = 8) -> str:
    """Generate a URL-safe room code."""
    return secrets.token_urlsafe(length)[:length]


def assign_unique_room_code(game: Game, max_attempts: int = 10) -> None:
    """Set game.room_code to a value not already used in the database."""
    for _ in range(max_attempts):
        code = generate_room_code()
        if not Game.query.filter_by(room_code=code).first():
            game.room_code = code
            return
    raise RuntimeError('Failed to generate unique room code')
