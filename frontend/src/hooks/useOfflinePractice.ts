import { useCallback, useEffect, useRef, useState } from "react";
import { Card, GameState, Rank, Suit } from "../types/game";
import {
  calculateRoundScore,
  getTotalScore,
} from "../utils/solitiareFuncs";
import {
  applyDrawDeck,
  applyMoveStack,
  applyPlayCard,
} from "../utils/gameStateMutations";
import { use_debug_spread } from "../utils/constants";

const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const OFFLINE_GAME_STORAGE_KEY = "nertsOfflineGameState";
const STACKS_PER_PLAYER = 4;

function emptyCenterStacks(playerCount: number): Card[][] {
  return Array.from({ length: STACKS_PER_PLAYER * playerCount }, () => []);
}

function normalizeCenterStacks(
  centerStacks: GameState["center_stacks"] | Record<Suit, Card[]>,
  playerCount: number
): Card[][] {
  const expected = STACKS_PER_PLAYER * playerCount;
  if (Array.isArray(centerStacks)) {
    const stacks = centerStacks.map((s) => [...s]);
    while (stacks.length < expected) stacks.push([]);
    return stacks.slice(0, expected);
  }
  const stacks = emptyCenterStacks(playerCount);
  SUITS.forEach((suit, i) => {
    if (i < stacks.length && centerStacks[suit]) {
      stacks[i] = [...centerStacks[suit]];
    }
  });
  return stacks;
}

function buildDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({
        suit,
        rank,
        display: rankDisplay(rank, suit),
      });
    }
  }
  return cards;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function cardKey(suit: Suit, rank: Rank) {
  return `${suit}:${rank}`;
}

function createInitialDeal(debugSpread: boolean) {
  if (!debugSpread) {
    // Normal mode: random deal that mirrors server-style setup.
    const deck = shuffle(buildDeck());
    const personalStacks: Card[][] = [];
    for (let i = 0; i < 6; i += 1) {
      personalStacks.push([deck.pop() as Card]);
    }
    const nerts = deck.splice(0, 13);
    const remainingDeck = deck; // 33 cards
    return { personalStacks, nerts, remainingDeck };
  } else {
    // Debug mode: deterministic low-card spread + shuffled remainder for easier manual testing.
    const pool = new Map<string, Card>(
      buildDeck().map((card) => [cardKey(card.suit, card.rank), card])
    );

    const take = (suit: Suit, rank: Rank) => {
      const key = cardKey(suit, rank);
      const card = pool.get(key);
      if (!card) {
        throw new Error(`Missing card while building debug spread: ${key}`);
      }
      pool.delete(key);
      return card;
    };

    // Keep low cards immediately accessible so center stacks grow quickly.
    const personalOrder: Card[] = [
      take("clubs", 1),
      take("diamonds", 1),
      take("hearts", 1),
      take("spades", 1),
      take("clubs", 2),
      take("diamonds", 2),
    ];

    const nerts: Card[] = [
      take("hearts", 2),
      take("spades", 2),
      take("clubs", 3),
      take("diamonds", 3),
      take("hearts", 3),
      take("spades", 3),
      take("clubs", 4),
      take("diamonds", 4),
      take("hearts", 4),
      take("spades", 4),
      take("clubs", 5),
      take("diamonds", 5),
      take("hearts", 5),
    ];

    // Whatever cards were not explicitly placed become the draw deck.
    const remainingPool = Array.from(pool.values());
    const remainingDeck = shuffle(remainingPool);
    const arrangedDeck = [
      ...nerts,
      ...remainingDeck,
      ...personalOrder.slice().reverse(),
    ];
    const personalStacks: Card[][] = [];
    for (let i = 0; i < 6; i += 1) {
      personalStacks.push([arrangedDeck.pop() as Card]);
    }

    return {
      personalStacks,
      nerts: arrangedDeck.splice(0, 13),
      remainingDeck: arrangedDeck,
    };
  }
}

function rankDisplay(rank: Rank, suit: Suit) {
  const displayMap: Record<number, string> = {
    1: "A",
    11: "J",
    12: "Q",
    13: "K",
  };
  const value = displayMap[rank] ?? rank.toString();
  return `${value}${suit[0].toUpperCase()}`;
}

export function useOfflinePractice(playerId: number, _playerName: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  // StrictMode can run effects twice in development; these refs prevent duplicate init/load work.
  const isInitializingRef = useRef(false);
  const hasLoadedFromStorageRef = useRef(false);

  const initGame = useCallback(() => {
    setGameState((prev) => {
      // Prevent double initialization in React StrictMode for brand new games
      // If prev is null (brand new game) and we're already initializing, skip
      if (prev === null && isInitializingRef.current) {
        console.log("[OfflinePractice] initGame blocked by ref (brand new game)", {
          timestamp: Date.now(),
        });
        return prev; // Return null to prevent state update
      }

      // Mark as initializing if this is a brand new game
      if (prev === null) {
        isInitializingRef.current = true;
      }
      console.log("[OfflinePractice] initGame called", {
        prevIsNull: prev === null,
        prevRound: prev?.current_round,
        playerId,
        timestamp: Date.now(),
      });

      const { personalStacks, nerts, remainingDeck } =
        createInitialDeal(use_debug_spread);

      // Scores persist across rounds; each entry is one round score.
      const previousScoreArray = prev?.players[playerId]?.score || [];

      // For brand new game (prev === null), start at round 1
      // For new round (after calling nerts), increment from previous round
      // If there are no previous scores and current_round is 1 or less, treat as new game
      // (handles case where initGame is called multiple times before state updates)
      const isNewGame =
        prev === null ||
        (previousScoreArray.length === 0 && prev && prev.current_round <= 1);
      const calculatedRound = isNewGame ? 1 : (prev?.current_round || 0) + 1;
      console.log("[OfflinePractice] Round calculation", {
        prevRound: prev?.current_round,
        calculatedRound,
        isNewGame: prev === null,
        timestamp: Date.now(),
      });

      // Build a full new round state (fresh piles/stacks) while preserving match-level metadata.
      const state: GameState = {
        game_id: 0,
        current_round: calculatedRound,
        status: prev?.status || "active",
        winner_id: prev?.winner_id || null,
        center_stacks: emptyCenterStacks(1),
        players: {
          [playerId]: {
            player_id: playerId,
            position: 0,
            score: previousScoreArray, // Keep previous round scores, new round score will be added when calling nerts
            nerts_pile_count: nerts.length,
            personal_stacks: personalStacks,
            deck: remainingDeck.slice(0), // full deck for private view
            deck_page: 0, // Start at first page
            nerts_pile: nerts,
            scoredCards: [], // Initialize empty array for scored cards
          },
        },
      };
      console.log("[OfflinePractice] initGame returning state", {
        finalRound: state.current_round,
        prevWasNull: prev === null,
        timestamp: Date.now(),
      });
      return state;
    });
  }, [playerId]);

  useEffect(() => {
    // First mount: restore persisted offline game if available, otherwise create a new one.
    if (hasLoadedFromStorageRef.current) return;
    hasLoadedFromStorageRef.current = true;
    try {
      const saved = localStorage.getItem(OFFLINE_GAME_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as GameState;
        if (parsed && parsed.players && parsed.players[playerId]) {
          const playerCount = Object.keys(parsed.players).length;
          setGameState({
            ...parsed,
            center_stacks: normalizeCenterStacks(
              parsed.center_stacks as GameState["center_stacks"] | Record<Suit, Card[]>,
              playerCount
            ),
          });
          return;
        }
      }
    } catch (error) {
      console.warn("[OfflinePractice] Failed to load saved game state", error);
    }

    console.log("[OfflinePractice] useEffect calling initGame", {
      timestamp: Date.now(),
    });
    initGame();
    // Reset the ref after a delay to allow state update to complete
    const timeoutId = setTimeout(() => {
      isInitializingRef.current = false;
    }, 100);
    return () => {
      clearTimeout(timeoutId);
      isInitializingRef.current = false;
    };
  }, [initGame]);

  useEffect(() => {
    if (!gameState) return;
    // Persist after every local state transition so refreshes can resume immediately.
    try {
      localStorage.setItem(OFFLINE_GAME_STORAGE_KEY, JSON.stringify(gameState));
    } catch (error) {
      console.warn("[OfflinePractice] Failed to save game state", error);
    }
  }, [gameState]);

  const drawDeck = useCallback(() => {
    setGameState((prev) => {
      if (!prev) return prev;
      return applyDrawDeck(prev, playerId) ?? prev;
    });
  }, [playerId]);

  const playCard = useCallback(
    (
      card: Card,
      targetType: "center" | "personal",
      target: string | number
    ) => {
      setGameState((prev) => {
        if (!prev) return prev;
        return applyPlayCard(prev, playerId, card, targetType, target) ?? prev;
      });
    },
    [playerId]
  );

  const moveStack = useCallback(
    (from: number, to: number, count = 1) => {
      setGameState((prev) => {
        if (!prev) return prev;
        return applyMoveStack(prev, playerId, from, to, count) ?? prev;
      });
    },
    [playerId]
  );

  const callNerts = useCallback(() => {
    setGameState((prev) => {
      if (!prev) return prev;
      const player = prev.players[playerId];

      // Calculate the current round's score
      let roundScore = calculateRoundScore(player);

      // Add 40 point bonus for first player to call nerts
      // In offline practice, the player always calls nerts first
      roundScore += 40;

      // Round scores are append-only history used to compute total and winner.
      const newScoreArray = [...player.score, roundScore];
      const totalScore = getTotalScore({ ...player, score: newScoreArray });

      // Check for winner (100 points)
      const winnerId = totalScore >= 100 ? playerId : prev.winner_id;
      const newStatus = totalScore >= 100 ? "finished" : prev.status;

      return {
        ...prev,
        status: newStatus,
        winner_id: winnerId,
        players: {
          ...prev.players,
          [playerId]: {
            ...player,
            score: newScoreArray,
          },
        },
      };
    });
    // Start next round immediately (or reset board after finish) using preserved score history.
    initGame();
  }, [initGame, playerId]);

  const restartGame = useCallback(() => {
    try {
      localStorage.removeItem(OFFLINE_GAME_STORAGE_KEY);
    } catch (error) {
      console.warn("[OfflinePractice] Failed to clear saved game state", error);
    }

    // Hard reset: clear persisted session and replace state in one pass
    // to avoid brief null/loading flicker in the UI.
    const { personalStacks, nerts, remainingDeck } =
      createInitialDeal(use_debug_spread);

    isInitializingRef.current = false;
    setGameState({
      game_id: 0,
      current_round: 1,
      status: "active",
      winner_id: null,
      center_stacks: emptyCenterStacks(1),
      players: {
        [playerId]: {
          player_id: playerId,
          position: 0,
          score: [],
          nerts_pile_count: nerts.length,
          personal_stacks: personalStacks,
          deck: remainingDeck.slice(0),
          deck_page: 0,
          nerts_pile: nerts,
          scoredCards: [],
        },
      },
    });
  }, [playerId]);

  return {
    gameState,
    connected: true,
    drawDeck,
    playCard,
    callNerts,
    moveStack,
    restartGame,
  };
}
