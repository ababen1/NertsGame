import { Card, Suit } from "../types/game";

const suitMap: Record<Suit, string> = {
  hearts: "HEART",
  diamonds: "DIAMOND",
  clubs: "CLUB",
  spades: "SPADE",
};

const rankName = (rank: number) => {
  if (rank === 1) return "1";
  if (rank === 11) return "11-JACK";
  if (rank === 12) return "12-QUEEN";
  if (rank === 13) return "13-KING";
  return `${rank}`;
};

export const cardAssetPath = (card: Card) => {
  return `/cards/${suitMap[card.suit]}-${rankName(card.rank)}.svg`;
};

export const cardBackPath = () => "/cards/BACK.svg";



