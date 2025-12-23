import { Card } from "../../types/game";
import { cardAssetPath } from "../../utils/cardAsset";
import { DragPayload } from "./types";
import "./PlayerArea.css";
import {
  isDraggableStack,
  isPickable,
  isDroppable,
  PickContext,
  DropTarget,
} from "../../utils/solitiareFuncs";

interface PersonalStackProps {
  stack: Card[];
  stackIndex: number;
  onDrop: (payload: DragPayload | null) => void;
  onDragStartPayload: (payload: DragPayload) => DragPayload;
  pickContext: PickContext;
}

export default function PersonalStack({
  stack,
  stackIndex,
  onDrop,
  onDragStartPayload,
  pickContext,
}: PersonalStackProps) {
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
    <div
      className="personal-stack"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const payload = parsePayload(e);
        if (payload) {
          // For stacks, we need to check the bottom card, not the top card
          let cardToCheck = payload.card;
          if (
            payload.source === "personal" &&
            payload.fromStack !== undefined &&
            payload.count &&
            payload.count > 1 &&
            pickContext.personalStacks
          ) {
            // Get the source stack and find the bottom card of the sequence
            const sourceStack = pickContext.personalStacks[payload.fromStack];
            if (sourceStack && sourceStack.length >= payload.count) {
              const startIdx = sourceStack.length - payload.count;
              const sequence = sourceStack.slice(startIdx);
              // Bottom card is the last card in the sequence
              cardToCheck = sequence[sequence.length - 1];
            }
          }
          // Create a modified payload with the bottom card for validation
          const validationPayload: DragPayload = {
            ...payload,
            card: cardToCheck,
          };
          const target: DropTarget = { type: "personal", stack };
          if (!isDroppable(validationPayload, target)) {
            // Invalid drop - ignore it (card stays in place)
            return;
          }
        }
        onDrop(payload);
      }}
    >
      {stack.length > 0 ? (
        <div className="stack-fan">
          {stack.map((card, cardIdx) => {
            const draggableSlice = stack.slice(cardIdx);
            const canDrag = isDraggableStack(draggableSlice);
            const count = draggableSlice.length;
            const payload: DragPayload = {
              source: "personal",
              fromStack: stackIndex,
              count,
              card,
            };
            const isPickablePayload = isPickable(payload, pickContext);
            const shouldAllowDrag = canDrag && isPickablePayload;

            return (
              <img
                key={cardIdx}
                className="card-img stack-card"
                draggable={shouldAllowDrag}
                src={cardAssetPath(card)}
                alt={card.display}
                style={{
                  top: cardIdx * 14,
                  zIndex: cardIdx,
                }}
                onDragStart={(e) => {
                  if (!shouldAllowDrag) {
                    e.preventDefault();
                    return;
                  }
                  const finalPayload = onDragStartPayload(payload);
                  e.dataTransfer.setData(
                    "application/json",
                    JSON.stringify(finalPayload)
                  );
                }}
              />
            );
          })}
        </div>
      ) : (
        <div className="card empty-stack">Empty</div>
      )}
    </div>
  );
}
