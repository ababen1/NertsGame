import { Card } from "../../types/game";

export type DragPayload = {
  source: "deck" | "nerts" | "personal";
  fromStack?: number;
  count?: number;
  card: Card;
  subCards: Card[]; // Array of cards being dragged (clicked card + all sub cards below it)
};
