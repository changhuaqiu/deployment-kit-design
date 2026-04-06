# OpenCode Runtime Foundation Implementation Plan

> **For execution:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建可独立开发和测试的 OpenCode Runtime 基础设施，为后续 UI 集成提供稳定的事件接入、状态归一化与投影能力。

**Architecture:** 该方案只实现 Runtime 层，不改动现有 UI 页面和 `deployStore` 业务主链路。通过 `client -> adapter -> projectors -> runtimeStore` 四层拆分，把 OpenCode 原始事件转换为前端可消费的统一实时状态，并用单元测试覆盖事件标准化、状态迁移和投影输出。

**Tech Stack:** TypeScript, React 18, Zustand, Vitest, Vite

---

## File Structure

### New Runtime Files
- Create: `pixel-prototype/src/runtime/opencode/types.ts`
  - 定义 OpenCode 原始事件、统一运行时事件、会话/代理/审批等核心类型。
- Create: `pixel-prototype/src/runtime/opencode/client.ts`
  - 封装 Runtime 客户端接口，提供可替换的 `connect / disconnect / subscribe` 能力，以及 SSE stub。
- Create: `pixel-prototype/src/runtime/opencode/adapter.ts`
  - 负责把 OpenCode 原始事件标准化为统一 `RuntimeEvent`。
- Create: `pixel-prototype/src/runtime/projectors/officeProjector.ts`
  - 把 `RuntimeEvent` 投影为办公室 agent 状态、台账、审批队列。
- Create: `pixel-prototype/src/runtime/projectors/cityProjector.ts`
  - 把 `RuntimeEvent` 投影为城市扫描/漂移/施工动画事件。
- Create: `pixel-prototype/src/runtime/projectors/runProjector.ts`
  - 把 `RuntimeEvent` 投影为运行阶段、进度、日志。
- Create: `pixel-prototype/src/store/runtimeStore.ts`
  - 保存实时会话状态、agent 状态、审批、实时日志、投影结果，并暴露消费 API。

### New Test Files
- Create: `pixel-prototype/src/runtime/opencode/adapter.test.ts`
- Create: `pixel-prototype/src/runtime/projectors/officeProjector.test.ts`
- Create: `pixel-prototype/src/runtime/projectors/cityProjector.test.ts`
- Create: `pixel-prototype/src/runtime/projectors/runProjector.test.ts`
- Create: `pixel-prototype/src/store/runtimeStore.test.ts`

### Existing Files To Reference Only
- Reference: `pixel-prototype/src/store/deployStore.ts`
- Reference: `pixel-prototype/src/utils/projection.ts`
- Reference: `pixel-prototype/src/components/city/CityHudMap.tsx`
- Reference: `pixel-prototype/package.json`

---

### Task 1: Freeze Runtime Contracts

**Files:**
- Create: `pixel-prototype/src/runtime/opencode/types.ts`
- Test: `pixel-prototype/src/runtime/opencode/adapter.test.ts`

- [ ] **Step 1: Define the raw OpenCode event envelope**

```ts
export type OpenCodeEventType =
  | 'session.started'
  | 'session.ended'
  | 'agent.spawned'
  | 'agent.updated'
  | 'agent.completed'
  | 'agent.failed'
  | 'tool.called'
  | 'tool.completed'
  | 'approval.required'
  | 'approval.resolved'
  | 'artifact.ready'
  | 'resource.detected'
  | 'resource.changed'
  | 'run.step.changed'
  | 'run.log'
  | 'run.completed'
  | 'error'

export interface OpenCodeEventEnvelope<T = unknown> {
  id: string
  type: OpenCodeEventType
  timestamp: number
  sessionId: string
  agentId?: string
  payload: T
}
```

- [ ] **Step 2: Define the normalized runtime event union**

```ts
export type RuntimeEvent =
  | { kind: 'session_started'; sessionId: string; at: number }
  | { kind: 'session_ended'; sessionId: string; at: number }
  | { kind: 'agent_spawned'; sessionId: string; agentId: string; name: string; role: string; at: number }
  | { kind: 'agent_status_changed'; sessionId: string; agentId: string; status: 'idle' | 'thinking' | 'working' | 'blocked' | 'done'; task?: string; at: number }
  | { kind: 'approval_needed'; sessionId: string; approvalId: string; agentId?: string; message: string; at: number }
  | { kind: 'approval_resolved'; sessionId: string; approvalId: string; decision: 'approved' | 'rejected'; at: number }
  | { kind: 'artifact_ready'; sessionId: string; summary: string; files: { path: string; change: 'add' | 'modify' | 'delete' }[]; at: number }
  | { kind: 'resource_signal'; sessionId: string; signal: 'scan_ping' | 'drift_alert' | 'build_start' | 'build_complete'; resourceKey: string; district: string; at: number }
  | { kind: 'run_stage_changed'; sessionId: string; stage: 'syntax' | 'plan' | 'test_deploy' | 'prod_canary' | 'verify' | 'complete'; progress?: number; at: number }
  | { kind: 'run_log'; sessionId: string; level: 'info' | 'warn' | 'error'; message: string; at: number }
  | { kind: 'runtime_error'; sessionId: string; message: string; at: number }
```

- [ ] **Step 3: Add store-facing view types**

```ts
export interface RuntimeAgentState {
  id: string
  sessionId: string
  name: string
  role: string
  status: 'idle' | 'thinking' | 'working' | 'blocked' | 'done'
  currentTask: string
  updatedAt: number
}

export interface RuntimeApprovalState {
  id: string
  sessionId: string
  status: 'pending' | 'approved' | 'rejected'
  message: string
  requestedAt: number
}
```

- [ ] **Step 4: Add a test fixture in `adapter.test.ts` that imports the exported types**

```ts
import type { OpenCodeEventEnvelope, RuntimeEvent } from './types'

const raw: OpenCodeEventEnvelope<{ name: string; role: string }> = {
  id: 'evt_1',
  type: 'agent.spawned',
  timestamp: 1710000000000,
  sessionId: 'sess_1',
  agentId: 'agent_1',
  payload: { name: 'OpenCode-Scanner', role: 'scanner' },
}

const expected: RuntimeEvent = {
  kind: 'agent_spawned',
  sessionId: 'sess_1',
  agentId: 'agent_1',
  name: 'OpenCode-Scanner',
  role: 'scanner',
  at: 1710000000000,
}
```

- [ ] **Step 5: Run type-check to verify the contracts compile**

Run: `npm run check`  
Expected: PASS without introducing type conflicts in the new runtime types.

---

### Task 2: Implement the Event Adapter

**Files:**
- Create: `pixel-prototype/src/runtime/opencode/adapter.ts`
- Test: `pixel-prototype/src/runtime/opencode/adapter.test.ts`

- [ ] **Step 1: Write a failing adapter test for `agent.spawned`**

```ts
import { describe, expect, it } from 'vitest'
import { adaptOpenCodeEvent } from './adapter'

describe('adaptOpenCodeEvent', () => {
  it('maps agent.spawned to agent_spawned', () => {
    const actual = adaptOpenCodeEvent({
      id: 'evt_1',
      type: 'agent.spawned',
      timestamp: 1710000000000,
      sessionId: 'sess_1',
      agentId: 'agent_1',
      payload: { name: 'OpenCode-Scanner', role: 'scanner' },
    })

    expect(actual).toEqual({
      kind: 'agent_spawned',
      sessionId: 'sess_1',
      agentId: 'agent_1',
      name: 'OpenCode-Scanner',
      role: 'scanner',
      at: 1710000000000,
    })
  })
})
```

- [ ] **Step 2: Run the adapter test to verify it fails**

Run: `npm run test -- adapter.test.ts`  
Expected: FAIL with `Cannot find module './adapter'` or missing export.

- [ ] **Step 3: Implement a minimal `adaptOpenCodeEvent()` function**

```ts
import type { OpenCodeEventEnvelope, RuntimeEvent } from './types'

export function adaptOpenCodeEvent(event: OpenCodeEventEnvelope): RuntimeEvent | null {
  switch (event.type) {
    case 'agent.spawned':
      return {
        kind: 'agent_spawned',
        sessionId: event.sessionId,
        agentId: event.agentId ?? 'unknown',
        name: String((event.payload as { name?: string }).name ?? 'Unknown Agent'),
        role: String((event.payload as { role?: string }).role ?? 'worker'),
        at: event.timestamp,
      }
    default:
      return null
  }
}
```

- [ ] **Step 4: Expand the test file to cover status, approval, run log, and unknown events**

```ts
it('maps tool.called to agent_status_changed', () => {
  const actual = adaptOpenCodeEvent({
    id: 'evt_2',
    type: 'tool.called',
    timestamp: 1710000000200,
    sessionId: 'sess_1',
    agentId: 'agent_1',
    payload: { tool: 'read', task: 'Reading stack files' },
  })

  expect(actual).toEqual({
    kind: 'agent_status_changed',
    sessionId: 'sess_1',
    agentId: 'agent_1',
    status: 'thinking',
    task: 'Reading stack files',
    at: 1710000000200,
  })
})
```

- [ ] **Step 5: Extend `adaptOpenCodeEvent()` to support the full planned event surface**

```ts
const TOOL_STATUS_MAP: Record<string, 'thinking' | 'working'> = {
  read: 'thinking',
  search: 'thinking',
  write: 'working',
  edit: 'working',
  command: 'working',
}
```

- [ ] **Step 6: Run the focused adapter tests**

Run: `npm run test -- adapter.test.ts`  
Expected: PASS with coverage for all currently supported event mappings.

---

### Task 3: Build the Runtime Client Shell

**Files:**
- Create: `pixel-prototype/src/runtime/opencode/client.ts`
- Test: `pixel-prototype/src/store/runtimeStore.test.ts`

- [ ] **Step 1: Define the runtime client interface**

```ts
import type { OpenCodeEventEnvelope } from './types'

export interface RuntimeClient {
  connect(): void
  disconnect(): void
  subscribe(listener: (event: OpenCodeEventEnvelope) => void): () => void
}
```

- [ ] **Step 2: Implement a memory-backed mock client for tests**

```ts
export function createMockRuntimeClient() {
  const listeners = new Set<(event: OpenCodeEventEnvelope) => void>()

  return {
    connect() {},
    disconnect() {},
    subscribe(listener: (event: OpenCodeEventEnvelope) => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    emit(event: OpenCodeEventEnvelope) {
      listeners.forEach((listener) => listener(event))
    },
  }
}
```

- [ ] **Step 3: Add an SSE client stub that satisfies the same contract**

```ts
export function createSseRuntimeClient(url: string): RuntimeClient {
  let source: EventSource | null = null
  const listeners = new Set<(event: OpenCodeEventEnvelope) => void>()

  return {
    connect() {
      source = new EventSource(url)
      source.onmessage = (message) => {
        const event = JSON.parse(message.data) as OpenCodeEventEnvelope
        listeners.forEach((listener) => listener(event))
      }
    },
    disconnect() {
      source?.close()
      source = null
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
```

- [ ] **Step 4: Add a store test that uses the mock client as the source**

```ts
const client = createMockRuntimeClient()
client.connect()
client.emit({
  id: 'evt_1',
  type: 'session.started',
  timestamp: 1710000000000,
  sessionId: 'sess_1',
  payload: {},
})
```

- [ ] **Step 5: Run the store test to confirm the client contract is usable**

Run: `npm run test -- runtimeStore.test.ts`  
Expected: FAIL only because the store is not implemented yet, not because the client API is invalid.

---

### Task 4: Implement the Office Projector

**Files:**
- Create: `pixel-prototype/src/runtime/projectors/officeProjector.ts`
- Test: `pixel-prototype/src/runtime/projectors/officeProjector.test.ts`

- [ ] **Step 1: Write a failing test for spawning a worker**

```ts
import { describe, expect, it } from 'vitest'
import { reduceOfficeProjection } from './officeProjector'

describe('reduceOfficeProjection', () => {
  it('adds an agent on agent_spawned', () => {
    const next = reduceOfficeProjection(
      { agents: {}, approvals: {}, ledger: [] },
      { kind: 'agent_spawned', sessionId: 'sess_1', agentId: 'agent_1', name: 'OpenCode-Scanner', role: 'scanner', at: 1710000000000 }
    )

    expect(next.agents.agent_1?.status).toBe('idle')
  })
})
```

- [ ] **Step 2: Run the projector test to verify it fails**

Run: `npm run test -- officeProjector.test.ts`  
Expected: FAIL because the reducer does not exist yet.

- [ ] **Step 3: Implement the office projection reducer**

```ts
import type { RuntimeAgentState, RuntimeApprovalState, RuntimeEvent } from '../opencode/types'

export interface OfficeProjectionState {
  agents: Record<string, RuntimeAgentState>
  approvals: Record<string, RuntimeApprovalState>
  ledger: { id: string; at: number; message: string; level: 'info' | 'warn' | 'error' }[]
}

export function reduceOfficeProjection(state: OfficeProjectionState, event: RuntimeEvent): OfficeProjectionState {
  if (event.kind === 'agent_spawned') {
    return {
      ...state,
      agents: {
        ...state.agents,
        [event.agentId]: {
          id: event.agentId,
          sessionId: event.sessionId,
          name: event.name,
          role: event.role,
          status: 'idle',
          currentTask: 'Awaiting task',
          updatedAt: event.at,
        },
      },
    }
  }

  return state
}
```

- [ ] **Step 4: Expand the test file for status changes, approvals, and logs**

```ts
it('adds a pending approval on approval_needed', () => {
  const next = reduceOfficeProjection(
    { agents: {}, approvals: {}, ledger: [] },
    { kind: 'approval_needed', sessionId: 'sess_1', approvalId: 'appr_1', message: 'Need approval to deploy', at: 1710000000100 }
  )

  expect(next.approvals.appr_1?.status).toBe('pending')
})
```

- [ ] **Step 5: Implement the remaining event branches**

```ts
if (event.kind === 'agent_status_changed') {
  const agent = state.agents[event.agentId]
  if (!agent) return state
  return {
    ...state,
    agents: {
      ...state.agents,
      [event.agentId]: { ...agent, status: event.status, currentTask: event.task ?? agent.currentTask, updatedAt: event.at },
    },
  }
}
```

- [ ] **Step 6: Run the office projector tests**

Run: `npm run test -- officeProjector.test.ts`  
Expected: PASS with deterministic state transitions for agents, approvals, and ledger.

---

### Task 5: Implement the City Projector

**Files:**
- Create: `pixel-prototype/src/runtime/projectors/cityProjector.ts`
- Test: `pixel-prototype/src/runtime/projectors/cityProjector.test.ts`

- [ ] **Step 1: Write a failing projector test for scan events**

```ts
import { describe, expect, it } from 'vitest'
import { projectCityEvents } from './cityProjector'

describe('projectCityEvents', () => {
  it('projects scan signals into city events', () => {
    const events = projectCityEvents([
      { kind: 'resource_signal', sessionId: 'sess_1', signal: 'scan_ping', resourceKey: 'aws_vpc.main', district: 'network', at: 1710000000000 },
    ])

    expect(events).toEqual([
      expect.objectContaining({
        kind: 'scan_ping',
        target: expect.objectContaining({ district: 'network', resourceKey: 'aws_vpc.main' }),
      }),
    ])
  })
})
```

- [ ] **Step 2: Run the city projector test to verify it fails**

Run: `npm run test -- cityProjector.test.ts`  
Expected: FAIL because the projector is missing.

- [ ] **Step 3: Implement a thin translator over the existing projection shape**

```ts
import type { ProjectionEvent } from '@/utils/projection'
import type { RuntimeEvent } from '../opencode/types'

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
        target: { x: 0, y: 0, district: event.district as ProjectionEvent['target']['district'], resourceKey: event.resourceKey },
        durationMs: event.signal === 'build_complete' ? 900 : 1800,
      },
    ]
  })
}
```

- [ ] **Step 4: Add a second test that verifies non-resource events are ignored**

```ts
it('ignores non-resource runtime events', () => {
  expect(projectCityEvents([
    { kind: 'session_started', sessionId: 'sess_1', at: 1710000000000 },
  ])).toEqual([])
})
```

- [ ] **Step 5: Run the city projector tests**

Run: `npm run test -- cityProjector.test.ts`  
Expected: PASS with deterministic city projection output.

---

### Task 6: Implement the Run Projector

**Files:**
- Create: `pixel-prototype/src/runtime/projectors/runProjector.ts`
- Test: `pixel-prototype/src/runtime/projectors/runProjector.test.ts`

- [ ] **Step 1: Write a failing test for run stage transitions**

```ts
import { describe, expect, it } from 'vitest'
import { reduceRunProjection } from './runProjector'

describe('reduceRunProjection', () => {
  it('tracks current stage and progress', () => {
    const next = reduceRunProjection(
      { currentStage: 'syntax', progress: 0, logs: [] },
      { kind: 'run_stage_changed', sessionId: 'sess_1', stage: 'plan', progress: 12, at: 1710000000000 }
    )

    expect(next.currentStage).toBe('plan')
    expect(next.progress).toBe(12)
  })
})
```

- [ ] **Step 2: Run the run projector test to verify it fails**

Run: `npm run test -- runProjector.test.ts`  
Expected: FAIL because the reducer is missing.

- [ ] **Step 3: Implement the reducer and log appender**

```ts
import type { RuntimeEvent } from '../opencode/types'

export interface RunProjectionState {
  currentStage: 'syntax' | 'plan' | 'test_deploy' | 'prod_canary' | 'verify' | 'complete'
  progress: number
  status: 'idle' | 'running' | 'succeeded' | 'failed'
  logs: { id: string; at: number; level: 'info' | 'warn' | 'error'; message: string }[]
}

export function reduceRunProjection(state: RunProjectionState, event: RuntimeEvent): RunProjectionState {
  if (event.kind === 'run_stage_changed') {
    return {
      ...state,
      currentStage: event.stage,
      progress: event.progress ?? state.progress,
      status: event.stage === 'complete' ? state.status : 'running',
    }
  }

  if (event.kind === 'run_log') {
    return {
      ...state,
      logs: [...state.logs, { id: `${event.sessionId}:${event.at}`, at: event.at, level: event.level, message: event.message }],
    }
  }

  return state
}
```

- [ ] **Step 4: Add tests for completion and runtime error**

```ts
it('marks failed status on runtime_error', () => {
  const next = reduceRunProjection(
    { currentStage: 'verify', progress: 90, status: 'running', logs: [] },
    { kind: 'runtime_error', sessionId: 'sess_1', message: 'permission denied', at: 1710000000100 }
  )

  expect(next.status).toBe('failed')
})
```

- [ ] **Step 5: Run the run projector tests**

Run: `npm run test -- runProjector.test.ts`  
Expected: PASS with deterministic stage, progress, and log behavior.

---

### Task 7: Create the Runtime Store

**Files:**
- Create: `pixel-prototype/src/store/runtimeStore.ts`
- Test: `pixel-prototype/src/store/runtimeStore.test.ts`

- [ ] **Step 1: Write a failing store test for ingesting one raw event**

```ts
import { describe, expect, it } from 'vitest'
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
})
```

- [ ] **Step 2: Run the store test to verify it fails**

Run: `npm run test -- runtimeStore.test.ts`  
Expected: FAIL because the store is not implemented yet.

- [ ] **Step 3: Implement the store skeleton and ingestion pipeline**

```ts
import { create } from 'zustand'
import { adaptOpenCodeEvent } from '@/runtime/opencode/adapter'
import { reduceOfficeProjection } from '@/runtime/projectors/officeProjector'
import { projectCityEvents } from '@/runtime/projectors/cityProjector'
import { reduceRunProjection } from '@/runtime/projectors/runProjector'
import type { OpenCodeEventEnvelope, ProjectionEvent, RuntimeAgentState } from '@/runtime/opencode/types'

interface RuntimeState {
  sessionId: string | null
  agents: Record<string, RuntimeAgentState>
  approvals: Record<string, { id: string; status: 'pending' | 'approved' | 'rejected'; message: string }>
  liveLogs: { id: string; at: number; level: 'info' | 'warn' | 'error'; message: string }[]
  projectionEvents: ProjectionEvent[]
  ingestRawEvent: (event: OpenCodeEventEnvelope) => void
  reset: () => void
}
```

- [ ] **Step 4: Wire the reducer chain in `ingestRawEvent()`**

```ts
const runtimeEvent = adaptOpenCodeEvent(event)
if (!runtimeEvent) return

const office = reduceOfficeProjection(
  { agents: state.agents, approvals: state.approvals, ledger: state.liveLogs },
  runtimeEvent
)
const run = reduceRunProjection(state.run, runtimeEvent)
const projected = projectCityEvents([runtimeEvent])
```

- [ ] **Step 5: Add a second store test that verifies approval and city projection updates**

```ts
store.getState().ingestRawEvent({
  id: 'evt_2',
  type: 'approval.required',
  timestamp: 1710000000100,
  sessionId: 'sess_1',
  payload: { approvalId: 'appr_1', message: 'Need approval to apply patch' },
})

expect(store.getState().approvals.appr_1?.status).toBe('pending')
```

- [ ] **Step 6: Run the store tests**

Run: `npm run test -- runtimeStore.test.ts`  
Expected: PASS with raw event ingestion updating agents, approvals, logs, and projection state.

---

### Task 8: Validate Runtime Layer in Isolation

**Files:**
- Test: `pixel-prototype/src/runtime/opencode/adapter.test.ts`
- Test: `pixel-prototype/src/runtime/projectors/officeProjector.test.ts`
- Test: `pixel-prototype/src/runtime/projectors/cityProjector.test.ts`
- Test: `pixel-prototype/src/runtime/projectors/runProjector.test.ts`
- Test: `pixel-prototype/src/store/runtimeStore.test.ts`

- [ ] **Step 1: Run the targeted runtime test suite**

Run: `npm run test -- adapter.test.ts officeProjector.test.ts cityProjector.test.ts runProjector.test.ts runtimeStore.test.ts`  
Expected: PASS with all runtime-only tests green.

- [ ] **Step 2: Run the full type-check**

Run: `npm run check`  
Expected: PASS without modifying existing UI code.

- [ ] **Step 3: Run the full test suite to detect accidental regressions**

Run: `npm run test`  
Expected: PASS or only pre-existing unrelated failures.

- [ ] **Step 4: Record scope boundaries in the commit message**

```text
feat(runtime): add opencode runtime foundation

- add runtime event contracts and adapter
- add office/city/run projectors
- add isolated runtime store
- keep deployStore and UI integration unchanged
```

---

## Scope Notes

- This plan intentionally does **not** modify [deployStore.ts](file:///c:/Users/qiufa/Desktop/deploy/deployment-kit-design/projects/pixel-office-cityhud/pixel-prototype/src/store/deployStore.ts), [CityHudMap.tsx](file:///c:/Users/qiufa/Desktop/deploy/deployment-kit-design/projects/pixel-office-cityhud/pixel-prototype/src/components/city/CityHudMap.tsx), or [AgentOfficePanel.tsx](file:///c:/Users/qiufa/Desktop/deploy/deployment-kit-design/projects/pixel-office-cityhud/pixel-prototype/src/components/city/AgentOfficePanel.tsx).
- `mockOpenCodeApi` remains in place until the Runtime foundation is complete and independently testable.
- The first UI integration task should consume `runtimeStore` in read-only mode before removing any existing mock path.

## Self-Review

- Spec coverage: 事件类型、client/adapter/projector/store 分层、可独立开发测试、与现有 UI 解耦，均已映射到 Task 1-8。
- Placeholder scan: 本计划未使用 TBD/TODO/“稍后实现”等占位语句；每个实现步骤均给出明确代码骨架或命令。
- Type consistency: `OpenCodeEventEnvelope` -> `RuntimeEvent` -> `Office/City/Run projector` -> `runtimeStore` 的字段命名保持一致，避免后续执行时重新命名。

Plan complete and saved to `docs/plans/2026-04-06-opencode-runtime-foundation-implementation.md`. Ready to execute using the executing-plans skill?
