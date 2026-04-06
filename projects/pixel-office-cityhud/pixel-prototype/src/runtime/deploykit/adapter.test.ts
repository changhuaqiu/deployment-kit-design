import { describe, expect, it } from 'vitest'
import type { DeployKitEvent } from './types'
import { adaptDeployKitEnvelope } from './adapter'

describe('DeployKitEvent types', () => {
  it('supports workflow_selected fixtures', () => {
    const event: DeployKitEvent = {
      kind: 'workflow_selected',
      sessionId: 'ses_1',
      workflowId: 'wf_init',
      workflowName: 'init-service',
      totalSkills: 5,
      at: 1710000000000,
    }

    expect(event.workflowId).toBe('wf_init')
  })
})

describe('adaptDeployKitEnvelope', () => {
  it('extracts DeployKitEvent from bridge envelope', () => {
    const actual = adaptDeployKitEnvelope({
      id: 'evt_1',
      type: 'deploykit.business',
      timestamp: 1710000000000,
      sessionId: 'ses_1',
      source: 'deploykit',
      payload: {
        kind: 'workflow_selected',
        sessionId: 'ses_1',
        workflowId: 'wf_init',
        workflowName: 'init-service',
        totalSkills: 5,
        at: 1710000000000,
      },
    })

    expect(actual).toEqual(
      expect.objectContaining({
        kind: 'workflow_selected',
        workflowId: 'wf_init',
      })
    )
  })

  it('returns null for runtime envelope types', () => {
    expect(
      adaptDeployKitEnvelope({
        id: 'evt_2',
        type: 'run.log',
        timestamp: 1710000000000,
        sessionId: 'ses_1',
        payload: {},
      })
    ).toBeNull()
  })
})
