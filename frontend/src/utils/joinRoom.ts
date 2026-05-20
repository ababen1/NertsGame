import { getDeviceId } from "./deviceId";
import { setDisplayNameForRoom, setActiveRoom } from "./roomSession";

export type JoinRoomResult = {
  gameId: number;
  participantId: number;
  roomCode: string;
};

export async function joinRoomByCode(
  roomCode: string,
  displayName: string,
): Promise<JoinRoomResult> {
  const name = displayName.trim();
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
  setDisplayNameForRoom(roomCode, name);
  setActiveRoom({
    gameId: participant.game_id,
    roomCode,
    participantId: participant.id,
  });

  return {
    gameId: participant.game_id,
    participantId: participant.id,
    roomCode,
  };
}
