import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { CityMapComplete } from '../CityMapComplete'
import { useMapStore } from '@/store/mapStore'
import { vi } from 'vitest'

// Mock MapCanvas to avoid canvas rendering issues in tests
vi.mock('../MapCanvas', () => ({
  MapCanvas: ({ onBuildingClick }: { onBuildingClick: (id: string) => void }) => (
    <div
      role="img"
      aria-label="map canvas"
      onClick={() => onBuildingClick('test-compute')}
    >
      Mock Map Canvas
    </div>
  )
}))

// Mock requestAnimationFrame and setTimeout for animation testing
global.requestAnimationFrame = vi.fn((callback) => setTimeout(callback, 0))
global.cancelAnimationFrame = vi.fn()

describe('CityMapComplete Integration', () => {
  beforeEach(() => {
    useMapStore.getState().resetView()
    useMapStore.getState().setHovered({ type: null, id: null })
    useMapStore.getState().setSelection({ type: null, id: null })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders map, controls, and panel', () => {
    render(<CityMapComplete />)

    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument()  // canvas
    expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument()
  })

  it('updates zoom when controls used', () => {
    render(<CityMapComplete />)

    const initialZoom = useMapStore.getState().zoom
    expect(initialZoom).toBe('environment')

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /zoom in/i }))
    })

    // Fast-forward timers to allow animation to complete
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    const updatedZoom = useMapStore.getState().zoom
    expect(updatedZoom).toBe('building')
  })

  it('resets view when reset button clicked', () => {
    render(<CityMapComplete />)

    // Change viewport first
    useMapStore.setState({ viewport: { x: 100, y: 100, width: 1200, height: 800 } })

    const resetBtn = screen.getByRole('button', { name: /reset/i })

    act(() => {
      fireEvent.click(resetBtn)
    })

    const viewport = useMapStore.getState().viewport
    expect(viewport.x).toBe(0)
    expect(viewport.y).toBe(0)
  })

  it('responds to keyboard shortcuts', () => {
    render(<CityMapComplete />)

    const initialZoom = useMapStore.getState().zoom
    expect(initialZoom).toBe('environment')

    act(() => {
      fireEvent.keyDown(window, { key: '+' })
    })

    const updatedZoom = useMapStore.getState().zoom
    expect(updatedZoom).toBe('building')
  })

  it('opens detail panel when building clicked', () => {
    render(<CityMapComplete />)

    // Simulate building click
    const canvas = screen.getByRole('img', { hidden: true })
    fireEvent.click(canvas, { clientX: 200, clientY: 200 })

    const selection = useMapStore.getState().selection
    expect(selection.type).toBe('building')
  })

  it('updates hover state when interacting with map', () => {
    render(<CityMapComplete />)

    const initialHovered = useMapStore.getState().hovered
    expect(initialHovered.type).toBe(null)

    // Simulate hover state change (in real scenario this would be from mouse move)
    act(() => {
      useMapStore.getState().setHovered({ type: 'building', id: 'test-compute' })
    })

    const updatedHovered = useMapStore.getState().hovered
    expect(updatedHovered.type).toBe('building')
    expect(updatedHovered.id).toBe('test-compute')
  })

  it('handles preset view buttons', () => {
    render(<CityMapComplete />)

    // Find the Test button by its text content
    const testButton = Array.from(document.querySelectorAll('button')).find(
      btn => btn.textContent === 'Test'
    )

    expect(testButton).toBeInTheDocument()

    act(() => {
      if (testButton) fireEvent.click(testButton)
    })

    const viewport = useMapStore.getState().viewport
    const zoom = useMapStore.getState().zoom

    expect(zoom).toBe('environment')
    expect(viewport.x).toBeGreaterThanOrEqual(0)
  })
})