import { useEffect, useState, useCallback } from "react";
import GameLobby from "./components/GameLobby";
import GameBoard from "./components/GameBoard";
import RoomLobby from "./components/RoomLobby";
import "./App.css";
import { getDeviceId } from "./utils/deviceId";
import { has_multiplayer } from "./utils/constants";
import {
  getStoredDisplayName,
  setStoredDisplayName,
  setActiveRoom,
  clearActiveRoom,
  getDisplayNameForRoom,
  setDisplayNameForRoom,
} from "./utils/roomSession";
import { getRoomCodeFromPath, roomPath } from "./utils/roomUrl";
import { joinRoomByCode } from "./utils/joinRoom";

function App() {
  const [displayName, setDisplayName] = useState("");
  const [participantId, setParticipantId] = useState<number | null>(null);
  const [currentGameId, setCurrentGameId] = useState<number | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomCodeFromUrl, setRoomCodeFromUrl] = useState<string | null>(() =>
    getRoomCodeFromPath(window.location.pathname),
  );
  const [loading, setLoading] = useState(true);
  const [autoJoining, setAutoJoining] = useState(false);
  const [showLobby, setShowLobby] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [gameStatus, setGameStatus] = useState<string | null>(null);

  const deviceId = getDeviceId();

  useEffect(() => {
    const onPopState = () => {
      setRoomCodeFromUrl(getRoomCodeFromPath(window.location.pathname));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!has_multiplayer) {
      setDisplayName("Offline Player");
      setParticipantId(0);
      setIsOffline(true);
      setCurrentGameId(1);
      setLoading(false);
      return;
    }

    const savedName = getStoredDisplayName();
    if (savedName) {
      setDisplayName(savedName);
    }

    const urlCode = getRoomCodeFromPath(window.location.pathname);
    if (urlCode) {
      setRoomCodeFromUrl(urlCode);
    }

    setLoading(false);
  }, []);

  const handleEnterRoom = useCallback(
    (gameId: number, pid: number, code: string, name?: string) => {
      const resolvedName = name?.trim() || displayName;
      setCurrentGameId(gameId);
      setParticipantId(pid);
      setRoomCode(code);
      setRoomCodeFromUrl(code);
      setGameStatus("waiting");
      setActiveRoom({ gameId, roomCode: code, participantId: pid });
      if (resolvedName) {
        setDisplayName(resolvedName);
        setDisplayNameForRoom(code, resolvedName);
      }
      window.history.pushState({}, "", roomPath(code));
    },
    [displayName],
  );

  useEffect(() => {
    if (!has_multiplayer || loading || isOffline) return;

    const urlCode = roomCodeFromUrl;
    if (!urlCode) return;

    const savedName = getDisplayNameForRoom(urlCode);
    if (!savedName) return;

    if (currentGameId && roomCode === urlCode) return;

    let cancelled = false;
    setAutoJoining(true);

    joinRoomByCode(urlCode, savedName)
      .then((result) => {
        if (!cancelled) {
          handleEnterRoom(
            result.gameId,
            result.participantId,
            result.roomCode,
            savedName,
          );
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          console.error("Auto-join failed:", err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAutoJoining(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    loading,
    roomCodeFromUrl,
    currentGameId,
    roomCode,
    isOffline,
    handleEnterRoom,
  ]);

  useEffect(() => {
    if (currentGameId && !isOffline) {
      const checkGameStatus = async () => {
        try {
          const response = await fetch(`/api/games/${currentGameId}`);
          if (response.ok) {
            const game = await response.json();
            setGameStatus(game.status);
            setRoomCode(game.room_code);
          }
        } catch (error) {
          console.error("Failed to fetch game status:", error);
        }
      };
      checkGameStatus();
    }
  }, [currentGameId, isOffline]);

  const handleLeaveRoom = useCallback(() => {
    setCurrentGameId(null);
    setParticipantId(null);
    setRoomCode(null);
    setGameStatus(null);
    setShowLobby(false);
    clearActiveRoom();
    window.history.pushState({}, "", "/");
    setRoomCodeFromUrl(null);
  }, []);

  const handleJoinFromHome = useCallback(
    async (code: string, name: string) => {
      const result = await joinRoomByCode(code, name);
      handleEnterRoom(
        result.gameId,
        result.participantId,
        result.roomCode,
        name,
      );
    },
    [handleEnterRoom],
  );

  const handleContinueToLobby = (name: string) => {
    const trimmed = name.trim();
    setDisplayName(trimmed);
    setStoredDisplayName(trimmed);
    setShowLobby(true);
  };

  const handlePlayOffline = (): void => {
    setDisplayName("Offline Player");
    setParticipantId(0);
    setIsOffline(true);
    setCurrentGameId(1);
    setLoading(false);
  };

  const handleRename = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (isOffline) {
      setDisplayName(trimmed);
      setStoredDisplayName(trimmed);
      return;
    }

    if (!currentGameId) {
      setDisplayName(trimmed);
      setStoredDisplayName(trimmed);
      return;
    }

    const response = await fetch(`/api/games/${currentGameId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_id: deviceId,
        display_name: trimmed,
      }),
    });

    if (response.ok) {
      setDisplayName(trimmed);
      setStoredDisplayName(trimmed);
      if (roomCode) {
        setDisplayNameForRoom(roomCode, trimmed);
      }
    } else {
      const error = await response.json();
      throw new Error(error.error || "Failed to update name");
    }
  };

  if (loading || autoJoining) {
    return (
      <div className="app">
        <div className="login-container">
          <h1>🎮 Nerts Online</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (isOffline) {
    return (
      <div className="app">
        <GameBoard
          gameId={currentGameId!}
          playerId={0}
          deviceId={deviceId}
          playerName={displayName}
          onRename={handleRename}
          onLeaveGame={() => {
            setIsOffline(false);
            setCurrentGameId(null);
            setParticipantId(null);
          }}
          isOffline
        />
      </div>
    );
  }

  if (!currentGameId || participantId === null) {
    if (showLobby && displayName) {
      return (
        <div className="app">
          <GameLobby displayName={displayName} onJoinGame={handleEnterRoom} />
        </div>
      );
    }

    return (
      <div className="app">
        <div className="login-container">
          <h1>🎮 Nerts Online</h1>
          <HomePage
            initialRoomCode={roomCodeFromUrl || ""}
            initialDisplayName={
              roomCodeFromUrl
                ? getDisplayNameForRoom(roomCodeFromUrl) ||
                  getStoredDisplayName()
                : getStoredDisplayName()
            }
            onJoinRoom={handleJoinFromHome}
            onContinueToLobby={handleContinueToLobby}
            onPlayOffline={handlePlayOffline}
          />
        </div>
      </div>
    );
  }

  if (gameStatus === "waiting") {
    return (
      <div className="app">
        <RoomLobby
          gameId={currentGameId}
          participantId={participantId}
          deviceId={deviceId}
          roomCode={roomCode}
          onLeaveRoom={handleLeaveRoom}
          onGameStart={() => setGameStatus("active")}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <GameBoard
        gameId={currentGameId}
        playerId={participantId}
        deviceId={deviceId}
        playerName={displayName}
        onRename={handleRename}
        onLeaveGame={handleLeaveRoom}
        isOffline={false}
      />
    </div>
  );
}

function HomePage({
  initialRoomCode,
  initialDisplayName,
  onJoinRoom,
  onContinueToLobby,
  onPlayOffline,
}: {
  initialRoomCode: string;
  initialDisplayName: string;
  onJoinRoom: (roomCode: string, displayName: string) => Promise<void>;
  onContinueToLobby: (displayName: string) => void;
  onPlayOffline: () => void;
}) {
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRoomCode(initialRoomCode);
  }, [initialRoomCode]);

  useEffect(() => {
    setDisplayName(initialDisplayName);
  }, [initialDisplayName]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = roomCode.trim();
    const name = displayName.trim();
    if (!code || !name) return;

    setLoading(true);
    setError(null);
    try {
      await onJoinRoom(code, name);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to join room");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    const name = displayName.trim();
    if (!name) return;
    onContinueToLobby(name);
  };

  return (
    <form onSubmit={handleJoin} className="login-form">
      <p>Enter a room code to join, or continue to browse public rooms.</p>
      <label htmlFor="room-code">Room code</label>
      <input
        id="room-code"
        type="text"
        placeholder="Room code"
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value)}
        maxLength={80}
      />
      <label htmlFor="display-name">Display name</label>
      <input
        id="display-name"
        type="text"
        placeholder="Display name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        required
        maxLength={80}
      />
      {error && <p className="home-error">{error}</p>}
      <button
        type="submit"
        disabled={loading || !roomCode.trim() || !displayName.trim()}
      >
        {loading ? "Joining..." : "Join room"}
      </button>
      <button
        type="button"
        className="primary"
        disabled={!displayName.trim()}
        onClick={handleContinue}
      >
        View public rooms
      </button>
      <button type="button" className="secondary" onClick={onPlayOffline}>
        Play single-player (offline)
      </button>
    </form>
  );
}

export default App;
