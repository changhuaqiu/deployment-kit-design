import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentCard } from './AgentCard';
import { Agent, AgentRole, AgentState } from '@/types/agents';

describe('AgentCard', () => {
  const mockAgent: Agent = {
    id: 'agent-1',
    name: 'Scanner Agent',
    icon: '🔍',
    role: AgentRole.SCANNER,
    state: AgentState.WORKING,
    location: {
      type: 'city',
      city: 'test',
      district: 'compute'
    },
    position: {
      x: 100,
      y: 100,
      tileCol: 5,
      tileRow: 5
    },
    path: [],
    currentTask: {
      id: 'task-1',
      type: 'scan',
      skill: 'resource-scanner',
      targetDistrict: 'test-compute',
      status: 'in_progress',
      progress: 65
    },
    progress: 65,
    bubble: null,
    palette: 0,
    frame: 0,
    frameTimer: 0
  };

  it('renders agent name and icon', () => {
    const { container } = render(<AgentCard agent={mockAgent} />);

    expect(container.textContent).toContain('Scanner Agent');
    expect(container.textContent).toContain('🔍');
  });

  it('renders agent status', () => {
    const { container } = render(<AgentCard agent={mockAgent} />);

    expect(container.textContent).toContain('Working');
  });

  it('renders current task when present', () => {
    const { container } = render(<AgentCard agent={mockAgent} />);

    expect(container.textContent).toContain('resource-scanner');
    expect(container.textContent).toContain('test-compute');
  });

  it('renders progress bar for active tasks', () => {
    const { container } = render(<AgentCard agent={mockAgent} />);

    const progressBar = container.querySelector('.progress-bar');
    expect(progressBar).toBeInTheDocument();

    const progressFill = container.querySelector('.progress-fill');
    expect(progressFill).toHaveStyle({ width: '65%' });
  });

  it('shows idle status when no task', () => {
    const idleAgent = { ...mockAgent, currentTask: null, state: AgentState.IDLE };
    render(<AgentCard agent={idleAgent} />);

    expect(screen.getByText('Idle')).toBeInTheDocument();
    expect(screen.getByText('No active task')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    const { container } = render(<AgentCard agent={mockAgent} onClick={handleClick} />);

    const card = container.querySelector('.agent-card');
    expect(card).toBeInTheDocument();

    if (card) {
      fireEvent.click(card);
      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledWith(mockAgent);
    }
  });

  it('applies selected styling when selected', () => {
    const { container } = render(<AgentCard agent={mockAgent} isSelected />);

    const card = container.querySelector('.agent-card');
    expect(card).toHaveClass('selected');
  });

  it('displays different status labels', () => {
    const { container, rerender } = render(<AgentCard agent={mockAgent} />);
    expect(container.textContent).toContain('Working');

    const walkingAgent = { ...mockAgent, state: AgentState.WALKING };
    rerender(<AgentCard agent={walkingAgent} />);
    expect(container.textContent).toContain('Walking');

    const returningAgent = { ...mockAgent, state: AgentState.RETURNING };
    rerender(<AgentCard agent={returningAgent} />);
    expect(container.textContent).toContain('Returning');
  });
});
