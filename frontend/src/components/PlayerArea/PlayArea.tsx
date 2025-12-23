import { Card } from "../../types/game";
import { DragPayload } from "./types";
import PersonalStack from "./PersonalStack";
import "./PlayerArea.css";
import { PickContext } from "../../utils/solitiareFuncs";

interface PlayAreaProps {
  personalStacks: Card[][];
  onDropToStack: (stackIdx: number, payload: DragPayload | null) => void;
  onDragStartPayload: (payload: DragPayload) => DragPayload;
  pickContext: PickContext;
}

export default function PlayArea({
  personalStacks,
  onDropToStack,
  onDragStartPayload,
  pickContext,
}: PlayAreaProps) {
  return (
    <div className="personal-stacks">
      <h4>Personal Stacks (K → 2, alternating colors)</h4>
      <div className="stacks-grid">
        {personalStacks.map((stack, idx) => (
          <PersonalStack
            key={idx}
            stack={stack}
            stackIndex={idx}
            onDrop={(payload) => onDropToStack(idx, payload)}
            onDragStartPayload={onDragStartPayload}
            pickContext={pickContext}
          />
        ))}
      </div>
    </div>
  );
}
