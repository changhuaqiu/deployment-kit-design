# OpenCode CLI Bridge Implementation Plan

> **For execution:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建 `opencode-bridge` 最小闭环，把 OpenCode CLI 的 JSONL/JSON 输出转成 SSE 事件流，并接入现有 `runtimeStore`。

**Architecture:** 新增一个独立 Node/TypeScript bridge 服务，负责 CLI 启动、逐行 JSON 解析、事件映射和 SSE 广播。前端只增加一个真实 SSE client 接入点，把桥接事件送入现有 Runtime 基础层，不移除现有 mock 路径。

**Tech Stack:** TypeScript, Node.js HTTP server, React 18, Zustand, Vitest, Vite

---

## File Structure

### Bridge Service
- Create: `opencode-bridge/package.json`
- Create: `opencode-bridge/tsconfig.json`
- Create: `opencode-bridge/src/types.ts`
- Create: `opencode-bridge/src/rawParser.ts`
- Create: `opencode-bridge/src/eventMapper.ts`
- Create: `opencode-bridge/src/sseHub.ts`
- Create: `opencode-bridge/src/cliRunner.ts`
- Create: `opencode-bridge/src/server.ts`

### Bridge Tests
- Create: `opencode-bridge/src/rawParser.test.ts`
- Create: `opencode-bridge/src/eventMapper.test.ts`
- Create: `opencode-bridge/src/sseHub.test.ts`

### Frontend Integration
- Modify: `pixel-prototype/src/runtime/opencode/client.ts`
- Modify: `pixel-prototype/src/store/runtimeStore.ts`
- Create: `pixel-prototype/src/runtime/opencode/liveClient.ts`

### Reference Only
- Reference: `docs/specs/2026-04-06-opencode-cli-bridge-design.md`
- Reference: `pixel-prototype/src/runtime/opencode/types.ts`
- Reference: `pixel-prototype/src/runtime/opencode/adapter.ts`

---

### Task 1: Scaffold the Bridge Package

**Files:**
- Create: `opencode-bridge/package.json`
- Create: `opencode-bridge/tsconfig.json`

- [ ] **Step 1: Create `package.json` with minimal scripts**

```json
{
  "name": "opencode-bridge",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "start": "tsx src/server.ts",
    "test": "vitest run",
    "check": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: Add dependencies and devDependencies**

```json
{
  "dependencies": {
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/node": "^22.15.30",
    "tsx": "^4.19.0",
    "typescript": "^5.8.3",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node", "vitest"]
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Install bridge dependencies**

Run: `npm install`  
Working dir: `opencode-bridge`  
Expected: `node_modules` created successfully.

---

### Task 2: Implement Raw JSONL Parsing

**Files:**
- Create: `opencode-bridge/src/types.ts`
- Create: `opencode-bridge/src/rawParser.ts`
- Test: `opencode-bridge/src/rawParser.test.ts`

- [ ] **Step 1: Write a failing parser test**

```ts
import { describe, expect, it } from 'vitest'
import { parseJsonLine } from './rawParser'

describe('parseJsonLine', () => {
  it('parses one JSON line', () => {
    expect(parseJsonLine('{"type":"session.started","sessionId":"sess_1"}')).toEqual({
      type: 'session.started',
      sessionId: 'sess_1',
    })
  })
})
```

- [ ] **Step 2: Run the parser test to verify it fails**

Run: `npm run test -- rawParser.test.ts`  
Expected: FAIL because parser file does not exist.

- [ ] **Step 3: Define bridge-side raw event type**

```ts
export interface OpenCodeRawEvent {
  type: string
  sessionId?: string
  agentId?: string
  [key: string]: unknown
}
```

- [ ] **Step 4: Implement the parser**

```ts
import type { OpenCodeRawEvent } from './types'

export function parseJsonLine(line: string): OpenCodeRawEvent | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  try {
    return JSON.parse(trimmed) as OpenCodeRawEvent
  } catch {
    return null
  }
}
```

- [ ] **Step 5: Add one more test for invalid JSON**

```ts
it('returns null for invalid JSON', () => {
  expect(parseJsonLine('{bad json')).toBeNull()
})
```

- [ ] **Step 6: Re-run parser tests**

Run: `npm run test -- rawParser.test.ts`  
Expected: PASS.

---

### Task 3: Map Raw CLI Events to Envelope Events

**Files:**
- Create: `opencode-bridge/src/eventMapper.ts`
- Test: `opencode-bridge/src/eventMapper.test.ts`

- [ ] **Step 1: Write a failing mapper test**

```ts
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
})
```

- [ ] **Step 2: Run mapper test to verify it fails**

Run: `npm run test -- eventMapper.test.ts`  
Expected: FAIL because mapper file does not exist.

- [ ] **Step 3: Implement the mapper**

```ts
import type { OpenCodeRawEvent } from './types'

export interface BridgeEnvelope {
  id: string
  type: string
  timestamp: number
  sessionId: string
  agentId?: string
  payload: Record<string, unknown>
}

export function mapRawEvent(raw: OpenCodeRawEvent): BridgeEnvelope | null {
  const sessionId = typeof raw.sessionId === 'string' ? raw.sessionId : 'unknown'

  return {
    id: `${raw.type}:${sessionId}:${Date.now()}`,
    type: raw.type,
    timestamp: Date.now(),
    sessionId,
    agentId: typeof raw.agentId === 'string' ? raw.agentId : undefined,
    payload: raw,
  }
}
```

- [ ] **Step 4: Add tests for `agent.spawned` and missing session fallback**

```ts
it('uses unknown session fallback', () => {
  const actual = mapRawEvent({ type: 'error', message: 'boom' })
  expect(actual?.sessionId).toBe('unknown')
})
```

- [ ] **Step 5: Re-run mapper tests**

Run: `npm run test -- eventMapper.test.ts`  
Expected: PASS.

---

### Task 4: Implement SSE Hub

**Files:**
- Create: `opencode-bridge/src/sseHub.ts`
- Test: `opencode-bridge/src/sseHub.test.ts`

- [ ] **Step 1: Write a failing test for broadcasting**

```ts
import { describe, expect, it, vi } from 'vitest'
import { createSseHub } from './sseHub'

describe('createSseHub', () => {
  it('broadcasts serialized events', () => {
    const hub = createSseHub()
    const write = vi.fn()
    hub.addClient({ write } as never)
    hub.broadcast({ type: 'session.started' })
    expect(write).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run hub test to verify it fails**

Run: `npm run test -- sseHub.test.ts`  
Expected: FAIL because hub file does not exist.

- [ ] **Step 3: Implement `createSseHub()`**

```ts
export function createSseHub() {
  const clients = new Set<{ write: (chunk: string) => void }>()

  return {
    addClient(client: { write: (chunk: string) => void }) {
      clients.add(client)
      return () => clients.delete(client)
    },
    broadcast(event: unknown) {
      const payload = `data: ${JSON.stringify(event)}\n\n`
      clients.forEach((client) => client.write(payload))
    },
    size() {
      return clients.size
    },
  }
}
```

- [ ] **Step 4: Add a test for add/remove lifecycle**

```ts
it('tracks connected clients', () => {
  const hub = createSseHub()
  const remove = hub.addClient({ write: vi.fn() } as never)
  expect(hub.size()).toBe(1)
  remove()
  expect(hub.size()).toBe(0)
})
```

- [ ] **Step 5: Re-run hub tests**

Run: `npm run test -- sseHub.test.ts`  
Expected: PASS.

---

### Task 5: Implement CLI Runner and HTTP Server

**Files:**
- Create: `opencode-bridge/src/cliRunner.ts`
- Create: `opencode-bridge/src/server.ts`

- [ ] **Step 1: Implement a minimal line-emitting CLI runner**

```ts
import { spawn } from 'node:child_process'

export function startCliRunner(command = 'opencode', args: string[] = []) {
  const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
  return child
}
```

- [ ] **Step 2: Implement a minimal HTTP server with `/health` and `/runtime/events`**

```ts
import { createServer } from 'node:http'

createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
    return
  }
}).listen(8787)
```

- [ ] **Step 3: Wire stdout line parsing to event mapping and SSE broadcast**

```ts
child.stdout.on('data', (chunk) => {
  const lines = String(chunk).split(/\r?\n/)
  for (const line of lines) {
    const raw = parseJsonLine(line)
    if (!raw) continue
    const envelope = mapRawEvent(raw)
    if (!envelope) continue
    hub.broadcast(envelope)
  }
})
```

- [ ] **Step 4: Add stderr and exit handling**

```ts
child.stderr.on('data', (chunk) => {
  hub.broadcast({
    id: `bridge-error:${Date.now()}`,
    type: 'error',
    timestamp: Date.now(),
    sessionId: 'unknown',
    payload: { message: String(chunk) },
  })
})
```

- [ ] **Step 5: Start the bridge manually**

Run: `npm run start`  
Working dir: `opencode-bridge`  
Expected: server listens on `http://localhost:8787`.

---

### Task 6: Add Frontend Live SSE Client

**Files:**
- Create: `pixel-prototype/src/runtime/opencode/liveClient.ts`
- Modify: `pixel-prototype/src/runtime/opencode/client.ts`

- [ ] **Step 1: Create `liveClient.ts`**

```ts
import { createSseRuntimeClient } from './client'

export function createLiveRuntimeClient() {
  return createSseRuntimeClient('http://localhost:8787/runtime/events')
}
```

- [ ] **Step 2: Keep existing mock client exports intact**

```ts
export { createMockRuntimeClient, createSseRuntimeClient } from './client'
```

- [ ] **Step 3: Verify imports still compile**

Run: `npm run check`  
Working dir: `pixel-prototype`  
Expected: no new errors from `client.ts` or `liveClient.ts`.

---

### Task 7: Connect Live Client to Runtime Store

**Files:**
- Modify: `pixel-prototype/src/store/runtimeStore.ts`

- [ ] **Step 1: Add an attach helper**

```ts
attachClient: (client: RuntimeClient) => () => void
```

- [ ] **Step 2: Implement subscription wiring without replacing existing store behavior**

```ts
attachClient: (client) => {
  const unsubscribe = client.subscribe((event) => {
    store.getState().ingestRawEvent(event)
  })
  client.connect()
  return () => {
    unsubscribe()
    client.disconnect()
  }
}
```

- [ ] **Step 3: Preserve `createRuntimeStore(client?)` compatibility**

```ts
if (client) {
  client.subscribe((event) => {
    store.getState().ingestRawEvent(event)
  })
}
```

- [ ] **Step 4: Re-run runtime store tests**

Run: `npm run test -- runtimeStore.test.ts`  
Expected: PASS.

---

### Task 8: Verify End-to-End Minimal Flow

**Files:**
- Test: `opencode-bridge/src/rawParser.test.ts`
- Test: `opencode-bridge/src/eventMapper.test.ts`
- Test: `opencode-bridge/src/sseHub.test.ts`
- Test: `pixel-prototype/src/store/runtimeStore.test.ts`

- [ ] **Step 1: Run bridge tests**

Run: `npm run test`  
Working dir: `opencode-bridge`  
Expected: PASS.

- [ ] **Step 2: Run frontend runtime-focused tests**

Run: `npm run test -- adapter.test.ts officeProjector.test.ts cityProjector.test.ts runProjector.test.ts runtimeStore.test.ts`  
Working dir: `pixel-prototype`  
Expected: PASS.

- [ ] **Step 3: Start bridge and confirm health**

Run: `Invoke-WebRequest http://localhost:8787/health | Select-Object -ExpandProperty Content`  
Expected: JSON with `ok: true`.

- [ ] **Step 4: Record implementation boundary**

```text
feat(bridge): add opencode cli bridge over sse

- add local bridge for opencode cli jsonl/json output
- broadcast normalized envelope events over sse
- connect frontend runtime store to live client
- keep existing mock UI flow intact
```

---

## Self-Review

- Spec coverage: CLI bridge、JSONL 解析、事件映射、SSE 广播、前端 live client、runtimeStore 接入均已落到 Task 1-8。
- Placeholder scan: 无 TBD/TODO/“后续补充”；每个步骤都给出了明确代码或命令。
- Type consistency: bridge 输出 `OpenCodeEventEnvelope`，前端直接送入现有 `runtimeStore.ingestRawEvent()`，字段命名与 Runtime 基础层一致。

Plan complete and saved to `docs/plans/2026-04-06-opencode-cli-bridge-implementation.md`. Ready to execute using the executing-plans skill?
