import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { MapControls } from '../MapControls'
import { useMapStore } from '@/store/mapStore'

// Mock requestAnimationFrame for tests
global.requestAnimationFrame = vi.fn((callback) => setTimeout(callback, 0))

// Mock setTimeout to control animation timing
vi.useFakeTimers()

describe('MapControls', () => {
  beforeEach(() => {
    useMapStore.getState().resetView()
  })

  it('renders zoom controls', () => {
    render(<MapControls />)
    expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument()
  })

  it('zooms in when + button clicked', () => {
    const setZoom = vi.fn()
    const setViewport = vi.fn()
    const resetView = vi.fn()

    // Set initial zoom to world so we can actually zoom in
    useMapStore.setState({
      zoom: 'world',
      setZoom,
      setViewport,
      resetView
    })

    render(<MapControls />)

    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }))

    // Advance timers to allow animation to complete
    vi.advanceTimersByTime(2000)

    // Now both functions should have been called
    expect(setViewport).toHaveBeenCalled()
    expect(setZoom).toHaveBeenCalled()
  })

  it('zooms out when - button clicked', () => {
    const setZoom = vi.fn()
    const setViewport = vi.fn()
    const resetView = vi.fn()

    // Set initial zoom to environment so we can actually zoom out
    useMapStore.setState({
      zoom: 'environment',
      setZoom,
      setViewport,
      resetView
    })

    render(<MapControls />)

    fireEvent.click(screen.getByRole('button', { name: /zoom out/i }))

    // Advance timers to allow animation to complete
    vi.advanceTimersByTime(2000)

    // Now both functions should have been called
    expect(setViewport).toHaveBeenCalled()
    expect(setZoom).toHaveBeenCalled()
  })

  it('resets view when reset button clicked', () => {
    const resetView = vi.fn()
    const originalResetView = useMapStore.getState().resetView

    // Mock the resetView function
    useMapStore.setState({ resetView })

    render(<MapControls />)

    fireEvent.click(screen.getByRole('button', { name: /reset/i }))
    expect(resetView).toHaveBeenCalled()
  })

  it('displays current zoom level', () => {
    useMapStore.setState({ zoom: 'environment' })
    render(<MapControls />)

    expect(screen.getByText(/environment/i)).toBeInTheDocument()
  })
})