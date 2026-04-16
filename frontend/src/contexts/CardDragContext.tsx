import React, { createContext, useContext } from "react";
import { useCardDrag } from "../hooks/useCardDrag";

interface CardDragContextType {
  dragState: ReturnType<typeof useCardDrag>["dragState"];
  startDrag: ReturnType<typeof useCardDrag>["startDrag"];
  cancelDrag: ReturnType<typeof useCardDrag>["cancelDrag"];
  completeDrag: ReturnType<typeof useCardDrag>["completeDrag"];
  floatingCardRef: React.RefObject<HTMLDivElement>;
}

const CardDragContext = createContext<CardDragContextType | null>(null);

export function CardDragProvider({ children }: { children: React.ReactNode }) {
  const { dragState, startDrag, cancelDrag, completeDrag, floatingCardRef } = useCardDrag();

  return (
    <CardDragContext.Provider
      value={{
        dragState,
        startDrag,
        cancelDrag,
        completeDrag,
        floatingCardRef,
      }}
    >
      {children}
    </CardDragContext.Provider>
  );
}

export function useCardDragContext() {
  const context = useContext(CardDragContext);
  if (!context) {
    throw new Error("useCardDragContext must be used within CardDragProvider");
  }
  return context;
}

