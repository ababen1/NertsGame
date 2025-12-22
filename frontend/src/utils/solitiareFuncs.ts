import { Card, CenterStack } from "../types/game";

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

export const isDraggableStack = (stack: Card[]) => {
  // Empty stack is not draggable
  if (stack.length === 0) return false;

  // Single card is always draggable
  if (stack.length === 1) return true;

  // Check that each card in the stack can be played on the one below it
  // (descending rank, alternating colors)
  for (let i = 0; i < stack.length - 1; i += 1) {
    const upper = stack[i];
    const lower = stack[i + 1];
    const isDescending = upper.rank === lower.rank - 1; // upper is one rank higher than lower
    const alternatesColor = isRedSuit(upper.suit) !== isRedSuit(lower.suit);
    if (!isDescending || !alternatesColor) return false;
  }
  return true;
};
