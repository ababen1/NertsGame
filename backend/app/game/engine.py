from typing import Dict, List, Optional, Tuple
from app.game.card import Card, Suit, Rank
from app.game.deck import Deck
import copy


class PlayerState:
    """Represents a player's game state"""
    def __init__(self, player_id: int, position: int):
        self.player_id = player_id
        self.position = position
        self.score = 0
        
        # Personal deck (33 cards)
        self.deck: List[Card] = []
        self.deck_display: List[Card] = []  # Top 3 visible cards (only last is playable)
        self.deck_used: List[Card] = []  # Cards that have been used from deck
        
        # Nerts pile (13 cards)
        self.nerts_pile: List[Card] = []
        
        # Personal stacks (6 stacks, 1 card each initially)
        self.personal_stacks: List[List[Card]] = [[] for _ in range(6)]

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
            data['deck_display'] = [card.to_dict() for card in self.deck_display]
            data['deck_used'] = [card.to_dict() for card in self.deck_used]
            data['nerts_pile'] = [card.to_dict() for card in self.nerts_pile]
        else:
            # Only show deck size and top visible card
            data['deck_size'] = len(self.deck) + len(self.deck_used)
            data['deck_display'] = [self.deck_display[-1].to_dict()] if self.deck_display else []
        
        return data

    @classmethod
    def from_dict(cls, data: dict) -> 'PlayerState':
        """Reconstruct from dictionary"""
        player_state = cls(data['player_id'], data['position'])
        player_state.score = data['score']
        
        if 'deck' in data:
            player_state.deck = [Card.from_dict(c) for c in data['deck']]
        if 'deck_display' in data:
            player_state.deck_display = [Card.from_dict(c) for c in data['deck_display']]
        if 'deck_used' in data:
            player_state.deck_used = [Card.from_dict(c) for c in data['deck_used']]
        if 'nerts_pile' in data:
            player_state.nerts_pile = [Card.from_dict(c) for c in data['nerts_pile']]
        if 'personal_stacks' in data:
            player_state.personal_stacks = [
                [Card.from_dict(c) for c in stack] for stack in data['personal_stacks']
            ]
        
        return player_state


class GameEngine:
    """Core game logic engine for Nerts"""
    
    WINNING_SCORE = 100
    
    def __init__(self, game_id: int, player_ids: List[int]):
        self.game_id = game_id
        self.current_round = 1
        self.status = 'waiting'  # waiting, active, finished
        self.winner_id: Optional[int] = None
        
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
            player_state.deck_display = []
            player_state.deck_used = []
    
    def draw_deck(self, player_id: int) -> bool:
        """Draw/reveal cards from player's deck. Returns True if successful"""
        if player_id not in self.players:
            return False
        
        player = self.players[player_id]
        
        # If deck is empty, cycle used cards back
        if not player.deck:
            if not player.deck_used:
                return False  # No cards available
            # recycle in the same order they were used (no shuffle)
            player.deck = player.deck_used
            player.deck_used = []
        
        # Draw up to 3 cards (or remaining cards)
        cards_to_draw = min(3, len(player.deck))
        if cards_to_draw == 0:
            return False
        
        # Add to display (only top card is playable)
        player.deck_display = player.deck[:cards_to_draw]
        
        return True
    
    def get_playable_card(self, player_id: int) -> Optional[Card]:
        """Get the currently playable card from deck (top of display)"""
        if player_id not in self.players:
            return None
        player = self.players[player_id]
        return player.deck_display[-1] if player.deck_display else None
    
    def use_deck_card(self, player_id: int) -> bool:
        """Move the playable card from deck display to used pile"""
        if player_id not in self.players:
            return False
        player = self.players[player_id]
        
        if not player.deck_display:
            return False
        
        # Remove top card from display and deck
        used_card = player.deck_display.pop()
        if player.deck:
            player.deck.pop(0)
        
        # Add to used pile
        player.deck_used.append(used_card)
        
        # Update display if there are more cards
        if player.deck:
            player.deck_display = player.deck[:min(3, len(player.deck))]
        else:
            player.deck_display = []
        
        return True
    
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
        
        # Award point
        self.players[player_id].score += 1
        
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
        
        # Check deck display (playable card)
        if player.deck_display and player.deck_display[-1] == card:
            self.use_deck_card(player_id)
            return True
        
        # Check Nerts pile
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
        
        # End the round
        self._end_round()
        
        return True, "NERTS! Round ended"
    
    def _end_round(self):
        """End the current round and calculate scores"""
        # Calculate penalties for remaining cards in Nerts piles
        for player_id, player in self.players.items():
            penalty = len(player.nerts_pile) * -2
            player.score += penalty
        
        # Check for winner
        for player_id, player in self.players.items():
            if player.score >= self.WINNING_SCORE:
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
        
        # Restore center stacks
        for suit_str, cards_data in data['center_stacks'].items():
            suit = Suit(suit_str)
            engine.center_stacks[suit] = [Card.from_dict(c) for c in cards_data]
        
        # Restore player states
        for player_id_str, player_data in data['players'].items():
            player_id = int(player_id_str)
            engine.players[player_id] = PlayerState.from_dict(player_data)
        
        return engine

