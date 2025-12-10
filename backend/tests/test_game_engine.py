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


def test_start_round():
    """Test starting a round"""
    engine = GameEngine(1, [1, 2])
    engine.start_round()
    
    assert engine.status == 'active'
    
    # Check each player has correct card distribution
    for player_id, player in engine.players.items():
        # 6 cards in personal stacks
        total_stack_cards = sum(len(stack) for stack in player.personal_stacks)
        assert total_stack_cards == 6
        
        # 13 cards in Nerts pile
        assert len(player.nerts_pile) == 13
        
        # 33 cards in deck
        assert len(player.deck) == 33


def test_draw_deck():
    """Test drawing from deck"""
    engine = GameEngine(1, [1])
    engine.start_round()
    
    player = engine.players[1]
    initial_deck_size = len(player.deck)
    
    success = engine.draw_deck(1)
    assert success == True
    assert len(player.deck_display) == 3
    assert len(player.deck) == initial_deck_size - 3


def test_play_card_to_center():
    """Test playing card to center stack"""
    engine = GameEngine(1, [1])
    engine.start_round()
    
    # Get an Ace from player's deck
    player = engine.players[1]
    ace = None
    for card in player.deck:
        if card.rank == Rank.ACE:
            ace = card
            break
    
    if ace:
        # Add to display so it's playable
        player.deck_display = [ace]
        player.deck.remove(ace)
        
        success, message = engine.play_card_to_center(1, ace, Suit.HEARTS)
        assert success == True
        assert len(engine.center_stacks[Suit.HEARTS]) == 1
        assert engine.players[1].score == 1


def test_play_card_to_personal_stack():
    """Test playing card to personal stack"""
    engine = GameEngine(1, [1])
    engine.start_round()
    
    player = engine.players[1]
    # Get a card that can be played on an empty stack (any card)
    card = player.personal_stacks[0][0] if player.personal_stacks[0] else None
    
    if card:
        # Remove from stack and add to display
        player.personal_stacks[0] = []
        player.deck_display = [card]
        
        # Get a King to play on empty stack
        king = Card(Suit.SPADES, Rank.KING)
        player.deck_display = [king]
        
        success, message = engine.play_card_to_personal_stack(1, king, 0)
        assert success == True
        assert len(player.personal_stacks[0]) == 1


def test_call_nerts():
    """Test calling NERTS!"""
    engine = GameEngine(1, [1])
    engine.start_round()
    
    # Empty the Nerts pile
    player = engine.players[1]
    player.nerts_pile = []
    
    success, message = engine.call_nerts(1)
    assert success == True
    assert engine.current_round == 2  # Should start next round


def test_game_state_serialization():
    """Test game state serialization"""
    engine = GameEngine(1, [1, 2])
    engine.start_round()
    
    # Serialize
    data = engine.to_dict()
    
    # Deserialize
    restored = GameEngine.from_dict(data)
    
    assert restored.game_id == engine.game_id
    assert restored.current_round == engine.current_round
    assert len(restored.players) == len(engine.players)

