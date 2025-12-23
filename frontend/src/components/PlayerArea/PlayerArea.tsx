import { PlayerState } from "../../types/game";
import { cardAssetPath, cardBackPath } from "../../utils/cardAsset";
import { DragPayload } from "./types";
import NertsPile from "./NertsPile";
import PlayArea from "./PlayArea";
import "./PlayerArea.css";
import { isPickable, PickContext } from "../../utils/solitiareFuncs";

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

  const pickContext: PickContext = {
    personalStacks: player.personal_stacks,
    nertsPile: player.nerts_pile,
    deckTopCard: playableCard,
  };

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
              pickContext={pickContext}
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
              {playableCard &&
                (() => {
                  const payload: DragPayload = {
                    source: "deck",
                    card: playableCard,
                  };
                  const isPickablePayload = isPickable(payload, pickContext);
                  return (
                    <img
                      className="card-img playable-card small"
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
                      src={cardAssetPath(playableCard)}
                      alt={playableCard.display}
                    />
                  );
                })()}
            </div>
          </div>

          <PlayArea
            personalStacks={player.personal_stacks}
            onDropToStack={onDropToStack}
            onDragStartPayload={onDragStartPayload}
            pickContext={pickContext}
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
