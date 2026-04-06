import { describe, expect, it } from 'vitest'
import { findPath, getWalkableNeighbors, TILE_SIZE } from '../../src/utils/pathfinding'

describe('Pathfinding Utility', () => {
  describe('findPath', () => {
    it('should find path from office to district', () => {
      const start = { x: 0, y: 0 }
      const end = { x: 64, y: 64 }
      const obstacles = new Set<string>()

      const path = findPath(start, end, obstacles)

      expect(path).toBeDefined()
      expect(path.length).toBeGreaterThan(0)
      expect(path[0]).toEqual(start)
      expect(path[path.length - 1]).toEqual(end)
    })

    it('should find path avoiding obstacles', () => {
      const start = { x: 0, y: 0 }
      const end = { x: 64, y: 64 }
      const obstacles = new Set<string>(['32,32']) // Obstacle at middle position

      const path = findPath(start, end, obstacles)

      expect(path).toBeDefined()
      expect(path.length).toBeGreaterThan(0)
      expect(path[path.length - 1]).toEqual(end)

      // Check that path doesn't go through obstacle
      const pathString = path.map(p => `${p.x},${p.y}`).join(',')
      expect(pathString).not.toContain('32,32')
    })

    it('should return empty path when no path exists', () => {
      const start = { x: 0, y: 0 }
      const end = { x: 96, y: 96 }
      // Block the direct path and create a simple barrier
      const obstacles = new Set<string>([
        // Block the entire middle row and column
        '1,0', '1,1', '1,2', '1,3', // Complete X=1 column
        '0,1', '1,1', '2,1', '3,1' // Complete Y=1 row
      ])

      const path = findPath(start, end, obstacles)

      expect(path).toEqual([])
    })

    it('should return empty path when start and end are the same', () => {
      const position = { x: 32, y: 32 }
      const obstacles = new Set<string>()

      const path = findPath(position, position, obstacles)

      expect(path).toEqual([])
    })
  })

  describe('getWalkableNeighbors', () => {
    it('should return walkable neighbors for a position', () => {
      const position = { x: 32, y: 32 }
      const obstacles = new Set<string>(['1,2', '2,1']) // Grid coordinates for down (32,64) and right (64,32)

      const neighbors = getWalkableNeighbors(position, obstacles)

      // Should have left (0,32) and up (32,0) neighbors, but not down (32,64) or right (64,32)
      expect(neighbors).toHaveLength(2)
      expect(neighbors).toEqual(
        expect.arrayContaining([{ x: 0, y: 32 }, { x: 32, y: 0 }])
      )
    })

    it('should not include positions with obstacles', () => {
      const position = { x: 32, y: 32 }
      const obstacles = new Set<string>(['0,1', '1,0', '2,1', '1,2']) // Grid coordinates for all directions

      const neighbors = getWalkableNeighbors(position, obstacles)

      expect(neighbors).toEqual([])
    })

    it('should handle edge positions', () => {
      const position = { x: 0, y: 0 } // Top-left corner
      const obstacles = new Set<string>()

      const neighbors = getWalkableNeighbors(position, obstacles)

      expect(neighbors).toHaveLength(2) // Right and down neighbors only
      expect(neighbors).toEqual(
        expect.arrayContaining([{ x: 32, y: 0 }, { x: 0, y: 32 }])
      )
    })
  })

  describe('TILE_SIZE', () => {
    it('should be defined as 32', () => {
      expect(TILE_SIZE).toBe(32)
    })
  })
})