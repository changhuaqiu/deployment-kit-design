import { describe, expect, it } from 'vitest'
import { parseJsonLine } from './rawParser'

describe('parseJsonLine', () => {
  it('parses one JSON line', () => {
    expect(parseJsonLine('{"type":"session.started","sessionId":"sess_1"}')).toEqual({
      type: 'session.started',
      sessionId: 'sess_1',
    })
  })

  it('returns null for invalid JSON', () => {
    expect(parseJsonLine('{bad json')).toBeNull()
  })
})
