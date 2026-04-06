import { render, screen } from '@testing-library/react'
import { Tooltip } from '../Tooltip'

describe('Tooltip', () => {
  it('renders tooltip for building', () => {
    const mockBuilding = {
      id: 'test-compute',
      name: 'test-compute',
      status: 'healthy',
      metrics: { resourceCount: 5 }
    }

    const { getByText } = render(
      <Tooltip
        type="building"
        target={mockBuilding}
        position={{ x: 100, y: 100 }}
      />
    )

    expect(getByText(/test-compute/i)).toBeInTheDocument()
    expect(getByText(/healthy/i)).toBeInTheDocument()
  })

  it('renders tooltip for agent', () => {
    const mockAgent = {
      id: 'agent-1',
      name: 'Scanner #1',
      icon: '🕵️',
      status: 'working',
      currentTask: 'Scanning resources'
    }

    const { getByText } = render(
      <Tooltip
        type="agent"
        target={mockAgent}
        position={{ x: 100, y: 100 }}
      />
    )

    expect(getByText(/scanner/i)).toBeInTheDocument()
    expect(getByText(/working/i)).toBeInTheDocument()
  })

  it('positions correctly at mouse coordinates', () => {
    const { container } = render(
      <Tooltip
        type="building"
        target={{ name: 'test', status: 'healthy', metrics: { resourceCount: 5 } }}
        position={{ x: 100, y: 100 }}
      />
    )

    const tooltip = container.firstChild as HTMLElement
    expect(tooltip.style.left).toBe('110px')  // x + 10
    expect(tooltip.style.top).toBe('110px')   // y + 10
  })
})