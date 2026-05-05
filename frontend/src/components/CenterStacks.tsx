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
  type DragPayloadWithTarget = DragPayload & { targetSuit?: Suit };

  const parsePayload = (e: React.DragEvent) => {
    try {
      const data = e.dataTransfer.getData("application/json");
      if (!data) return null;
      return JSON.parse(data) as DragPayload;
    } catch {
      return null;
    }
  };

  const getTargetSuit = (
    card: Card,
    cards: Card[],
    slotSuit: Suit
  ): Suit | null => {
    if (cards.length === 0) {
      // Empty center slots only accept an ace.
      return card.rank === 1 ? slotSuit : null;
    }
    // Non-empty slot: route to this physical slot key.
    return slotSuit;
  };

  const buildCenterDropTarget = (
    card: Card,
    cards: Card[],
    stackSuit?: Suit
  ): DropTarget => {
    const validationSuit = cards.length === 0 ? card.suit : (stackSuit as Suit);
    const centerStack: CenterStack = {
      suit: validationSuit,
      cards,
    };
    return { type: "center", stack: centerStack };
  };

  const addTargetSuit = (
    payload: DragPayload,
    targetSuit: Suit
  ): DragPayloadWithTarget => ({
    ...payload,
    targetSuit,
  });

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

                  const targetSuit = getTargetSuit(card, cards, suit);
                  if (!targetSuit) {
                    cancelDrag();
                    return;
                  }

                  const target = buildCenterDropTarget(card, cards, stackSuit);
                  if (!isDroppable(customPayload, target)) {
                    // Invalid drop - return card to original position
                    cancelDrag();
                    return;
                  }

                  // Valid drop - use the slot's suit key (where it was dropped) to update the correct stack.
                  const payloadWithTarget = addTargetSuit(customPayload, targetSuit);
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

                const targetSuit = getTargetSuit(card, cards, suit);
                if (!targetSuit) {
                  return;
                }

                const target = buildCenterDropTarget(card, cards, stackSuit);
                if (!isDroppable(payload, target)) {
                  // Invalid drop - ignore it (card stays in place)
                  return;
                }

                // Add targetSuit for the handler - use slot's suit key.
                const payloadWithTarget = addTargetSuit(payload, targetSuit);
                onCardDrop(payloadWithTarget);
              }}
              onMouseUp={() => {
                // Handle drop on mouse up for click-to-drag (desktop only)
                if (dragState.isDragging && dragState.payload) {
                  // This handler is bound to this specific center stack, so treat it as drop target.
                  const customPayload = dragState.payload;
                  const card = customPayload.card;

                  const targetSuit = getTargetSuit(card, cards, suit);
                  if (!targetSuit) {
                    cancelDrag();
                    return;
                  }

                  const dropTarget = buildCenterDropTarget(card, cards, stackSuit);
                  if (!isDroppable(customPayload, dropTarget)) {
                    // Invalid drop - return card to original position
                    cancelDrag();
                    return;
                  }

                  // Valid drop - use slot's suit key.
                  const payloadWithTarget = addTargetSuit(customPayload, targetSuit);
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
