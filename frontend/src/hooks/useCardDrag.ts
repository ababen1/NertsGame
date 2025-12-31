import { useState, useCallback, useEffect, useRef } from "react";
import { Card } from "../types/game";
import { DragPayload } from "../components/PlayerArea/types";
import { cardAssetPath } from "../utils/cardAsset";
import { CARD_STACK_OFFSET } from "../utils/constants";

interface DragState {
  isDragging: boolean;
  payload: DragPayload | null;
  mouseX: number;
  mouseY: number;
  card: Card | null;
  originalElement: HTMLElement | null;
  originalPosition: { x: number; y: number; width: number; height: number } | null;
}

export function useCardDrag() {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    payload: null,
    mouseX: 0,
    mouseY: 0,
    card: null,
    originalElement: null,
    originalPosition: null,
  });

  const floatingCardRef = useRef<HTMLDivElement | null>(null);

  const startDrag = useCallback((
    payload: DragPayload,
    card: Card,
    element: HTMLElement,
    event: React.MouseEvent
  ) => {
    const rect = element.getBoundingClientRect();
    setDragState({
      isDragging: true,
      payload,
      mouseX: event.clientX,
      mouseY: event.clientY,
      card,
      originalElement: element,
      originalPosition: {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      },
    });
  }, []);

  const cancelDrag = useCallback(() => {
    if (dragState.isDragging && dragState.originalElement) {
      // Return card to original position with animation
      const element = dragState.originalElement;
      const originalPos = dragState.originalPosition;
      if (originalPos) {
        element.style.transition = "all 0.3s ease-out";
        element.style.transform = "";
        element.style.opacity = "1";
        element.style.zIndex = "";
        
        // Reset after animation
        setTimeout(() => {
          element.style.transition = "";
        }, 300);
      }
    }
    setDragState({
      isDragging: false,
      payload: null,
      mouseX: 0,
      mouseY: 0,
      card: null,
      originalElement: null,
      originalPosition: null,
    });
  }, [dragState.isDragging, dragState.originalElement, dragState.originalPosition]);

  const completeDrag = useCallback(() => {
    if (dragState.originalElement) {
      const element = dragState.originalElement;
      element.style.transition = "";
      element.style.transform = "";
      element.style.opacity = "";
      element.style.zIndex = "";
    }
    setDragState({
      isDragging: false,
      payload: null,
      mouseX: 0,
      mouseY: 0,
      card: null,
      originalElement: null,
      originalPosition: null,
    });
  }, [dragState.originalElement]);

  // Update mouse position during drag
  useEffect(() => {
    if (!dragState.isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setDragState((prev) => ({
        ...prev,
        mouseX: e.clientX,
        mouseY: e.clientY,
      }));
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      cancelDrag();
    };

    const handleMouseUp = (e: MouseEvent) => {
      // Don't auto-cancel on mouseup - let the card continue following the cursor
      // Component-level handlers (onMouseUp in PersonalStack, CenterStacks) will handle drops
      // Right-click is handled separately in handleContextMenu
    };
    
    const handleMouseDown = (e: MouseEvent) => {
      // If clicking while dragging and not over a card/stack, cancel the drag
      // This allows clicking on empty space to cancel an active drag
      // But don't cancel if clicking on a card (might be starting a new drag)
      setDragState((prev) => {
        if (!prev.isDragging || e.button !== 0) return prev;
        
        const target = e.target as HTMLElement;
        // Check if clicking on a card or stack area
        const isCardOrStack = target.closest(".card-img") || 
                              target.closest(".personal-stack") ||
                              target.closest(".center-stack") ||
                              target.closest(".nerts-pile") ||
                              target.closest(".stack-fan");
        
        // Only cancel if clicking on empty space (not on a card/stack)
        if (!isCardOrStack) {
          // Clicking on empty space - cancel drag
          if (prev.originalElement && prev.originalPosition) {
            const element = prev.originalElement;
            element.style.transition = "all 0.3s ease-out";
            element.style.transform = "";
            element.style.opacity = "1";
            element.style.zIndex = "";
            
            setTimeout(() => {
              element.style.transition = "";
            }, 300);
          }
          
          return {
            isDragging: false,
            payload: null,
            mouseX: 0,
            mouseY: 0,
            card: null,
            originalElement: null,
            originalPosition: null,
          };
        }
        
        return prev;
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousedown", handleMouseDown);

    // Hide original card during drag
    if (dragState.originalElement) {
      dragState.originalElement.style.opacity = "0.3";
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousedown", handleMouseDown);
      if (dragState.originalElement) {
        dragState.originalElement.style.opacity = "";
      }
    };
  }, [dragState.isDragging, dragState.originalElement, cancelDrag]);

  // Update floating card position
  useEffect(() => {
    if (dragState.isDragging && floatingCardRef.current) {
      const container = floatingCardRef.current;
      const cardWidth = container.offsetWidth || 88;
      const cardHeight = container.offsetHeight || 123;
      
      // Calculate number of cards in stack
      const cardCount = dragState.payload?.subCards?.length || 1;
      const totalHeight = cardHeight + (cardCount - 1) * CARD_STACK_OFFSET;
      
      // Center the stack on the cursor
      container.style.left = `${dragState.mouseX - cardWidth / 2}px`;
      container.style.top = `${dragState.mouseY - totalHeight / 2}px`;
    }
  }, [dragState.mouseX, dragState.mouseY, dragState.isDragging, dragState.payload]);

  return {
    dragState,
    startDrag,
    cancelDrag,
    completeDrag,
    floatingCardRef,
  };
}

