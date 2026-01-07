import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { GameState, LobbyState } from "../types/game";

export function useGameSocket(
  gameId: number,
  playerId: number,
  enabled: boolean = true
) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setSocket(null);
      setConnected(false);
      setGameState(null);
      return;
    }

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/f5db1c29-c371-4701-9cab-8b57bf1cf498", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "useGameSocket.ts:14",
        message: "Socket init started",
        data: { gameId, playerId, enabled },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "6",
      }),
    }).catch(() => {});
    // #endregion

    const newSocket = io("http://localhost:5000", {
      transports: ["polling", "websocket"],
      upgrade: true,
    });

    newSocket.on("connect", () => {
      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/f5db1c29-c371-4701-9cab-8b57bf1cf498",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "useGameSocket.ts:27",
            message: "Socket connected",
            data: { gameId, playerId },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "6",
          }),
        }
      ).catch(() => {});
      // #endregion
      setConnected(true);
      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/f5db1c29-c371-4701-9cab-8b57bf1cf498",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "useGameSocket.ts:29",
            message: "Emitting join_game",
            data: { game_id: gameId, player_id: playerId },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "1,4,5",
          }),
        }
      ).catch(() => {});
      // #endregion
      newSocket.emit("join_game", { game_id: gameId, player_id: playerId });
    });

    newSocket.on("disconnect", () => {
      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/f5db1c29-c371-4701-9cab-8b57bf1cf498",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "useGameSocket.ts:33",
            message: "Socket disconnected",
            data: {},
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "2",
          }),
        }
      ).catch(() => {});
      // #endregion
      setConnected(false);
    });

    newSocket.on("joined_game", (data: any) => {
      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/f5db1c29-c371-4701-9cab-8b57bf1cf498",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "useGameSocket.ts:37",
            message: "Received joined_game event",
            data: data,
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "1,2",
          }),
        }
      ).catch(() => {});
      // #endregion
      console.log("Joined game room");
    });

    newSocket.on("lobby_state", (state: LobbyState) => {
      setLobbyState(state);
      setGameState(null); // Clear game state when in lobby
    });

    newSocket.on("lobby_update", (state: LobbyState) => {
      setLobbyState(state);
    });

    newSocket.on("game_state", (state: GameState) => {
      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/f5db1c29-c371-4701-9cab-8b57bf1cf498",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "useGameSocket.ts:41",
            message: "Received game_state event",
            data: {
              hasState: !!state,
              stateKeys: state ? Object.keys(state) : null,
              hasPlayers: !!state?.players,
              playerIdInState: state?.players?.[playerId.toString()]
                ? true
                : false,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "1,2,3,4",
          }),
        }
      ).catch(() => {});
      // #endregion
      setGameState(state);
      setLobbyState(null); // Clear lobby state when game starts
      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/f5db1c29-c371-4701-9cab-8b57bf1cf498",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "useGameSocket.ts:43",
            message: "Updated gameState state",
            data: { stateSet: !!state },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "3",
          }),
        }
      ).catch(() => {});
      // #endregion
    });

    newSocket.on("round_ended", (data: any) => {
      console.log("Round ended:", data);
    });

    newSocket.on("error", (error: { message: string }) => {
      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/f5db1c29-c371-4701-9cab-8b57bf1cf498",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "useGameSocket.ts:48",
            message: "Socket error received",
            data: error,
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "1,2,4,5",
          }),
        }
      ).catch(() => {});
      // #endregion
      console.error("Socket error:", error.message);
      alert(error.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [gameId, playerId, enabled]);

  const drawDeck = useCallback(() => {
    if (socket) {
      socket.emit("draw_deck", { game_id: gameId, player_id: playerId });
    }
  }, [socket, gameId, playerId]);

  const playCard = useCallback(
    (card: any, targetType: "center" | "personal", target: string | number) => {
      if (socket) {
        socket.emit("play_card", {
          game_id: gameId,
          player_id: playerId,
          card,
          target_type: targetType,
          target,
        });
      }
    },
    [socket, gameId, playerId]
  );

  const callNerts = useCallback(() => {
    if (socket) {
      socket.emit("call_nerts", { game_id: gameId, player_id: playerId });
    }
  }, [socket, gameId, playerId]);

  const moveStack = useCallback(
    (fromStack: number, toStack: number, count: number = 1) => {
      if (socket) {
        socket.emit("move_stack", {
          game_id: gameId,
          player_id: playerId,
          from_stack: fromStack,
          to_stack: toStack,
          count,
        });
      }
    },
    [socket, gameId, playerId]
  );

  const setReady = useCallback(async () => {
    try {
      const response = await fetch(`/api/games/${gameId}/ready`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: playerId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to set ready status");
      }
    } catch (error: any) {
      console.error("Failed to set ready:", error);
      alert(error.message || "Failed to set ready status");
    }
  }, [gameId, playerId]);

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
  };
}
