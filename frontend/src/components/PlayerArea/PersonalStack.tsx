import { Card } from "../../types/game";
import { cardAssetPath } from "../../utils/cardAsset";
import { isValidSequenceForDrag } from "../../utils/solitiareFuncs";
import { DragPayload } from "./types";
import "./PlayerArea.css";

interface PersonalStackProps {
  stack: Card[];
  stackIndex: number;
  onDrop: (payload: DragPayload | null) => void;
  onDragStartPayload: (payload: DragPayload) => DragPayload;
}

export default function PersonalStack({
  stack,
  stackIndex,
  onDrop,
  onDragStartPayload,
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
        onDrop(payload);
      }}
    >
      {stack.length > 0 ? (
        <div className="stack-fan">
          {stack.map((card, cardIdx) => {
            const canDrag = isValidSequenceForDrag(stack, cardIdx);
            return (
              <img
                key={cardIdx}
                className="card-img stack-card"
                draggable={canDrag}
                src={cardAssetPath(card)}
                alt={card.display}
                style={{
                  top: cardIdx * 14,
                  zIndex: cardIdx,
                }}
                onDragStart={(e) => {
                  if (!canDrag) return;
                  const count = stack.length - cardIdx;
                  const payload = onDragStartPayload({
                    source: "personal",
                    fromStack: stackIndex,
                    count,
                    card,
                  });
                  e.dataTransfer.setData(
                    "application/json",
                    JSON.stringify(payload)
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
