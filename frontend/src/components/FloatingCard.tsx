import { useCardDrag } from "../hooks/useCardDrag";
import { cardAssetPath } from "../utils/cardAsset";
import "./FloatingCard.css";

interface FloatingCardProps {
  dragState: ReturnType<typeof useCardDrag>["dragState"];
  floatingCardRef: React.RefObject<HTMLDivElement>;
}

export default function FloatingCard({ dragState, floatingCardRef }: FloatingCardProps) {
  if (!dragState.isDragging || !dragState.card || !dragState.payload) {
    return null;
  }

  // Get all cards in the stack being dragged
  // subCards should always be set, but fallback to single card if not
  const cardsToShow = dragState.payload.subCards?.length > 0 
    ? dragState.payload.subCards 
    : [dragState.card];
  const cardWidth = 88;
  const cardHeight = 123;
  const stackOffset = 14; // Offset between stacked cards

  return (
    <div
      ref={floatingCardRef}
      className="floating-card-container"
      style={{
        position: "fixed",
        pointerEvents: "none",
        zIndex: 10000,
        width: cardWidth,
        height: cardHeight + (cardsToShow.length - 1) * stackOffset,
      }}
    >
      {cardsToShow.map((card, index) => (
        <img
          key={index}
          className="floating-card"
          src={cardAssetPath(card)}
          alt={card.display}
          style={{
            position: "absolute",
            top: index * stackOffset,
            left: 0,
            opacity: 1,
            zIndex: index,
          }}
        />
      ))}
    </div>
  );
}

