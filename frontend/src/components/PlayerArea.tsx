import { PlayerState, Card } from '../types/game'
import './PlayerArea.css'

interface PlayerAreaProps {
  player: PlayerState
  isCurrentPlayer: boolean
  selectedCard: Card | null
  onCardClick: (card: Card, source: string, index?: number) => void
  onStackClick: (stackIndex: number) => void
  onDrawDeck: () => void
  onCallNerts: () => void
}

export default function PlayerArea({
  player,
  isCurrentPlayer,
  selectedCard,
  onCardClick,
  onStackClick,
  onDrawDeck,
  onCallNerts,
}: PlayerAreaProps) {
  const playableCard = player.deck_display && player.deck_display.length > 0
    ? player.deck_display[player.deck_display.length - 1]
    : null

  const canCallNerts = player.nerts_pile_count === 0

  return (
    <div className={`player-area ${isCurrentPlayer ? 'current-player' : ''}`}>
      <div className="player-header">
        <h3>Player {player.position + 1}</h3>
        <div className="player-score">Score: {player.score}</div>
      </div>

      {isCurrentPlayer ? (
        <>
          {/* Personal Deck */}
          <div className="deck-section">
            <button onClick={onDrawDeck} className="deck-button">
              <div className="deck-info">
                <span>Deck</span>
                <span className="deck-size">{player.deck_size || 0}</span>
              </div>
            </button>
            {playableCard && (
              <div
                className={`card playable-card ${selectedCard === playableCard ? 'selected' : ''}`}
                onClick={() => onCardClick(playableCard, 'deck')}
                style={{
                  color: playableCard.suit === 'hearts' || playableCard.suit === 'diamonds' ? '#dc3545' : '#333',
                }}
              >
                {playableCard.display}
              </div>
            )}
          </div>

          {/* Nerts Pile */}
          <div className="nerts-section">
            <div className="nerts-pile">
              <span>Nerts Pile: {player.nerts_pile_count}</span>
              {player.nerts_pile && player.nerts_pile.length > 0 && (
                <div className="nerts-cards">
                  {player.nerts_pile.map((card, idx) => (
                    <div
                      key={idx}
                      className={`card nerts-card ${selectedCard === card ? 'selected' : ''}`}
                      onClick={() => onCardClick(card, 'nerts', idx)}
                      style={{
                        color: card.suit === 'hearts' || card.suit === 'diamonds' ? '#dc3545' : '#333',
                      }}
                    >
                      {card.display}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {canCallNerts && (
              <button onClick={onCallNerts} className="nerts-button">
                🎉 NERTS!
              </button>
            )}
          </div>

          {/* Personal Stacks */}
          <div className="personal-stacks">
            <h4>Personal Stacks (K → 2, alternating colors)</h4>
            <div className="stacks-grid">
              {player.personal_stacks.map((stack, idx) => (
                <div
                  key={idx}
                  className="personal-stack"
                  onClick={() => onStackClick(idx)}
                >
                  {stack.length > 0 ? (
                    <div
                      className={`card stack-card ${selectedCard === stack[stack.length - 1] ? 'selected' : ''}`}
                      style={{
                        color:
                          stack[stack.length - 1].suit === 'hearts' ||
                          stack[stack.length - 1].suit === 'diamonds'
                            ? '#dc3545'
                            : '#333',
                      }}
                    >
                      {stack[stack.length - 1].display}
                    </div>
                  ) : (
                    <div className="card empty-stack">Empty</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="opponent-view">
          <p>Deck: {player.deck_size || 0} cards</p>
          <p>Nerts Pile: {player.nerts_pile_count} cards</p>
          <div className="opponent-stacks">
            {player.personal_stacks.map((stack, idx) => (
              <div key={idx} className="opponent-stack">
                {stack.length > 0 ? (
                  <div className="card" style={{
                    color: stack[stack.length - 1].suit === 'hearts' || stack[stack.length - 1].suit === 'diamonds' ? '#dc3545' : '#333',
                  }}>
                    {stack[stack.length - 1].display}
                  </div>
                ) : (
                  <div className="card empty-stack">-</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

