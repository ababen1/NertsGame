import pytest
from unittest.mock import MagicMock, patch
from app.game.engine import GameEngine
from app.game.cache import (
    start_session,
    get_engine,
    require_session,
    resolve_participant_id,
    pop_session,
    persist_game_end,
)


@pytest.fixture(autouse=True)
def clear_sessions():
    pop_session(1)
    pop_session(2)
    yield
    pop_session(1)
    pop_session(2)


@pytest.fixture
def active_engine():
    engine = GameEngine(1, [10, 20])
    engine.start_round()
    return engine


@pytest.fixture
def mock_game():
    game = MagicMock()
    game.id = 1
    game.status = 'active'
    game.current_round = 1
    game.winner_id = None
    game.game_state = {}
    gp1 = MagicMock()
    gp1.id = 10
    gp1.device_id = 'device-a'
    gp1.score = 0
    gp2 = MagicMock()
    gp2.id = 20
    gp2.device_id = 'device-b'
    gp2.score = 0
    game.game_players = [gp1, gp2]
    return game


def test_start_session_and_resolve(active_engine, mock_game):
    start_session(mock_game, active_engine)
    assert get_engine(1) is active_engine
    assert resolve_participant_id(1, 'device-a') == 10
    assert resolve_participant_id(1, 'device-b') == 20
    assert resolve_participant_id(1, 'unknown') is None


def test_require_session_raises_when_missing():
    with pytest.raises(KeyError):
        require_session(999)


def test_pop_session_clears_cache(active_engine, mock_game):
    start_session(mock_game, active_engine)
    popped = pop_session(1)
    assert popped is not None
    assert get_engine(1) is None


def test_persist_game_end_writes_and_clears(active_engine, mock_game):
    active_engine.status = 'finished'
    active_engine.winner_id = 10
    active_engine.players[10].score = [100]
    active_engine.players[20].score = [50]

    start_session(mock_game, active_engine)

    with patch('app.game.cache.db') as mock_db:
        persist_game_end(mock_game, active_engine)

    assert mock_game.status == 'finished'
    assert mock_game.winner_id == 10
    assert mock_game.game_state == {}
    assert mock_game.game_players[0].score == 100
    assert mock_game.game_players[1].score == 50
    mock_db.session.commit.assert_called_once()
    assert get_engine(1) is None


def test_engine_survives_second_lookup_without_db_reload(active_engine, mock_game):
    start_session(mock_game, active_engine)
    first = get_engine(1)
    first.draw_deck(10)
    second = get_engine(1)
    assert second is first
    assert second.players[10].deck_page == 1
