/** Parse `/room/:roomCode` from the current path. */
export function getRoomCodeFromPath(path: string): string | null {
  const match = path.match(/^\/room\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function roomPath(roomCode: string): string {
  return `/room/${encodeURIComponent(roomCode)}`;
}

export function roomShareUrl(roomCode: string): string {
  return `${window.location.origin}${roomPath(roomCode)}`;
}
