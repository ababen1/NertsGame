import random
from typing import List, Optional
from app.game.card import Card, Suit, Rank


class Deck:
    """Represents a standard 52-card deck"""
    def __init__(self, cards: Optional[List[Card]] = None):
        if cards is None:
            self.cards = self._create_standard_deck()
        else:
            self.cards = cards.copy()

    def _create_standard_deck(self) -> List[Card]:
        """Create a standard 52-card deck"""
        deck = []
        for suit in Suit:
            for rank in Rank:
                deck.append(Card(suit, rank))
        return deck

    def shuffle(self):
        """Shuffle the deck"""
        random.shuffle(self.cards)

    def deal(self, count: int) -> List[Card]:
        """Deal a specified number of cards from the top"""
        if count > len(self.cards):
            raise ValueError(f"Cannot deal {count} cards, only {len(self.cards)} available")
        dealt = self.cards[:count]
        self.cards = self.cards[count:]
        return dealt

    def draw(self) -> Optional[Card]:
        """Draw a single card from the top"""
        if not self.cards:
            return None
        return self.cards.pop(0)

    def add_cards(self, cards: List[Card]):
        """Add cards to the bottom of the deck"""
        self.cards.extend(cards)

    def size(self) -> int:
        """Get the number of cards remaining"""
        return len(self.cards)

    def to_dict(self):
        return [card.to_dict() for card in self.cards]

    @classmethod
    def from_dict(cls, data: List[dict]) -> 'Deck':
        cards = [Card.from_dict(card_data) for card_data in data]
        return cls(cards)

