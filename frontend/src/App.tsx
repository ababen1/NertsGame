import { useEffect, useState } from "react";
import GameLobby from "./components/GameLobby";
import GameBoard from "./components/GameBoard";
import RoomLobby from "./components/RoomLobby";
import "./App.css";
import { getDeviceId } from "./utils/deviceId";

type PlayerProfile = { id: number; username: string; device_id?: string };

function App() {
  const [currentGameId, setCurrentGameId] = useState<number | null>(null);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [gameStatus, setGameStatus] = useState<string | null>(null);

  // Load player from device (localStorage) on start
  useEffect(() => {
    const saved = localStorage.getItem("nertsPlayer");
    const load = async () => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as PlayerProfile;
          // Offline profile (id=0) should not hit backend
          if (parsed.id === 0) {
            setPlayer(parsed);
            setIsOffline(true);
            setCurrentGameId(1);
            return;
          }

          // Try to load by device_id first (new approach)
          const deviceId = getDeviceId();
          const res = await fetch(`/api/players/device/${deviceId}`);
          if (res.ok) {
            const data = await res.json();
            setPlayer({
              id: data.id,
              username: data.username,
              device_id: data.device_id,
            });
            localStorage.setItem(
              "nertsPlayer",
              JSON.stringify({
                id: data.id,
                username: data.username,
                device_id: data.device_id,
              })
            );
            return;
          }

          // Fallback: try loading by ID (for backward compatibility)
          if (parsed.id) {
            const resById = await fetch(`/api/players/${parsed.id}`);
            if (resById.ok) {
              const data = await resById.json();
              setPlayer({
                id: data.id,
                username: data.username,
                device_id: data.device_id,
              });
              localStorage.setItem(
                "nertsPlayer",
                JSON.stringify({
                  id: data.id,
                  username: data.username,
                  device_id: data.device_id,
                })
              );
              return;
            }
          }
        } catch (err) {
          // ignore and fall back to login
        }
        localStorage.removeItem("nertsPlayer");
      }
    };
    load().finally(() => setLoadingProfile(false));
  }, []);

  // Check game status and show appropriate component
  useEffect(() => {
    if (currentGameId && !isOffline) {
      const checkGameStatus = async () => {
        try {
          const response = await fetch(`/api/games/${currentGameId}`);
          if (response.ok) {
            const game = await response.json();
            setGameStatus(game.status);
          }
        } catch (error) {
          console.error("Failed to fetch game status:", error);
        }
      };
      checkGameStatus();
      // Poll for status changes (or use WebSocket updates)
      const interval = setInterval(checkGameStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [currentGameId, isOffline]);

  const handlePlayOffline = (): void => {
    const offlinePlayer = { id: 0, username: "Offline Player" };
    setPlayer(offlinePlayer);
    localStorage.setItem("nertsPlayer", JSON.stringify(offlinePlayer));
    setLoadingProfile(false);
    setCurrentGameId(1);
    setIsOffline(true);
  };

  const handleLogin = async (username: string) => {
    setIsOffline(false);
    const deviceId = getDeviceId();
    const response = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, device_id: deviceId }),
    });

    if (response.ok) {
      const playerResp = await response.json();
      const profile = {
        id: playerResp.id,
        username: playerResp.username,
        device_id: playerResp.device_id,
      };
      setPlayer(profile);
      localStorage.setItem("nertsPlayer", JSON.stringify(profile));
    } else {
      const error = await response.json();
      throw new Error(error.error || "Failed to create player");
    }
  };

  const handleRename = async (username: string) => {
    if (isOffline) {
      // Offline mode: just update local profile
      const profile = { id: player?.id ?? 0, username };
      setPlayer(profile);
      localStorage.setItem("nertsPlayer", JSON.stringify(profile));
      return;
    }
    if (!player) return;

    // Use device_id endpoint if available, otherwise fall back to ID
    const deviceId = player.device_id || getDeviceId();
    const endpoint = deviceId
      ? `/api/players/device/${deviceId}`
      : `/api/players/${player.id}`;

    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    if (response.ok) {
      const updated = await response.json();
      const profile = {
        id: updated.id,
        username: updated.username,
        device_id: updated.device_id,
      };
      setPlayer(profile);
      localStorage.setItem("nertsPlayer", JSON.stringify(profile));
    } else {
      const error = await response.json();
      throw new Error(error.error || "Failed to update name");
    }
  };

  if (loadingProfile) {
    return (
      <div className="app">
        <div className="login-container">
          <h1>🎮 Nerts Online</h1>
          <p>Loading player...</p>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="app">
        <div className="login-container">
          <h1>🎮 Nerts Online</h1>
          <LoginForm
            handlePlayOffline={handlePlayOffline}
            initialUsername={
              localStorage.getItem("nertsPlayer")
                ? JSON.parse(localStorage.getItem("nertsPlayer") as string)
                    ?.username
                : ""
            }
            onLogin={async (username) => {
              try {
                await handleLogin(username);
              } catch (err: any) {
                alert(err.message || "Failed to start");
              }
            }}
          />
        </div>
      </div>
    );
  }

  if (!currentGameId) {
    return (
      <div className="app">
        <GameLobby
          playerId={player.id}
          onJoinGame={async (gameId) => {
            setCurrentGameId(gameId);
            // Fetch game status to determine which component to show
            try {
              const response = await fetch(`/api/games/${gameId}`);
              if (response.ok) {
                const game = await response.json();
                setGameStatus(game.status);
              }
            } catch (error) {
              console.error("Failed to fetch game status:", error);
            }
          }}
        />
      </div>
    );
  }

  // Show RoomLobby for waiting games, GameBoard for active games
  if (gameStatus === "waiting" && !isOffline) {
    return (
      <div className="app">
        <RoomLobby
          gameId={currentGameId}
          playerId={player.id}
          onLeaveRoom={() => {
            setCurrentGameId(null);
            setGameStatus(null);
          }}
          onGameStart={() => {
            setGameStatus("active");
          }}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <GameBoard
        gameId={currentGameId}
        playerId={player.id}
        playerName={player.username}
        onRename={handleRename}
        onLeaveGame={() => {
          if (isOffline || player.id === 0) {
            setPlayer(null);
            setIsOffline(false);
            localStorage.removeItem("nertsPlayer");
          }
          setCurrentGameId(null);
          setGameStatus(null);
        }}
        isOffline={isOffline || player.id === 0}
      />
    </div>
  );
}

function LoginForm({
  onLogin,
  initialUsername,
  handlePlayOffline,
}: {
  onLogin: (username: string) => void | Promise<void>;
  initialUsername?: string;
  handlePlayOffline: () => void;
}) {
  const [username, setUsername] = useState(initialUsername || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onLogin(username);
    } catch (error: any) {
      alert(error?.message || "Error connecting to server");
    } finally {
      setLoading(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="login-form">
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Start Playing"}
      </button>
      <button
        type="button"
        className="secondary"
        onClick={() => handlePlayOffline()}
      >
        Play single-player (offline)
      </button>
    </form>
  );
}

export default App;
