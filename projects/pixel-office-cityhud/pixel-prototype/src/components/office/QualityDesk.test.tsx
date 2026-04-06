import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QualityDesk } from './QualityDesk';
import { Agent } from '@/types/agents';

describe('QualityDesk', () => {
  const mockAgent: Agent = {
    id: 'agent-1',
    name: 'Monitor Agent',
    icon: '👮',
    role: 'monitor' as any,
    state: 'idle' as any,
    location: { type: 'office' },
    position: { x: 0, y: 0, tileCol: 0, tileRow: 0 },
    path: [],
    currentTask: null,
    progress: 0,
    bubble: null,
    palette: 0,
    frame: 0,
    frameTimer: 0
  };

  const mockReviewItems = [
    {
      id: 'review-1',
      agentId: 'agent-2',
      agentName: 'Scanner Agent',
      agentIcon: '🔍',
      taskType: 'scan',
      skill: 'resource-scanner',
      result: {
        resourcesFound: 5,
        issues: ['Configuration drift detected']
      },
      timestamp: Date.now()
    },
    {
      id: 'review-2',
      agentId: 'agent-3',
      agentName: 'Planner Agent',
      agentIcon: '👨‍🎨',
      taskType: 'generate',
      skill: 'terraform-generator',
      result: {
        filesGenerated: 3,
        warnings: []
      },
      timestamp: Date.now() - 1000
    }
  ];

  it('renders review items', () => {
    render(<QualityDesk items={mockReviewItems} />);

    expect(screen.getByText('Scanner Agent')).toBeInTheDocument();
    expect(screen.getByText('Planner Agent')).toBeInTheDocument();
  });

  it('renders agent icons', () => {
    const { container } = render(<QualityDesk items={mockReviewItems} />);

    expect(container.textContent).toContain('🔍');
    expect(container.textContent).toContain('👨‍🎨');
  });

  it('displays skill names', () => {
    const { container } = render(<QualityDesk items={mockReviewItems} />);

    expect(container.textContent).toContain('resource-scanner');
    expect(container.textContent).toContain('terraform-generator');
  });

  it('shows pending review count', () => {
    const { container } = render(<QualityDesk items={mockReviewItems} />);

    expect(container.textContent).toContain('2 Pending Reviews');
  });

  it('renders empty state when no items', () => {
    render(<QualityDesk items={[]} />);

    expect(screen.getByText('No pending reviews')).toBeInTheDocument();
  });

  it('handles approve action', () => {
    const handleApprove = vi.fn();
    const { container } = render(<QualityDesk items={mockReviewItems} onApprove={handleApprove} />);

    const approveButtons = container.querySelectorAll('button');
    const approveButton = Array.from(approveButtons).find(btn => btn.textContent === 'Approve');

    expect(approveButton).toBeDefined();
    if (approveButton) {
      fireEvent.click(approveButton);
      expect(handleApprove).toHaveBeenCalled();
    }
  });

  it('handles reject action', () => {
    const handleReject = vi.fn();
    const { container } = render(<QualityDesk items={mockReviewItems} onReject={handleReject} />);

    const rejectButtons = container.querySelectorAll('button');
    const rejectButton = Array.from(rejectButtons).find(btn => btn.textContent === 'Reject');

    expect(rejectButton).toBeDefined();
    if (rejectButton) {
      fireEvent.click(rejectButton);
      expect(handleReject).toHaveBeenCalled();
    }
  });

  it('displays review result details', () => {
    const { container } = render(<QualityDesk items={mockReviewItems} />);

    expect(container.textContent).toContain('Configuration drift detected');
  });
});
