import { PlayerState } from "../../types/game";
import { cardAssetPath, cardBackPath } from "../../utils/cardAsset";
import { DragPayload } from "./types";
import NertsPile from "./NertsPile";
import PlayArea from "./PlayArea";
import "./PlayerArea.css";

interface PlayerAreaProps {
  player: PlayerState;
  isCurrentPlayer: boolean;
  onDrawDeck: () => void;
  onCallNerts: () => void;
  onDropToStack: (stackIdx: number, payload: DragPayload | null) => void;
  onDragStartPayload: (payload: DragPayload) => DragPayload;
}

export default function PlayerArea({
  player,
  isCurrentPlayer,
  onDrawDeck,
  onCallNerts,
  onDropToStack,
  onDragStartPayload,
}: PlayerAreaProps) {
  const playableCard =
    player.deck_display && player.deck_display.length > 0
      ? player.deck_display[player.deck_display.length - 1]
      : null;

  const canCallNerts = player.nerts_pile_count === 0;

  return (
    <div className={`player-area ${isCurrentPlayer ? "current-player" : ""}`}>
      <div className="player-header">
        <h3>Player {player.position + 1}</h3>
        <div className="player-score">Score: {player.score}</div>
      </div>

      {isCurrentPlayer ? (
        <div className="player-layout">
          <div className="side-column">
            <NertsPile
              nertsPile={player.nerts_pile}
              nertsPileCount={player.nerts_pile_count}
              canCallNerts={canCallNerts}
              onCallNerts={onCallNerts}
              onDragStartPayload={onDragStartPayload}
            />

            {/* Personal Deck */}
            <div className="deck-section vertical">
              <button onClick={onDrawDeck} className="deck-button small">
                <div className="deck-info">
                  <span>Deck</span>
                  <span className="deck-size">{player.deck_size || 0}</span>
                </div>
                <img
                  src={cardBackPath()}
                  alt="Deck back"
                  className="card-img small"
                />
              </button>
              {playableCard && (
                <img
                  className="card-img playable-card small"
                  draggable
                  onDragStart={(e) => {
                    const payload = onDragStartPayload({
                      source: "deck",
                      card: playableCard,
                    });
                    e.dataTransfer.setData(
                      "application/json",
                      JSON.stringify(payload)
                    );
                  }}
                  src={cardAssetPath(playableCard)}
                  alt={playableCard.display}
                />
              )}
            </div>
          </div>

          <PlayArea
            personalStacks={player.personal_stacks}
            onDropToStack={onDropToStack}
            onDragStartPayload={onDragStartPayload}
          />
        </div>
      ) : (
        <div className="opponent-view">
          <p>Deck: {player.deck_size || 0} cards</p>
          <p>Nerts Pile: {player.nerts_pile_count} cards</p>
          <div className="opponent-stacks">
            {player.personal_stacks.map((stack, idx) => (
              <div key={idx} className="opponent-stack">
                {stack.length > 0 ? (
                  <img
                    className="card-img tiny"
                    src={cardAssetPath(stack[stack.length - 1])}
                    alt={stack[stack.length - 1].display}
                  />
                ) : (
                  <div className="card empty-stack">-</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
