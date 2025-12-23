import { Card, CenterStack } from "../types/game";

export type DragPayload = {
  source: "deck" | "nerts" | "personal";
  fromStack?: number;
  count?: number;
  card?: Card;
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
  // If suit doesn't match or if the stack is full, it cannot be added.
  if (card.suit != stack.suit || stack.cards.length == 13) {
    return false;
  }
  // If stack is empty, card can be added if it is an ace.
  if (stack.cards.length == 0) {
    return card.rank == 1;
  } else {
    // Card can be added if it follows the last card in the stack
    return card.rank + 1 == stack.cards[stack.cards.length - 1].rank;
  }
};

const cardsEqual = (a: Card, b: Card) => a.rank === b.rank && a.suit === b.suit;

const canPlayOnPersonal = (card: Card, top: Card | undefined | null) => {
  // Empty stacks can accept any card (or stack)
  if (!top) return true;
  // Non-empty stacks: card must be one rank lower and opposite color
  return (
    card.rank === top.rank - 1 && isRedSuit(card.suit) !== isRedSuit(top.suit)
  );
};

const isDescendingAlternating = (stack: Card[]) => {
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

    const count = payload.count ?? 1;
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
    if (payload.count && payload.count > 1) return false;
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
