import type { DistrictKey } from '@/utils/city'
import type { ProjectionEvent } from '@/utils/projection'
import type { RuntimeEvent } from '../opencode/types'

const DISTRICTS: DistrictKey[] = ['business', 'data', 'network', 'security', 'ops', 'config']

function normalizeDistrict(value: string): DistrictKey {
  return DISTRICTS.includes(value as DistrictKey) ? (value as DistrictKey) : 'ops'
}

export function projectCityEvents(events: RuntimeEvent[]): ProjectionEvent[] {
  return events.flatMap((event) => {
    if (event.kind !== 'resource_signal') return []

    return [
      {
        id: `${event.sessionId}:${event.resourceKey}:${event.at}:${event.signal}`,
        at: event.at,
        kind: event.signal,
        env: 'prod',
        changeId: event.sessionId,
        target: {
          x: 0,
          y: 0,
          district: normalizeDistrict(event.district),
          resourceKey: event.resourceKey,
        },
        durationMs: event.signal === 'build_complete' ? 900 : 1800,
      },
    ]
  })
}
