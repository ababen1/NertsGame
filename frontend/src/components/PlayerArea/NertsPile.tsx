import { Card } from "../../types/game";
import { cardAssetPath } from "../../utils/cardAsset";
import { DragPayload } from "./types";
import "./PlayerArea.css";
import { isPickable, PickContext } from "../../utils/solitiareFuncs";

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
              };
              const isPickablePayload = isPickable(payload, pickContext);
              return (
                <img
                  key="nerts-top"
                  className="card-img nerts-card small"
                  draggable={isPickablePayload}
                  onDragStart={(e) => {
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
