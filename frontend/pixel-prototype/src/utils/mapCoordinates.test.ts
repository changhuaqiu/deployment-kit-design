import { describe, it, expect } from 'vitest'
import { mapToScreen, screenToMap } from './mapCoordinates'
import type { ViewportState } from '@/types/map'

describe('mapCoordinates', () => {
  const viewport: ViewportState = {
    x: 100,
    y: 50,
    width: 800,
    height: 600
  }

  it('should convert map coordinates to screen coordinates', () => {
    const result = mapToScreen(200, 150, viewport, 1.0)
    expect(result.x).toBe(100) // (200 - 100) * 1.0
    expect(result.y).toBe(100) // (150 - 50) * 1.0
  })

  it('should apply zoom scale to screen coordinates', () => {
    const result = mapToScreen(200, 150, viewport, 2.0)
    expect(result.x).toBe(200) // (200 - 100) * 2.0
    expect(result.y).toBe(200) // (150 - 50) * 2.0
  })

  it('should convert screen coordinates back to map coordinates', () => {
    const result = screenToMap(100, 100, viewport, 1.0)
    expect(result.x).toBe(200) // (100 / 1.0) + 100
    expect(result.y).toBe(150) // (100 / 1.0) + 50
  })

  it('should apply zoom scale when converting back to map coordinates', () => {
    const result = screenToMap(200, 200, viewport, 2.0)
    expect(result.x).toBe(200) // (200 / 2.0) + 100
    expect(result.y).toBe(150) // (200 / 2.0) + 50
  })

  it('should handle zero offset', () => {
    const zeroViewport: ViewportState = { x: 0, y: 0, width: 800, height: 600 }
    const result = mapToScreen(100, 100, zeroViewport, 1.0)
    expect(result.x).toBe(100)
    expect(result.y).toBe(100)
  })
})
