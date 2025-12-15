import { useCallback, useEffect, useState } from "react";
import { Card, GameState, Rank, Suit } from "../types/game";

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

function isRed(suit: Suit) {
  return suit === "hearts" || suit === "diamonds";
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

function canPlayOnPersonal(card: Card, top: Card | undefined | null) {
  if (!top) return true;
  return card.rank === top.rank - 1 && isRed(card.suit) !== isRed(top.suit);
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
    const visible = remainingDeck.slice(0, Math.min(3, remainingDeck.length));

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
          deck_size: remainingDeck.length + 0, // deck + deck_used
          deck_display: visible,
          deck: remainingDeck.slice(0), // full deck for private view
          deck_used: [],
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
      const deck = [...(player.deck || [])];
      const used = [...(player.deck_used || [])];

      // If both deck and used are empty, nothing to do
      if (deck.length === 0 && used.length === 0) return prev;

      // If deck is empty but we have used cards, recycle them
      if (deck.length === 0 && used.length > 0) {
        const recycled = [...used]; // keep order
        return {
          ...prev,
          players: {
            ...prev.players,
            [playerId]: {
              ...player,
              deck: recycled,
              deck_used: [],
              deck_display: recycled.slice(0, Math.min(3, recycled.length)),
              deck_size: recycled.length,
            },
          },
        };
      }

      // Normal case: draw from deck
      const display = deck.slice(0, Math.min(3, deck.length));
      const remaining = deck.slice(display.length);
      return {
        ...prev,
        players: {
          ...prev.players,
          [playerId]: {
            ...player,
            deck: remaining,
            deck_display: display,
            deck_size: remaining.length + used.length, // deck + deck_used
          },
        },
      };
    });
  }, [playerId]);

  const useDeckTop = (state: GameState, pid: number) => {
    const player = state.players[pid];
    if (!player.deck_display || player.deck_display.length === 0) return state;
    const display = [...player.deck_display];
    const used = [...(player.deck_used || [])];
    const deck = [...(player.deck || [])];
    const played = display.pop() as Card;
    // remove from deck (it corresponds to the top slice)
    deck.shift();
    used.push(played);
    const newDisplay = deck.slice(0, Math.min(3, deck.length));
    return {
      ...state,
      players: {
        ...state.players,
        [pid]: {
          ...player,
          deck,
          deck_used: used,
          deck_display: newDisplay,
          deck_size: deck.length + used.length, // deck + deck_used
        },
      },
    };
  };

  const removeFromPlayer = (state: GameState, pid: number, card: Card) => {
    let s = state;
    // deck top
    const player = s.players[pid];
    if (player.deck_display && player.deck_display.length > 0) {
      const top = player.deck_display[player.deck_display.length - 1];
      if (top.suit === card.suit && top.rank === card.rank) {
        return useDeckTop(s, pid);
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
        // validate sequence descending alternating
        for (let i = 0; i < seq.length - 1; i += 1) {
          if (!canPlayOnPersonal(seq[i], seq[i + 1])) return prev;
        }
        const targetTop = target[target.length - 1];
        if (!canPlayOnPersonal(seq[0], targetTop)) return prev;
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
