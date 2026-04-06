# Deployment Kit Stdout Forwarder Implementation Plan

> **For execution:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为当前仓库补一个本地转发脚本与使用示例，把 Deployment Kit 的 `stdout JSONL` 直接转发到 `opencode-bridge` 的 `/deploykit/ingest`。

**Architecture:** 在 `opencode-bridge` 内新增一个独立的 stdin forwarder，不改 bridge server 主逻辑。forwarder 负责从标准输入读取 JSONL、按批发送到本地 HTTP ingest 接口，并提供最小的 PowerShell/Node 使用示例，便于你在目标网络同步套件侧事件输出时立即联调。

**Tech Stack:** TypeScript, Node.js, tsx, Vitest, PowerShell

---

## File Structure

### Forwarder
- Create: `opencode-bridge/src/deployKitForwarder.ts`
- Create: `opencode-bridge/src/deployKitForwarder.test.ts`
- Modify: `opencode-bridge/package.json`

### Docs
- Modify: `README.md`
- Modify: `docs/specs/2026-04-06-deployment-kit-visualization-event-protocol-design.md`

---

### Task 1: Add Forwarder Test

**Files:**
- Create: `opencode-bridge/src/deployKitForwarder.test.ts`

- [ ] **Step 1: Write a failing test for JSONL normalization**

```ts
import { describe, expect, it } from 'vitest'
import { normalizeJsonlPayload } from './deployKitForwarder'

describe('normalizeJsonlPayload', () => {
  it('keeps valid JSON lines and removes blank lines', () => {
    const actual = normalizeJsonlPayload('\n{"kind":"workflow_selected"}\n\n{"kind":"skill_started"}\n')
    expect(actual).toBe('{"kind":"workflow_selected"}\n{"kind":"skill_started"}')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- deployKitForwarder.test.ts`  
Working dir: `opencode-bridge`  
Expected: FAIL because the forwarder file does not exist.

---

### Task 2: Implement the Forwarder

**Files:**
- Create: `opencode-bridge/src/deployKitForwarder.ts`
- Modify: `opencode-bridge/package.json`

- [ ] **Step 1: Implement `normalizeJsonlPayload()`**

```ts
export function normalizeJsonlPayload(input: string): string {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
}
```

- [ ] **Step 2: Implement stdin collection and POST forwarding**

```ts
const chunks: string[] = []
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => chunks.push(chunk))
process.stdin.on('end', async () => {
  const body = normalizeJsonlPayload(chunks.join(''))
  await fetch(targetUrl, { method: 'POST', headers: { 'content-type': 'text/plain' }, body })
})
```

- [ ] **Step 3: Add npm script**

```json
"forward:deploykit": "tsx src/deployKitForwarder.ts"
```

- [ ] **Step 4: Re-run forwarder test**

Run: `npm run test -- deployKitForwarder.test.ts`  
Working dir: `opencode-bridge`  
Expected: PASS.

---

### Task 3: Document Usage Examples

**Files:**
- Modify: `README.md`
- Modify: `docs/specs/2026-04-06-deployment-kit-visualization-event-protocol-design.md`

- [ ] **Step 1: Add a local forwarding example to `README.md`**

```md
## Forward Deployment Kit JSONL

```powershell
Get-Content .\sample-events.jsonl -Raw | npm run forward:deploykit
```
```

- [ ] **Step 2: Add a sync note for the secure network workflow**

```md
- 在套件侧确保结构化事件写 stdout
- 在当前仓库启动 `opencode-bridge`
- 使用 forwarder 把 stdout JSONL 送到 `/deploykit/ingest`
```

---

### Task 4: Verify End-to-End Forwarding

**Files:**
- Test: `opencode-bridge/src/deployKitForwarder.test.ts`

- [ ] **Step 1: Run bridge tests**

Run: `npm run test`  
Working dir: `opencode-bridge`  
Expected: PASS.

- [ ] **Step 2: Run bridge server**

Run: `npm run start`  
Working dir: `opencode-bridge`  
Expected: server listens on `http://localhost:8787`.

- [ ] **Step 3: Simulate stdin forwarding**

Run:

```powershell
'{"kind":"workflow_selected","sessionId":"ses_1","workflowId":"wf_1","workflowName":"demo","totalSkills":2,"at":1710000000000}' | npm run forward:deploykit
```

Expected: POST succeeds without error and bridge health remains OK.

---

## Self-Review

- Spec coverage: 覆盖 stdin forwarder、npm script、README 示例与 bridge 联调验证。
- Placeholder scan: 无 TBD/TODO/“后续补”。
- Type consistency: forwarder 只处理 JSONL 文本并转发到 `/deploykit/ingest`，不与 `deploykit.business` 事件命名冲突。

Plan complete and saved to `docs/plans/2026-04-06-deploykit-stdout-forwarder-implementation.md`. Ready to execute using the executing-plans skill?
