import { describe, expect, it } from 'vitest'
import { normalizeJsonlPayload } from './deployKitForwarder'

describe('normalizeJsonlPayload', () => {
  it('keeps valid JSON lines and removes blank lines', () => {
    const actual = normalizeJsonlPayload('\n{"kind":"workflow_selected"}\n\n{"kind":"skill_started"}\n')
    expect(actual).toBe('{"kind":"workflow_selected"}\n{"kind":"skill_started"}')
  })
})
