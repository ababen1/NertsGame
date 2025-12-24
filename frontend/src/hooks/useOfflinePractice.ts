import { useCallback, useEffect, useState } from "react";
import { Card, GameState, Rank, Suit } from "../types/game";
import {
  canPlayOnPersonal,
  isDescendingAlternating,
} from "../utils/solitiareFuncs";

const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

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
  target: Suit
) {
  if (card.suit !== target) return false;
  if (!top) return card.rank === 1;
  return card.rank === top.rank + 1;
}

export function useOfflinePractice(playerId: number, _playerName: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);

  const initGame = useCallback(() => {
    const deck = shuffle(buildDeck());
    const personalStacks: Card[][] = [];
    for (let i = 0; i < 6; i += 1) {
      personalStacks.push([deck.pop() as Card]);
    }
    const nerts = deck.splice(0, 13);
    const remainingDeck = deck; // 33 cards

    const state: GameState = {
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
          score: 0,
          nerts_pile_count: nerts.length,
          personal_stacks: personalStacks,
          deck: remainingDeck.slice(0), // full deck for private view
          deck_page: 0, // Start at first page
          nerts_pile: nerts,
        },
      },
    };
    setGameState(state);
  }, [playerId]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const drawDeck = useCallback(() => {
    setGameState((prev) => {
      if (!prev) return prev;
      const player = prev.players[playerId];
      const deck = player.deck || [];

      // If deck is empty, nothing to do
      if (deck.length === 0) return prev;

      // Calculate number of pages (each page is 3 cards)
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

    // Recalculate page if needed (if we removed a card from current page)
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

    // nerts
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
          const suit = target as Suit;
          const stack = prev.center_stacks[suit];
          const top = stack[stack.length - 1];
          if (!canPlayOnCenter(card, top, suit)) return prev;
          next = removeFromPlayer(next, playerId, card);
          const newStack = [...stack, card];
          return {
            ...next,
            center_stacks: { ...next.center_stacks, [suit]: newStack },
            players: {
              ...next.players,
              [playerId]: {
                ...next.players[playerId],
                score: player.score + 1,
              },
            },
          };
        }
        if (targetType === "personal") {
          const idx = target as number;
          const stack = player.personal_stacks[idx] || [];
          const top = stack[stack.length - 1];
          if (!canPlayOnPersonal(card, top)) return prev;
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
        // Validate sequence is descending alternating
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
      const penalty = (player.nerts_pile_count || 0) * -2;
      const updatedScore = player.score + penalty;
      // Restart round
      return {
        ...prev,
        current_round: prev.current_round + 1,
        players: {
          ...prev.players,
          [playerId]: {
            ...player,
            score: updatedScore,
          },
        },
      };
    });
    // new round
    initGame();
  }, [initGame, playerId]);

  return {
    gameState,
    connected: true,
    drawDeck,
    playCard,
    callNerts,
    moveStack,
  };
}
