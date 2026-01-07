import { useState, useEffect } from "react";
import { LobbyState } from "../types/game";
import { useGameSocket } from "../hooks/useGameSocket";
import "./RoomLobby.css";

interface RoomLobbyProps {
  gameId: number;
  playerId: number;
  onLeaveRoom: () => void;
  onGameStart: () => void;
}

export default function RoomLobby({
  gameId,
  playerId,
  onLeaveRoom,
  onGameStart,
}: RoomLobbyProps) {
  const { lobbyState, setReady, connected, gameState } = useGameSocket(
    gameId,
    playerId,
    true
  );

  // If game state is received, the game has started
  useEffect(() => {
    if (gameState) {
      onGameStart();
    }
  }, [gameState, onGameStart]);
  const [roomName, setRoomName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [startingGame, setStartingGame] = useState(false);

  useEffect(() => {
    if (lobbyState) {
      setRoomName(lobbyState.name || `Game #${lobbyState.game_id}`);
    }
  }, [lobbyState]);

  const isOwner = lobbyState?.owner_id === playerId;
  const allReady =
    lobbyState &&
    lobbyState.players.length >= 2 &&
    lobbyState.players.every((p) => p.is_ready);

  const handleSaveName = async () => {
    if (!isOwner || !lobbyState) return;
    setSavingName(true);
    try {
      const response = await fetch(`/api/games/${gameId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: playerId, name: roomName }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update room name");
      }
      setEditingName(false);
    } catch (error: any) {
      alert(error.message || "Failed to update room name");
    } finally {
      setSavingName(false);
    }
  };

  const handleKickPlayer = async (targetPlayerId: number) => {
    if (!isOwner) return;
    if (
      !confirm(
        `Are you sure you want to kick ${
          lobbyState?.players.find((p) => p.player_id === targetPlayerId)
            ?.username || "this player"
        }?`
      )
    ) {
      return;
    }
    try {
      const response = await fetch(`/api/games/${gameId}/kick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_id: playerId,
          target_player_id: targetPlayerId,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to kick player");
      }
    } catch (error: any) {
      alert(error.message || "Failed to kick player");
    }
  };

  const handleStartGame = async () => {
    if (!isOwner || !allReady) return;
    setStartingGame(true);
    try {
      const response = await fetch(`/api/games/${gameId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: playerId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start game");
      }
      onGameStart();
    } catch (error: any) {
      alert(error.message || "Failed to start game");
    } finally {
      setStartingGame(false);
    }
  };

  if (!lobbyState) {
    return (
      <div className="room-lobby">
        <div className="room-lobby-loading">
          <p>{connected ? "Loading room..." : "Connecting..."}</p>
        </div>
      </div>
    );
  }

  const currentPlayer = lobbyState.players.find(
    (p) => p.player_id === playerId
  );

  return (
    <div className="room-lobby">
      <div className="room-lobby-header">
        <div className="room-name-section">
          {isOwner && !editingName ? (
            <>
              <h1>{roomName}</h1>
              <button
                onClick={() => setEditingName(true)}
                className="edit-name-btn"
              >
                Edit
              </button>
            </>
          ) : isOwner && editingName ? (
            <>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Room name"
                className="room-name-input"
              />
              <button
                onClick={handleSaveName}
                disabled={savingName || !roomName.trim()}
                className="save-name-btn"
              >
                {savingName ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditingName(false);
                  setRoomName(lobbyState.name || `Game #${lobbyState.game_id}`);
                }}
                className="cancel-name-btn"
              >
                Cancel
              </button>
            </>
          ) : (
            <h1>{roomName}</h1>
          )}
        </div>
        <button onClick={onLeaveRoom} className="leave-room-btn">
          Leave Room
        </button>
      </div>

      <div className="room-lobby-content">
        <div className="players-list">
          <h2>Players ({lobbyState.players.length} / 6)</h2>
          <div className="players-grid">
            {lobbyState.players.map((player) => {
              const isCurrentPlayer = player.player_id === playerId;
              const isPlayerOwner = player.player_id === lobbyState.owner_id;
              return (
                <div
                  key={player.player_id}
                  className={`player-card ${
                    isCurrentPlayer ? "current-player" : ""
                  } ${isPlayerOwner ? "owner" : ""}`}
                >
                  <div className="player-info">
                    <span className="player-name">
                      {player.username || `Player ${player.player_id}`}
                      {isPlayerOwner && (
                        <span className="owner-badge">👑 Owner</span>
                      )}
                    </span>
                    <span
                      className={`ready-status ${
                        player.is_ready ? "ready" : "not-ready"
                      }`}
                    >
                      {player.is_ready ? "✓ Ready" : "Not Ready"}
                    </span>
                  </div>
                  {isCurrentPlayer && (
                    <button
                      onClick={setReady}
                      className={`ready-toggle-btn ${
                        player.is_ready ? "unready" : "ready"
                      }`}
                    >
                      {player.is_ready ? "Unready" : "Ready"}
                    </button>
                  )}
                  {isOwner &&
                    !isCurrentPlayer &&
                    player.player_id !== lobbyState.owner_id && (
                      <button
                        onClick={() => handleKickPlayer(player.player_id)}
                        className="kick-btn"
                      >
                        Kick
                      </button>
                    )}
                </div>
              );
            })}
          </div>
        </div>

        {isOwner && (
          <div className="owner-controls">
            <button
              onClick={handleStartGame}
              disabled={!allReady || startingGame}
              className={`start-game-btn ${allReady ? "enabled" : "disabled"}`}
            >
              {startingGame
                ? "Starting..."
                : allReady
                ? "Start Game"
                : "Waiting for all players to be ready"}
            </button>
            {!allReady && (
              <p className="ready-status-info">
                {lobbyState.players.filter((p) => !p.is_ready).length} player(s)
                not ready
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
