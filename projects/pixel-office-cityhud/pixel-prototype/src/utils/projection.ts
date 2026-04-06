import type { DeployChange, EnvName, InventoryItem, ResourceChange } from '@/store/deployStore'
import { districtForInventory, districtForResource, type DistrictKey } from '@/utils/city'
import { defaultDistrictRects, placeInDistrict } from '@/utils/cityPlacement'

export type ProjectionKind = 'scan_ping' | 'build_start' | 'build_complete' | 'drift_alert'

export type ProjectionEvent = {
  id: string
  at: number
  kind: ProjectionKind
  env: EnvName
  changeId: string
  agentId?: string
  target: { x: number; y: number; district: DistrictKey; resourceKey?: string }
  durationMs?: number
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

export function projectionForScan(args: { at: number; change: DeployChange; inventory: InventoryItem[] }) {
  const rects = defaultDistrictRects()
  const occupied = new Set<string>()
  const events: ProjectionEvent[] = []

  for (const inv of args.inventory) {
    const district = districtForInventory(inv)
    const pos = placeInDistrict({ occupied, rects, district, seedKey: `${args.change.id}:${inv.id}` })
    events.push({
      id: uid('pe'),
      at: args.at,
      kind: 'scan_ping',
      env: args.change.env,
      changeId: args.change.id,
      target: { ...pos, district, resourceKey: `${inv.type}.${inv.name}` },
      durationMs: 1200,
    })

    if (inv.drift !== 'none') {
      events.push({
        id: uid('pe'),
        at: args.at + 250,
        kind: 'drift_alert',
        env: args.change.env,
        changeId: args.change.id,
        target: { ...pos, district, resourceKey: `${inv.type}.${inv.name}` },
        durationMs: 2400,
      })
    }
  }

  return events
}

export function projectionForGenerate(args: { at: number; change: DeployChange; resources: ResourceChange[] }) {
  const rects = defaultDistrictRects()
  const occupied = new Set<string>()
  const events: ProjectionEvent[] = []

  let stagger = 0
  for (const r of args.resources) {
    const district = districtForResource(r)
    const pos = placeInDistrict({ occupied, rects, district, seedKey: `${args.change.id}:${r.id}` })
    const baseAt = args.at + stagger

    events.push({
      id: uid('pe'),
      at: baseAt,
      kind: 'build_start',
      env: args.change.env,
      changeId: args.change.id,
      target: { ...pos, district, resourceKey: `${r.type}.${r.name}` },
      durationMs: 2600,
    })

    events.push({
      id: uid('pe'),
      at: baseAt + 2600,
      kind: 'build_complete',
      env: args.change.env,
      changeId: args.change.id,
      target: { ...pos, district, resourceKey: `${r.type}.${r.name}` },
      durationMs: 900,
    })

    stagger += 180
  }

  return events
}

