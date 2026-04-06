import { describe, expect, it } from 'vitest'
import { createMockRuntimeClient } from '../runtime/opencode/client'
import { createRuntimeStore } from './runtimeStore'

describe('runtimeStore', () => {
  it('ingests raw events and updates office state', () => {
    const store = createRuntimeStore()

    store.getState().ingestRawEvent({
      id: 'evt_1',
      type: 'agent.spawned',
      timestamp: 1710000000000,
      sessionId: 'sess_1',
      agentId: 'agent_1',
      payload: { name: 'OpenCode-Scanner', role: 'scanner' },
    })

    expect(store.getState().agents.agent_1?.name).toBe('OpenCode-Scanner')
  })

  it('uses the mock runtime client as an event source', () => {
    const client = createMockRuntimeClient()
    const store = createRuntimeStore(client)

    client.connect()
    client.emit({
      id: 'evt_1',
      type: 'session.started',
      timestamp: 1710000000000,
      sessionId: 'sess_1',
      payload: {},
    })

    expect(store.getState().sessionId).toBe('sess_1')
  })

  it('updates approvals and city projections from raw events', () => {
    const store = createRuntimeStore()

    store.getState().ingestRawEvent({
      id: 'evt_2',
      type: 'approval.required',
      timestamp: 1710000000100,
      sessionId: 'sess_1',
      payload: { approvalId: 'appr_1', message: 'Need approval to apply patch' },
    })

    store.getState().ingestRawEvent({
      id: 'evt_3',
      type: 'resource.changed',
      timestamp: 1710000000200,
      sessionId: 'sess_1',
      payload: { resourceKey: 'aws_vpc.main', district: 'network', phase: 'start' },
    })

    expect(store.getState().approvals.appr_1?.status).toBe('pending')
    expect(store.getState().projectionEvents.at(-1)).toEqual(
      expect.objectContaining({
        kind: 'build_start',
        target: expect.objectContaining({ resourceKey: 'aws_vpc.main', district: 'network' }),
      })
    )
  })
})
