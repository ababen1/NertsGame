import { useEffect, useState } from "react";
import GameLobby from "./components/GameLobby";
import GameBoard from "./components/GameBoard";
import "./App.css";

type PlayerProfile = { id: number; username: string };

function App() {
  const [currentGameId, setCurrentGameId] = useState<number | null>(null);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Load player from device (localStorage) on start
  useEffect(() => {
    const saved = localStorage.getItem("nertsPlayer");
    const load = async () => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as PlayerProfile;
          const res = await fetch(`/api/players/${parsed.id}`);
          if (res.ok) {
            const data = await res.json();
            setPlayer({ id: data.id, username: data.username });
            return;
          }
        } catch (err) {
          // ignore and fall back to login
        }
        localStorage.removeItem("nertsPlayer");
      }
    };
    load().finally(() => setLoadingProfile(false));
  }, []);

  const handlePlayOffline = (): void => {
    const offlinePlayer = { id: 0, username: "Offline Player" };
    setPlayer(offlinePlayer);
    localStorage.setItem("nertsPlayer", JSON.stringify(offlinePlayer));
    setLoadingProfile(false);
    setCurrentGameId(1);
  };

  const handleLogin = async (username: string) => {
    const response = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    if (response.ok) {
      const playerResp = await response.json();
      const profile = { id: playerResp.id, username: playerResp.username };
      setPlayer(profile);
      localStorage.setItem("nertsPlayer", JSON.stringify(profile));
    } else {
      const error = await response.json();
      throw new Error(error.error || "Failed to create player");
    }
  };

  const handleRename = async (username: string) => {
    if (!player) return;
    const response = await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    if (response.ok) {
      const updated = await response.json();
      const profile = { id: updated.id, username: updated.username };
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
          onJoinGame={(gameId) => setCurrentGameId(gameId)}
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
        onLeaveGame={() => setCurrentGameId(null)}
        isOffline={player.id === 0}
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
      <button onClick={() => handlePlayOffline()}>Play offline </button>
    </form>
  );
}

export default App;
