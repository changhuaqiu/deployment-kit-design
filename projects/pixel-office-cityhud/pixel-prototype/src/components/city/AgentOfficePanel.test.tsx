import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import AgentOfficePanel from './AgentOfficePanel'

describe('AgentOfficePanel', () => {
  it('renders without crashing', () => {
    const onOpenLedger = vi.fn()
    render(<AgentOfficePanel onOpenLedger={onOpenLedger} />)

    expect(screen.getByText('PIXEL CONSTRUCTION CO.')).toBeInTheDocument()
  })

  it('displays office title', () => {
    const onOpenLedger = vi.fn()
    render(<AgentOfficePanel onOpenLedger={onOpenLedger} />)

    expect(screen.getAllByText('PIXEL CONSTRUCTION CO.').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/OFFICE/).length).toBeGreaterThan(0)
  })

  it('renders ledger button', () => {
    const onOpenLedger = vi.fn()
    render(<AgentOfficePanel onOpenLedger={onOpenLedger} />)

    expect(screen.getAllByText('[ LEDGER ]').length).toBeGreaterThan(0)
  })

  it('renders worker desks section', () => {
    const onOpenLedger = vi.fn()
    render(<AgentOfficePanel onOpenLedger={onOpenLedger} />)

    expect(screen.getAllByText('WORKER DESKS').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/OFFICE/).length).toBeGreaterThan(0)
  })

  it('renders deacon office section', () => {
    const onOpenLedger = vi.fn()
    render(<AgentOfficePanel onOpenLedger={onOpenLedger} />)

    expect(screen.getAllByText('DEACON OFFICE').length).toBeGreaterThan(0)
  })

  it('calls onOpenLedger when ledger button is clicked', () => {
    const onOpenLedger = vi.fn()
    render(<AgentOfficePanel onOpenLedger={onOpenLedger} />)

    const ledgerButton = screen.getAllByText('[ LEDGER ]')[0]
    fireEvent.click(ledgerButton)

    expect(onOpenLedger).toHaveBeenCalled()
  })
})
