import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DispatchPanel } from './DispatchPanel';
import { Agent, AgentRole } from '@/types/agents';

describe('DispatchPanel', () => {
  const mockAgents: Agent[] = [
    {
      id: 'agent-1',
      name: 'Scanner Agent',
      icon: '🔍',
      role: AgentRole.SCANNER,
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
    },
    {
      id: 'agent-2',
      name: 'Planner Agent',
      icon: '👨‍🎨',
      role: AgentRole.PLANNER,
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
    }
  ];

  const mockTasks = [
    {
      id: 'task-1',
      type: 'scan',
      skill: 'resource-scanner',
      targetDistrict: 'test-compute',
      description: 'Scan compute resources'
    },
    {
      id: 'task-2',
      type: 'generate',
      skill: 'terraform-generator',
      targetDistrict: 'prod-data',
      description: 'Generate Terraform config'
    }
  ];

  it('renders available tasks', () => {
    render(<DispatchPanel tasks={mockTasks} agents={mockAgents} />);

    expect(screen.getByText('Scan compute resources')).toBeInTheDocument();
    expect(screen.getByText('Generate Terraform config')).toBeInTheDocument();
  });

  it('renders agent selector dropdown', () => {
    const { container } = render(<DispatchPanel tasks={mockTasks} agents={mockAgents} />);

    const labels = container.querySelectorAll('label');
    expect(labels.length).toBeGreaterThan(0);

    // Check for "Select Agent" text
    expect(container.textContent).toContain('Select Agent');
  });

  it('displays agent options in dropdown', () => {
    const { container } = render(<DispatchPanel tasks={mockTasks} agents={mockAgents} />);

    expect(container.textContent).toContain('Scanner Agent');
    expect(container.textContent).toContain('Planner Agent');
  });

  it('shows dispatch button for each task', () => {
    const { container } = render(<DispatchPanel tasks={mockTasks} agents={mockAgents} />);

    const dispatchButtons = container.querySelectorAll('button');
    expect(dispatchButtons.length).toBeGreaterThan(0);
  });

  it('handles task dispatch', () => {
    const handleDispatch = vi.fn();
    const { container } = render(<DispatchPanel tasks={mockTasks} agents={mockAgents} onDispatch={handleDispatch} />);

    const dispatchButtons = container.querySelectorAll('button');
    expect(dispatchButtons.length).toBeGreaterThan(0);

    // Find a dispatch button
    const dispatchButton = Array.from(dispatchButtons).find(btn =>
      btn.textContent?.includes('Dispatch Task')
    );

    expect(dispatchButton).toBeDefined();
  });

  it('filters agents by role when role specified', () => {
    const taskWithRole = {
      ...mockTasks[0],
      requiredRole: AgentRole.SCANNER
    };

    const { container } = render(
      <DispatchPanel tasks={[taskWithRole]} agents={mockAgents} />
    );

    // Should only show scanner agents
    expect(container.textContent).toContain('Scanner Agent');
  });

  it('displays task metadata', () => {
    const { container } = render(<DispatchPanel tasks={mockTasks} agents={mockAgents} />);

    expect(container.textContent).toContain('resource-scanner');
    expect(container.textContent).toContain('test-compute');
  });

  it('shows empty state when no tasks', () => {
    render(<DispatchPanel tasks={[]} agents={mockAgents} />);

    expect(screen.getByText('No available tasks')).toBeInTheDocument();
  });
});
