from app import db
from datetime import datetime
from sqlalchemy.orm import relationship


class Player(db.Model):
    """Player model for user accounts"""
    __tablename__ = 'players'

    id = db.Column(db.Integer, primary_key=True)
    # Device ID uniquely identifies the player's device
    device_id = db.Column(db.String(255), unique=True, nullable=False, index=True)
    # Usernames are display names only (not unique); devices identify the player.
    username = db.Column(db.String(80), unique=False, nullable=False, index=True)
    # Email is optional; players may join with just a display name.
    email = db.Column(db.String(120), unique=False, nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    game_participations = relationship('GamePlayer', back_populates='player', cascade='all, delete-orphan')
    moves = relationship('Move', back_populates='player', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'device_id': self.device_id,
            'username': self.username,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'email': self.email,
        }

    def __repr__(self):
        return f'<Player {self.username}>'

