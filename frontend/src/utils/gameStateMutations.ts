import { Card, GameState, Suit } from "../types/game";
import {
  canPlayOnPersonal,
  isDescendingAlternating,
} from "./solitiareFuncs";

function canPlayOnCenter(
  card: Card,
  top: Card | undefined | null,
  _target: Suit
) {
  if (!top) return card.rank === 1;
  if (card.suit !== top.suit) return false;
  return card.rank === top.rank + 1;
}

function removeCardFromDeck(
  state: GameState,
  pid: number,
  card: Card
): GameState {
  const key = pid.toString();
  const player = state.players[key];
  if (!player) return state;
  const deck = [...(player.deck || [])];
  const deckPage = player.deck_page || 0;

  const cardIndex = deck.findIndex(
    (c) => c.rank === card.rank && c.suit === card.suit
  );
  if (cardIndex === -1) return state;

  deck.splice(cardIndex, 1);

  const cardsPerPage = 3;
  const totalPages = Math.ceil(deck.length / cardsPerPage);
  let newPage = deckPage;
  if (deckPage > totalPages) {
    newPage = 0;
  } else if (deckPage > 0 && deckPage <= totalPages) {
    newPage = deckPage;
  }

  return {
    ...state,
    players: {
      ...state.players,
      [key]: {
        ...player,
        deck,
        deck_page: newPage,
      },
    },
  };
}

function removeFromPlayer(
  state: GameState,
  pid: number,
  card: Card
): GameState {
  const key = pid.toString();
  const player = state.players[key];
  if (!player) return state;

  const deck = player.deck || [];
  const deckPage = player.deck_page || 0;
  let currentPageCards: Card[] = [];
  if (deckPage > 0) {
    const cardsPerPage = 3;
    const pageStart = (deckPage - 1) * cardsPerPage;
    const pageEnd = Math.min(pageStart + cardsPerPage, deck.length);
    currentPageCards = deck.slice(pageStart, pageEnd);
  }

  if (currentPageCards.length > 0) {
    const topCard = currentPageCards[currentPageCards.length - 1];
    if (topCard.suit === card.suit && topCard.rank === card.rank) {
      return removeCardFromDeck(state, pid, card);
    }
  }

  if (player.nerts_pile) {
    const idx = player.nerts_pile.findIndex(
      (c) => c.rank === card.rank && c.suit === card.suit
    );
    if (idx >= 0) {
      const newPile = [...player.nerts_pile];
      newPile.splice(idx, 1);
      return {
        ...state,
        players: {
          ...state.players,
          [key]: {
            ...player,
            nerts_pile: newPile,
            nerts_pile_count: newPile.length,
          },
        },
      };
    }
  }

  const stacks = player.personal_stacks.map((stack) => [...stack]);
  for (let i = 0; i < stacks.length; i += 1) {
    const stack = stacks[i];
    if (stack.length > 0) {
      const top = stack[stack.length - 1];
      if (top.rank === card.rank && top.suit === card.suit) {
        stack.pop();
        return {
          ...state,
          players: {
            ...state.players,
            [key]: {
              ...player,
              personal_stacks: stacks,
            },
          },
        };
      }
    }
  }
  return state;
}

/** Returns null if the draw is a no-op or invalid. */
export function applyDrawDeck(
  state: GameState,
  playerId: number
): GameState | null {
  const key = playerId.toString();
  const player = state.players[key];
  if (!player) return null;

  const deck = player.deck || [];
  if (deck.length === 0) return null;

  const cardsPerPage = 3;
  const totalPages = Math.ceil(deck.length / cardsPerPage);
  const currentPage = player.deck_page || 0;

  let nextPage: number;
  if (currentPage === 0) {
    nextPage = 1;
  } else if (currentPage >= totalPages) {
    nextPage = 0;
  } else {
    nextPage = currentPage + 1;
    if (nextPage > totalPages) {
      nextPage = 0;
    }
  }

  return {
    ...state,
    players: {
      ...state.players,
      [key]: {
        ...player,
        deck_page: nextPage,
      },
    },
  };
}

/** Returns null if the play is invalid. */
export function applyPlayCard(
  state: GameState,
  playerId: number,
  card: Card,
  targetType: "center" | "personal",
  target: string | number
): GameState | null {
  const key = playerId.toString();
  const player = state.players[key];
  if (!player) return null;

  if (targetType === "center") {
    const stackIndex = target as number;
    const stacks = state.center_stacks.map((s) => [...s]);
    const stack = stacks[stackIndex];
    if (!stack) return null;
    const top = stack.length > 0 ? stack[stack.length - 1] : undefined;
    if (!canPlayOnCenter(card, top, card.suit)) return null;

    let next = removeFromPlayer(state, playerId, card);
    stacks[stackIndex] = [...stack, card];
    const currentPlayer = next.players[key];
    return {
      ...next,
      center_stacks: stacks,
      players: {
        ...next.players,
        [key]: {
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
    if (!canPlayOnPersonal(card, top)) return null;

    const next = removeFromPlayer(state, playerId, card);
    const newStacks = next.players[key].personal_stacks.map((s, i) =>
      i === idx ? [...s, card] : s
    );
    return {
      ...next,
      players: {
        ...next.players,
        [key]: {
          ...next.players[key],
          personal_stacks: newStacks,
        },
      },
    };
  }

  return null;
}

/** Returns null if the move is invalid. */
export function applyMoveStack(
  state: GameState,
  playerId: number,
  from: number,
  to: number,
  count = 1
): GameState | null {
  const key = playerId.toString();
  const player = state.players[key];
  if (!player) return null;

  const source = [...player.personal_stacks[from]];
  const target = [...player.personal_stacks[to]];
  if (source.length < count) return null;

  const seq = source.slice(source.length - count);
  if (!isDescendingAlternating(seq)) return null;

  const targetTop =
    target.length > 0 ? target[target.length - 1] : undefined;
  const rootCard = seq[0];
  if (!canPlayOnPersonal(rootCard, targetTop)) return null;

  const newSource = source.slice(0, source.length - count);
  const newTarget = [...target, ...seq];
  const stacks = player.personal_stacks.map((s, i) => {
    if (i === from) return newSource;
    if (i === to) return newTarget;
    return s;
  });

  return {
    ...state,
    players: {
      ...state.players,
      [key]: {
        ...player,
        personal_stacks: stacks,
      },
    },
  };
}
