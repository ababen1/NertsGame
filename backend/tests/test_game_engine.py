import pytest
from app.game.engine import GameEngine
from app.game.card import Card, Suit, Rank


def test_game_engine_initialization():
    """Test game engine initialization"""
    engine = GameEngine(1, [1, 2, 3])

    assert engine.game_id == 1
    assert len(engine.players) == 3
    assert engine.current_round == 1
    assert engine.status == 'waiting'
    assert len(engine.center_stacks) == GameEngine.center_stack_count(3)


def test_start_round():
    """Test starting a round"""
    engine = GameEngine(1, [1, 2])
    engine.start_round()

    assert engine.status == 'active'
    assert len(engine.center_stacks) == GameEngine.center_stack_count(2)

    for player_id, player in engine.players.items():
        total_stack_cards = sum(len(stack) for stack in player.personal_stacks)
        assert total_stack_cards == 6
        assert len(player.nerts_pile) == 13
        assert len(player.deck) == 33


def test_draw_deck():
    """Test drawing from deck (page-based reveal)"""
    engine = GameEngine(1, [1])
    engine.start_round()

    player = engine.players[1]
    assert player.deck_page == 0

    success = engine.draw_deck(1)
    assert success is True
    assert player.deck_page == 1
    assert engine.get_playable_card(1) is not None


def test_play_card_to_center():
    """Test playing card to center stack by index"""
    engine = GameEngine(1, [1, 2])
    engine.start_round()

    player = engine.players[1]
    ace = None
    for card in player.deck:
        if card.rank == Rank.ACE:
            ace = card
            break

    assert ace is not None
    player.deck.remove(ace)
    player.deck_page = 0

    success, message = engine.play_card_to_center(1, ace, 0)
    assert success is True
    assert len(engine.center_stacks[0]) == 1
    assert ace in engine.players[1].scored_cards


def test_play_card_to_personal_stack():
    """Test playing card to personal stack"""
    engine = GameEngine(1, [1])
    engine.start_round()

    player = engine.players[1]
    king = Card(Suit.SPADES, Rank.KING)
    player.personal_stacks[0] = []

    success, message = engine.play_card_to_personal_stack(1, king, 0)
    assert success is True
    assert len(player.personal_stacks[0]) == 1


def test_call_nerts():
    """Test calling NERTS!"""
    engine = GameEngine(1, [1])
    engine.start_round()

    player = engine.players[1]
    player.nerts_pile = []

    success, message = engine.call_nerts(1)
    assert success is True
    assert engine.current_round == 2


def test_game_state_serialization():
    """Test game state serialization"""
    engine = GameEngine(1, [1, 2])
    engine.start_round()

    data = engine.to_dict()
    restored = GameEngine.from_dict(data)

    assert restored.game_id == engine.game_id
    assert restored.current_round == engine.current_round
    assert len(restored.players) == len(engine.players)
    assert len(restored.center_stacks) == len(engine.center_stacks)
