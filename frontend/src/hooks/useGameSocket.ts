import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { GameState } from "../types/game";

export function useGameSocket(
  gameId: number,
  playerId: number,
  enabled: boolean = true
) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setSocket(null);
      setConnected(false);
      setGameState(null);
      return;
    }

    const newSocket = io("http://localhost:5000", {
      transports: ["polling", "websocket"],
      upgrade: true,
    });

    newSocket.on("connect", () => {
      setConnected(true);
      newSocket.emit("join_game", { game_id: gameId, player_id: playerId });
    });

    newSocket.on("disconnect", () => {
      setConnected(false);
    });

    newSocket.on("joined_game", () => {
      console.log("Joined game room");
    });

    newSocket.on("game_state", (state: GameState) => {
      setGameState(state);
    });

    newSocket.on("round_ended", (data: any) => {
      console.log("Round ended:", data);
    });

    newSocket.on("error", (error: { message: string }) => {
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

  return {
    socket,
    gameState,
    connected,
    drawDeck,
    playCard,
    callNerts,
    moveStack,
  };
}
