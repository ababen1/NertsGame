import { Card, Suit } from '../types/game'
import './CenterStacks.css'

interface CenterStacksProps {
  centerStacks: {
    [key in Suit]: Card[]
  }
  onStackClick: (suit: Suit) => void
}

const suitSymbols: { [key in Suit]: string } = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
}

const suitColors: { [key in Suit]: string } = {
  hearts: '#dc3545',
  diamonds: '#dc3545',
  clubs: '#333',
  spades: '#333',
}

export default function CenterStacks({ centerStacks, onStackClick }: CenterStacksProps) {
  return (
    <div className="center-stacks">
      <h2>Center Stacks (A → K)</h2>
      <div className="stacks-container">
        {(Object.keys(centerStacks) as Suit[]).map((suit) => {
          const stack = centerStacks[suit]
          const topCard = stack.length > 0 ? stack[stack.length - 1] : null

          return (
            <div
              key={suit}
              className="center-stack"
              onClick={() => onStackClick(suit)}
            >
              <div className="stack-label" style={{ color: suitColors[suit] }}>
                {suitSymbols[suit]} {suit}
              </div>
              <div className="stack-cards">
                {topCard ? (
                  <div className="card top-card" style={{ color: suitColors[suit] }}>
                    {topCard.display}
                  </div>
                ) : (
                  <div className="card empty-card">A</div>
                )}
                {stack.length > 1 && (
                  <div className="stack-count">+{stack.length - 1}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

