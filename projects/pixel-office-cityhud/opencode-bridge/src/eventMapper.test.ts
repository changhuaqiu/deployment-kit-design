import { describe, expect, it } from 'vitest'
import { mapRawEvent } from './eventMapper'

describe('mapRawEvent', () => {
  it('maps raw session event to envelope', () => {
    const actual = mapRawEvent({
      type: 'session.started',
      sessionId: 'sess_1',
    })

    expect(actual).toEqual(
      expect.objectContaining({
        type: 'session.started',
        sessionId: 'sess_1',
      })
    )
  })

  it('uses unknown session fallback', () => {
    const actual = mapRawEvent({ type: 'error', message: 'boom' })
    expect(actual?.sessionId).toBe('unknown')
  })
})
