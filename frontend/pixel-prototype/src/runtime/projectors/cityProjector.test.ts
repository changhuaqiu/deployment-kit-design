import { describe, expect, it } from 'vitest'
import { projectCityEvents } from './cityProjector'

describe('projectCityEvents', () => {
  it('projects scan signals into city events', () => {
    const events = projectCityEvents([
      {
        kind: 'resource_signal',
        sessionId: 'sess_1',
        signal: 'scan_ping',
        resourceKey: 'aws_vpc.main',
        district: 'network',
        at: 1710000000000,
      },
    ])

    expect(events).toEqual([
      expect.objectContaining({
        kind: 'scan_ping',
        target: expect.objectContaining({ district: 'network', resourceKey: 'aws_vpc.main' }),
      }),
    ])
  })

  it('ignores non-resource runtime events', () => {
    expect(
      projectCityEvents([
        { kind: 'session_started', sessionId: 'sess_1', at: 1710000000000 },
      ])
    ).toEqual([])
  })
})
