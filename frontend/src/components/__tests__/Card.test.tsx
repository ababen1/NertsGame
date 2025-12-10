import { describe, it, expect } from 'vitest'
import { Card, Suit, Rank } from '../../types/game'

describe('Card Types', () => {
  it('should create a card object', () => {
    const card: Card = {
      suit: 'hearts',
      rank: 1,
      display: 'A♥',
    }

    expect(card.suit).toBe('hearts')
    expect(card.rank).toBe(1)
    expect(card.display).toBe('A♥')
  })

  it('should validate suit types', () => {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
    suits.forEach((suit) => {
      expect(['hearts', 'diamonds', 'clubs', 'spades']).toContain(suit)
    })
  })

  it('should validate rank values', () => {
    const ranks: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
    ranks.forEach((rank) => {
      expect(rank).toBeGreaterThanOrEqual(1)
      expect(rank).toBeLessThanOrEqual(13)
    })
  })
})

