import { describe, it, expect, beforeEach } from 'vitest';
import { createAgentStore } from '@/store/agents';

describe('Agent Store', () => {
  let store: ReturnType<typeof createAgentStore>;

  beforeEach(() => {
    store = createAgentStore();
  });

  it('should create agent with IDLE state', () => {
    const agent = store.getState().createAgent('scanner-1', 'scanner', '🕵️ 普查员');

    expect(agent).toBeDefined();
    expect(agent.state).toBe('idle');
    expect(agent.location.type).toBe('office');
  });

  it('should update agent state to WALKING when task assigned', () => {
    const agent = store.getState().createAgent('scanner-1', 'scanner', '🕵️ 普查员');

    store.getState().assignTask(agent.id, {
      id: 'task-1',
      type: 'scan',
      skill: 'aws-scan',
      targetDistrict: 'test-compute',
      status: 'pending',
      progress: 0
    });

    expect(store.getState().agents[agent.id].state).toBe('walking');
  });

  it('should generate path from office to district', () => {
    const agent = store.getState().createAgent('scanner-1', 'scanner', '🕵️ 普查员');
    const district = {
      id: 'test-compute',
      position: { x: 200, y: 150, width: 100, height: 80 },
      city: 'test',
      type: 'compute',
      supervisor: { id: 'sup-1', name: '👨‍💼', icon: '👨‍💼', role: 'supervisor', statusMessage: 'active', active: true },
      resources: [],
      issues: [],
      status: 'healthy',
      metrics: { resourceCount: 0, healthPercent: 100, customMetric: '', customValue: '' }
    };

    store.getState().setPathToDistrict(agent.id, district);

    const path = store.getState().agents[agent.id].path;
    expect(path.length).toBeGreaterThan(0);
    const lastPoint = path[path.length - 1];
    expect(lastPoint.x).toBeGreaterThan(0);
    expect(lastPoint.y).toBeGreaterThan(0);
    expect(lastPoint.tileCol).toBeGreaterThanOrEqual(0);
    expect(lastPoint.tileRow).toBeGreaterThanOrEqual(0);
  });
});