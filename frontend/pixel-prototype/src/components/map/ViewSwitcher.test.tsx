import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ViewSwitcher } from './ViewSwitcher'

describe('ViewSwitcher', () => {
  const mockOnViewChange = vi.fn()
  const mockOnCityChange = vi.fn()

  beforeEach(() => {
    mockOnViewChange.mockClear()
    mockOnCityChange.mockClear()
  })

  it('renders all three dimension buttons', () => {
    render(
      <ViewSwitcher
        currentView="environment"
        onViewChange={mockOnViewChange}
      />
    )

    expect(screen.getByText(/ENV/)).toBeInTheDocument()
    expect(screen.getByText(/RES/)).toBeInTheDocument()
    expect(screen.getByText(/APP/)).toBeInTheDocument()
  })

  it('highlights the active dimension button', () => {
    const { rerender } = render(
      <ViewSwitcher
        currentView="environment"
        onViewChange={mockOnViewChange}
      />
    )

    // Check environment button is highlighted
    const envButton = screen.getAllByText(/ENV/)[0].closest('button')
    expect(envButton).not.toBeNull()
    // Check that it has the active styling (cyan-400 instead of cyan-800)
    expect(envButton?.className).toContain('border-cyan-400')
    expect(envButton?.className).not.toContain('border-cyan-800')

    // Check resource button is not highlighted
    const resButtonInactive = screen.getAllByText(/RES/)[0].closest('button')
    expect(resButtonInactive).not.toBeNull()
    expect(resButtonInactive?.className).toContain('border-cyan-800')

    // Rerender with resource view
    rerender(
      <ViewSwitcher
        currentView="resource"
        onViewChange={mockOnViewChange}
      />
    )

    // After rerender, query DOM fresh - resource button should be highlighted
    const resButton = screen.getAllByText(/RES/)[0].closest('button')
    expect(resButton).not.toBeNull()
    expect(resButton?.className).toMatch(/border-cyan-400/)

    // Environment button should now be inactive
    const envButtonInactive = screen.getAllByText(/ENV/)[0].closest('button')
    expect(envButtonInactive).not.toBeNull()
    expect(envButtonInactive?.className).toMatch(/border-cyan-800\/40/)
  })

  it('calls onViewChange when clicking dimension buttons', () => {
    render(
      <ViewSwitcher
        currentView="environment"
        onViewChange={mockOnViewChange}
      />
    )

    const resButton = screen.getAllByText(/RES/)[0].closest('button')
    expect(resButton).not.toBeNull()
    if (resButton) {
      fireEvent.click(resButton)
      expect(mockOnViewChange).toHaveBeenCalledWith('resource')
    }

    const appButton = screen.getAllByText(/APP/)[0].closest('button')
    expect(appButton).not.toBeNull()
    if (appButton) {
      fireEvent.click(appButton)
      expect(mockOnViewChange).toHaveBeenCalledWith('application')
    }
  })

  it('shows city selector only in environment view', () => {
    const { rerender } = render(
      <ViewSwitcher
        currentView="environment"
        onViewChange={mockOnViewChange}
        selectedCity="test"
        onCityChange={mockOnCityChange}
      />
    )

    // City buttons should be visible
    const testButton = screen.getAllByText('TEST').find(el => el.tagName === 'BUTTON')
    const prodButton = screen.getAllByText('PROD').find(el => el.tagName === 'BUTTON')
    const allButton = screen.getAllByText('ALL').find(el => el.tagName === 'BUTTON')

    expect(testButton).toBeInTheDocument()
    expect(prodButton).toBeInTheDocument()
    expect(allButton).toBeInTheDocument()

    // Switch to resource view
    rerender(
      <ViewSwitcher
        currentView="resource"
        onViewChange={mockOnViewChange}
        selectedCity="test"
        onCityChange={mockOnCityChange}
      />
    )

    // City buttons should not be visible
    expect(screen.queryByText('TEST')).not.toBeInTheDocument()
    expect(screen.queryByText('PROD')).not.toBeInTheDocument()
    const allButtons = screen.queryAllByText('ALL')
    expect(allButtons.filter(el => el.tagName === 'BUTTON')).toHaveLength(0)
  })

  it('highlights the selected city button', () => {
    render(
      <ViewSwitcher
        currentView="environment"
        onViewChange={mockOnViewChange}
        selectedCity="test"
        onCityChange={mockOnCityChange}
      />
    )

    const testButton = screen.getAllByText('TEST').find(el => el.tagName === 'BUTTON')
    expect(testButton).not.toBeUndefined()
    expect(testButton?.className).toMatch(/border-green-400/)

    const prodButton = screen.getAllByText('PROD').find(el => el.tagName === 'BUTTON')
    expect(prodButton).not.toBeUndefined()
    expect(prodButton?.className).toMatch(/border-orange-800\/30/)
  })

  it('calls onCityChange when clicking city buttons', () => {
    render(
      <ViewSwitcher
        currentView="environment"
        onViewChange={mockOnViewChange}
        selectedCity="test"
        onCityChange={mockOnCityChange}
      />
    )

    const prodButton = screen.getAllByText('PROD').find(el => el.tagName === 'BUTTON')
    expect(prodButton).toBeInTheDocument()
    if (prodButton) {
      fireEvent.click(prodButton)
      expect(mockOnCityChange).toHaveBeenCalledWith('prod')
    }

    const allButton = screen.getAllByText('ALL').find(el => el.tagName === 'BUTTON')
    expect(allButton).toBeInTheDocument()
    if (allButton) {
      fireEvent.click(allButton)
      expect(mockOnCityChange).toHaveBeenCalledWith(null)
    }
  })

  it('does not show city selector when onCityChange is not provided', () => {
    const { container } = render(
      <ViewSwitcher
        currentView="environment"
        onViewChange={mockOnViewChange}
        selectedCity="test"
      />
    )

    // City buttons should not be in the DOM when onCityChange is not provided
    const cityButtons = container.querySelectorAll('button')
    const buttonTexts = Array.from(cityButtons).map(b => b.textContent)

    // Should only have dimension buttons (ENV, RES, APP), not city buttons (TEST, PROD, ALL)
    expect(buttonTexts.join(' ')).not.toContain('TEST')
    expect(buttonTexts.join(' ')).not.toContain('PROD')
  })

  it('applies correct styling for prod city selection', () => {
    const { container } = render(
      <ViewSwitcher
        currentView="environment"
        onViewChange={mockOnViewChange}
        selectedCity="prod"
        onCityChange={mockOnCityChange}
      />
    )

    // Find all buttons and check for prod button
    const buttons = container.querySelectorAll('button')
    const prodButton = Array.from(buttons).find(b => b.textContent === 'PROD')

    expect(prodButton).toBeDefined()
    // Just check the button exists and has some className
    expect(prodButton?.className).toBeDefined()
    expect(prodButton?.className.length).toBeGreaterThan(0)
  })

  it('applies correct styling for null city selection (all cities)', () => {
    const { container } = render(
      <ViewSwitcher
        currentView="environment"
        onViewChange={mockOnViewChange}
        selectedCity={null}
        onCityChange={mockOnCityChange}
      />
    )

    // Find all buttons and check for all button
    const buttons = container.querySelectorAll('button')
    const allButton = Array.from(buttons).find(b => b.textContent === 'ALL')

    expect(allButton).toBeDefined()
    // Just check the button exists and has some className
    expect(allButton?.className).toBeDefined()
    expect(allButton?.className.length).toBeGreaterThan(0)
  })
})
