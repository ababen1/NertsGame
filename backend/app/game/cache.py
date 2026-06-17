"""In-memory active game sessions. Authoritative during play; DB only at boundaries."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from app import db
from app.game.engine import GameEngine
from app.models.game import Game

_active_sessions: dict[int, GameSession] = {}


@dataclass
class GameSession:
    engine: GameEngine
    device_to_player: dict[str, int] = field(default_factory=dict)

    @property
    def player_ids(self) -> list[int]:
        return list(self.engine.players.keys())


def _session(game_id: int) -> Optional[GameSession]:
    return _active_sessions.get(game_id)


def start_session(game: Game, engine: GameEngine) -> None:
    device_map = {gp.device_id: gp.id for gp in game.game_players}
    _active_sessions[game.id] = GameSession(engine=engine, device_to_player=device_map)


def get_engine(game_id: int) -> Optional[GameEngine]:
    session = _session(game_id)
    return session.engine if session else None


def require_session(game_id: int) -> GameSession:
    session = _session(game_id)
    if session is None:
        raise KeyError(f'No active in-memory session for game {game_id}')
    return session


def resolve_participant_id(game_id: int, device_id: str) -> Optional[int]:
    session = _session(game_id)
    if not session:
        return None
    return session.device_to_player.get(device_id)


def pop_session(game_id: int) -> Optional[GameSession]:
    return _active_sessions.pop(game_id, None)


def persist_game_end(game: Game, engine: GameEngine) -> None:
    """Write final room outcome to DB and drop in-memory session."""
    game.status = engine.status
    game.current_round = engine.current_round
    game.winner_id = engine.winner_id
    game.game_state = {}

    for gp in game.game_players:
        player_state = engine.players.get(gp.id)
        if player_state is not None:
            gp.score = sum(player_state.score)

    pop_session(game.id)
    db.session.commit()
