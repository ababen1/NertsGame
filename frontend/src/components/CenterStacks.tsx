import { Card, Suit, CenterStack } from "../types/game";
import { cardAssetPath } from "../utils/cardAsset";
import { isDroppable, DropTarget, DragPayload } from "../utils/solitiareFuncs";
import "./CenterStacks.css";

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
                const payload = parsePayload(e);
                if (!payload) {
                  return;
                }
                // Convert centerStacks format to CenterStack for validation
                const centerStack: CenterStack = {
                  suit,
                  cards: stack,
                };
                const target: DropTarget = { type: "center", stack: centerStack };
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
                {stack.length > 1 && (
                  <div className="stack-count">+{stack.length - 1}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
