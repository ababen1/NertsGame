import { useCallback, useEffect, useRef, useState } from "react";
import { Card, GameState, Rank, Suit } from "../types/game";
import {
  canPlayOnPersonal,
  isDescendingAlternating,
  calculateRoundScore,
  getTotalScore,
} from "../utils/solitiareFuncs";
import { use_debug_spread } from "../utils/constants";

const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const OFFLINE_GAME_STORAGE_KEY = "nertsOfflineGameState";

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

function canPlayOnCenter(
  card: Card,
  top: Card | undefined | null,
  _target: Suit // Target is for placement location, not validation
) {
  // If stack is empty, accept any ace (suit doesn't matter - it will determine the stack's suit)
  if (!top) {
    return card.rank === 1;
  }
  // If stack has cards, suit must match the first card's suit and card must follow sequence
  if (card.suit !== top.suit) return false;
  return card.rank === top.rank + 1;
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
        center_stacks: {
          hearts: [],
          diamonds: [],
          clubs: [],
          spades: [],
        },
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
          setGameState(parsed);
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
      const player = prev.players[playerId];
      const deck = player.deck || [];

      // If deck is empty, nothing to do
      if (deck.length === 0) return prev;

      // Deck UI is paged in chunks of 3 to match physical Nerts draw behavior.
      // Page 0 = no cards displayed, Page 1 = first 3 cards, Page 2 = next 3 cards, etc.
      const cardsPerPage = 3;
      const totalPages = Math.ceil(deck.length / cardsPerPage);
      const currentPage = player.deck_page || 0;

      // Move to next page
      let nextPage: number;
      if (currentPage === 0) {
        // From page 0 (hidden), go to page 1 (first cards)
        nextPage = 1;
      } else if (currentPage >= totalPages) {
        // At or beyond last page, go back to page 0 (hidden)
        nextPage = 0;
      } else {
        // Move to next page
        nextPage = currentPage + 1;
        // If we've reached beyond the last page, go to page 0
        if (nextPage > totalPages) {
          nextPage = 0;
        }
      }

      return {
        ...prev,
        players: {
          ...prev.players,
          [playerId]: {
            ...player,
            deck_page: nextPage,
          },
        },
      };
    });
  }, [playerId]);

  const removeCardFromDeck = (state: GameState, pid: number, card: Card) => {
    const player = state.players[pid];
    const deck = [...(player.deck || [])];
    const deckPage = player.deck_page || 0;

    // Find and remove the card from deck
    const cardIndex = deck.findIndex(
      (c) => c.rank === card.rank && c.suit === card.suit
    );

    if (cardIndex === -1) return state;

    // Remove the card
    deck.splice(cardIndex, 1);

    // Keep deck_page in range after removal so UI never points to a non-existent page.
    // Page 0 = no cards, Page 1+ = actual card pages
    const cardsPerPage = 3;
    const totalPages = Math.ceil(deck.length / cardsPerPage);
    let newPage = deckPage;

    // If current page is beyond available pages, adjust it
    if (deckPage > totalPages) {
      // Beyond last page, go to page 0 (no cards displayed)
      newPage = 0;
    } else if (deckPage > 0 && deckPage <= totalPages) {
      // On a valid page, stay on it (page number doesn't change when removing a card)
      newPage = deckPage;
    }
    // If deckPage is 0, keep it at 0

    return {
      ...state,
      players: {
        ...state.players,
        [pid]: {
          ...player,
          deck,
          deck_page: newPage,
        },
      },
    };
  };

  const removeFromPlayer = (state: GameState, pid: number, card: Card) => {
    let s = state;
    const player = s.players[pid];

    // Source precedence matters for matching gameplay:
    // 1) current visible deck top, 2) nerts pile, 3) top cards of personal stacks.
    // This ensures we only remove legal, currently playable cards from each source.
    // Check if card is in deck (check current page's top card)
    // Page 0 = no cards displayed, Page 1+ = actual card pages
    const deck = player.deck || [];
    const deckPage = player.deck_page || 0;
    let currentPageCards: Card[] = [];
    if (deckPage > 0) {
      // Page 1+ shows cards: page 1 = cards 0-2, page 2 = cards 3-5, etc.
      const cardsPerPage = 3;
      const pageStart = (deckPage - 1) * cardsPerPage;
      const pageEnd = Math.min(pageStart + cardsPerPage, deck.length);
      currentPageCards = deck.slice(pageStart, pageEnd);
    }
    // Page 0 shows nothing (currentPageCards is empty array)

    if (currentPageCards.length > 0) {
      const topCard = currentPageCards[currentPageCards.length - 1];
      if (topCard.suit === card.suit && topCard.rank === card.rank) {
        return removeCardFromDeck(s, pid, card);
      }
    }

    // nerts - removing a card from nerts pile (no score change during round, calculated at end)
    if (player.nerts_pile) {
      const idx = player.nerts_pile.findIndex(
        (c) => c.rank === card.rank && c.suit === card.suit
      );
      if (idx >= 0) {
        const newPile = [...player.nerts_pile];
        newPile.splice(idx, 1);
        return {
          ...s,
          players: {
            ...s.players,
            [pid]: {
              ...player,
              nerts_pile: newPile,
              nerts_pile_count: newPile.length,
            },
          },
        };
      }
    }
    // personal stacks
    const stacks = player.personal_stacks.map((stack) => [...stack]);
    for (let i = 0; i < stacks.length; i += 1) {
      const stack = stacks[i];
      if (stack.length > 0) {
        const top = stack[stack.length - 1];
        if (top.rank === card.rank && top.suit === card.suit) {
          stack.pop();
          return {
            ...s,
            players: {
              ...s.players,
              [pid]: {
                ...player,
                personal_stacks: stacks,
              },
            },
          };
        }
      }
    }
    return s;
  };

  const playCard = useCallback(
    (
      card: Card,
      targetType: "center" | "personal",
      target: string | number
    ) => {
      setGameState((prev) => {
        if (!prev) return prev;
        const player = prev.players[playerId];
        let next = prev;
        if (targetType === "center") {
          const suit = target as Suit; // This is the slot's suit key (where the card was dropped)
          const stack = prev.center_stacks[suit];
          const top = stack.length > 0 ? stack[stack.length - 1] : undefined;
          // Validation: canPlayOnCenter checks suit against top card's suit (if exists) or allows any ace if empty
          // The suit parameter is just for placement location, not validation
          if (!canPlayOnCenter(card, top, suit)) return prev;
          // Remove from whichever source currently owns this card, then append to center.
          next = removeFromPlayer(next, playerId, card);
          const newStack = [...stack, card];
          const currentPlayer = next.players[playerId];
          return {
            ...next,
            center_stacks: { ...next.center_stacks, [suit]: newStack },
            players: {
              ...next.players,
              [playerId]: {
                ...currentPlayer,
                scoredCards: [...(currentPlayer.scoredCards || []), card],
              },
            },
          };
        }
        if (targetType === "personal") {
          const idx = target as number;
          const stack = player.personal_stacks[idx] || [];
          const top = stack[stack.length - 1];
          if (!canPlayOnPersonal(card, top)) return prev;
          // Same ownership removal logic as center plays; destination differs.
          next = removeFromPlayer(next, playerId, card);
          const newStacks = next.players[playerId].personal_stacks.map((s, i) =>
            i === idx ? [...s, card] : s
          );
          return {
            ...next,
            players: {
              ...next.players,
              [playerId]: {
                ...next.players[playerId],
                personal_stacks: newStacks,
              },
            },
          };
        }
        return prev;
      });
    },
    [playerId]
  );

  const moveStack = useCallback(
    (from: number, to: number, count = 1) => {
      setGameState((prev) => {
        if (!prev) return prev;
        const player = prev.players[playerId];
        const source = [...player.personal_stacks[from]];
        const target = [...player.personal_stacks[to]];
        if (source.length < count) return prev;
        const seq = source.slice(source.length - count);
        // Internal stack moves must move a valid descending/alternating run.
        if (!isDescendingAlternating(seq)) return prev;
        // Check if bottom card of sequence can be placed on target
        const targetTop =
          target.length > 0 ? target[target.length - 1] : undefined;
        const rootCard = seq[0];
        if (!canPlayOnPersonal(rootCard, targetTop)) return prev;
        const newSource = source.slice(0, source.length - count);
        const newTarget = [...target, ...seq];
        const stacks = player.personal_stacks.map((s, i) => {
          if (i === from) return newSource;
          if (i === to) return newTarget;
          return s;
        });
        return {
          ...prev,
          players: {
            ...prev.players,
            [playerId]: {
              ...player,
              personal_stacks: stacks,
            },
          },
        };
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
      center_stacks: {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: [],
      },
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
