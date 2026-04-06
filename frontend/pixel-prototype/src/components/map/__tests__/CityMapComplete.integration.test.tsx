import { render, screen, fireEvent, act } from '@testing-library/react'
import { CityMapComplete } from '../CityMapComplete'
import { useMapStore } from '@/store/mapStore'
import { vi } from 'vitest'

// Mock MapCanvas to avoid canvas rendering issues in tests
vi.mock('../MapCanvas', () => ({
  MapCanvas: () => <div role="img" aria-label="map canvas">Mock Map Canvas</div>
}))

// Mock requestAnimationFrame and setTimeout for animation testing
global.requestAnimationFrame = vi.fn((callback) => setTimeout(callback, 0))
global.cancelAnimationFrame = vi.fn()

describe('CityMapComplete Integration', () => {
  beforeEach(() => {
    useMapStore.getState().resetView()
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
})