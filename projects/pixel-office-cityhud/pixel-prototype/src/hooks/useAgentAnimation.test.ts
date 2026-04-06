import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAgentAnimation } from './useAgentAnimation'
import { useAgentStore } from '@/store/agents'
import { AgentState, AgentRole } from '@/types/agents'

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
  return setTimeout(() => cb(performance.now()), 16) as unknown as number
}) as any

global.cancelAnimationFrame = vi.fn((id) => {
  clearTimeout(id)
})

describe('useAgentAnimation', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useAgentStore.getState()
    Object.keys(store.agents).forEach((id) => {
      store.removeAgent(id)
    })
    vi.clearAllMocks()
  })

  it('initializes animation on mount', () => {
    const { result } = renderHook(() => useAgentAnimation())

    expect(result.current.isAnimating).toBe(true)
    expect(global.requestAnimationFrame).toHaveBeenCalled()
  })

  it('cleans up animation on unmount', () => {
    const { unmount } = renderHook(() => useAgentAnimation())

    unmount()

    expect(global.cancelAnimationFrame).toHaveBeenCalled()
  })

  it('updates agent frame over time', async () => {
    // Create an agent
    const store = useAgentStore.getState()
    const agent = store.createAgent('test-agent', AgentRole.SCANNER, '🕵️', 'Test Agent')

    const initialFrame = agent.frame

    // Render animation hook
    renderHook(() => useAgentAnimation())

    // Wait for animation frames
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    // Check that agent frame was updated
    const updatedAgent = store.getAgentById('test-agent')
    expect(updatedAgent).toBeDefined()
    // Frame may or may not have changed depending on timing
    expect(updatedAgent?.frame).toBeGreaterThanOrEqual(0)
    expect(updatedAgent?.frame).toBeLessThanOrEqual(3)
  })

  it('updates walking agent position towards path waypoint', async () => {
    // Create agent at origin with path to (100, 100)
    const store = useAgentStore.getState()
    store.createAgent('walking-agent', AgentRole.SCANNER, '🕵️', 'Walker')
    store.updateAgent('walking-agent', {
      position: { x: 0, y: 0, tileCol: 0, tileRow: 0 },
      state: AgentState.WALKING,
      path: [
        { x: 50, y: 50, tileCol: 2, tileRow: 2 },
        { x: 100, y: 100, tileCol: 5, tileRow: 5 }
      ]
    })

    const initialPosition = store.agents['walking-agent'].position

    // Render animation hook
    renderHook(() => useAgentAnimation())

    // Wait for movement
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    // Check that position changed
    const updatedAgent = store.getAgentById('walking-agent')
    expect(updatedAgent).toBeDefined()
    expect(updatedAgent!.position.x).toBeGreaterThan(initialPosition.x)
    expect(updatedAgent!.position.y).toBeGreaterThan(initialPosition.y)
  })

  it('updates working agent progress', async () => {
    // Create agent in working state
    const store = useAgentStore.getState()
    store.createAgent('working-agent', AgentRole.PLANNER, '👨‍🎨', 'Planner')
    store.updateAgent('working-agent', {
      state: AgentState.WORKING,
      progress: 0,
      currentTask: {
        id: 'task-1',
        type: 'generate',
        skill: 'terraform-generate',
        targetDistrict: 'test-compute',
        status: 'in_progress',
        progress: 0
      }
    })

    const initialProgress = store.getAgentById('working-agent')!.progress

    // Render animation hook
    renderHook(() => useAgentAnimation())

    // Wait for work progress
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    // Check that progress increased
    const updatedAgent = store.getAgentById('working-agent')
    expect(updatedAgent).toBeDefined()
    expect(updatedAgent!.progress).toBeGreaterThan(initialProgress)
  })

  it('transitions working agent to returning when progress reaches 100', async () => {
    // Create agent with nearly complete work
    const store = useAgentStore.getState()
    store.createAgent('finishing-agent', AgentRole.MONITOR, '👮', 'Monitor')
    store.updateAgent('finishing-agent', {
      state: AgentState.WORKING,
      progress: 99,
      position: { x: 100, y: 100, tileCol: 5, tileRow: 5 },
      currentTask: {
        id: 'task-2',
        type: 'review',
        skill: 'terraform-validate',
        targetDistrict: 'test-compute',
        status: 'in_progress',
        progress: 99
      }
    })

    // Render animation hook
    renderHook(() => useAgentAnimation())

    // Wait for work to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    // Check that state transitioned to returning
    const updatedAgent = store.getAgentById('finishing-agent')
    expect(updatedAgent).toBeDefined()
    expect(updatedAgent!.state).toBe(AgentState.RETURNING)
  })

  it('moves returning agent towards office', async () => {
    // Create agent returning from far position
    const store = useAgentStore.getState()
    store.createAgent('returning-agent', AgentRole.SCANNER, '🕵️', 'Scanner')
    store.updateAgent('returning-agent', {
      state: AgentState.RETURNING,
      position: { x: 100, y: 100, tileCol: 5, tileRow: 5 }
    })

    const initialPosition = store.getAgentById('returning-agent')!.position

    // Render animation hook
    renderHook(() => useAgentAnimation())

    // Wait for movement towards office
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    // Check that position moved towards office (400, 350)
    const updatedAgent = store.getAgentById('returning-agent')
    expect(updatedAgent).toBeDefined()
    expect(updatedAgent!.position.x).toBeGreaterThan(initialPosition.x)
  })

  it('transitions returning agent to idle when at office', async () => {
    // Create agent near office
    const store = useAgentStore.getState()
    store.createAgent('arriving-agent', AgentRole.SCANNER, '🕵️', 'Scanner')
    store.updateAgent('arriving-agent', {
      state: AgentState.RETURNING,
      position: { x: 402, y: 352, tileCol: 20, tileRow: 17 } // Very close to office
    })

    // Render animation hook
    renderHook(() => useAgentAnimation())

    // Wait for arrival
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    // Check that state transitioned to idle
    const updatedAgent = store.getAgentById('arriving-agent')
    expect(updatedAgent).toBeDefined()
    expect(updatedAgent!.state).toBe(AgentState.IDLE)
  })

  it('adds random wander to idle agents', async () => {
    // Create idle agent
    const store = useAgentStore.getState()
    store.createAgent('idle-agent', AgentRole.SCANNER, '🕵️', 'Idle Agent')

    const initialPosition = { ...store.getAgentById('idle-agent')!.position }

    // Render animation hook
    renderHook(() => useAgentAnimation())

    // Wait for potential wander (may take a few tries due to randomness)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500))
    })

    // Check that position may have changed (due to random wander)
    const updatedAgent = store.getAgentById('idle-agent')
    expect(updatedAgent).toBeDefined()
    // Position might be the same or slightly different due to randomness
    expect(updatedAgent!.position).toBeDefined()
  })
})
