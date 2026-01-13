import { useState, useEffect } from "react";
import { Game, GamePlayer } from "../types/game";
import "./GameLobby.css";

interface GameLobbyProps {
  playerId: number;
  onJoinGame: (gameId: number) => void;
}

export default function GameLobby({ playerId, onJoinGame }: GameLobbyProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);

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

  const createGame = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_players: 6, owner_id: playerId }),
      });

      if (response.ok) {
        const game = await response.json();
        // Auto-join the creator immediately
        const joinResponse = await fetch(`/api/games/${game.id}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ player_id: playerId }),
        });
        if (joinResponse.ok) {
          onJoinGame(game.id);
        } else {
          const error = await joinResponse.json();
          alert(error.error || "Failed to join game");
        }
      } else {
        alert("Failed to create game");
      }
    } catch (error) {
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
        body: JSON.stringify({ player_id: playerId }),
      });

      if (response.ok) {
        onJoinGame(gameId);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to join game");
      }
    } catch (error) {
      alert("Error joining game");
    } finally {
      setLoading(false);
    }
  };

  const startGame = async (gameId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/games/${gameId}/start`, {
        method: "POST",
      });

      if (response.ok) {
        onJoinGame(gameId);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to start game");
      }
    } catch (error) {
      alert("Error starting game");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lobby">
      <div className="lobby-header">
        <h1>🎮 Game Lobby</h1>
        <button
          onClick={createGame}
          disabled={loading}
          className="create-game-btn"
        >
          {loading ? "Loading..." : "+ Create New Game"}
        </button>
      </div>

      <div className="games-list">
        <h2>Available Games</h2>
        {games.length === 0 ? (
          <p className="no-games">
            No games available. Create one to get started!
          </p>
        ) : (
          games.map((game) => (
            <div key={game.id} className="game-card">
              <div className="game-info">
                <h3>Game #{game.id}</h3>
                <p>
                  Players: {game.players.length} / {game.max_players}
                </p>
                <p>Status: {game.status}</p>
              </div>
              <div className="game-actions">
                {game.players.some(
                  (gp: GamePlayer) => gp.player_id === playerId
                ) ? (
                  <button
                    onClick={() => onJoinGame(game.id)}
                    className="join-btn"
                  >
                    Rejoin Game
                  </button>
                ) : game.players.length < game.max_players ? (
                  <button
                    onClick={() => joinGame(game.id)}
                    disabled={loading}
                    className="join-btn"
                  >
                    Join Game
                  </button>
                ) : (
                  <span className="full-badge">Full</span>
                )}
                {game.players.some(
                  (gp: GamePlayer) => gp.player_id === playerId
                ) &&
                  game.players.length >= 2 && (
                    <button
                      onClick={() => startGame(game.id)}
                      disabled={loading}
                      className="start-btn"
                    >
                      Start Game
                    </button>
                  )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
