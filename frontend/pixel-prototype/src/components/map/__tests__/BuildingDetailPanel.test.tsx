import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { BuildingDetailPanel } from '../BuildingDetailPanel'
import { useDeployStore } from '@/store/deployStore'

describe('BuildingDetailPanel', () => {
  beforeEach(() => {
    useDeployStore.getState().resetDemoData()
  })

  it('does not render when no building selected', () => {
    const { container } = render(
      <BuildingDetailPanel buildingId={null} onClose={() => {}} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders when building selected', () => {
    const { getByText } = render(
      <BuildingDetailPanel buildingId="test-compute" onClose={() => {}} />
    )
    expect(getByText(/test-compute/i)).toBeInTheDocument()
  })

  it('displays close button and calls onClose', () => {
    const onClose = vi.fn()
    const { getByRole } = render(
      <BuildingDetailPanel buildingId="test-compute" onClose={onClose} />
    )

    fireEvent.click(getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('displays building status', () => {
    const { getByText } = render(
      <BuildingDetailPanel buildingId="test-compute" onClose={() => {}} />
    )
    expect(getByText(/healthy|warning|error/i)).toBeInTheDocument()
  })

  it('displays resource count', () => {
    const { getByText } = render(
      <BuildingDetailPanel buildingId="test-compute" onClose={() => {}} />
    )
    expect(getByText('5')).toBeInTheDocument()
  })
})