import { Card, Suit, CenterStack } from "../types/game";
import { cardAssetPath } from "../utils/cardAsset";
import { isDroppable, DropTarget, DragPayload } from "../utils/solitiareFuncs";
import "./CenterStacks.css";
import { useCardDragContext } from "../contexts/CardDragContext";

interface CenterStacksProps {
  centerStacks: {
    [key in Suit]: Card[];
  };
  onCardDrop: (payload: DragPayload | null) => void;
}

export default function CenterStacks({
  centerStacks,
  onCardDrop,
}: CenterStacksProps) {
  const { dragState, cancelDrag, completeDrag } = useCardDragContext();

  const parsePayload = (e: React.DragEvent) => {
    try {
      const data = e.dataTransfer.getData("application/json");
      if (!data) return null;
      return JSON.parse(data) as DragPayload;
    } catch {
      return null;
    }
  };

  // Get all stacks (including empty ones) - show 4 slots
  const allStacks = (Object.keys(centerStacks) as Suit[]).map((suit) => ({
    suit,
    cards: centerStacks[suit],
  }));

  return (
    <div className="center-stacks">
      <div className="stacks-container">
        {allStacks.map(({ suit, cards }) => {
          const topCard = cards.length > 0 ? cards[cards.length - 1] : null;
          // Determine the stack's suit - use first card's suit if stack has cards, otherwise undefined
          const stackSuit = topCard ? topCard.suit : undefined;

          return (
            <div
              key={suit}
              className="center-stack"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();

                // Handle custom drag (click-to-drag)
                if (dragState.isDragging && dragState.payload) {
                  const customPayload = dragState.payload;
                  const card = customPayload.card;
                  
                  // Determine target suit:
                  // - If stack is empty and card is ace, use the slot's suit key (place in this specific slot)
                  // - If stack has cards, use the stack's suit (from first card) for validation
                  let targetSuit: Suit;
                  if (cards.length === 0) {
                    // Empty stack - only accept ace
                    if (card.rank !== 1) {
                      cancelDrag();
                      return;
                    }
                    // Use the slot's suit key (the suit variable from the map) - this is the physical slot
                    targetSuit = suit;
                  } else {
                    // Stack has cards, use its suit (determined by first card) for validation
                    targetSuit = stackSuit!;
                  }
                  
                  // For validation, create a CenterStack with the card's suit if empty (for ace validation)
                  // or the stack's suit if it has cards
                  const validationSuit = cards.length === 0 ? card.suit : stackSuit!;
                  const centerStack: CenterStack = {
                    suit: validationSuit,
                    cards: cards,
                  };
                  const target: DropTarget = {
                    type: "center",
                    stack: centerStack,
                  };
                  if (!isDroppable(customPayload, target)) {
                    // Invalid drop - return card to original position
                    cancelDrag();
                    return;
                  }
                  // Valid drop - use the slot's suit key (where it was dropped) to update the correct stack
                  const payloadWithTarget: DragPayload & { targetSuit?: Suit } =
                    {
                      ...customPayload,
                      targetSuit: targetSuit, // This is the slot's suit key, not the card's suit
                    };
                  onCardDrop(payloadWithTarget);
                  completeDrag();
                  return;
                }

                // Handle HTML5 drag (fallback)
                const payload = parsePayload(e);
                if (!payload) {
                  return;
                }
                const card = payload.card;
                
                // Determine target suit - use slot's suit key for placement
                let targetSuit: Suit;
                if (cards.length === 0) {
                  // Empty stack - only accept ace
                  if (card.rank !== 1) {
                    return;
                  }
                  // Use the slot's suit key (where it was dropped)
                  targetSuit = suit;
                } else {
                  // Stack has cards, use its suit
                  targetSuit = stackSuit!;
                }
                
                // For validation, use card's suit if empty (for ace) or stack's suit if has cards
                const validationSuit = cards.length === 0 ? card.suit : stackSuit!;
                const centerStack: CenterStack = {
                  suit: validationSuit,
                  cards: cards,
                };
                const target: DropTarget = {
                  type: "center",
                  stack: centerStack,
                };
                if (!isDroppable(payload, target)) {
                  // Invalid drop - ignore it (card stays in place)
                  return;
                }
                // Add targetSuit for the handler - use slot's suit key
                const payloadWithTarget: DragPayload & { targetSuit?: Suit } = {
                  ...payload,
                  targetSuit: targetSuit, // Slot's suit key
                };
                onCardDrop(payloadWithTarget);
              }}
              onTouchEnd={(e) => {
                // Handle drop on touch end for mobile
                if (dragState.isDragging && dragState.payload) {
                  if (e.cancelable) {
                    e.preventDefault();
                  }

                  const customPayload = dragState.payload;
                  const card = customPayload.card;

                  let targetSuit: Suit;
                  if (cards.length === 0) {
                    // Empty stack - only accept ace
                    if (card.rank !== 1) {
                      cancelDrag();
                      return;
                    }
                    // Use the slot's suit key (where it was dropped)
                    targetSuit = suit;
                  } else {
                    // Stack has cards, use its suit
                    targetSuit = stackSuit!;
                  }

                  // For validation, use card's suit if empty or stack's suit if has cards
                  const validationSuit = cards.length === 0 ? card.suit : stackSuit!;
                  const centerStack: CenterStack = {
                    suit: validationSuit,
                    cards: cards,
                  };
                  const dropTarget: DropTarget = {
                    type: "center",
                    stack: centerStack,
                  };
                  if (!isDroppable(customPayload, dropTarget)) {
                    cancelDrag();
                    return;
                  }
                  const payloadWithTarget: DragPayload & {
                    targetSuit?: Suit;
                  } = {
                    ...customPayload,
                    targetSuit: targetSuit, // Slot's suit key
                  };
                  onCardDrop(payloadWithTarget);
                  completeDrag();
                }
              }}
              onMouseUp={() => {
                // Handle drop on mouse up for click-to-drag (desktop only)
                if (dragState.isDragging && dragState.payload) {
                  // This handler is bound to this specific center stack, so treat it as drop target.
                  const customPayload = dragState.payload;
                  const card = customPayload.card;

                  let targetSuit: Suit;
                  if (cards.length === 0) {
                    // Empty stack - only accept ace
                    if (card.rank !== 1) {
                      cancelDrag();
                      return;
                    }
                    // Use the slot's suit key (where it was dropped)
                    targetSuit = suit;
                  } else {
                    // Stack has cards, use its suit
                    targetSuit = stackSuit!;
                  }

                  // For validation, use card's suit if empty or stack's suit if has cards
                  const validationSuit = cards.length === 0 ? card.suit : stackSuit!;
                  const centerStack: CenterStack = {
                    suit: validationSuit,
                    cards: cards,
                  };
                  const dropTarget: DropTarget = {
                    type: "center",
                    stack: centerStack,
                  };
                  if (!isDroppable(customPayload, dropTarget)) {
                    // Invalid drop - return card to original position
                    cancelDrag();
                    return;
                  }
                  // Valid drop - use slot's suit key
                  const payloadWithTarget: DragPayload & {
                    targetSuit?: Suit;
                  } = {
                    ...customPayload,
                    targetSuit: targetSuit, // Slot's suit key
                  };
                  onCardDrop(payloadWithTarget);
                  completeDrag();
                }
              }}
              data-suit={suit}
            >
              <div className="stack-cards">
                {topCard ? (
                  <img
                    className="card-img"
                    src={cardAssetPath(topCard)}
                    alt={topCard.display}
                  />
                ) : (
                  <div className="card empty-card"></div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
