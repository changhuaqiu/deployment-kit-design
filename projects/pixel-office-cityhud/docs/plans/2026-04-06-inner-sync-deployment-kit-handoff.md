# Inner Sync Deployment Kit Handoff Implementation Plan

> **For execution:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在当前仓库创建一个专门的 `docs/inner-sync/deployment-kit/` 交付目录，集中放置内网同步所需的说明、最小事件协议摘要、stdout JSONL 示例和可拷贝代码模板。

**Architecture:** 该交付包只包含文档与模板，不包含运行时代码改动。目录按“说明 -> 协议摘要 -> 示例 -> 模板”组织，便于直接整体带入内网环境，由套件侧同学按文档在安全网络中落地 `Deployment Kit` 事件输出。 

**Tech Stack:** Markdown, JSONL, TypeScript template, Python template

---

## File Structure

### Handoff Directory
- Create: `docs/inner-sync/deployment-kit/README.md`
- Create: `docs/inner-sync/deployment-kit/event-protocol-summary.md`
- Create: `docs/inner-sync/deployment-kit/stdout-jsonl-examples.md`
- Create: `docs/inner-sync/deployment-kit/templates/deployment-kit-event-emitter.ts`
- Create: `docs/inner-sync/deployment-kit/templates/deployment-kit-event-emitter.py`
- Create: `docs/inner-sync/deployment-kit/templates/sample-events.jsonl`

### Reference Only
- Reference: `docs/specs/2026-04-06-deployment-kit-visualization-event-protocol-design.md`
- Reference: `README.md`

---

### Task 1: Create Handoff README

**Files:**
- Create: `docs/inner-sync/deployment-kit/README.md`

- [ ] **Step 1: Write the handoff overview**

```md
# Deployment Kit Inner Sync Handoff

该目录用于把 Deployment Kit 可视化联调所需的最小资料整体带入内网。
```

- [ ] **Step 2: Document the local-to-secure workflow**

```md
1. 在内网侧为 `/it-deploy` 输出 stdout JSONL 事件
2. 在本地仓库启动 `opencode-bridge`
3. 使用 `forward:deploykit` 把 JSONL 转发到 `/deploykit/ingest`
```

---

### Task 2: Create Protocol Summary

**Files:**
- Create: `docs/inner-sync/deployment-kit/event-protocol-summary.md`

- [ ] **Step 1: Write the minimum Phase 1 event list**

```md
- scenario_detected
- workflow_selected
- skill_started
- skill_completed
- approval_required
- workflow_completed
```

- [ ] **Step 2: Document required fields**

```md
- sessionId
- at
- workflowId (when applicable)
```

---

### Task 3: Add JSONL Examples

**Files:**
- Create: `docs/inner-sync/deployment-kit/stdout-jsonl-examples.md`
- Create: `docs/inner-sync/deployment-kit/templates/sample-events.jsonl`

- [ ] **Step 1: Add markdown examples for each event**

```md
{"kind":"workflow_selected","sessionId":"ses_001","workflowId":"wf_init","workflowName":"init-service","totalSkills":5,"at":1775487000000}
```

- [ ] **Step 2: Create `sample-events.jsonl` for local forwarding**

```jsonl
{"kind":"scenario_detected","sessionId":"ses_001","scenario":"init","confidence":0.94,"at":1775487000000}
{"kind":"workflow_selected","sessionId":"ses_001","workflowId":"wf_init","workflowName":"init-service","totalSkills":5,"at":1775487000100}
{"kind":"skill_started","sessionId":"ses_001","workflowId":"wf_init","skillId":"discover-resources","skillName":"discover-resources","index":1,"total":5,"at":1775487000200}
{"kind":"skill_completed","sessionId":"ses_001","workflowId":"wf_init","skillId":"discover-resources","result":"success","at":1775487000500}
{"kind":"approval_required","sessionId":"ses_001","workflowId":"wf_init","gateId":"gate_1","message":"Need approval to deploy","at":1775487000600}
{"kind":"workflow_completed","sessionId":"ses_001","workflowId":"wf_init","status":"success","at":1775487001000}
```

---

### Task 4: Add Copyable Code Templates

**Files:**
- Create: `docs/inner-sync/deployment-kit/templates/deployment-kit-event-emitter.ts`
- Create: `docs/inner-sync/deployment-kit/templates/deployment-kit-event-emitter.py`

- [ ] **Step 1: Add a TypeScript emitter helper**

```ts
export function emitDeployKitEvent(event: Record<string, unknown>) {
  process.stdout.write(`${JSON.stringify(event)}\n`)
}
```

- [ ] **Step 2: Add a Python emitter helper**

```py
import json
import sys

def emit_deploykit_event(event: dict) -> None:
    sys.stdout.write(json.dumps(event) + "\n")
    sys.stdout.flush()
```

---

### Task 5: Verify Handoff Completeness

**Files:**
- Test: `docs/inner-sync/deployment-kit/README.md`
- Test: `docs/inner-sync/deployment-kit/event-protocol-summary.md`
- Test: `docs/inner-sync/deployment-kit/stdout-jsonl-examples.md`

- [ ] **Step 1: Check that all referenced Phase 1 events appear in the handoff package**

Expected: the six required Phase 1 events exist in summary, examples, and sample JSONL.

- [ ] **Step 2: Check that the package is self-contained**

Expected: someone can copy only `docs/inner-sync/deployment-kit/` into another environment and understand what to emit.

---

## Self-Review

- Spec coverage: 覆盖说明、协议摘要、JSONL 示例、TS/Python 模板与 sample 文件。
- Placeholder scan: 无 TBD/TODO/“之后补”。
- Type consistency: 事件名称与已批准的 Deployment Kit Phase 1 协议保持一致。

Plan complete and saved to `docs/plans/2026-04-06-inner-sync-deployment-kit-handoff.md`. Ready to execute using the executing-plans skill?
