export type Suit = "hearts" | "diamonds" | "clubs" | "spades";

export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface Card {
  suit: Suit;
  rank: Rank;
  display: string;
}

export interface CenterStack {
  suit: Suit;
  cards: Card[];
}

export interface PlayerState {
  player_id: number;
  position: number;
  score: number[]; // Array of round scores, total score is sum of this array
  nerts_pile_count: number;
  personal_stacks: Card[][];
  // Private fields (only for own player)
  deck?: Card[];
  deck_page?: number; // Current page index (0-based, each page is 3 cards)
  nerts_pile?: Card[];
  scoredCards?: Card[]; // Cards that have been scored to the center
}

export interface GameState {
  game_id: number;
  current_round: number;
  status: "waiting" | "active" | "finished";
  winner_id: number | null;
  center_stacks: {
    [key in Suit]: Card[];
  };
  players: {
    [playerId: string]: PlayerState;
  };
}

export interface Game {
  id: number;
  status: string;
  max_players: number;
  current_round: number;
  winner_id: number | null;
  owner_id: number | null;
  name: string | null;
  players: GamePlayer[];
}

export interface GamePlayer {
  id: number;
  game_id: number;
  player_id: number;
  position: number;
  score: number;
  is_ready: boolean;
  player: Player | null;
}

export interface Player {
  id: number;
  username: string;
  email?: string | null;
}

export interface LobbyState {
  game_id: number;
  name: string | null;
  owner_id: number | null;
  players: Array<{
    player_id: number;
    username: string | null;
    is_ready: boolean;
    position: number;
  }>;
}
