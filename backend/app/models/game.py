from app import db
from datetime import datetime
from sqlalchemy.orm import relationship
from sqlalchemy import JSON
import json


class Game(db.Model):
    """Game model representing a Nerts match"""
    __tablename__ = 'games'

    id = db.Column(db.Integer, primary_key=True)
    status = db.Column(db.String(20), default='waiting', nullable=False)  # waiting, active, finished
    max_players = db.Column(db.Integer, default=6, nullable=False)
    current_round = db.Column(db.Integer, default=1, nullable=False)
    winner_id = db.Column(db.Integer, db.ForeignKey('players.id'), nullable=True)
    game_state = db.Column(JSON, nullable=False, default=dict)  # Stores full game state
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    game_players = relationship('GamePlayer', back_populates='game', cascade='all, delete-orphan', order_by='GamePlayer.position')
    moves = relationship('Move', back_populates='game', cascade='all, delete-orphan')

    def to_dict(self, include_state=False):
        data = {
            'id': self.id,
            'status': self.status,
            'max_players': self.max_players,
            'current_round': self.current_round,
            'winner_id': self.winner_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'players': [gp.to_dict() for gp in self.game_players],
        }
        if include_state:
            data['game_state'] = self.game_state
        return data

    def __repr__(self):
        return f'<Game {self.id} - {self.status}>'


class GamePlayer(db.Model):
    """Join table for players in games with their positions and scores"""
    __tablename__ = 'game_players'

    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.Integer, db.ForeignKey('games.id'), nullable=False)
    player_id = db.Column(db.Integer, db.ForeignKey('players.id'), nullable=False)
    position = db.Column(db.Integer, nullable=False)  # 0-5, player's position in the game
    score = db.Column(db.Integer, default=0, nullable=False)
    is_ready = db.Column(db.Boolean, default=False, nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    game = relationship('Game', back_populates='game_players')
    player = relationship('Player', back_populates='game_players')

    # Unique constraint: one player per position per game
    __table_args__ = (db.UniqueConstraint('game_id', 'position', name='unique_game_position'),)

    def to_dict(self):
        return {
            'id': self.id,
            'game_id': self.game_id,
            'player_id': self.player_id,
            'position': self.position,
            'score': self.score,
            'is_ready': self.is_ready,
            'player': self.player.to_dict() if self.player else None,
        }

    def __repr__(self):
        return f'<GamePlayer game={self.game_id} player={self.player_id} pos={self.position}>'

