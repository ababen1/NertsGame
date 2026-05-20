from app import db
from app.time_utils import utc_now
from sqlalchemy.orm import relationship
from sqlalchemy import JSON


class Game(db.Model):
    """Game model representing a Nerts match (room)"""
    __tablename__ = 'games'

    id = db.Column(db.Integer, primary_key=True)
    room_code = db.Column(db.String(12), unique=True, nullable=False, index=True)
    is_private = db.Column(db.Boolean, default=False, nullable=False)
    status = db.Column(db.String(20), default='waiting', nullable=False)  # waiting, active, finished
    max_players = db.Column(db.Integer, default=6, nullable=False)
    current_round = db.Column(db.Integer, default=1, nullable=False)
    winner_id = db.Column(
        db.Integer,
        db.ForeignKey('game_players.id', use_alter=True, name='fk_games_winner_id'),
        nullable=True,
    )
    owner_id = db.Column(
        db.Integer,
        db.ForeignKey('game_players.id', use_alter=True, name='fk_games_owner_id'),
        nullable=True,
    )
    name = db.Column(db.String(100), nullable=True)
    game_state = db.Column(JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)

    game_players = relationship(
        'GamePlayer',
        back_populates='game',
        cascade='all, delete-orphan',
        order_by='GamePlayer.position',
        foreign_keys='GamePlayer.game_id',
    )
    moves = relationship('Move', back_populates='game', cascade='all, delete-orphan')

    def to_dict(self, include_state=False):
        data = {
            'id': self.id,
            'room_code': self.room_code,
            'is_private': self.is_private,
            'status': self.status,
            'max_players': self.max_players,
            'current_round': self.current_round,
            'winner_id': self.winner_id,
            'owner_id': self.owner_id,
            'name': self.name,
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
    """Room participant (player exists only within this game)"""
    __tablename__ = 'game_players'

    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.Integer, db.ForeignKey('games.id'), nullable=False)
    device_id = db.Column(db.String(255), nullable=False, index=True)
    display_name = db.Column(db.String(80), nullable=False)
    position = db.Column(db.Integer, nullable=False)
    score = db.Column(db.Integer, default=0, nullable=False)
    is_ready = db.Column(db.Boolean, default=False, nullable=False)
    joined_at = db.Column(db.DateTime, default=utc_now)

    game = relationship('Game', back_populates='game_players', foreign_keys=[game_id])

    __table_args__ = (
        db.UniqueConstraint('game_id', 'position', name='unique_game_position'),
        db.UniqueConstraint('game_id', 'device_id', name='unique_game_device'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'game_id': self.game_id,
            'device_id': self.device_id,
            'display_name': self.display_name,
            'position': self.position,
            'score': self.score,
            'is_ready': self.is_ready,
            # Legacy field: participant id used by game engine / websocket clients
            'player_id': self.id,
        }

    def __repr__(self):
        return f'<GamePlayer game={self.game_id} device={self.device_id} pos={self.position}>'
