import { useEffect, useRef } from 'react'
import { useAgentStore } from '@/store/agents'
import { AgentState, type Agent, type Position } from '@/types/agents'

/**
 * Animation timing constants
 */
const FRAME_TIME = 100 // ms per animation frame
const MOVE_SPEED = 2 // pixels per frame
const WORK_DURATION = 3000 // ms for work animation

/**
 * Agent animation hook
 * Handles frame timing, state transitions, and position interpolation
 * for smooth agent movement and animations
 */
export function useAgentAnimation() {
  const agents = useAgentStore((state) => state.agents)
  const updateAgent = useAgentStore((state) => state.updateAgent)
  const animationFrameRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)

  useEffect(() => {
    let animationId: number

    const animate = (timestamp: number) => {
      // Initialize last time on first frame
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp
      }

      const deltaTime = timestamp - lastTimeRef.current

      // Update agents every frame
      Object.values(agents).forEach((agent) => {
        updateAgentFrame(agent, deltaTime)
      })

      lastTimeRef.current = timestamp
      animationId = requestAnimationFrame(animate)
    }

    // Start animation loop
    animationId = requestAnimationFrame(animate)

    // Cleanup on unmount
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [agents])

  return {
    isAnimating: true
  }
}

/**
 * Update a single agent's animation frame
 */
function updateAgentFrame(agent: Agent, deltaTime: number) {
  const { updateAgent } = useAgentStore.getState()

  // Update frame timer
  const newFrameTimer = agent.frameTimer + deltaTime

  // Check if it's time to advance frame
  if (newFrameTimer >= FRAME_TIME) {
    const newFrame = (agent.frame + 1) % 4 // 4 animation frames (0-3)

    // Update position based on state
    let newPosition = { ...agent.position }
    let newState = agent.state

    switch (agent.state) {
      case AgentState.WALKING:
        newPosition = updateWalkingPosition(agent)
        break
      case AgentState.WORKING:
        // Check if work is complete
        if (agent.progress >= 100) {
          newState = AgentState.RETURNING
        }
        break
      case AgentState.RETURNING:
        newPosition = updateReturningPosition(agent)
        // Check if back at office
        if (isAtOffice(newPosition)) {
          newState = AgentState.IDLE
        }
        break
      case AgentState.IDLE:
        // Random idle movement
        if (Math.random() < 0.01) {
          newPosition = addRandomWander(agent.position)
        }
        break
    }

    // Update agent with new frame and position
    updateAgent(agent.id, {
      frame: newFrame,
      frameTimer: 0,
      position: newPosition,
      state: newState,
      progress: updateProgress(agent, deltaTime)
    })
  } else {
    // Just update timer without changing frame
    updateAgent(agent.id, {
      frameTimer: newFrameTimer
    })
  }
}

/**
 * Update position for walking state
 */
function updateWalkingPosition(agent: Agent): Position {
  if (agent.path.length === 0) {
    // No more path, start working
    return agent.position
  }

  // Get next waypoint
  const nextWaypoint = agent.path[0]
  const dx = nextWaypoint.x - agent.position.x
  const dy = nextWaypoint.y - agent.position.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  // If close to waypoint, remove it and continue to next
  if (distance < MOVE_SPEED) {
    // Remove this waypoint from path
    const { updateAgent } = useAgentStore.getState()
    updateAgent(agent.id, {
      path: agent.path.slice(1)
    })
    return nextWaypoint
  }

  // Move towards waypoint
  const ratio = MOVE_SPEED / distance
  return {
    ...agent.position,
    x: agent.position.x + dx * ratio,
    y: agent.position.y + dy * ratio
  }
}

/**
 * Update position for returning state
 */
function updateReturningPosition(agent: Agent): Position {
  // Office position
  const officePosition = { x: 400, y: 350 }
  const dx = officePosition.x - agent.position.x
  const dy = officePosition.y - agent.position.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  // If at office, stop moving
  if (distance < MOVE_SPEED) {
    return officePosition
  }

  // Move towards office
  const ratio = MOVE_SPEED / distance
  return {
    ...agent.position,
    x: agent.position.x + dx * ratio,
    y: agent.position.y + dy * ratio
  }
}

/**
 * Check if position is at office
 */
function isAtOffice(position: Position): boolean {
  const officePosition = { x: 400, y: 350 }
  const dx = officePosition.x - position.x
  const dy = officePosition.y - position.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  return distance < MOVE_SPEED * 2
}

/**
 * Add random wander movement for idle agents
 */
function addRandomWander(position: Position): Position {
  const wanderDistance = 5
  const angle = Math.random() * Math.PI * 2

  return {
    ...position,
    x: position.x + Math.cos(angle) * wanderDistance,
    y: position.y + Math.sin(angle) * wanderDistance
  }
}

/**
 * Update agent progress based on state
 */
function updateProgress(agent: Agent, deltaTime: number): number {
  if (agent.state !== AgentState.WORKING) {
    return agent.progress
  }

  // Calculate progress based on work duration
  const progressIncrement = (deltaTime / WORK_DURATION) * 100
  return Math.min(100, agent.progress + progressIncrement)
}
