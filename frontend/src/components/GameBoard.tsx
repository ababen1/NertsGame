import { useEffect, useState } from "react";
import { useGameSocket } from "../hooks/useGameSocket";
import { useOfflinePractice } from "../hooks/useOfflinePractice";
import PlayerArea from "./PlayerArea";
import CenterStacks from "./CenterStacks";
import "./GameBoard.css";
import { CardDragProvider, useCardDragContext } from "../contexts/CardDragContext";
import FloatingCard from "./FloatingCard";

interface GameBoardProps {
  gameId: number;
  playerId: number;
  playerName: string;
  onRename: (username: string) => Promise<void> | void;
  onLeaveGame: () => void;
  isOffline: boolean;
}

function GameBoardContent({
  gameId,
  playerId,
  playerName,
  onRename,
  onLeaveGame,
  isOffline,
}: GameBoardProps) {
  const online = useGameSocket(gameId, playerId, !isOffline);
  const practice = useOfflinePractice(playerId, playerName);
  const gameState = isOffline ? practice.gameState : online.gameState;
  const connected = isOffline ? true : online.connected;
  const drawDeck = isOffline ? practice.drawDeck : online.drawDeck;
  const playCard = isOffline ? practice.playCard : online.playCard;
  const callNerts = isOffline ? practice.callNerts : online.callNerts;
  const moveStack = isOffline ? practice.moveStack : online.moveStack;
  const [editingName, setEditingName] = useState(playerName);
  const [renameSaving, setRenameSaving] = useState(false);
  const { dragState, floatingCardRef, cancelDrag, completeDrag } = useCardDragContext();

  useEffect(() => {
    setEditingName(playerName);
  }, [playerName]);

  if (!gameState) {
    return (
      <div className="game-board loading">
        <p>{connected ? "Loading game..." : "Connecting..."}</p>
      </div>
    );
  }

  const currentPlayer = gameState.players[playerId.toString()];

  if (!currentPlayer) {
    return (
      <div className="game-board error">
        <p>Player not found in game</p>
        <button onClick={onLeaveGame}>Leave Game</button>
      </div>
    );
  }

  return (
    <div className="game-board">
      <div className="game-header">
        <h1>
          {isOffline ? "Practice Mode" : `Game #${gameId}`} - Round{" "}
          {(() => {
            // #region agent log
            fetch(
              "http://127.0.0.1:7242/ingest/f5db1c29-c371-4701-9cab-8b57bf1cf498",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  location: "GameBoard.tsx:64",
                  message: "Displaying round number",
                  data: { currentRound: gameState.current_round, isOffline },
                  timestamp: Date.now(),
                  sessionId: "debug-session",
                  runId: "run1",
                  hypothesisId: "E",
                }),
              }
            ).catch(() => {});
            // #endregion
            return gameState.current_round;
          })()}
        </h1>
        <div className="game-info">
          <div className="rename-area">
            <input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              placeholder="Display name"
            />
            <button
              onClick={async () => {
                if (!editingName.trim()) return;
                try {
                  setRenameSaving(true);
                  await onRename(editingName.trim());
                } finally {
                  setRenameSaving(false);
                }
              }}
              disabled={renameSaving || !editingName.trim()}
            >
              {renameSaving ? "Saving..." : "Save name"}
            </button>
          </div>
          <span className={`status ${gameState.status}`}>
            {gameState.status}
          </span>
          {gameState.winner_id && (
            <span className="winner">Winner: Player {gameState.winner_id}</span>
          )}
          <button onClick={onLeaveGame} className="leave-btn">
            Leave Game
          </button>
        </div>
      </div>

      <div className="game-content">
        <CenterStacks
          centerStacks={gameState.center_stacks}
          onCardDrop={(payload) => {
            if (!payload) {
              // Invalid drop - cancel drag if active
              if (dragState.isDragging) {
                cancelDrag();
              }
              return;
            }
            if (payload.subCards.length > 1) {
              // Invalid drop - center accepts single card only
              if (dragState.isDragging) {
                cancelDrag();
              }
              return;
            }
            if (payload.card) {
              playCard(payload.card, "center", payload.card.suit);
              if (dragState.isDragging) {
                completeDrag();
              }
            }
          }}
        />

        <div className="players-area">
          {Object.entries(gameState.players).map(([pid, player]) => (
            <PlayerArea
              key={pid}
              player={player}
              isCurrentPlayer={parseInt(pid) === playerId}
              onDrawDeck={drawDeck}
              onCallNerts={callNerts}
              onDropToStack={(stackIdx, payload) => {
                if (!payload) {
                  // Invalid drop - cancel drag if active
                  if (dragState.isDragging) {
                    cancelDrag();
                  }
                  return;
                }
                if (
                  payload.source === "personal" &&
                  payload.fromStack !== undefined
                ) {
                  moveStack(payload.fromStack, stackIdx, payload.count || 1);
                  if (dragState.isDragging) {
                    completeDrag();
                  }
                  return;
                }
                if (payload.card) {
                  playCard(payload.card, "personal", stackIdx);
                  if (dragState.isDragging) {
                    completeDrag();
                  }
                }
              }}
              onDragStartPayload={(p) => p}
            />
          ))}
        </div>
      </div>
      <FloatingCard dragState={dragState} floatingCardRef={floatingCardRef} />
    </div>
  );
}

export default function GameBoard(props: GameBoardProps) {
  return (
    <CardDragProvider>
      <GameBoardContent {...props} />
    </CardDragProvider>
  );
}
