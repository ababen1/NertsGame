import { Card, CenterStack, PlayerState } from "../types/game";

export type DragPayload = {
  source: "deck" | "nerts" | "personal";
  fromStack?: number;
  card: Card;
  subCards: Card[]; // Array of cards being dragged (clicked card + all sub cards below it)
};

export type DropTarget =
  | { type: "center"; stack: CenterStack }
  | { type: "personal"; stack: Card[] };

export type PickContext = {
  personalStacks?: Card[][];
  nertsPile?: Card[];
  deckTopCard?: Card | null;
};

export const isRedSuit = (suit: Card["suit"]) =>
  suit === "hearts" || suit === "diamonds";

export const isBlackSuit = (suit: Card["suit"]) => !isRedSuit(suit);

export const canAddToCenterStack = (card: Card, stack: CenterStack) => {
  // If stack is full, cannot add
  if (stack.cards.length == 13) {
    return false;
  }
  // If stack is empty, card can be added if it is an ace (any suit)
  if (stack.cards.length == 0) {
    return card.rank == 1;
  } else {
    // Stack has cards - suit must match and card must follow sequence
    // The stack's suit is determined by the first card (ace)
    if (card.suit != stack.suit) {
      return false;
    }
    // Card can be added if it follows the last card in the stack
    return card.rank - 1 == stack.cards[stack.cards.length - 1].rank;
  }
};

const cardsEqual = (a: Card, b: Card) => a.rank === b.rank && a.suit === b.suit;

export const canPlayOnPersonal = (card: Card, top: Card | undefined | null) => {
  // Empty stacks can accept any card (or stack)
  if (!top) return true;
  // Non-empty stacks: card must be one rank lower and opposite color
  return (
    card.rank === top.rank - 1 && isRedSuit(card.suit) !== isRedSuit(top.suit)
  );
};

export const isDescendingAlternating = (stack: Card[]) => {
  if (stack.length === 0) return false;
  if (stack.length === 1) return true;

  for (let i = 0; i < stack.length - 1; i += 1) {
    const upper = stack[i];
    const lower = stack[i + 1];
    const isDescending = upper.rank === lower.rank + 1;
    const alternatesColor = isRedSuit(upper.suit) !== isRedSuit(lower.suit);
    if (!isDescending || !alternatesColor) return false;
  }
  return true;
};

export const isDraggableStack = (stack: Card[]) =>
  isDescendingAlternating(stack);

export const isPickable = (payload: DragPayload, context: PickContext) => {
  if (payload.source === "personal") {
    if (
      context.personalStacks === undefined ||
      payload.fromStack === undefined
    ) {
      return false;
    }
    const stack = context.personalStacks[payload.fromStack];
    if (!stack || stack.length === 0) return false;

    const count = payload.subCards.length ?? 1;
    if (count < 1 || count > stack.length) return false;

    const startIdx = stack.length - count;
    const sequence = stack.slice(startIdx);
    if (payload.card && !cardsEqual(payload.card, sequence[0])) return false;

    return isDescendingAlternating(sequence);
  }

  if (payload.source === "nerts") {
    if (!context.nertsPile || context.nertsPile.length === 0) return false;
    const top = context.nertsPile[context.nertsPile.length - 1];
    return payload.card ? cardsEqual(payload.card, top) : true;
  }

  if (payload.source === "deck") {
    if (!context.deckTopCard) return false;
    return payload.card ? cardsEqual(payload.card, context.deckTopCard) : true;
  }

  return false;
};

export const isDroppable = (payload: DragPayload, target: DropTarget) => {
  const card = payload.card;
  if (!card) return false;

  if (target.type === "center") {
    // Center stacks only accept single cards that ascend by suit.
    if (payload.subCards && payload.subCards.length > 1) return false;
    return canAddToCenterStack(card, target.stack);
  }

  if (target.type === "personal") {
    const targetTop =
      target.stack.length > 0
        ? target.stack[target.stack.length - 1]
        : undefined;
    return canPlayOnPersonal(card, targetTop);
  }

  return false;
};

export const calculateRoundScore = (player: PlayerState) => {
  const nertsPileCount: number = player.nerts_pile?.length || 0;
  const scoredCardsCount: number = player.scoredCards?.length || 0;
  return nertsPileCount * -2 + scoredCardsCount;
};

export const getTotalScore = (player: PlayerState): number => {
  return player.score.reduce((sum, roundScore) => sum + roundScore, 0);
};

export const getCurrentTotalScore = (player: PlayerState): number => {
  // Sum of completed rounds plus current round's score
  const completedRoundsScore = getTotalScore(player);
  const currentRoundScore = calculateRoundScore(player);
  return completedRoundsScore + currentRoundScore;
};
