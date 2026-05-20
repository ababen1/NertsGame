const DISPLAY_NAME_KEY = "nertsDisplayName";
const ACTIVE_ROOM_KEY = "nertsActiveRoom";
const ROOM_DISPLAY_NAMES_KEY = "nertsRoomDisplayNames";

export type ActiveRoomSession = {
  gameId: number;
  roomCode: string;
  participantId: number;
};

type RoomDisplayNames = Record<string, string>;

function getRoomDisplayNames(): RoomDisplayNames {
  const raw = localStorage.getItem(ROOM_DISPLAY_NAMES_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as RoomDisplayNames;
  } catch {
    return {};
  }
}

export function getStoredDisplayName(): string {
  return localStorage.getItem(DISPLAY_NAME_KEY) || "";
}

export function setStoredDisplayName(name: string): void {
  localStorage.setItem(DISPLAY_NAME_KEY, name);
}

export function getDisplayNameForRoom(roomCode: string): string {
  return getRoomDisplayNames()[roomCode] || "";
}

export function setDisplayNameForRoom(roomCode: string, name: string): void {
  const names = getRoomDisplayNames();
  names[roomCode] = name;
  localStorage.setItem(ROOM_DISPLAY_NAMES_KEY, JSON.stringify(names));
  setStoredDisplayName(name);
}

export function getActiveRoom(): ActiveRoomSession | null {
  const raw = localStorage.getItem(ACTIVE_ROOM_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActiveRoomSession;
  } catch {
    return null;
  }
}

export function setActiveRoom(session: ActiveRoomSession): void {
  localStorage.setItem(ACTIVE_ROOM_KEY, JSON.stringify(session));
}

export function clearActiveRoom(): void {
  localStorage.removeItem(ACTIVE_ROOM_KEY);
}
