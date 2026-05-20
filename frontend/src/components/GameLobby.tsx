import { useState, useEffect } from "react";
import { Game, GamePlayer } from "../types/game";
import { getDeviceId } from "../utils/deviceId";
import { roomShareUrl } from "../utils/roomUrl";
import "./GameLobby.css";

interface GameLobbyProps {
  displayName: string;
  onJoinGame: (
    gameId: number,
    participantId: number,
    roomCode: string,
    displayName: string,
  ) => void;
}

export default function GameLobby({ displayName, onJoinGame }: GameLobbyProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [lastShareUrl, setLastShareUrl] = useState<string | null>(null);

  const deviceId = getDeviceId();

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      const response = await fetch("/api/games?status=waiting");
      if (response.ok) {
        const data = await response.json();
        setGames(data);
      }
    } catch (error) {
      console.error("Failed to load games:", error);
    }
  };

  const enterRoom = (game: Game, participant: GamePlayer) => {
    onJoinGame(game.id, participant.id, game.room_code, displayName);
    window.history.pushState({}, "", `/room/${game.room_code}`);
  };

  const createGame = async () => {
    setLoading(true);
    setLastShareUrl(null);
    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_players: 6,
          device_id: deviceId,
          display_name: displayName,
          is_private: isPrivate,
        }),
      });

      if (response.ok) {
        const game: Game = await response.json();
        const owner = game.players.find((p) => p.device_id === deviceId);
        if (owner) {
          const share = roomShareUrl(game.room_code);
          setLastShareUrl(share);
          enterRoom(game, owner);
        } else {
          alert("Room created but could not find your seat");
        }
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create game");
      }
    } catch {
      alert("Error creating game");
    } finally {
      setLoading(false);
    }
  };

  const joinGame = async (gameId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/games/${gameId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: deviceId,
          display_name: displayName,
        }),
      });

      if (response.ok) {
        const participant: GamePlayer = await response.json();
        const game = games.find((g) => g.id === gameId);
        if (game) {
          enterRoom(game, participant);
        } else {
          const gameRes = await fetch(`/api/games/${gameId}`);
          if (gameRes.ok) {
            const fullGame: Game = await gameRes.json();
            enterRoom(fullGame, participant);
          }
        }
      } else {
        const error = await response.json();
        alert(error.error || "Failed to join game");
      }
    } catch {
      alert("Error joining game");
    } finally {
      setLoading(false);
    }
  };

  const isInGame = (game: Game) =>
    game.players.some((gp) => gp.device_id === deviceId);

  const copyShareLink = async () => {
    if (!lastShareUrl) return;
    try {
      await navigator.clipboard.writeText(lastShareUrl);
      alert("Room link copied to clipboard");
    } catch {
      prompt("Copy this room link:", lastShareUrl);
    }
  };

  return (
    <div className="lobby">
      <div className="lobby-header">
        <h1>🎮 Game Lobby</h1>
        <p className="lobby-user">Playing as {displayName}</p>
        <div className="create-game-controls">
          <label className="private-room-toggle">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
            Private room (link only, hidden from list)
          </label>
          <button
            onClick={createGame}
            disabled={loading}
            className="create-game-btn"
          >
            {loading ? "Loading..." : "+ Create New Room"}
          </button>
        </div>
        {lastShareUrl && (
          <p className="share-link">
            Share: <code>{lastShareUrl}</code>{" "}
            <button type="button" onClick={copyShareLink} className="secondary">
              Copy
            </button>
          </p>
        )}
      </div>

      <div className="games-list">
        <h2>Public waiting rooms</h2>
        {games.length === 0 ? (
          <p className="no-games">
            No public rooms open. Create one or use a private invite link.
          </p>
        ) : (
          games.map((game) => (
            <div key={game.id} className="game-card">
              <div className="game-info">
                <h3>{game.name || `Room ${game.room_code}`}</h3>
                <p>
                  Players: {game.players.length} / {game.max_players}
                </p>
                <p>Status: {game.status}</p>
              </div>
              <div className="game-actions">
                {isInGame(game) ? (
                  <button
                    onClick={() => {
                      const gp = game.players.find(
                        (p) => p.device_id === deviceId
                      )!;
                      enterRoom(game, gp);
                    }}
                    className="join-btn"
                  >
                    Rejoin Room
                  </button>
                ) : game.players.length < game.max_players ? (
                  <button
                    onClick={() => joinGame(game.id)}
                    disabled={loading}
                    className="join-btn"
                  >
                    Join Room
                  </button>
                ) : (
                  <span className="full-badge">Full</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
