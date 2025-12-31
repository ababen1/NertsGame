import { Card } from "../../types/game";
import { cardAssetPath } from "../../utils/cardAsset";
import { DragPayload } from "./types";
import "./PlayerArea.css";
import { isPickable, PickContext } from "../../utils/solitiareFuncs";
import { useCardDragContext } from "../../contexts/CardDragContext";

interface NertsPileProps {
  nertsPile: Card[] | undefined;
  nertsPileCount: number;
  canCallNerts: boolean;
  onCallNerts: () => void;
  onDragStartPayload: (payload: DragPayload) => DragPayload;
  pickContext: PickContext;
}

export default function NertsPile({
  nertsPile,
  nertsPileCount,
  canCallNerts,
  onCallNerts,
  onDragStartPayload,
  pickContext,
}: NertsPileProps) {
  const { startDrag, dragState } = useCardDragContext();
  
  return (
    <div className="nerts-section">
      <div className="nerts-pile">
        <div className="nerts-header">
          <span>Nerts</span>
          <span className="pill">{nertsPileCount}</span>
        </div>
        {nertsPile && nertsPile.length > 0 && (
          <div className="nerts-cards">
            {(() => {
              const top = nertsPile[nertsPile.length - 1];
              const payload: DragPayload = {
                source: "nerts",
                card: top,
                subCards: [top],
              };
              const isPickablePayload = isPickable(payload, pickContext);
              return (
                <img
                  key="nerts-top"
                  className="card-img nerts-card small"
                  draggable={isPickablePayload}
                  style={{
                    cursor: isPickablePayload ? "grab" : "default",
                  }}
                  onMouseDown={(e) => {
                    if (!isPickablePayload || e.button !== 0) return; // Only left click
                    e.preventDefault();
                    const finalPayload = onDragStartPayload(payload);
                    const element = e.currentTarget;
                    startDrag(finalPayload, top, element, e.nativeEvent);
                  }}
                  onDragStart={(e) => {
                    // Keep HTML5 drag as fallback
                    if (dragState.isDragging) {
                      e.preventDefault();
                      return;
                    }
                    if (!isPickablePayload) {
                      e.preventDefault();
                      return;
                    }
                    const finalPayload = onDragStartPayload(payload);
                    e.dataTransfer.setData(
                      "application/json",
                      JSON.stringify(finalPayload)
                    );
                  }}
                  src={cardAssetPath(top)}
                  alt={top.display}
                />
              );
            })()}
          </div>
        )}
      </div>
      {canCallNerts && (
        <button onClick={onCallNerts} className="nerts-button">
          🎉 NERTS!
        </button>
      )}
    </div>
  );
}
