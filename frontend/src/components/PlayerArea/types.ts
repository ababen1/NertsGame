import { Card } from "../../types/game";

export type DragPayload = {
  source: "deck" | "nerts" | "personal";
  fromStack?: number;
  count?: number;
  card?: Card;
};

