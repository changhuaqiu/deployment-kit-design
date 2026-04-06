import { describe, expect, it } from 'vitest'
import type { OpenCodeEventEnvelope, RuntimeEvent } from './types'
import { adaptOpenCodeEvent } from './adapter'

const rawFixture: OpenCodeEventEnvelope<{ name: string; role: string }> = {
  id: 'evt_1',
  type: 'agent.spawned',
  timestamp: 1710000000000,
  sessionId: 'sess_1',
  agentId: 'agent_1',
  payload: { name: 'OpenCode-Scanner', role: 'scanner' },
}

const expectedFixture: RuntimeEvent = {
  kind: 'agent_spawned',
  sessionId: 'sess_1',
  agentId: 'agent_1',
  name: 'OpenCode-Scanner',
  role: 'scanner',
  at: 1710000000000,
}

describe('adaptOpenCodeEvent', () => {
  it('keeps the plan fixture types aligned', () => {
    expect(rawFixture.type).toBe('agent.spawned')
    expect(expectedFixture.kind).toBe('agent_spawned')
  })

  it('maps agent.spawned to agent_spawned', () => {
    const actual = adaptOpenCodeEvent(rawFixture)

    expect(actual).toEqual(expectedFixture)
  })

  it('maps tool.called to agent_status_changed', () => {
    const actual = adaptOpenCodeEvent({
      id: 'evt_2',
      type: 'tool.called',
      timestamp: 1710000000200,
      sessionId: 'sess_1',
      agentId: 'agent_1',
      payload: { tool: 'read', task: 'Reading stack files' },
    })

    expect(actual).toEqual({
      kind: 'agent_status_changed',
      sessionId: 'sess_1',
      agentId: 'agent_1',
      status: 'thinking',
      task: 'Reading stack files',
      at: 1710000000200,
    })
  })

  it('maps approval.required to approval_needed', () => {
    const actual = adaptOpenCodeEvent({
      id: 'evt_3',
      type: 'approval.required',
      timestamp: 1710000000300,
      sessionId: 'sess_1',
      payload: { approvalId: 'appr_1', message: 'Need approval to deploy' },
    })

    expect(actual).toEqual({
      kind: 'approval_needed',
      sessionId: 'sess_1',
      approvalId: 'appr_1',
      message: 'Need approval to deploy',
      at: 1710000000300,
    })
  })

  it('maps run.log to run_log', () => {
    const actual = adaptOpenCodeEvent({
      id: 'evt_4',
      type: 'run.log',
      timestamp: 1710000000400,
      sessionId: 'sess_1',
      payload: { level: 'warn', message: 'Canary elevated latency' },
    })

    expect(actual).toEqual({
      kind: 'run_log',
      sessionId: 'sess_1',
      level: 'warn',
      message: 'Canary elevated latency',
      at: 1710000000400,
    })
  })

  it('returns null for unsupported events', () => {
    const actual = adaptOpenCodeEvent({
      id: 'evt_5',
      type: 'tool.unknown' as never,
      timestamp: 1710000000500,
      sessionId: 'sess_1',
      payload: { tool: 'unknown' },
    })

    expect(actual).toBeNull()
  })
})
