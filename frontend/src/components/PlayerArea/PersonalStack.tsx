import { Card } from "../../types/game";
import { cardAssetPath } from "../../utils/cardAsset";
import { DragPayload } from "./types";
import "./PlayerArea.css";
import {
  isDraggableStack,
  isPickable,
  isDroppable,
  PickContext,
  DropTarget,
} from "../../utils/solitiareFuncs";
import { useCardDragContext } from "../../contexts/CardDragContext";
import { CARD_STACK_OFFSET } from "../../utils/constants";
import { useEffect, useRef } from "react";

interface PersonalStackProps {
  stack: Card[];
  stackIndex: number;
  onDrop: (payload: DragPayload | null) => void;
  onDragStartPayload: (payload: DragPayload) => DragPayload;
  pickContext: PickContext;
}

export default function PersonalStack({
  stack,
  stackIndex,
  onDrop,
  onDragStartPayload,
  pickContext,
}: PersonalStackProps) {
  const { startDrag, cancelDrag, completeDrag, dragState } =
    useCardDragContext();
  const isDraggingFromHere = useRef(false);

  useEffect(() => {
    if (!dragState.isDragging) {
      isDraggingFromHere.current = false;
    }
  }, [dragState.isDragging]);

  const parsePayload = (e: React.DragEvent) => {
    try {
      const data = e.dataTransfer.getData("application/json");
      if (!data) return null;
      const payload = JSON.parse(data) as DragPayload;

      // If payload is from a personal stack, add the subCards array (clicked card + all sub cards)
      if (
        payload.source === "personal" &&
        payload.fromStack !== undefined &&
        payload.subCards &&
        payload.subCards.length > 0
      ) {
        // subCards is already set in the payload from onDragStart
        return payload;
      }

      // For other sources (deck, nerts), subCards array is just the single card
      if (payload.card && !payload.subCards) {
        return {
          ...payload,
          subCards: [payload.card],
        };
      }

      return payload;
    } catch {
      return null;
    }
  };

  return (
    <div
      className="personal-stack"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const payload = parsePayload(e);

        // Handle custom drag (click-to-drag)
        if (dragState.isDragging && dragState.payload) {
          const customPayload = dragState.payload;
          if (customPayload) {
            // For stacks, we need to check the bottom card, not the top card
            let cardToCheck = customPayload.card;
            if (
              customPayload.source === "personal" &&
              customPayload.fromStack !== undefined &&
              customPayload.count &&
              customPayload.count > 1 &&
              pickContext.personalStacks
            ) {
              // Get the source stack and find the bottom card of the sequence
              const sourceStack =
                pickContext.personalStacks[customPayload.fromStack];
              if (sourceStack && sourceStack.length >= customPayload.count) {
                const startIdx = sourceStack.length - customPayload.count;
                const sequence = sourceStack.slice(startIdx);
                // Bottom card is the last card in the sequence
                cardToCheck = sequence[0];
              }
            }
            // Create a modified payload with the bottom card for validation
            const validationPayload: DragPayload = {
              ...customPayload,
              card: cardToCheck,
            };
            const target: DropTarget = { type: "personal", stack };
            if (!isDroppable(validationPayload, target)) {
              // Invalid drop - return card to original position
              cancelDrag();
              return;
            }
            // Valid drop
            onDrop(customPayload);
            completeDrag();
            isDraggingFromHere.current = false;
            return;
          }
        }

        // Handle HTML5 drag (fallback)
        if (payload) {
          // For stacks, we need to check the bottom card, not the top card
          let cardToCheck = payload.card;
          if (
            payload.source === "personal" &&
            payload.fromStack !== undefined &&
            payload.count &&
            payload.count > 1 &&
            pickContext.personalStacks
          ) {
            // Get the source stack and find the bottom card of the sequence
            const sourceStack = pickContext.personalStacks[payload.fromStack];
            if (sourceStack && sourceStack.length >= payload.count) {
              const startIdx = sourceStack.length - payload.count;
              const sequence = sourceStack.slice(startIdx);
              // Bottom card is the last card in the sequence
              cardToCheck = sequence[0];
            }
          }
          // Create a modified payload with the bottom card for validation
          const validationPayload: DragPayload = {
            ...payload,
            card: cardToCheck,
          };
          const target: DropTarget = { type: "personal", stack };
          if (!isDroppable(validationPayload, target)) {
            // Invalid drop - ignore it (card stays in place)
            return;
          }
        }
        onDrop(payload);
      }}
      onMouseUp={() => {
        // Handle drop on mouse up (also used by synthetic mouseup from touch end)
        if (
          dragState.isDragging &&
          dragState.payload &&
          !isDraggingFromHere.current
        ) {
          const customPayload = dragState.payload;
          if (customPayload) {
            let cardToCheck = customPayload.card;
            if (
              customPayload.source === "personal" &&
              customPayload.fromStack !== undefined &&
              customPayload.count &&
              customPayload.count > 1 &&
              pickContext.personalStacks
            ) {
              const sourceStack =
                pickContext.personalStacks[customPayload.fromStack];
              if (sourceStack && sourceStack.length >= customPayload.count) {
                const startIdx = sourceStack.length - customPayload.count;
                const sequence = sourceStack.slice(startIdx);
                cardToCheck = sequence[0];
              }
            }
            const validationPayload: DragPayload = {
              ...customPayload,
              card: cardToCheck,
            };
            const dropTarget: DropTarget = { type: "personal", stack };
            if (!isDroppable(validationPayload, dropTarget)) {
              cancelDrag();
              isDraggingFromHere.current = false;
              return;
            }
            onDrop(customPayload);
            completeDrag();
            isDraggingFromHere.current = false;
          }
        }
      }}
      onClick={(e) => {
        // Handle drop on click for click-to-drag (desktop only)
        // Only handle if we're already dragging (not starting a new drag from this stack)
        if (
          dragState.isDragging &&
          dragState.payload &&
          !isDraggingFromHere.current
        ) {
          e.stopPropagation();
          e.preventDefault();
          // We're clicking on this stack (or a card in it) - validate and drop
          const customPayload = dragState.payload;
          if (customPayload) {
            // For stacks, we need to check the bottom card, not the top card
            let cardToCheck = customPayload.card;
            if (
              customPayload.source === "personal" &&
              customPayload.fromStack !== undefined &&
              customPayload.count &&
              customPayload.count > 1 &&
              pickContext.personalStacks
            ) {
              // Get the source stack and find the bottom card of the sequence
              const sourceStack =
                pickContext.personalStacks[customPayload.fromStack];
              if (sourceStack && sourceStack.length >= customPayload.count) {
                const startIdx = sourceStack.length - customPayload.count;
                const sequence = sourceStack.slice(startIdx);
                // Bottom card is the last card in the sequence
                cardToCheck = sequence[0];
              }
            }
            // Create a modified payload with the bottom card for validation
            const validationPayload: DragPayload = {
              ...customPayload,
              card: cardToCheck,
            };
            const dropTarget: DropTarget = { type: "personal", stack };
            if (!isDroppable(validationPayload, dropTarget)) {
              // Invalid drop - return card to original position
              cancelDrag();
              isDraggingFromHere.current = false;
              return;
            }
            // Valid drop
            onDrop(customPayload);
            completeDrag();
            isDraggingFromHere.current = false;
          }
        }
      }}
    >
      {stack.length > 0 ? (
        <div className="stack-fan">
          {stack.map((card, cardIdx) => {
            const draggableSlice = stack.slice(cardIdx);
            const canDrag = isDraggableStack(draggableSlice);
            const count = draggableSlice.length;
            const payload: DragPayload = {
              source: "personal",
              fromStack: stackIndex,
              count,
              card,
              subCards: draggableSlice,
            };
            const isPickablePayload = isPickable(payload, pickContext);
            const shouldAllowDrag = canDrag && isPickablePayload;

            return (
              <img
                key={cardIdx}
                className="card-img stack-card"
                draggable={false}
                src={cardAssetPath(card)}
                alt={card.display}
                style={{
                  top: cardIdx * CARD_STACK_OFFSET,
                  zIndex: cardIdx,
                  cursor: shouldAllowDrag ? "grab" : "default",
                }}
                onMouseDown={(e) => {
                  // On mobile, use touch events instead
                  if ("ontouchstart" in window) return;

                  if (!shouldAllowDrag || e.button !== 0) return; // Only left click

                  // If already dragging, don't start a new drag - let the drop handler manage it
                  if (dragState.isDragging) {
                    return;
                  }

                  e.preventDefault();
                  e.stopPropagation();
                  const finalPayload = onDragStartPayload(payload);
                  const element = e.currentTarget;
                  startDrag(finalPayload, card, element, e.nativeEvent);
                  isDraggingFromHere.current = true;
                }}
                onTouchStart={(e) => {
                  // On mobile, use touch and drag (not click-to-drag)
                  if (!shouldAllowDrag) return;

                  // If already dragging, don't start a new drag
                  if (dragState.isDragging) {
                    return;
                  }

                  if (e.cancelable) {
                    e.preventDefault();
                  }
                  e.stopPropagation();
                  const finalPayload = onDragStartPayload(payload);
                  const element = e.currentTarget;
                  startDrag(finalPayload, card, element, e.nativeEvent);
                  isDraggingFromHere.current = true;
                }}
                onClick={(e) => {
                  // If we're already dragging and clicking on a card in a different stack,
                  // handle the drop directly here
                  if (
                    dragState.isDragging &&
                    dragState.payload &&
                    !isDraggingFromHere.current
                  ) {
                    e.stopPropagation();
                    e.preventDefault();

                    // Handle drop on this stack
                    const customPayload = dragState.payload;
                    if (customPayload) {
                      // For stacks, we need to check the bottom card, not the top card
                      let cardToCheck = customPayload.card;
                      if (
                        customPayload.source === "personal" &&
                        customPayload.fromStack !== undefined &&
                        customPayload.count &&
                        customPayload.count > 1 &&
                        pickContext.personalStacks
                      ) {
                        // Get the source stack and find the bottom card of the sequence
                        const sourceStack =
                          pickContext.personalStacks[customPayload.fromStack];
                        if (
                          sourceStack &&
                          sourceStack.length >= customPayload.count
                        ) {
                          const startIdx =
                            sourceStack.length - customPayload.count;
                          const sequence = sourceStack.slice(startIdx);
                          // Bottom card is the last card in the sequence
                          cardToCheck = sequence[0];
                        }
                      }
                      // Create a modified payload with the bottom card for validation
                      const validationPayload: DragPayload = {
                        ...customPayload,
                        card: cardToCheck,
                      };
                      const dropTarget: DropTarget = {
                        type: "personal",
                        stack,
                      };
                      if (!isDroppable(validationPayload, dropTarget)) {
                        // Invalid drop - return card to original position
                        cancelDrag();
                        return;
                      }
                      // Valid drop
                      onDrop(customPayload);
                      completeDrag();
                    }
                    return;
                  }

                  // If we just started dragging from this card, prevent the click
                  // from starting a new drag or interfering
                  if (isDraggingFromHere.current) {
                    e.preventDefault();
                    e.stopPropagation();
                    // Reset the flag to allow drops on other stacks
                    setTimeout(() => {
                      isDraggingFromHere.current = false;
                    }, 50);
                  }
                }}
                onDragStart={(e) => {
                  // Block browser-native image drag gestures (e.g. Chrome split view)
                  e.preventDefault();
                }}
              />
            );
          })}
        </div>
      ) : (
        <div className="card empty-stack">Empty</div>
      )}
    </div>
  );
}
