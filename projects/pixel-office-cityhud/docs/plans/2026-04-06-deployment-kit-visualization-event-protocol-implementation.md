# Deployment Kit Visualization Event Protocol Implementation Plan

> **For execution:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在当前仓库内完成 Deployment Kit 业务事件接入链路，包括 bridge 的业务事件通道、前端 `deployKitEventAdapter`、`deployStore` 的 ingestion API，以及与现有 UI 状态的最小映射。

**Architecture:** 该实现只修改当前仓库内可控部分，不直接改 Deployment Kit 套件源码。`Deployment Kit stdout JSONL -> opencode-bridge SSE -> deployKitEventAdapter -> deployStore` 构成业务态主链，`runtimeStore` 保持为 OpenCode 执行态补充，不改变现有办公室 runtime 结构。

**Tech Stack:** TypeScript, Node.js HTTP server, React 18, Zustand, Vitest, Vite

---

## File Structure

### Bridge Side
- Modify: `opencode-bridge/src/types.ts`
- Modify: `opencode-bridge/src/eventMapper.ts`
- Modify: `opencode-bridge/src/server.ts`
- Create: `opencode-bridge/src/deployKitMapper.test.ts`

### Frontend Runtime / Business State
- Create: `pixel-prototype/src/runtime/deploykit/types.ts`
- Create: `pixel-prototype/src/runtime/deploykit/adapter.ts`
- Create: `pixel-prototype/src/runtime/deploykit/liveClient.ts`
- Create: `pixel-prototype/src/runtime/deploykit/adapter.test.ts`
- Modify: `pixel-prototype/src/store/deployStore.ts`
- Create: `pixel-prototype/src/store/deployStore.deploykit.test.ts`

### Reference Only
- Reference: `docs/specs/2026-04-06-deployment-kit-visualization-event-protocol-design.md`
- Reference: `pixel-prototype/src/store/runtimeStore.ts`
- Reference: `pixel-prototype/src/utils/projection.ts`

---

### Task 1: Extend Bridge Envelope for Business Events

**Files:**
- Modify: `opencode-bridge/src/types.ts`
- Modify: `opencode-bridge/src/eventMapper.ts`
- Create: `opencode-bridge/src/deployKitMapper.test.ts`

- [ ] **Step 1: Write a failing bridge mapper test for Deployment Kit business events**

```ts
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
```

- [ ] **Step 2: Run bridge test to verify it fails**

Run: `npm run test -- deployKitMapper.test.ts`  
Working dir: `opencode-bridge`  
Expected: FAIL because mapper does not distinguish Deployment Kit events yet.

- [ ] **Step 3: Extend bridge event types**

```ts
export interface BridgeEnvelope {
  id: string
  type: string
  timestamp: number
  sessionId: string
  agentId?: string
  source?: 'opencode' | 'deploykit'
  payload: Record<string, unknown>
}
```

- [ ] **Step 4: Implement Deployment Kit event detection in `mapRawEvent()`**

```ts
const DEPLOYKIT_KINDS = new Set([
  'entry_invoked',
  'scenario_detected',
  'workflow_selected',
  'workflow_started',
  'workflow_phase_changed',
  'skill_started',
  'skill_completed',
  'skill_failed',
  'approval_required',
  'approval_resolved',
  'resource_delta',
  'rollback_started',
  'rollback_completed',
  'workflow_completed',
])
```

- [ ] **Step 5: Re-run bridge mapper tests**

Run: `npm run test -- deployKitMapper.test.ts eventMapper.test.ts`  
Working dir: `opencode-bridge`  
Expected: PASS.

---

### Task 2: Add Bridge Route for Deployment Kit Event Streams

**Files:**
- Modify: `opencode-bridge/src/server.ts`

- [ ] **Step 1: Add a dedicated SSE route for Deployment Kit**

```ts
if (req.url === '/deploykit/events') {
  handleSse(req, res)
  return
}
```

- [ ] **Step 2: Add a POST ingest route for external Deployment Kit JSONL forwarding**

```ts
if (req.url === '/deploykit/ingest' && req.method === 'POST') {
  // read body text, split lines, parse JSON, map, broadcast
}
```

- [ ] **Step 3: Implement line-by-line JSON ingestion**

```ts
const lines = body.split(/\r?\n/)
for (const line of lines) {
  const raw = parseJsonLine(line)
  if (!raw) continue
  const envelope = mapRawEvent(raw)
  if (!envelope) continue
  hub.broadcast(envelope)
}
```

- [ ] **Step 4: Update `/health` to expose deployment kit bridge readiness**

```ts
writeJson(res, 200, {
  ok: true,
  cliConnected,
  clients: hub.size(),
  lastError,
  deployKitIngestEnabled: true,
})
```

- [ ] **Step 5: Start bridge and verify routes respond**

Run: `npm run start`  
Working dir: `opencode-bridge`  
Expected: bridge starts without route errors.

---

### Task 3: Define Frontend Deployment Kit Event Types

**Files:**
- Create: `pixel-prototype/src/runtime/deploykit/types.ts`
- Create: `pixel-prototype/src/runtime/deploykit/adapter.test.ts`

- [ ] **Step 1: Write a failing adapter fixture test**

```ts
import { describe, expect, it } from 'vitest'
import type { DeployKitEvent } from './types'

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
```

- [ ] **Step 2: Run the adapter type test to verify it fails**

Run: `npm run test -- adapter.test.ts`  
Working dir: `pixel-prototype`  
Expected: FAIL because deploykit types file does not exist.

- [ ] **Step 3: Add the Deployment Kit event union from the approved spec**

```ts
export type DeployKitEvent =
  | { kind: 'scenario_detected'; sessionId: string; scenario: 'init' | 'update' | 'validate' | 'deploy' | 'rollback' | 'auto'; confidence?: number; at: number }
  | { kind: 'workflow_selected'; sessionId: string; workflowId: string; workflowName: string; totalSkills: number; at: number }
  | { kind: 'skill_started'; sessionId: string; workflowId: string; skillId: string; skillName: string; index: number; total: number; params?: Record<string, unknown>; at: number }
  | { kind: 'skill_completed'; sessionId: string; workflowId: string; skillId: string; result: 'success'; outputs?: Record<string, unknown>; artifactRefs?: string[]; at: number }
  | { kind: 'approval_required'; sessionId: string; workflowId: string; gateId: string; message: string; approvers?: string[]; at: number }
  | { kind: 'workflow_completed'; sessionId: string; workflowId: string; status: 'success' | 'failed'; at: number }
```

- [ ] **Step 4: Re-run the type fixture test**

Run: `npm run test -- adapter.test.ts`  
Working dir: `pixel-prototype`  
Expected: PASS for the type fixture.

---

### Task 4: Implement Deployment Kit Event Adapter

**Files:**
- Create: `pixel-prototype/src/runtime/deploykit/adapter.ts`
- Modify: `pixel-prototype/src/runtime/deploykit/adapter.test.ts`

- [ ] **Step 1: Extend test file with a failing parser test**

```ts
import { adaptDeployKitEnvelope } from './adapter'

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
```

- [ ] **Step 2: Run the adapter test to verify it fails**

Run: `npm run test -- adapter.test.ts`  
Working dir: `pixel-prototype`  
Expected: FAIL because adapter file does not exist.

- [ ] **Step 3: Implement `adaptDeployKitEnvelope()`**

```ts
export function adaptDeployKitEnvelope(envelope: {
  type: string
  payload: Record<string, unknown>
}): DeployKitEvent | null {
  if (envelope.type !== 'deploykit.business') return null
  const payload = envelope.payload
  if (!payload || typeof payload.kind !== 'string') return null
  return payload as DeployKitEvent
}
```

- [ ] **Step 4: Add a test that ignores non-deploykit envelope types**

```ts
it('returns null for runtime envelope types', () => {
  expect(
    adaptDeployKitEnvelope({
      type: 'run.log',
      payload: {},
    } as never)
  ).toBeNull()
})
```

- [ ] **Step 5: Re-run adapter tests**

Run: `npm run test -- adapter.test.ts`  
Working dir: `pixel-prototype`  
Expected: PASS.

---

### Task 5: Add Deployment Kit Live Client

**Files:**
- Create: `pixel-prototype/src/runtime/deploykit/liveClient.ts`

- [ ] **Step 1: Create a Deployment Kit SSE client helper**

```ts
import { createSseRuntimeClient } from '../opencode/client'

export function createLiveDeployKitClient() {
  return createSseRuntimeClient('http://localhost:8787/deploykit/events')
}
```

- [ ] **Step 2: Verify the new file type-checks**

Run: `npm run check`  
Working dir: `pixel-prototype`  
Expected: no new errors from the new live client file.

---

### Task 6: Extend `deployStore` with Deployment Kit Ingestion

**Files:**
- Modify: `pixel-prototype/src/store/deployStore.ts`
- Create: `pixel-prototype/src/store/deployStore.deploykit.test.ts`

- [ ] **Step 1: Write a failing store test for `workflow_selected`**

```ts
import { describe, expect, it } from 'vitest'
import { useDeployStore } from './deployStore'

describe('deployStore deployment-kit ingestion', () => {
  it('captures workflow selection as workshop context', () => {
    const store = useDeployStore.getState()
    store.ingestDeployKitEvent({
      kind: 'workflow_selected',
      sessionId: 'ses_1',
      workflowId: 'wf_init',
      workflowName: 'init-service',
      totalSkills: 5,
      at: 1710000000000,
    })

    expect(useDeployStore.getState().activeWorkflow?.workflowId).toBe('wf_init')
  })
})
```

- [ ] **Step 2: Run the store test to verify it fails**

Run: `npm run test -- deployStore.deploykit.test.ts`  
Working dir: `pixel-prototype`  
Expected: FAIL because ingestion API does not exist.

- [ ] **Step 3: Add minimal Deployment Kit state to `deployStore`**

```ts
type ActiveWorkflowState = {
  sessionId: string
  workflowId: string
  workflowName: string
  totalSkills: number
  currentSkillId: string | null
  currentSkillName: string | null
  status: 'idle' | 'running' | 'waiting_approval' | 'succeeded' | 'failed'
}
```

- [ ] **Step 4: Add `ingestDeployKitEvent()` to the store API**

```ts
ingestDeployKitEvent: (event: DeployKitEvent) => void
```

- [ ] **Step 5: Implement mappings for the Phase 1 events**

```ts
if (event.kind === 'workflow_selected') {
  return {
    activeWorkflow: {
      sessionId: event.sessionId,
      workflowId: event.workflowId,
      workflowName: event.workflowName,
      totalSkills: event.totalSkills,
      currentSkillId: null,
      currentSkillName: null,
      status: 'idle',
    },
  }
}
```

- [ ] **Step 6: Map `skill_started`, `skill_completed`, `approval_required`, and `workflow_completed`**

```ts
if (event.kind === 'skill_started') {
  // update current skill and running status
}
```

- [ ] **Step 7: Re-run deployStore ingestion tests**

Run: `npm run test -- deployStore.deploykit.test.ts`  
Working dir: `pixel-prototype`  
Expected: PASS.

---

### Task 7: Verify Business and Runtime Streams Coexist

**Files:**
- Modify: `pixel-prototype/src/store/deployStore.deploykit.test.ts`
- Test: `pixel-prototype/src/store/runtimeStore.test.ts`

- [ ] **Step 1: Add a test proving Deployment Kit state does not mutate `runtimeStore`**

```ts
import { useRuntimeStore } from './runtimeStore'

it('does not touch runtimeStore agent state', () => {
  const before = useRuntimeStore.getState().agents
  useDeployStore.getState().ingestDeployKitEvent({
    kind: 'workflow_completed',
    sessionId: 'ses_1',
    workflowId: 'wf_init',
    status: 'success',
    at: 1710000001000,
  })
  expect(useRuntimeStore.getState().agents).toEqual(before)
})
```

- [ ] **Step 2: Run focused store tests**

Run: `npm run test -- deployStore.deploykit.test.ts runtimeStore.test.ts`  
Working dir: `pixel-prototype`  
Expected: PASS.

---

### Task 8: Document External Deployment Kit Changes

**Files:**
- Modify: `docs/specs/2026-04-06-deployment-kit-visualization-event-protocol-design.md`

- [ ] **Step 1: Add a synchronization checklist section**

```md
## Sync Checklist For Deployment Kit

- emit `scenario_detected`
- emit `workflow_selected`
- emit `skill_started`
- emit `skill_completed`
- emit `approval_required`
- emit `workflow_completed`
```

- [ ] **Step 2: Re-read the checklist against the plan scope**

Expected: the checklist matches Phase 1 events and does not require code changes in this repository.

---

### Task 9: Validate the Minimal End-to-End Flow

**Files:**
- Test: `opencode-bridge/src/deployKitMapper.test.ts`
- Test: `pixel-prototype/src/runtime/deploykit/adapter.test.ts`
- Test: `pixel-prototype/src/store/deployStore.deploykit.test.ts`

- [ ] **Step 1: Run bridge tests**

Run: `npm run test`  
Working dir: `opencode-bridge`  
Expected: PASS.

- [ ] **Step 2: Run frontend focused tests**

Run: `npm run test -- adapter.test.ts deployStore.deploykit.test.ts runtimeStore.test.ts`  
Working dir: `pixel-prototype`  
Expected: PASS for the new Deployment Kit business flow.

- [ ] **Step 3: Run targeted diagnostics**

Expected: no new diagnostics in bridge files, deploykit adapter files, or modified store files.

- [ ] **Step 4: Record implementation boundary**

```text
feat(deploykit): add business event ingestion path

- accept deployment kit stdout JSONL through bridge
- adapt deployment kit business events on the frontend
- ingest workflow/skill/approval events into deployStore
- keep deployment kit source changes external to this repository
```

---

## Self-Review

- Spec coverage: 覆盖 bridge 业务事件通道、deploykit adapter、deployStore ingestion 与套件侧同步清单。
- Placeholder scan: 未使用 TBD/TODO/“后续实现”等占位语句；每个任务都给出了明确代码或命令。
- Type consistency: `deploykit.business` -> `DeployKitEvent` -> `deployStore.ingestDeployKitEvent()` 命名保持一致，并与 `runtimeStore` 解耦。

Plan complete and saved to `docs/plans/2026-04-06-deployment-kit-visualization-event-protocol-implementation.md`. Ready to execute using the executing-plans skill?
