import { useEffect, useState } from "react";
import { useGameSocket } from "../hooks/useGameSocket";
import { GameState, Card, Suit } from "../types/game";
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
  const { gameState, connected, drawDeck, playCard, callNerts, moveStack } =
    useGameSocket(gameId, playerId);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedStack, setSelectedStack] = useState<number | null>(null);
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

  const handleCardClick = (card: Card, source: string, index?: number) => {
    if (selectedCard && selectedCard === card) {
      // Deselect
      setSelectedCard(null);
      setSelectedStack(null);
      return;
    }

    // Select card
    setSelectedCard(card);
    if (index !== undefined) {
      setSelectedStack(index);
    }
  };

  const handlePlayAreaClick = (
    targetType: "center" | "personal",
    target: string | number
  ) => {
    if (!selectedCard) return;

    if (targetType === "center") {
      playCard(selectedCard, "center", target as string);
    } else if (targetType === "personal") {
      playCard(selectedCard, "personal", target as number);
    }

    setSelectedCard(null);
    setSelectedStack(null);
  };

  const handleStackClick = (stackIndex: number) => {
    if (selectedCard && selectedStack !== null) {
      // Moving from one stack to another
      moveStack(selectedStack, stackIndex);
      setSelectedCard(null);
      setSelectedStack(null);
    } else if (selectedCard) {
      // Playing card to stack
      handlePlayAreaClick("personal", stackIndex);
    } else {
      // Select top card of stack
      const stack = currentPlayer.personal_stacks[stackIndex];
      if (stack && stack.length > 0) {
        handleCardClick(stack[stack.length - 1], "stack", stackIndex);
      }
    }
  };

  return (
    <div className="game-board">
      <div className="game-header">
        <h1>
          Game #{gameId} - Round {gameState.current_round}
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
          onStackClick={(suit) => {
            if (selectedCard) {
              handlePlayAreaClick("center", suit);
            }
          }}
        />

        <div className="players-area">
          {Object.entries(gameState.players).map(([pid, player]) => (
            <PlayerArea
              key={pid}
              player={player}
              isCurrentPlayer={parseInt(pid) === playerId}
              selectedCard={selectedCard}
              onCardClick={handleCardClick}
              onStackClick={handleStackClick}
              onDrawDeck={drawDeck}
              onCallNerts={callNerts}
            />
          ))}
        </div>
      </div>

      {selectedCard && (
        <div className="selection-indicator">
          Selected: {selectedCard.display}
        </div>
      )}
    </div>
  );
}
