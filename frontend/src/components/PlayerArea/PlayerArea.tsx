import { Card, PlayerState } from "../../types/game";
import { cardAssetPath, cardBackPath } from "../../utils/cardAsset";
import { DragPayload } from "./types";
import NertsPile from "./NertsPile";
import PlayArea from "./PlayArea";
import "./PlayerArea.css";
import {
  isPickable,
  PickContext,
  getCurrentTotalScore,
} from "../../utils/solitiareFuncs";
import { useCardDragContext } from "../../contexts/CardDragContext";
import { useState, useEffect } from "react";
import { has_multiplayer } from "../../utils/constants";

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
  const { startDrag, dragState } = useCardDragContext();
  const [isPeekingDeck, setIsPeekingDeck] = useState(false);
  
  // Calculate current page display from deck and deck_page
  // Page 0 = no cards displayed, Page 1 = first 3 cards, Page 2 = next 3 cards, etc.
  const deck = player.deck || [];
  const deckPage = player.deck_page || 0;
  const cardsPerPage = 3;
  let deckDisplay: Card[] = [];
  if (deckPage > 0) {
    // Page 1+ shows cards: page 1 = cards 0-2, page 2 = cards 3-5, etc.
    const pageStart = (deckPage - 1) * cardsPerPage;
    const pageEnd = Math.min(pageStart + cardsPerPage, deck.length);
    deckDisplay = deck.slice(pageStart, pageEnd);
  }
  // Page 0 shows nothing (deckDisplay is empty array)
  const playableCard =
    deckDisplay.length > 0 ? deckDisplay[deckDisplay.length - 1] : null;
  
  // Get the card below the playable card for peek
  const peekCard = playableCard && deckDisplay.length > 1 
    ? deckDisplay[deckDisplay.length - 2] 
    : null;

  const canCallNerts = player.nerts_pile_count === 0;

  const pickContext: PickContext = {
    personalStacks: player.personal_stacks,
    nertsPile: player.nerts_pile,
    deckTopCard: playableCard,
  };

  // Stop peeking when drag completes or cancels
  useEffect(() => {
    if (!dragState.isDragging && isPeekingDeck) {
      setIsPeekingDeck(false);
    }
  }, [dragState.isDragging, isPeekingDeck]);

  return (
    <div className={`player-area ${isCurrentPlayer ? "current-player" : ""}`}>
      <div className="player-header">
        {has_multiplayer && <h3>Player {player.position + 1}</h3>}
        <div className="player-score">
          Score: {getCurrentTotalScore(player)}
        </div>
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
                  <span className="deck-size">{deck.length}</span>
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
                    subCards: [playableCard],
                  };
                  const isPickablePayload = isPickable(payload, pickContext);
                  return (
                    <div style={{ position: "relative" }}>
                      {/* Peek card (shown below when dragging) */}
                      {isPeekingDeck && peekCard && (
                        <img
                          className="card-img playable-card small"
                          src={cardAssetPath(peekCard)}
                          alt={peekCard.display}
                          style={{
                            position: "absolute",
                            top: "8px",
                            left: 0,
                            opacity: 0.9,
                            zIndex: 1,
                          }}
                        />
                      )}
                      {/* Playable card */}
                      <img
                        className="card-img playable-card small"
                        draggable={isPickablePayload}
                        style={{
                          position: "relative",
                          zIndex: 2,
                          cursor: isPickablePayload ? "grab" : "default",
                        }}
                        onMouseDown={(e) => {
                          // On mobile, use touch events instead
                          if ('ontouchstart' in window) return;
                          
                          if (!isPickablePayload || e.button !== 0) return; // Only left click
                          e.preventDefault();
                          const finalPayload = onDragStartPayload(payload);
                          const element = e.currentTarget;
                          startDrag(finalPayload, playableCard, element, e.nativeEvent);
                          setIsPeekingDeck(true);
                        }}
                        onTouchStart={(e) => {
                          // On mobile, use touch and drag
                          if (!isPickablePayload) return;
                          if (e.cancelable) {
                            e.preventDefault();
                          }
                          const finalPayload = onDragStartPayload(payload);
                          const element = e.currentTarget;
                          startDrag(finalPayload, playableCard, element, e.nativeEvent);
                          setIsPeekingDeck(true);
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
                          setIsPeekingDeck(true);
                        }}
                        onDragEnd={() => {
                          setIsPeekingDeck(false);
                        }}
                        src={cardAssetPath(playableCard)}
                        alt={playableCard.display}
                      />
                    </div>
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
          <p>Deck: {deck.length} cards</p>
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
