from enum import Enum
from typing import Optional


class Suit(Enum):
    """Card suits"""
    HEARTS = 'hearts'
    DIAMONDS = 'diamonds'
    CLUBS = 'clubs'
    SPADES = 'spades'

    def is_red(self) -> bool:
        return self in [Suit.HEARTS, Suit.DIAMONDS]

    def is_black(self) -> bool:
        return self in [Suit.CLUBS, Suit.SPADES]


class Rank(Enum):
    """Card ranks with numeric values"""
    ACE = 1
    TWO = 2
    THREE = 3
    FOUR = 4
    FIVE = 5
    SIX = 6
    SEVEN = 7
    EIGHT = 8
    NINE = 9
    TEN = 10
    JACK = 11
    QUEEN = 12
    KING = 13

    @property
    def display(self) -> str:
        """Get display string for rank"""
        display_map = {
            1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
            8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K'
        }
        return display_map[self.value]

    def __int__(self):
        return self.value


class Card:
    """Represents a playing card"""
    def __init__(self, suit: Suit, rank: Rank):
        self.suit = suit
        self.rank = rank

    def __eq__(self, other):
        if not isinstance(other, Card):
            return False
        return self.suit == other.suit and self.rank == other.rank

    def __hash__(self):
        return hash((self.suit, self.rank))

    def __repr__(self):
        return f'Card({self.rank.display}{self.suit.value[0].upper()})'

    def to_dict(self):
        return {
            'suit': self.suit.value,
            'rank': self.rank.value,
            'display': f'{self.rank.display}{self.suit.value[0].upper()}',
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'Card':
        suit = Suit(data['suit'])
        # Find rank by value - data['rank'] should be an integer
        rank_value = data['rank']
        rank = next((r for r in Rank if r.value == rank_value), None)
        if rank is None:
            raise ValueError(f"Invalid rank value: {rank_value}")
        return cls(suit, rank)

    def can_play_on_center_stack(self, top_card: Optional['Card'], target_suit: Suit) -> bool:
        """Check if this card can be played on a center stack (A→K, same suit). Must start with matching Ace."""
        if self.suit != target_suit:
            return False
        if top_card is None:
            return self.rank == Rank.ACE
        return int(self.rank) == int(top_card.rank) + 1

    def can_play_on_personal_stack(self, top_card: Optional['Card']) -> bool:
        """Check if this card can be played on a personal stack (K→2, alternating colors)"""
        if top_card is None:
            return True  # Can always play on empty stack
        # Must be descending (K→2) and alternate colors
        return (int(self.rank) == int(top_card.rank) - 1 and
                self.suit.is_red() != top_card.suit.is_red())

