import pytest
from app.game.card import Card, Suit, Rank


def test_card_creation():
    """Test card creation"""
    card = Card(Suit.HEARTS, Rank.ACE)
    assert card.suit == Suit.HEARTS
    assert card.rank == Rank.ACE


def test_card_equality():
    """Test card equality"""
    card1 = Card(Suit.HEARTS, Rank.ACE)
    card2 = Card(Suit.HEARTS, Rank.ACE)
    card3 = Card(Suit.SPADES, Rank.ACE)
    
    assert card1 == card2
    assert card1 != card3


def test_card_to_dict():
    """Test card serialization"""
    card = Card(Suit.HEARTS, Rank.ACE)
    data = card.to_dict()
    
    assert data['suit'] == 'hearts'
    assert data['rank'] == 1
    assert data['display'] == 'A♥'


def test_card_from_dict():
    """Test card deserialization"""
    data = {'suit': 'hearts', 'rank': 1, 'display': 'A♥'}
    card = Card.from_dict(data)
    
    assert card.suit == Suit.HEARTS
    assert card.rank == Rank.ACE


def test_card_center_stack_validation():
    """Test center stack placement validation"""
    # Can place any Ace on empty stack (ace's suit determines stack suit)
    ace_hearts = Card(Suit.HEARTS, Rank.ACE)
    assert ace_hearts.can_play_on_center_stack(None, Suit.HEARTS) == True
    assert ace_hearts.can_play_on_center_stack(None, Suit.CLUBS) == True  # Any ace on empty stack
    
    ace_clubs = Card(Suit.CLUBS, Rank.ACE)
    assert ace_clubs.can_play_on_center_stack(None, Suit.HEARTS) == True  # Any ace on empty stack
    assert ace_clubs.can_play_on_center_stack(None, Suit.CLUBS) == True
    
    # Can place 2 on Ace (same suit)
    two = Card(Suit.HEARTS, Rank.TWO)
    assert two.can_play_on_center_stack(ace_hearts, Suit.HEARTS) == True
    
    # Cannot place 3 on Ace (must be sequential)
    three = Card(Suit.HEARTS, Rank.THREE)
    assert three.can_play_on_center_stack(ace_hearts, Suit.HEARTS) == False
    
    # Cannot place different suit on non-empty stack
    spade_two = Card(Suit.SPADES, Rank.TWO)
    assert spade_two.can_play_on_center_stack(ace_hearts, Suit.HEARTS) == False


def test_card_personal_stack_validation():
    """Test personal stack placement validation"""
    # Can place any card on empty stack
    king = Card(Suit.HEARTS, Rank.KING)
    assert king.can_play_on_personal_stack(None) == True
    
    # Can place red Queen on black King (descending, alternating colors)
    queen = Card(Suit.DIAMONDS, Rank.QUEEN)
    assert queen.can_play_on_personal_stack(king) == False  # King is red, Queen is red - same color!
    
    # Can place red Queen on black King
    black_king = Card(Suit.SPADES, Rank.KING)
    assert queen.can_play_on_personal_stack(black_king) == True
    
    # Cannot place non-sequential card
    jack = Card(Suit.CLUBS, Rank.JACK)
    assert jack.can_play_on_personal_stack(black_king) == False

