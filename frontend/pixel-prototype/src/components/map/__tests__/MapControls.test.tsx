import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { MapControls } from '../MapControls'
import { useMapStore } from '@/store/mapStore'

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
    const originalSetZoom = useMapStore.getState().setZoom

    // Mock the setZoom function
    useMapStore.setState({ setZoom })

    render(<MapControls />)

    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }))
    expect(setZoom).toHaveBeenCalled()
  })

  it('zooms out when - button clicked', () => {
    const setZoom = vi.fn()
    const originalSetZoom = useMapStore.getState().setZoom

    // Mock the setZoom function
    useMapStore.setState({ setZoom })

    render(<MapControls />)

    fireEvent.click(screen.getByRole('button', { name: /zoom out/i }))
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