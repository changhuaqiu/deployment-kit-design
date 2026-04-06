import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AgentOfficePanel } from './AgentOfficePanel'

describe('AgentOfficePanel', () => {
  it('renders without crashing', () => {
    const onOpenLedger = vi.fn()
    render(<AgentOfficePanel onOpenLedger={onOpenLedger} />)

    expect(screen.getByText(/OFFICE/)).toBeInTheDocument()
  })

  it('displays office title', () => {
    const onOpenLedger = vi.fn()
    render(<AgentOfficePanel onOpenLedger={onOpenLedger} />)

    expect(screen.getByText('PIXEL CONSTRUCTION CO.')).toBeInTheDocument()
    expect(screen.getByText('OFFICE')).toBeInTheDocument()
  })

  it('renders ledger button', () => {
    const onOpenLedger = vi.fn()
    render(<AgentOfficePanel onOpenLedger={onOpenLedger} />)

    expect(screen.getByText('[ LEDGER ]')).toBeInTheDocument()
  })

  it('renders worker desks section', () => {
    const onOpenLedger = vi.fn()
    render(<AgentOfficePanel onOpenLedger={onOpenLedger} />)

    expect(screen.getByText('WORKER DESKS')).toBeInTheDocument()
  })

  it('renders deacon office section', () => {
    const onOpenLedger = vi.fn()
    render(<AgentOfficePanel onOpenLedger={onOpenLedger} />)

    expect(screen.getByText('DEACON OFFICE')).toBeInTheDocument()
  })

  it('calls onOpenLedger when ledger button is clicked', () => {
    const onOpenLedger = vi.fn()
    render(<AgentOfficePanel onOpenLedger={onOpenLedger} />)

    const ledgerButton = screen.getByText('[ LEDGER ]')
    ledgerButton.click()

    expect(onOpenLedger).toHaveBeenCalled()
  })
})
