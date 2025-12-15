import { useEffect, useState } from "react";
import { useGameSocket } from "../hooks/useGameSocket";
import { useOfflinePractice } from "../hooks/useOfflinePractice";
import PlayerArea from "./PlayerArea";
import CenterStacks from "./CenterStacks";
import "./GameBoard.css";

interface GameBoardProps {
  gameId: number;
  playerId: number;
  playerName: string;
  onRename: (username: string) => Promise<void> | void;
  onLeaveGame: () => void;
  isOffline: boolean;
}

export default function GameBoard({
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
          {gameState.current_round}
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
            if (!payload) return;
            if (
              payload.source === "personal" &&
              payload.count &&
              payload.count > 1
            )
              return; // center accepts single card
            if (payload.card) {
              playCard(payload.card, "center", payload.targetSuit as any);
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
                if (!payload) return;
                if (
                  payload.source === "personal" &&
                  payload.fromStack !== undefined
                ) {
                  moveStack(payload.fromStack, stackIdx, payload.count || 1);
                  return;
                }
                if (payload.card) {
                  playCard(payload.card, "personal", stackIdx);
                }
              }}
              onDragStartPayload={(p) => p}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
