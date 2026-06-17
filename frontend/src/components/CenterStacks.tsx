import { Card, Suit, CenterStack } from "../types/game";
import { cardAssetPath } from "../utils/cardAsset";
import { isDroppable, DropTarget, DragPayload } from "../utils/solitiareFuncs";
import "./CenterStacks.css";
import { useCardDragContext } from "../contexts/CardDragContext";

interface CenterStacksProps {
  centerStacks: Card[][];
  onCardDrop: (payload: DragPayload | null) => void;
}

export default function CenterStacks({
  centerStacks,
  onCardDrop,
}: CenterStacksProps) {
  const { dragState, cancelDrag, completeDrag } = useCardDragContext();
  type DragPayloadWithTarget = DragPayload & { targetStackIndex?: number };

  const parsePayload = (e: React.DragEvent) => {
    try {
      const data = e.dataTransfer.getData("application/json");
      if (!data) return null;
      return JSON.parse(data) as DragPayload;
    } catch {
      return null;
    }
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

  const addTargetStackIndex = (
    payload: DragPayload,
    stackIndex: number
  ): DragPayloadWithTarget => ({
    ...payload,
    targetStackIndex: stackIndex,
  });

  const tryDropOnStack = (
    payload: DragPayload,
    cards: Card[],
    stackIndex: number
  ): boolean => {
    const card = payload.card;
    if (!card) return false;

    if (cards.length === 0 && card.rank !== 1) {
      return false;
    }

    const stackSuit = cards.length > 0 ? cards[cards.length - 1].suit : undefined;
    const target = buildCenterDropTarget(card, cards, stackSuit);
    if (!isDroppable(payload, target)) {
      return false;
    }

    onCardDrop(addTargetStackIndex(payload, stackIndex));
    return true;
  };

  return (
    <div className="center-stacks">
      <div className="stacks-container">
        {centerStacks.map((cards, stackIndex) => {
          const topCard = cards.length > 0 ? cards[cards.length - 1] : null;

          return (
            <div
              key={stackIndex}
              className="center-stack"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();

                if (dragState.isDragging && dragState.payload) {
                  if (!tryDropOnStack(dragState.payload, cards, stackIndex)) {
                    cancelDrag();
                    return;
                  }
                  completeDrag();
                  return;
                }

                const payload = parsePayload(e);
                if (!payload) return;
                tryDropOnStack(payload, cards, stackIndex);
              }}
              onMouseUp={() => {
                if (dragState.isDragging && dragState.payload) {
                  if (!tryDropOnStack(dragState.payload, cards, stackIndex)) {
                    cancelDrag();
                    return;
                  }
                  completeDrag();
                }
              }}
              data-stack-index={stackIndex}
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
