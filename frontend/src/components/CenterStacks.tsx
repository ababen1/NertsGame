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

const suitSymbols: { [key in Suit]: string } = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const suitColors: { [key in Suit]: string } = {
  hearts: "#dc3545",
  diamonds: "#dc3545",
  clubs: "#333",
  spades: "#333",
};

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

  return (
    <div className="center-stacks">
      <h2>Center Stacks (A → K)</h2>
      <div className="stacks-container">
        {(Object.keys(centerStacks) as Suit[]).map((suit) => {
          const stack = centerStacks[suit];
          const topCard = stack.length > 0 ? stack[stack.length - 1] : null;

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
                  // Convert centerStacks format to CenterStack for validation
                  const centerStack: CenterStack = {
                    suit,
                    cards: stack,
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
                  // Valid drop
                  const payloadWithTarget: DragPayload & { targetSuit?: Suit } =
                    {
                      ...customPayload,
                      targetSuit: suit,
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
                // Convert centerStacks format to CenterStack for validation
                const centerStack: CenterStack = {
                  suit,
                  cards: stack,
                };
                const target: DropTarget = {
                  type: "center",
                  stack: centerStack,
                };
                if (!isDroppable(payload, target)) {
                  // Invalid drop - ignore it (card stays in place)
                  return;
                }
                // Add targetSuit for the handler
                const payloadWithTarget: DragPayload & { targetSuit?: Suit } = {
                  ...payload,
                  targetSuit: suit,
                };
                onCardDrop(payloadWithTarget);
              }}
              onTouchEnd={(e) => {
                // Handle drop on touch end for mobile
                if (dragState.isDragging && dragState.payload) {
                  e.preventDefault();
                  const touch = e.changedTouches[0];
                  const target = document.elementFromPoint(
                    touch.clientX,
                    touch.clientY
                  );
                  const isOverThisStack =
                    target &&
                    target.closest(`.center-stack[data-suit="${suit}"]`);

                  if (isOverThisStack) {
                    const customPayload = dragState.payload;
                    const centerStack: CenterStack = {
                      suit,
                      cards: stack,
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
                      targetSuit: suit,
                    };
                    onCardDrop(payloadWithTarget);
                    completeDrag();
                  }
                }
              }}
              onMouseUp={(e) => {
                // Handle drop on mouse up for click-to-drag (desktop only)
                if (dragState.isDragging && dragState.payload) {
                  // Check if we're over this center stack
                  const target = document.elementFromPoint(
                    e.clientX,
                    e.clientY
                  );
                  const isOverThisStack =
                    target &&
                    target.closest(`.center-stack[data-suit="${suit}"]`);

                  if (isOverThisStack) {
                    // We're over this stack - validate and drop
                    const customPayload = dragState.payload;
                    // Convert centerStacks format to CenterStack for validation
                    const centerStack: CenterStack = {
                      suit,
                      cards: stack,
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
                    // Valid drop
                    const payloadWithTarget: DragPayload & {
                      targetSuit?: Suit;
                    } = {
                      ...customPayload,
                      targetSuit: suit,
                    };
                    onCardDrop(payloadWithTarget);
                    completeDrag();
                  }
                }
              }}
              data-suit={suit}
            >
              <div className="stack-label" style={{ color: suitColors[suit] }}>
                {suitSymbols[suit]} {suit}
              </div>
              <div className="stack-cards">
                {topCard ? (
                  <img
                    className="card-img"
                    src={cardAssetPath(topCard)}
                    alt={topCard.display}
                  />
                ) : (
                  <div className="card empty-card">A</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
