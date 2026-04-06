import { describe, it, expect, beforeEach } from 'vitest'
import { createMapStore } from './mapStore'

describe('mapStore', () => {
  let store: ReturnType<typeof createMapStore>

  beforeEach(() => {
    store = createMapStore()
  })

  it('should initialize with default state', () => {
    const state = store.getState()

    expect(state.viewport).toEqual({
      x: 0,
      y: 0,
      width: 1200,
      height: 800
    })
    expect(state.zoom).toBe('environment')
    expect(state.selection).toEqual({ type: null, id: null })
    expect(state.hovered).toEqual({ type: null, id: null })
  })

  it('should update viewport', () => {
    store.getState().setViewport({ x: 100, y: 200 })

    const state = store.getState()
    expect(state.viewport.x).toBe(100)
    expect(state.viewport.y).toBe(200)
  })

  it('should set zoom level', () => {
    store.getState().setZoom('world')

    expect(store.getState().zoom).toBe('world')
  })

  it('should set selection', () => {
    store.getState().setSelection({ type: 'building', id: 'compute-a' })

    const state = store.getState()
    expect(state.selection).toEqual({ type: 'building', id: 'compute-a' })
  })

  it('should reset view to default', () => {
    store.getState().setViewport({ x: 500, y: 500 })
    store.getState().setZoom('building')
    store.getState().resetView()

    const state = store.getState()
    expect(state.viewport.x).toBe(0)
    expect(state.viewport.y).toBe(0)
    expect(state.zoom).toBe('environment')
  })
})
