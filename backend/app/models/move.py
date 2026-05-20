from app import db
from app.time_utils import utc_now
from sqlalchemy.orm import relationship
from sqlalchemy import JSON


class Move(db.Model):
    """Move model for tracking game moves (for history/replay)"""
    __tablename__ = 'moves'

    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.Integer, db.ForeignKey('games.id'), nullable=False)
    player_id = db.Column(db.Integer, db.ForeignKey('game_players.id'), nullable=False)
    round_number = db.Column(db.Integer, nullable=False)
    move_type = db.Column(db.String(50), nullable=False)
    move_data = db.Column(JSON, nullable=False)
    timestamp = db.Column(db.DateTime, default=utc_now, nullable=False)

    game = relationship('Game', back_populates='moves')
    participant = relationship('GamePlayer', foreign_keys=[player_id])

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
