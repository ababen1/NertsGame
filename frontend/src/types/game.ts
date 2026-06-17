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
  deck?: Card[];
  deck_page?: number;
  nerts_pile?: Card[];
  scoredCards?: Card[];
}

export interface GameState {
  game_id: number;
  current_round: number;
  status: "waiting" | "active" | "finished";
  winner_id: number | null;
  center_stacks: Card[][];
  players: {
    [playerId: string]: PlayerState;
  };
}

export interface GamePlayer {
  id: number;
  game_id: number;
  device_id: string;
  display_name: string;
  position: number;
  score: number;
  is_ready: boolean;
  /** Room participant id (same as `id`; used by game engine / websocket) */
  player_id: number;
}

export interface Game {
  id: number;
  room_code: string;
  is_private: boolean;
  status: string;
  max_players: number;
  current_round: number;
  winner_id: number | null;
  owner_id: number | null;
  name: string | null;
  players: GamePlayer[];
}

export interface LobbyPlayer {
  player_id: number;
  device_id: string;
  display_name: string;
  /** @deprecated use display_name */
  username: string | null;
  is_ready: boolean;
  position: number;
}

export interface LobbyState {
  game_id: number;
  room_code?: string;
  name: string | null;
  owner_id: number | null;
  players: LobbyPlayer[];
}
