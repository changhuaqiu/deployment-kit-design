import { describe, expect, it } from 'vitest'
import { reduceOfficeProjection, type OfficeProjectionState } from './officeProjector'

function makeState(): OfficeProjectionState {
  return { agents: {}, approvals: {}, ledger: [] }
}

describe('reduceOfficeProjection', () => {
  it('adds an agent on agent_spawned', () => {
    const next = reduceOfficeProjection(makeState(), {
      kind: 'agent_spawned',
      sessionId: 'sess_1',
      agentId: 'agent_1',
      name: 'OpenCode-Scanner',
      role: 'scanner',
      at: 1710000000000,
    })

    expect(next.agents.agent_1?.status).toBe('idle')
    expect(next.ledger).toHaveLength(1)
  })

  it('updates agent state on agent_status_changed', () => {
    const seeded = reduceOfficeProjection(makeState(), {
      kind: 'agent_spawned',
      sessionId: 'sess_1',
      agentId: 'agent_1',
      name: 'OpenCode-Scanner',
      role: 'scanner',
      at: 1710000000000,
    })

    const next = reduceOfficeProjection(seeded, {
      kind: 'agent_status_changed',
      sessionId: 'sess_1',
      agentId: 'agent_1',
      status: 'working',
      task: 'Reading stack files',
      at: 1710000000100,
    })

    expect(next.agents.agent_1?.status).toBe('working')
    expect(next.agents.agent_1?.currentTask).toBe('Reading stack files')
  })

  it('adds a pending approval on approval_needed', () => {
    const next = reduceOfficeProjection(makeState(), {
      kind: 'approval_needed',
      sessionId: 'sess_1',
      approvalId: 'appr_1',
      message: 'Need approval to deploy',
      at: 1710000000100,
    })

    expect(next.approvals.appr_1?.status).toBe('pending')
    expect(next.ledger.at(-1)?.level).toBe('warn')
  })

  it('records runtime errors in the ledger', () => {
    const next = reduceOfficeProjection(makeState(), {
      kind: 'runtime_error',
      sessionId: 'sess_1',
      message: 'permission denied',
      at: 1710000000200,
    })

    expect(next.ledger.at(-1)).toEqual(
      expect.objectContaining({
        level: 'error',
        message: 'permission denied',
      })
    )
  })
})
