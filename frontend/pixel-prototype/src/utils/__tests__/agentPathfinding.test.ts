import { describe, it, expect } from 'vitest'
import { calculateAgentPath } from '../agentPathfinding'

describe('Agent Pathfinding', () => {
  it('calculates direct path when no obstacles', () => {
    const agent = { position: { mapX: 100, mapY: 100 } }
    const target = {
      id: 'target-1',
      position: { x: 300, y: 100, width: 50, height: 50 }
    }
    const obstacles = []

    const path = calculateAgentPath(agent, target, obstacles)

    expect(path).toBeDefined()
    expect(path.length).toBeGreaterThanOrEqual(2)
    expect(path[0]).toEqual({ x: 100, y: 100 })
  })

  it('calculates path with obstacles (simple implementation)', () => {
    const agent = { position: { mapX: 100, mapY: 100 } }
    const target = {
      id: 'target-1',
      position: { x: 300, y: 100, width: 50, height: 50 }
    }
    const obstacles = [
      { x: 180, y: 50, width: 40, height: 100 }
    ]

    const path = calculateAgentPath(agent, target, obstacles)

    // Simple implementation returns direct path (obstacle avoidance not implemented yet)
    expect(path).toBeDefined()
    expect(path.length).toBeGreaterThanOrEqual(2)
    expect(path[0]).toEqual({ x: 100, y: 100 })
  })
})
