import { Card } from "../../types/game";
import { cardAssetPath } from "../../utils/cardAsset";
import { DragPayload } from "./types";
import "./PlayerArea.css";

interface NertsPileProps {
  nertsPile: Card[] | undefined;
  nertsPileCount: number;
  canCallNerts: boolean;
  onCallNerts: () => void;
  onDragStartPayload: (payload: DragPayload) => DragPayload;
}

export default function NertsPile({
  nertsPile,
  nertsPileCount,
  canCallNerts,
  onCallNerts,
  onDragStartPayload,
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
              return (
                <img
                  key="nerts-top"
                  className="card-img nerts-card small"
                  draggable
                  onDragStart={(e) => {
                    const payload = onDragStartPayload({
                      source: "nerts",
                      card: top,
                    });
                    e.dataTransfer.setData(
                      "application/json",
                      JSON.stringify(payload)
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
