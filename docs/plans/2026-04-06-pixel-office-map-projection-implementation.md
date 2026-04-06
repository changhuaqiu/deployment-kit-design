# Pixel Office + Map Projection Implementation Plan

> **For execution:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将右侧“办公室（Office）”的多 Agent 动作投影到左侧地图，出现扫描与施工动画，并在完成后让对应建筑在地图中生成/升级。

**Architecture:** 在 Zustand store 中新增 `projectionEvents`（投影事件流）与纯函数生成器；Canvas 每帧读取事件流渲染扫描波纹、脚手架、粒子爆裂与建筑显形；右侧 UI 从“列表终端”改为“具象化办公室工位”，每个 subagent 占用工位并显示气泡短日志。

**Tech Stack:** React + TS, Zustand, HTML Canvas, Tailwind, Vitest

---

## File Map (Lock In)

**Create**
- `frontend/pixel-prototype/src/utils/cityPlacement.ts`：把资源/库存稳定映射到地图格子坐标的纯函数（可复用、可测试）。
- `frontend/pixel-prototype/src/utils/projection.ts`：从变化/工坊数据生成 `ProjectionEvent[]` 的纯函数。
- `frontend/pixel-prototype/src/utils/projection.test.ts`：投影生成器单测。
- `frontend/pixel-prototype/src/utils/cityPlacement.test.ts`：坐标映射单测。

**Modify**
- `frontend/pixel-prototype/src/store/deployStore.ts`：新增 `ProjectionEvent` 类型、`projectionEvents` 状态、投影事件写入方法。
- `frontend/pixel-prototype/src/store/deployStore.test.ts`：增加投影事件写入的行为测试。
- `frontend/pixel-prototype/src/components/city/CityHudMap.tsx`：读取事件流渲染扫描/施工动画；建筑显形/升级动画；减少“硬框切割”的视觉。
- `frontend/pixel-prototype/src/components/city/AgentOfficePanel.tsx`：重构为具象化办公室（工位/监工室/文件堆）UI。

---

### Task 1: Add Placement Utilities (Deterministic X/Y)

**Files:**
- Create: `frontend/pixel-prototype/src/utils/cityPlacement.ts`
- Test: `frontend/pixel-prototype/src/utils/cityPlacement.test.ts`

- [ ] **Step 1: Create `cityPlacement.ts` with deterministic hashing + open spot search**

```ts
export type DistrictKey = 'business' | 'data' | 'network' | 'security' | 'ops' | 'config'

export type DistrictRect = { key: DistrictKey; x: number; y: number; w: number; h: number }

export function hashInt(input: string) {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function findOpenSpot(occupied: Set<string>, rect: DistrictRect, seed: number) {
  const stride = 2
  const maxX = rect.x + rect.w - 2
  const maxY = rect.y + rect.h - 2
  let x = rect.x + 1 + ((seed % Math.max(1, rect.w - 2)) & ~1)
  let y = rect.y + 1 + (((seed >>> 6) % Math.max(1, rect.h - 2)) & ~1)

  for (let i = 0; i < 256; i++) {
    const key = `${x},${y}`
    if (!occupied.has(key)) {
      occupied.add(key)
      return { x, y }
    }
    x += stride
    if (x > maxX) {
      x = rect.x + 1
      y += stride
      if (y > maxY) y = rect.y + 1
    }
  }

  const fallback = `${rect.x + 1},${rect.y + 1}`
  occupied.add(fallback)
  return { x: rect.x + 1, y: rect.y + 1 }
}

export function defaultDistrictRects(): DistrictRect[] {
  return [
    { key: 'business', x: 2, y: 2, w: 18, h: 12 },
    { key: 'data', x: 22, y: 2, w: 18, h: 12 },
    { key: 'network', x: 42, y: 2, w: 12, h: 12 },
    { key: 'security', x: 2, y: 16, w: 16, h: 16 },
    { key: 'ops', x: 20, y: 16, w: 16, h: 16 },
    { key: 'config', x: 38, y: 16, w: 16, h: 16 },
  ]
}

export function placeInDistrict(opts: {
  occupied: Set<string>
  rects: DistrictRect[]
  district: DistrictKey
  seedKey: string
}) {
  const rect = opts.rects.find(r => r.key === opts.district) ?? opts.rects[0]
  return findOpenSpot(opts.occupied, rect, hashInt(opts.seedKey))
}
```

- [ ] **Step 2: Write unit tests for placement determinism**

```ts
import { describe, expect, it } from 'vitest'
import { defaultDistrictRects, placeInDistrict } from './cityPlacement'

describe('cityPlacement', () => {
  it('places deterministically for same seedKey', () => {
    const rects = defaultDistrictRects()
    const p1 = placeInDistrict({ occupied: new Set(), rects, district: 'data', seedKey: 'a:b:c' })
    const p2 = placeInDistrict({ occupied: new Set(), rects, district: 'data', seedKey: 'a:b:c' })
    expect(p1).toEqual(p2)
  })

  it('avoids occupied spots', () => {
    const rects = defaultDistrictRects()
    const occupied = new Set<string>()
    const p1 = placeInDistrict({ occupied, rects, district: 'business', seedKey: 'x' })
    const p2 = placeInDistrict({ occupied, rects, district: 'business', seedKey: 'x' })
    expect(p1).not.toEqual(p2)
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npm run test -- src/utils/cityPlacement.test.ts`

---

### Task 2: Add Projection Event Model + Pure Generators

**Files:**
- Create: `frontend/pixel-prototype/src/utils/projection.ts`
- Test: `frontend/pixel-prototype/src/utils/projection.test.ts`

- [ ] **Step 1: Implement `ProjectionEvent` types and event generators**

```ts
import type { DeployChange, EnvName, InventoryItem, ResourceChange } from '@/store/deployStore'
import { defaultDistrictRects, placeInDistrict, type DistrictKey } from './cityPlacement'
import { districtForInventory, districtForResource } from './city'

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

export function projectionForScan(args: {
  at: number
  change: DeployChange
  inventory: InventoryItem[]
}) {
  const rects = defaultDistrictRects()
  const occupied = new Set<string>()
  const events: ProjectionEvent[] = []

  for (const inv of args.inventory) {
    const district = districtForInventory(inv) as DistrictKey
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
    const district = districtForResource(r) as DistrictKey
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
```

- [ ] **Step 2: Add unit tests for projection generation counts**

```ts
import { describe, expect, it } from 'vitest'
import { projectionForGenerate, projectionForScan } from './projection'
import type { DeployChange } from '@/store/deployStore'

const baseChange: DeployChange = {
  id: 'chg_t',
  title: 't',
  env: 'prod',
  scenario: 'live_to_iac',
  createdAt: 0,
  createdBy: 'x',
  status: 'draft',
  workshop: { step: 'select', scope: 'x', repo: 'x', inventory: [], artifact: null, updatedAt: 0 },
  resources: [],
  notes: '',
  comments: [],
}

describe('projection', () => {
  it('generate produces start+complete per resource', () => {
    const ev = projectionForGenerate({
      at: 1000,
      change: baseChange,
      resources: [
        { id: 'r1', action: 'create', type: 'aws_s3_bucket', name: 'b', summary: 's', costDeltaMonthlyUsd: 0, riskTags: [] },
        { id: 'r2', action: 'update', type: 'aws_iam_role', name: 'role', summary: 's', costDeltaMonthlyUsd: 0, riskTags: [] },
      ],
    })
    expect(ev.filter(e => e.kind === 'build_start')).toHaveLength(2)
    expect(ev.filter(e => e.kind === 'build_complete')).toHaveLength(2)
  })

  it('scan produces ping per inventory, drift adds alert', () => {
    const ev = projectionForScan({
      at: 1000,
      change: baseChange,
      inventory: [
        { id: 'i1', type: 'aws_s3_bucket', name: 'b', mark: 'managed', drift: 'none' },
        { id: 'i2', type: 'aws_iam_role', name: 'role', mark: 'managed', drift: 'changed' },
      ],
    })
    expect(ev.filter(e => e.kind === 'scan_ping')).toHaveLength(2)
    expect(ev.filter(e => e.kind === 'drift_alert')).toHaveLength(1)
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npm run test -- src/utils/projection.test.ts`

---

### Task 3: Store Integration (Projection Event Stream)

**Files:**
- Modify: `frontend/pixel-prototype/src/store/deployStore.ts`
- Modify: `frontend/pixel-prototype/src/store/deployStore.test.ts`

- [ ] **Step 1: Add `projectionEvents` state + helpers to DeployState**

Add to types:

```ts
import type { ProjectionEvent } from '@/utils/projection'

type DeployState = {
  // ...
  projectionEvents: ProjectionEvent[]
  pushProjectionEvents: (events: ProjectionEvent[]) => void
  gcProjectionEvents: (now: number) => void
  projectScan: (changeId: string) => void
  projectGenerate: (changeId: string) => void
}
```

- [ ] **Step 2: Implement `pushProjectionEvents` + `gcProjectionEvents`**

```ts
projectionEvents: [],
pushProjectionEvents: (events) =>
  set((s) => ({ projectionEvents: [...s.projectionEvents, ...events] })),
gcProjectionEvents: (now) =>
  set((s) => ({
    projectionEvents: s.projectionEvents.filter((e) => now - e.at < (e.durationMs ?? 3000) + 1500),
  })),
```

- [ ] **Step 3: Implement `projectScan`/`projectGenerate` using the pure generators**

```ts
import { projectionForGenerate, projectionForScan } from '@/utils/projection'

projectScan: (changeId) => {
  const at = Date.now()
  const ch = get().changes.find(c => c.id === changeId)
  if (!ch) return
  const events = projectionForScan({ at, change: ch, inventory: ch.workshop.inventory })
  get().pushProjectionEvents(events)
},
projectGenerate: (changeId) => {
  const at = Date.now()
  const ch = get().changes.find(c => c.id === changeId)
  if (!ch) return
  const events = projectionForGenerate({ at, change: ch, resources: ch.resources })
  get().pushProjectionEvents(events)
},
```

- [ ] **Step 4: Extend store tests to assert projection events are written**

```ts
it('projects scan and generate into projectionEvents', () => {
  const id = useDeployStore.getState().createTask({
    title: 'test',
    env: 'dev',
    scenario: 'live_and_iac_to_sync',
    createdBy: 'a@b.c',
  })
  useDeployStore.getState().runWorkshopScan(id)
  useDeployStore.getState().projectScan(id)
  expect(useDeployStore.getState().projectionEvents.some(e => e.kind === 'scan_ping')).toBe(true)

  useDeployStore.getState().runWorkshopGenerate(id)
  useDeployStore.getState().projectGenerate(id)
  expect(useDeployStore.getState().projectionEvents.some(e => e.kind === 'build_start')).toBe(true)
})
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/store/deployStore.test.ts`

---

### Task 4: Canvas Projection Rendering (Scan + Scaffolding + Burst)

**Files:**
- Modify: `frontend/pixel-prototype/src/components/city/CityHudMap.tsx`

- [ ] **Step 1: Read `projectionEvents` and periodically GC them**

Add selectors:

```ts
const projectionEvents = useDeployStore(s => s.projectionEvents)
const gcProjectionEvents = useDeployStore(s => s.gcProjectionEvents)
```

Add an interval effect:

```ts
useEffect(() => {
  const t = window.setInterval(() => gcProjectionEvents(Date.now()), 1500)
  return () => window.clearInterval(t)
}, [gcProjectionEvents])
```

- [ ] **Step 2: In the draw loop, render events as an overlay layer**

Add helpers inside the effect (no new file yet):

```ts
const now = Date.now()
for (const e of projectionEvents) {
  const age = now - e.at
  const dur = e.durationMs ?? 1000
  const t = Math.max(0, Math.min(1, age / dur))
  const cx = e.target.x * tile + tile * 0.6
  const cy = e.target.y * tile + tile * 0.6

  if (e.kind === 'scan_ping') {
    const r = 8 + t * 46
    ctx.strokeStyle = `rgba(34,211,238,${0.35 * (1 - t)})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
  }

  if (e.kind === 'drift_alert') {
    const pulse = 0.5 + 0.5 * Math.sin((age / 180) * Math.PI * 2)
    ctx.fillStyle = `rgba(250,204,21,${0.25 + 0.25 * pulse})`
    ctx.fillRect(cx - 14, cy - 22, 28, 10)
    ctx.fillStyle = 'rgba(250,204,21,0.9)'
    ctx.font = '10px "Press Start 2P", ui-sans-serif'
    ctx.fillText('⚠', cx - 6, cy - 14)
  }

  if (e.kind === 'build_start') {
    // scaffolding box
    ctx.strokeStyle = 'rgba(56,189,248,0.85)'
    ctx.lineWidth = 2
    ctx.setLineDash([3, 3])
    ctx.strokeRect(cx - 18, cy - 18, 36, 36)
    ctx.setLineDash([])
    // progress bar
    ctx.fillStyle = 'rgba(56,189,248,0.15)'
    ctx.fillRect(cx - 18, cy + 22, 36, 4)
    ctx.fillStyle = 'rgba(56,189,248,0.9)'
    ctx.fillRect(cx - 18, cy + 22, 36 * t, 4)
  }

  if (e.kind === 'build_complete') {
    // pixel burst
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2
      const rr = 6 + t * 18
      const px = cx + Math.cos(a) * rr
      const py = cy + Math.sin(a) * rr
      ctx.fillStyle = `rgba(74,222,128,${0.6 * (1 - t)})`
      ctx.fillRect(px, py, 2, 2)
    }
  }
}
```

- [ ] **Step 3: Make buildings “appear” after build events**

Implement a local map of `revealAtByResourceKey`:

```ts
const revealRef = useRef(new Map<string, number>())
useEffect(() => {
  for (const e of projectionEvents) {
    if (e.kind === 'build_complete' && e.target.resourceKey) {
      revealRef.current.set(e.target.resourceKey, e.at)
    }
  }
}, [projectionEvents])
```

When drawing buildings, compute an alpha boost:

```ts
const key = b.target.kind === 'resource' ? `${selectedResource?.type}.${selectedResource?.name}` : null
const revealAt = key ? revealRef.current.get(key) : undefined
const fade = revealAt ? Math.min(1, (Date.now() - revealAt) / 700) : 1
ctx.globalAlpha = fade
// draw icon etc
ctx.globalAlpha = 1
```

Note: if resourceKey mapping is easier, add `resourceKey` into `CityBuilding` and wire it during derived building creation.

- [ ] **Step 4: Run `lint` and smoke test locally**

Run: `npm run lint`
Run: `npm run dev` and manually click “智能普查 / 智能生成”，观察扫描圈与脚手架动画。

---

### Task 5: Office UI – From List to Pixel Office Scene

**Files:**
- Modify: `frontend/pixel-prototype/src/components/city/AgentOfficePanel.tsx`

- [ ] **Step 1: Replace card-list with a simple “office cross-section” layout**

Structure:

```tsx
return (
  <div className="h-full w-full bg-[#0a0f18] relative overflow-hidden">
    <div className="h-12 border-b border-cyan-800/40 flex items-center justify-between px-4">
      <div className="font-bold tracking-widest text-cyan-300">PIXEL CONSTRUCTION CO.</div>
      <button onClick={onOpenLedger} className="text-[10px] text-cyan-400">[ LEDGER ]</button>
    </div>

    <div className="p-4 space-y-4">
      <OfficeRoomDeacon queue={queue} reviewer={reviewer} onOpenLedger={onOpenLedger} />
      <OfficeDesks workers={workers} onOpenLedger={onOpenLedger} />
    </div>
  </div>
)
```

- [ ] **Step 2: Implement desks as fixed slots + bubbles**

Rules:
- 工位数量先定为 6（3x2 grid），超过则进入 scroll。
- `working`：桌面显示 “⌨️” 闪烁 + 气泡显示 `currentTask` 的短句。
- `done`：桌面显示 “📄✅” 并触发一次“文件上交”动画（先用 CSS translate + opacity 过渡）。

- [ ] **Step 3: Rename UI copy to Office narrative**

Ensure strings never say “审批台/Refinery”。Use:
- “办公室”
- “工位”
- “文件堆/待签收文件”

- [ ] **Step 4: Smoke test**

Run: `npm run dev`
Trigger scan/generate, confirm workers appear “in desks” with bubbles.

---

### Task 6: Wire Projection Triggers to Buttons

**Files:**
- Modify: `frontend/pixel-prototype/src/components/city/CityHudMap.tsx`

- [ ] **Step 1: After `runWorkshopScan`, call `projectScan(changeId)`**

```ts
const projectScan = useDeployStore(s => s.projectScan)
// in callback
runWorkshopScan(selectedChange.id)
projectScan(selectedChange.id)
```

- [ ] **Step 2: After `runWorkshopGenerate`, call `projectGenerate(changeId)`**

```ts
const projectGenerate = useDeployStore(s => s.projectGenerate)
runWorkshopGenerate(selectedChange.id)
projectGenerate(selectedChange.id)
```

- [ ] **Step 3: Run `lint` + `test`**

Run: `npm run lint`
Run: `npm run test`

---

## Plan Self-Review (Spec Coverage)
- 3:2 布局：已存在（继续沿用）。
- 办公室叙事替代“审批台”：Task 5 强制改文案。
- 右边动作 → 左边变化：Task 6 将 scan/generate 的完成回调转换为投影事件；Task 4 将事件渲染到 Canvas。
- 施工现场动画：Task 4 的 `build_start` 脚手架 + 进度条，`build_complete` 爆裂粒子。
- 可玩性：点击工位/建筑 → Ledger；扫描/建造带明显反馈。

