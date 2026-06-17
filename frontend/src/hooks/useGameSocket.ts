import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Card, GameState, LobbyState } from "../types/game";
import {
  applyDrawDeck,
  applyMoveStack,
  applyPlayCard,
} from "../utils/gameStateMutations";

export function useGameSocket(
  gameId: number,
  deviceId: string,
  participantId: number,
  enabled: boolean = true
) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
  const [connected, setConnected] = useState(false);
  const lobbyStateRef = useRef<LobbyState | null>(null);
  const serverStateRef = useRef<GameState | null>(null);

  useEffect(() => {
    lobbyStateRef.current = lobbyState;
  }, [lobbyState]);

  useEffect(() => {
    if (!enabled) {
      setSocket(null);
      setConnected(false);
      setGameState(null);
      serverStateRef.current = null;
      return;
    }

    const newSocket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      setConnected(true);
      newSocket.emit("join_game", {
        game_id: gameId,
        device_id: deviceId,
      });
    });

    newSocket.on("disconnect", () => {
      setConnected(false);
    });

    newSocket.on("joined_game", () => {
      console.log("Joined game room");
    });

    newSocket.on("lobby_state", (state: LobbyState) => {
      setLobbyState(state);
      setGameState(null);
      serverStateRef.current = null;
    });

    newSocket.on("lobby_update", (state: LobbyState) => {
      setLobbyState(state);
    });

    newSocket.on("game_state", (state: GameState) => {
      serverStateRef.current = state;
      setGameState(state);
      setLobbyState(null);
    });

    newSocket.on("round_ended", (data: unknown) => {
      console.log("Round ended:", data);
    });

    newSocket.on("error", (error: { message: string }) => {
      console.error("Socket error:", error.message);
      if (serverStateRef.current) {
        setGameState(serverStateRef.current);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [gameId, deviceId, enabled]);

  const rollback = useCallback(() => {
    if (serverStateRef.current) {
      setGameState(serverStateRef.current);
    }
  }, []);

  const drawDeck = useCallback(() => {
    setGameState((prev) => {
      if (!prev) return prev;
      return applyDrawDeck(prev, participantId) ?? prev;
    });
    if (socket) {
      socket.emit("draw_deck", { game_id: gameId, device_id: deviceId });
    }
  }, [socket, gameId, deviceId, participantId]);

  const playCard = useCallback(
    (
      card: Card,
      targetType: "center" | "personal",
      target: string | number
    ) => {
      setGameState((prev) => {
        if (!prev) return prev;
        return applyPlayCard(prev, participantId, card, targetType, target) ?? prev;
      });
      if (socket) {
        socket.emit("play_card", {
          game_id: gameId,
          device_id: deviceId,
          card,
          target_type: targetType,
          target,
        });
      }
    },
    [socket, gameId, deviceId, participantId]
  );

  const callNerts = useCallback(() => {
    if (socket) {
      socket.emit("call_nerts", { game_id: gameId, device_id: deviceId });
    }
  }, [socket, gameId, deviceId]);

  const moveStack = useCallback(
    (fromStack: number, toStack: number, count: number = 1) => {
      setGameState((prev) => {
        if (!prev) return prev;
        return (
          applyMoveStack(prev, participantId, fromStack, toStack, count) ?? prev
        );
      });
      if (socket) {
        socket.emit("move_stack", {
          game_id: gameId,
          device_id: deviceId,
          from_stack: fromStack,
          to_stack: toStack,
          count,
        });
      }
    },
    [socket, gameId, deviceId, participantId]
  );

  const setReady = useCallback(async () => {
    const currentState = lobbyStateRef.current;
    if (currentState) {
      const updatedState = {
        ...currentState,
        players: currentState.players.map((p) =>
          p.player_id === participantId
            ? { ...p, is_ready: !p.is_ready }
            : p
        ),
      };
      setLobbyState(updatedState);
    }

    try {
      const response = await fetch(`/api/games/${gameId}/ready`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: deviceId }),
      });
      if (!response.ok) {
        if (currentState) {
          setLobbyState(currentState);
        }
        const error = await response.json();
        throw new Error(error.error || "Failed to set ready status");
      }
    } catch (error: unknown) {
      console.error("Failed to set ready:", error);
      alert(
        error instanceof Error ? error.message : "Failed to set ready status"
      );
    }
  }, [gameId, deviceId, participantId]);

  return {
    socket,
    gameState,
    lobbyState,
    connected,
    drawDeck,
    playCard,
    callNerts,
    moveStack,
    setReady,
    rollback,
  };
}
