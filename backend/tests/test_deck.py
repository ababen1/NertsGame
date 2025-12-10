import pytest
from app.game.deck import Deck
from app.game.card import Suit, Rank


def test_deck_creation():
    """Test standard deck creation"""
    deck = Deck()
    assert deck.size() == 52


def test_deck_shuffle():
    """Test deck shuffling"""
    deck1 = Deck()
    deck2 = Deck()
    
    # Get initial order
    cards1 = deck1.cards.copy()
    cards2 = deck2.cards.copy()
    
    # Shuffle one
    deck1.shuffle()
    
    # At least some cards should be in different positions
    # (very unlikely all 52 cards stay in same position after shuffle)
    assert deck1.cards != cards1 or deck1.cards != cards2


def test_deck_deal():
    """Test dealing cards"""
    deck = Deck()
    initial_size = deck.size()
    
    dealt = deck.deal(5)
    assert len(dealt) == 5
    assert deck.size() == initial_size - 5


def test_deck_draw():
    """Test drawing a single card"""
    deck = Deck()
    initial_size = deck.size()
    
    card = deck.draw()
    assert card is not None
    assert deck.size() == initial_size - 1


def test_deck_add_cards():
    """Test adding cards to deck"""
    deck = Deck()
    initial_size = deck.size()
    
    from app.game.card import Card
    new_cards = [Card(Suit.HEARTS, Rank.ACE)]
    deck.add_cards(new_cards)
    
    assert deck.size() == initial_size + 1


def test_deck_to_dict():
    """Test deck serialization"""
    deck = Deck()
    data = deck.to_dict()
    
    assert len(data) == 52
    assert all('suit' in card and 'rank' in card for card in data)


def test_deck_from_dict():
    """Test deck deserialization"""
    from app.game.card import Card
    original_deck = Deck()
    data = original_deck.to_dict()
    
    restored_deck = Deck.from_dict(data)
    assert restored_deck.size() == 52
    assert restored_deck.cards == original_deck.cards

