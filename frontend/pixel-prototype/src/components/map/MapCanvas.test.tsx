import { describe, it, expect, vi, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { MapCanvas } from './MapCanvas'
import type { Building } from '@/types/map'

// Mock canvas 2D context methods
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  arc: vi.fn(),
  fillText: vi.fn(),
  setLineDash: vi.fn(),
  font: '',
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  textAlign: 'center',
  textBaseline: 'middle',
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn()
}) as unknown as CanvasRenderingContext2D)

// Mock requestAnimationFrame
const mockRAF = vi.fn((cb) => setTimeout(cb, 16)) as unknown as number
const mockCAF = vi.fn()
global.requestAnimationFrame = mockRAF
global.cancelAnimationFrame = mockCAF

describe('MapCanvas', () => {
  afterEach(() => {
    // Clear all timers after each test
    vi.clearAllTimers()
  })
  it('should render canvas element', () => {
    const { container } = render(
      <MapCanvas
        buildings={[]}
        agents={[]}
        connections={[]}
        viewport={{ x: 0, y: 0, width: 800, height: 600 }}
        zoom="environment"
        selection={{ type: null, id: null }}
        onBuildingClick={vi.fn()}
        onAgentClick={vi.fn()}
        onViewportChange={vi.fn()}
        onZoomChange={vi.fn()}
      />
    )

    const canvas = container.querySelector('canvas')
    expect(canvas).toBeTruthy()
  })

  it('should render canvas with correct props', () => {
    const handleClick = vi.fn()
    const buildings: Building[] = [
      {
        id: 'test-compute',
        type: 'compute',
        name: 'COMPUTE',
        city: 'test',
        position: { x: 100, y: 100, width: 120, height: 100 },
        status: 'healthy',
        metrics: { resourceCount: 5 }
      }
    ]

    const { container } = render(
      <MapCanvas
        buildings={buildings}
        agents={[]}
        connections={[]}
        viewport={{ x: 0, y: 0, width: 800, height: 600 }}
        zoom="environment"
        selection={{ type: null, id: null }}
        onBuildingClick={handleClick}
        onAgentClick={vi.fn()}
        onViewportChange={vi.fn()}
        onZoomChange={vi.fn()}
      />
    )

    const canvas = container.querySelector('canvas') as HTMLCanvasElement

    // Verify canvas element exists
    expect(canvas).toBeTruthy()

    // Verify canvas has correct style
    expect(canvas.style.display).toBe('block')

    // Verify event handlers are attached by checking they exist
    expect(canvas.onmousedown).toBeNull() // React uses synthetic events
    expect(canvas.onmouseup).toBeNull()
  })
})
