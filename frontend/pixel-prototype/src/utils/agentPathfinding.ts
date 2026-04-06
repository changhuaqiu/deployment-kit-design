export interface Point {
  x: number
  y: number
}

interface Agent {
  position: { mapX: number; mapY: number }
}

interface Building {
  id: string
  position: { x: number; y: number; width: number; height: number }
}

export function calculateAgentPath(
  agent: Agent,
  targetBuilding: Building,
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

function pointInRect(point: Point, rect: { x: number; y: number; width: number; height: number }): boolean {
  return point.x >= rect.x &&
         point.x <= rect.x + rect.width &&
         point.y >= rect.y &&
         point.y <= rect.y + rect.height
}
