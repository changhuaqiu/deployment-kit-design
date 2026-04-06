import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CityMap } from './CityMap'

describe('CityMap', () => {
  it('renders without crashing', () => {
    render(<CityMap />)
    // Just check that it renders without throwing
    expect(document.querySelector('.relative.w-full.h-full')).toBeInTheDocument()
  })

  it('renders ViewSwitcher component', () => {
    render(<CityMap />)

    expect(screen.getAllByText(/ENV/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/RES/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/APP/).length).toBeGreaterThan(0)
  })

  it('renders city selector buttons', () => {
    render(<CityMap />)

    expect(screen.getAllByText('TEST').length).toBeGreaterThan(0)
    expect(screen.getAllByText('PROD').length).toBeGreaterThan(0)
    expect(screen.getAllByText('ALL').length).toBeGreaterThan(0)
  })

  it('renders view info overlay', () => {
    render(<CityMap />)

    expect(screen.getAllByText(/VIEW:/).length).toBeGreaterThan(0)
  })

  it('renders SVG canvas', () => {
    const { container } = render(<CityMap />)

    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('has correct map dimensions', () => {
    const { container } = render(<CityMap />)

    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('800')
    expect(svg?.getAttribute('height')).toBe('400')
  })

  it('renders background grid', () => {
    const { container } = render(<CityMap />)

    const map = container.querySelector('.relative.w-full.h-full')
    expect(map).toBeInTheDocument()
    expect(map?.className).toContain('bg-[#0a0f18]')
  })
})
