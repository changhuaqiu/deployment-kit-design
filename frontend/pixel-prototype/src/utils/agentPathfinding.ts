import type { Point } from './mapCoordinates'

interface Agent {
  position: { mapX: number; mapY: number }
}

interface Building {
  id: string
  position: { x: number; y: number; width: number; height: number }
}

/**
 * Calculates path from agent to building entrance
 * TODO: Implement obstacle avoidance using allBuildings parameter
 * Current: Direct line path (start → end)
 * @returns Array of points from agent to building center-bottom
 */
export function calculateAgentPath(
  agent: Agent,
  targetBuilding: Building,
  /** @param allBuildings - All buildings in the scene (reserved for future obstacle avoidance) */
  allBuildings: Building[]
): Point[] {
  const start: Point = {
    x: agent.position.mapX,
    y: agent.position.mapY
  }

  const end: Point = {
    x: targetBuilding.position.x + targetBuilding.position.width / 2,
    y: targetBuilding.position.y + targetBuilding.position.height
  }

  // Simple implementation: direct path (no obstacle avoidance for now)
  // Full BFS implementation would go here
  return [start, end]
}
