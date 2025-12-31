from typing import Dict, List, Optional, Tuple
from app.game.card import Card, Suit, Rank
from app.game.deck import Deck
import copy


class PlayerState:
    """Represents a player's game state"""
    def __init__(self, player_id: int, position: int):
        self.player_id = player_id
        self.position = position
        self.score: List[int] = []  # Array of round scores, total score is sum of this array
        
        # Personal deck (33 cards)
        self.deck: List[Card] = []
        self.deck_page: int = 0  # Current page index (0 = no cards, 1 = first 3 cards, etc.)
        
        # Nerts pile (13 cards)
        self.nerts_pile: List[Card] = []
        
        # Personal stacks (6 stacks, 1 card each initially)
        self.personal_stacks: List[List[Card]] = [[] for _ in range(6)]
        
        # Cards that have been scored to the center
        self.scored_cards: List[Card] = []

    def to_dict(self, include_private: bool = False) -> dict:
        """Convert to dictionary. include_private=False hides opponent's cards"""
        data = {
            'player_id': self.player_id,
            'position': self.position,
            'score': self.score,
            'nerts_pile_count': len(self.nerts_pile),
            'personal_stacks': [
                [card.to_dict() for card in stack] if include_private
                else [stack[-1].to_dict()] if stack else []
                for stack in self.personal_stacks
            ],
        }
        
        if include_private:
            data['deck'] = [card.to_dict() for card in self.deck]
            data['deck_page'] = self.deck_page
            data['nerts_pile'] = [card.to_dict() for card in self.nerts_pile]
            data['scored_cards'] = [card.to_dict() for card in self.scored_cards]
        
        return data

    @classmethod
    def from_dict(cls, data: dict) -> 'PlayerState':
        """Reconstruct from dictionary"""
        player_state = cls(data['player_id'], data['position'])
        player_state.score = data.get('score', [])  # Array of round scores
        
        if 'deck' in data:
            player_state.deck = [Card.from_dict(c) for c in data['deck']]
        if 'deck_page' in data:
            player_state.deck_page = data['deck_page']
        if 'nerts_pile' in data:
            player_state.nerts_pile = [Card.from_dict(c) for c in data['nerts_pile']]
        if 'personal_stacks' in data:
            player_state.personal_stacks = [
                [Card.from_dict(c) for c in stack] for stack in data['personal_stacks']
            ]
        if 'scored_cards' in data:
            player_state.scored_cards = [Card.from_dict(c) for c in data['scored_cards']]
        
        return player_state


class GameEngine:
    """Core game logic engine for Nerts"""
    
    WINNING_SCORE = 100
    
    def __init__(self, game_id: int, player_ids: List[int]):
        self.game_id = game_id
        self.current_round = 1
        self.status = 'waiting'  # waiting, active, finished
        self.winner_id: Optional[int] = None
        self.first_nerts_caller: Optional[int] = None  # Track who called nerts first in current round
        
        # Center shared stacks (4 stacks, one per suit, A→K)
        self.center_stacks: Dict[Suit, List[Card]] = {
            suit: [] for suit in Suit
        }
        
        # Player states
        self.players: Dict[int, PlayerState] = {}
        for i, player_id in enumerate(player_ids):
            self.players[player_id] = PlayerState(player_id, i)
    
    def start_round(self):
        """Initialize a new round with card distribution"""
        self.status = 'active'
        
        # Reset center stacks
        self.center_stacks = {suit: [] for suit in Suit}
        
        # Reset first nerts caller for new round
        self.first_nerts_caller = None
        
        # Deal cards to each player
        for player_id, player_state in self.players.items():
            # Create and shuffle a deck for this player
            deck = Deck()
            deck.shuffle()
            
            # Deal 6 cards to personal stacks (1 per stack)
            for i in range(6):
                card = deck.draw()
                if card:
                    player_state.personal_stacks[i] = [card]
            
            # Deal 13 cards to Nerts pile
            player_state.nerts_pile = deck.deal(13)
            
            # Remaining 33 cards go to personal deck
            player_state.deck = deck.cards
            player_state.deck_page = 0  # Start at page 0 (no cards displayed)
            
            # Reset scored cards for new round
            player_state.scored_cards = []
            
            # Score array persists across rounds, new round score will be added when calling nerts
    
    def draw_deck(self, player_id: int) -> bool:
        """Draw/reveal cards from player's deck using page-based system. Returns True if successful"""
        if player_id not in self.players:
            return False
        
        player = self.players[player_id]
        
        # If deck is empty, nothing to do
        if not player.deck:
            return False
        
        # Calculate number of pages (each page is 3 cards)
        # Page 0 = no cards displayed, Page 1 = first 3 cards, etc.
        cards_per_page = 3
        total_pages = (len(player.deck) + cards_per_page - 1) // cards_per_page  # Ceiling division
        current_page = player.deck_page
        
        # Move to next page
        if current_page == 0:
            # From page 0 (hidden), go to page 1 (first cards)
            next_page = 1
        elif current_page >= total_pages:
            # At or beyond last page, go back to page 0 (hidden)
            next_page = 0
        else:
            # Move to next page
            next_page = current_page + 1
            # If we've reached beyond the last page, go to page 0
            if next_page > total_pages:
                next_page = 0
        
        player.deck_page = next_page
        return True
    
    def get_playable_card(self, player_id: int) -> Optional[Card]:
        """Get the currently playable card from deck (top of current page)"""
        if player_id not in self.players:
            return None
        player = self.players[player_id]
        
        if not player.deck or player.deck_page == 0:
            return None
        
        # Page 1+ shows cards: page 1 = cards 0-2, page 2 = cards 3-5, etc.
        cards_per_page = 3
        page_start = (player.deck_page - 1) * cards_per_page
        page_end = min(page_start + cards_per_page, len(player.deck))
        current_page_cards = player.deck[page_start:page_end]
        
        return current_page_cards[-1] if current_page_cards else None
    
    def remove_card_from_deck(self, player_id: int, card: Card) -> bool:
        """Remove a card from the deck. Returns True if found and removed"""
        if player_id not in self.players:
            return False
        player = self.players[player_id]
        
        # Find and remove the card from deck
        try:
            card_index = player.deck.index(card)
            player.deck.pop(card_index)
            
            # Recalculate page if needed
            cards_per_page = 3
            total_pages = (len(player.deck) + cards_per_page - 1) // cards_per_page if player.deck else 0
            if player.deck_page > total_pages:
                # Beyond last page, go to page 0
                player.deck_page = 0
            elif player.deck_page > 0 and total_pages == 0:
                # No cards left, go to page 0
                player.deck_page = 0
            
            return True
        except ValueError:
            return False
    
    def play_card_to_center(self, player_id: int, card: Card, suit: Suit) -> Tuple[bool, str]:
        """Play a card to a center stack. Returns (success, message)"""
        if player_id not in self.players:
            return False, "Invalid player"
        
        stack = self.center_stacks[suit]
        top_card = stack[-1] if stack else None
        
        if not card.can_play_on_center_stack(top_card, suit):
            return False, "Invalid move: card cannot be played on this center stack"
        
        # Remove card from player's area
        removed = self._remove_card_from_player(player_id, card)
        if not removed:
            return False, "Card not found in player's area"
        
        # Add to center stack
        stack.append(card)
        
        # Add card to scored_cards (score will be calculated at end of round)
        self.players[player_id].scored_cards.append(card)
        
        return True, "Card played successfully"
    
    def play_card_to_personal_stack(self, player_id: int, card: Card, stack_index: int) -> Tuple[bool, str]:
        """Play a card to a personal stack. Returns (success, message)"""
        if player_id not in self.players:
            return False, "Invalid player"
        
        if stack_index < 0 or stack_index >= 6:
            return False, "Invalid stack index"
        
        player = self.players[player_id]
        stack = player.personal_stacks[stack_index]
        top_card = stack[-1] if stack else None
        
        if not card.can_play_on_personal_stack(top_card):
            return False, "Invalid move: card cannot be played on this personal stack"
        
        # Remove card from player's area
        removed = self._remove_card_from_player(player_id, card)
        if not removed:
            return False, "Card not found in player's area"
        
        # Add to personal stack
        stack.append(card)
        
        return True, "Card played successfully"
    
    def _remove_card_from_player(self, player_id: int, card: Card) -> bool:
        """Remove a card from player's area. Returns True if found and removed"""
        player = self.players[player_id]
        
        # Check deck (current page's top card)
        if player.deck and player.deck_page > 0:
            cards_per_page = 3
            page_start = (player.deck_page - 1) * cards_per_page
            page_end = min(page_start + cards_per_page, len(player.deck))
            current_page_cards = player.deck[page_start:page_end]
            if current_page_cards and current_page_cards[-1] == card:
                return self.remove_card_from_deck(player_id, card)
        
        # Check Nerts pile (score will be calculated at end of round)
        if card in player.nerts_pile:
            player.nerts_pile.remove(card)
            return True
        
        # Check personal stacks (can remove from top of any stack)
        for stack in player.personal_stacks:
            if stack and stack[-1] == card:
                stack.pop()
                return True
        
        return False
    
    def move_stack_sequence(self, player_id: int, from_stack: int, to_stack: int, count: int) -> Tuple[bool, str]:
        """Move a sequence of cards from one personal stack to another"""
        if player_id not in self.players:
            return False, "Invalid player"
        
        if from_stack < 0 or from_stack >= 6 or to_stack < 0 or to_stack >= 6:
            return False, "Invalid stack index"
        
        if from_stack == to_stack:
            return False, "Cannot move to same stack"
        
        player = self.players[player_id]
        source = player.personal_stacks[from_stack]
        target = player.personal_stacks[to_stack]
        
        if len(source) < count:
            return False, "Not enough cards in source stack"
        
        # Get the sequence to move
        sequence = source[-count:]
        
        # Validate the sequence can be moved (must be valid descending sequence)
        for i in range(len(sequence) - 1):
            if not sequence[i].can_play_on_personal_stack(sequence[i + 1]):
                return False, "Invalid sequence: cards must form a valid descending sequence"
        
        # Check if sequence can be placed on target
        top_target = target[-1] if target else None
        if not sequence[-1].can_play_on_personal_stack(top_target):
            return False, "Sequence cannot be placed on target stack"
        
        # Move the cards
        player.personal_stacks[from_stack] = source[:-count]
        player.personal_stacks[to_stack] = target + sequence
        
        return True, "Sequence moved successfully"
    
    def call_nerts(self, player_id: int) -> Tuple[bool, str]:
        """Player calls NERTS! to end the round. Returns (success, message)"""
        if player_id not in self.players:
            return False, "Invalid player"
        
        player = self.players[player_id]
        
        if player.nerts_pile:
            return False, "Nerts pile must be empty to call NERTS!"
        
        # Track first caller for 40 point bonus
        if self.first_nerts_caller is None:
            self.first_nerts_caller = player_id
        
        # End the round
        self._end_round()
        
        return True, "NERTS! Round ended"
    
    def _calculate_round_score(self, player: PlayerState) -> int:
        """Calculate the current round's score based on nerts pile and scored cards"""
        nerts_pile_count = len(player.nerts_pile)
        scored_cards_count = len(player.scored_cards)
        return nerts_pile_count * -2 + scored_cards_count
    
    def _end_round(self):
        """End the current round and calculate scores"""
        # Calculate round score for each player and add to their score array
        for player_id, player in self.players.items():
            round_score = self._calculate_round_score(player)
            
            # Add 40 point bonus for first player to call nerts
            if player_id == self.first_nerts_caller:
                round_score += 40
            
            player.score.append(round_score)
        
        # Check for winner (100 points total)
        for player_id, player in self.players.items():
            total_score = sum(player.score)
            if total_score >= self.WINNING_SCORE:
                self.status = 'finished'
                self.winner_id = player_id
                return
        
        # If no winner, start next round
        self.current_round += 1
        self.start_round()
    
    def get_game_state(self, requesting_player_id: Optional[int] = None) -> dict:
        """Get the full game state. requesting_player_id determines what's visible"""
        include_private = requesting_player_id is not None
        
        return {
            'game_id': self.game_id,
            'current_round': self.current_round,
            'status': self.status,
            'winner_id': self.winner_id,
            'center_stacks': {
                suit.value: [card.to_dict() for card in stack]
                for suit, stack in self.center_stacks.items()
            },
            'players': {
                player_id: player.to_dict(include_private=(include_private and player_id == requesting_player_id))
                for player_id, player in self.players.items()
            },
        }
    
    def to_dict(self) -> dict:
        """Serialize game state to dictionary"""
        return {
            'game_id': self.game_id,
            'current_round': self.current_round,
            'status': self.status,
            'winner_id': self.winner_id,
            'first_nerts_caller': self.first_nerts_caller,
            'center_stacks': {
                suit.value: [card.to_dict() for card in stack]
                for suit, stack in self.center_stacks.items()
            },
            'players': {
                player_id: player.to_dict(include_private=True)
                for player_id, player in self.players.items()
            },
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'GameEngine':
        """Deserialize game state from dictionary"""
        player_ids = [int(pid) for pid in data['players'].keys()]
        engine = cls(data['game_id'], player_ids)
        
        engine.current_round = data['current_round']
        engine.status = data['status']
        engine.winner_id = data.get('winner_id')
        engine.first_nerts_caller = data.get('first_nerts_caller')
        
        # Restore center stacks
        for suit_str, cards_data in data['center_stacks'].items():
            suit = Suit(suit_str)
            engine.center_stacks[suit] = [Card.from_dict(c) for c in cards_data]
        
        # Restore player states
        for player_id_str, player_data in data['players'].items():
            player_id = int(player_id_str)
            engine.players[player_id] = PlayerState.from_dict(player_data)
        
        return engine

