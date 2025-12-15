import { PlayerState, Card } from "../types/game";
import { cardAssetPath, cardBackPath } from "../utils/cardAsset";
import "./PlayerArea.css";

type DragPayload = {
  source: "deck" | "nerts" | "personal";
  fromStack?: number;
  count?: number;
  card?: Card;
};

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
    <div className={`player-area ${isCurrentPlayer ? "current-player" : ""}`}>
      <div className="player-header">
        <h3>Player {player.position + 1}</h3>
        <div className="player-score">Score: {player.score}</div>
      </div>

      {isCurrentPlayer ? (
        <div className="player-layout">
          <div className="side-column">
            {/* Nerts Pile */}
            <div className="nerts-section">
              <div className="nerts-pile">
                <div className="nerts-header">
                  <span>Nerts</span>
                  <span className="pill">{player.nerts_pile_count}</span>
                </div>
                {player.nerts_pile && player.nerts_pile.length > 0 && (
                  <div className="nerts-cards">
                    {(() => {
                      const top = player.nerts_pile[player.nerts_pile.length - 1];
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

          {/* Personal Stacks */}
          <div className="personal-stacks">
            <h4>Personal Stacks (K → 2, alternating colors)</h4>
            <div className="stacks-grid">
              {player.personal_stacks.map((stack, idx) => (
                <div
                  key={idx}
                  className="personal-stack"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const payload = parsePayload(e);
                    onDropToStack(idx, payload);
                  }}
                >
                  {stack.length > 0 ? (
                    <div className="stack-fan">
                      {stack.map((card, cardIdx) => {
                        const isTop = cardIdx === stack.length - 1;
                        return (
                          <img
                            key={cardIdx}
                            className="card-img stack-card"
                            draggable={isTop}
                            src={cardAssetPath(card)}
                            alt={card.display}
                            style={{
                              top: cardIdx * 14,
                              zIndex: cardIdx,
                            }}
                            onDragStart={(e) => {
                              if (!isTop) return;
                              const count = stack.length - cardIdx;
                              const payload = onDragStartPayload({
                                source: "personal",
                                fromStack: idx,
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
              ))}
            </div>
          </div>
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
