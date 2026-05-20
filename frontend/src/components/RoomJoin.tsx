import { useState } from "react";
import { getDeviceId } from "../utils/deviceId";
import {
  getStoredDisplayName,
  setStoredDisplayName,
  setActiveRoom,
} from "../utils/roomSession";
import "./RoomJoin.css";

interface RoomJoinProps {
  roomCode: string;
  onJoined: (gameId: number, participantId: number, roomCode: string) => void;
  onCancel: () => void;
}

export default function RoomJoin({
  roomCode,
  onJoined,
  onCancel,
}: RoomJoinProps) {
  const [displayName, setDisplayName] = useState(getStoredDisplayName());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = displayName.trim();
    if (!name) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/games/by-code/${encodeURIComponent(roomCode)}/join`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            device_id: getDeviceId(),
            display_name: name,
          }),
        },
      );

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "Failed to join room");
      }

      const participant = await response.json();
      setStoredDisplayName(name);
      setActiveRoom({
        gameId: participant.game_id,
        roomCode,
        participantId: participant.id,
      });
      onJoined(participant.game_id, participant.id, roomCode);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to join room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="room-join login-container">
      <h1>Join room</h1>
      <p className="room-join-code">
        Room: <code>{roomCode}</code>
      </p>
      <form onSubmit={handleJoin} className="login-form room-join-form">
        <label htmlFor="display-name">Your display name</label>
        <input
          id="display-name"
          type="text"
          placeholder="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          maxLength={80}
        />
        {error && <p className="room-join-error">{error}</p>}
        <button type="submit" disabled={loading || !displayName.trim()}>
          {loading ? "Joining..." : "Join room"}
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          Back to lobby
        </button>
      </form>
    </div>
  );
}
