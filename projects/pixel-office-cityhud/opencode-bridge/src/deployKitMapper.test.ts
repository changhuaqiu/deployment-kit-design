import { describe, expect, it } from 'vitest'
import { mapRawEvent } from './eventMapper'

describe('mapRawEvent deploykit', () => {
  it('preserves deployment kit business events as deploykit envelope messages', () => {
    const actual = mapRawEvent({
      kind: 'workflow_selected',
      sessionId: 'ses_1',
      workflowId: 'wf_init',
      workflowName: 'init-service',
      totalSkills: 5,
      at: 1710000000000,
    })

    expect(actual).toEqual(
      expect.objectContaining({
        type: 'deploykit.business',
        sessionId: 'ses_1',
        payload: expect.objectContaining({
          kind: 'workflow_selected',
          workflowId: 'wf_init',
        }),
      })
    )
  })
})
