// Types
export interface Position {
  x: number
  y: number
}

export interface Tile extends Position {
  gridX: number
  gridY: number
}

export const TILE_SIZE = 32

// Convert pixel position to grid position
function pixelToGrid(position: Position): { gridX: number; gridY: number } {
  return {
    gridX: Math.floor(position.x / TILE_SIZE),
    gridY: Math.floor(position.y / TILE_SIZE)
  }
}

// Convert grid position to pixel position
function gridToPixel(gridX: number, gridY: number): Position {
  return {
    x: gridX * TILE_SIZE,
    y: gridY * TILE_SIZE
  }
}

// Get walkable neighbors using BFS
export function getWalkableNeighbors(
  position: Position,
  obstacles: Set<string>
): Position[] {
  const neighbors: Position[] = []
  const directions = [
    { dx: -1, dy: 0 }, // left
    { dx: 1, dy: 0 },  // right
    { dx: 0, dy: -1 }, // up
    { dx: 0, dy: 1 }   // down
  ]

  const { gridX, gridY } = pixelToGrid(position)

  for (const { dx, dy } of directions) {
    const newGridX = gridX + dx
    const newGridY = gridY + dy
    const newPixelPos = gridToPixel(newGridX, newGridY)
    const obstacleKey = `${newGridX},${newGridY}`

    // Check if neighbor is walkable (not an obstacle and within reasonable bounds)
    if (!obstacles.has(obstacleKey) && newGridX >= 0 && newGridY >= 0) {
      neighbors.push(newPixelPos)
    }
  }

  return neighbors
}

// BFS pathfinding algorithm
export function findPath(
  start: Position,
  end: Position,
  obstacles: Set<string>
): Position[] {
  // If start and end are the same, return empty path
  if (start.x === end.x && start.y === end.y) {
    return []
  }

  const { gridX: startGridX, gridY: startGridY } = pixelToGrid(start)
  const { gridX: endGridX, gridY: endGridY } = pixelToGrid(end)

  const queue: { position: Position; path: Position[] }[] = []
  const visited = new Set<string>()
  const startKey = `${startGridX},${startGridY}`

  // Start from the initial position
  queue.push({ position: start, path: [start] })
  visited.add(startKey)

  // BFS loop
  while (queue.length > 0) {
    const { position, path } = queue.shift()!

    // Check if we've reached the end
    if (position.x === end.x && position.y === end.y) {
      return path
    }

    // Get all walkable neighbors
    const neighbors = getWalkableNeighbors(position, obstacles)

    for (const neighbor of neighbors) {
      const { gridX: neighborGridX, gridY: neighborGridY } = pixelToGrid(neighbor)
      const neighborKey = `${neighborGridX},${neighborGridY}`

      // Skip if already visited
      if (visited.has(neighborKey)) {
        continue
      }

      // Add to queue and mark as visited
      visited.add(neighborKey)
      queue.push({
        position: neighbor,
        path: [...path, neighbor]
      })
    }
  }

  // No path found
  return []
}