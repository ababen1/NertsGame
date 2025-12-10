from app import db
from datetime import datetime
from sqlalchemy.orm import relationship
from sqlalchemy import JSON


class Move(db.Model):
    """Move model for tracking game moves (for history/replay)"""
    __tablename__ = 'moves'

    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.Integer, db.ForeignKey('games.id'), nullable=False)
    player_id = db.Column(db.Integer, db.ForeignKey('players.id'), nullable=False)
    round_number = db.Column(db.Integer, nullable=False)
    move_type = db.Column(db.String(50), nullable=False)  # e.g., 'play_card', 'draw_deck', 'call_nerts'
    move_data = db.Column(JSON, nullable=False)  # Stores move details
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    game = relationship('Game', back_populates='moves')
    player = relationship('Player', back_populates='moves')

    def to_dict(self):
        return {
            'id': self.id,
            'game_id': self.game_id,
            'player_id': self.player_id,
            'round_number': self.round_number,
            'move_type': self.move_type,
            'move_data': self.move_data,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
        }

    def __repr__(self):
        return f'<Move {self.id} - {self.move_type}>'

