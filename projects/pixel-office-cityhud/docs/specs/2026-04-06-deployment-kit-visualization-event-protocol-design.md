# Deployment Kit Visualization Event Protocol Design

**Goal:** 定义一套最小、稳定、可桥接的可视化事件协议，用于把 `Deployment Kit` 的业务执行链路映射到当前 Web 原型中的城市、办公室、工坊和时间线视图。

**Decision:** 以 `Deployment Kit` 业务事件为主、以 `OpenCode` 运行时事件为辅。第一阶段采用 `stdout JSONL` 作为协议出口，不保留 `skill_progress` 事件，优先保证简单、稳定和可落地。

## Context

### 当前系统关系

- `Deployment Kit` 最新实现运行在 `OpenCode` 之上。
- 用户通过 `/it-deploy` 唤醒套件。
- 套件先识别场景，再选择 workflow，随后串联多个 skill 执行。
- `OpenCode` 负责承载 skill 执行过程与 agent/runtime/tool 行为。

### 当前前端基础

- 当前仓库已经具备两类状态基础：
  - `deployStore`：偏业务态，负责 `change/workshop/run/resources/review`
  - `runtimeStore`：偏执行态，负责 `agent/runtime/tool/office`
- 当前最缺的是一条稳定的、业务优先的事件主线。

### 核心判断

- 不应把 `OpenCode` 当成唯一事实源。
- 对当前产品来说，真正的主叙事是：

```text
/it-deploy
  -> 场景识别
  -> 选择 workflow
  -> 执行多个 skill
  -> skill 内部由 OpenCode 承载执行
```

- 因此：
  - `Deployment Kit` 提供“在做什么”
  - `OpenCode` 提供“怎么做、谁在做”

## Scope

### 本次设计覆盖

- 定义 `Deployment Kit` 业务事件协议
- 定义与现有 `deployStore/runtimeStore` 的映射关系
- 定义 bridge 如何消费 `stdout JSONL`
- 明确当前仓库需要做哪些改动
- 明确 `Deployment Kit` 套件侧需要同步做哪些改动

### 本次设计不覆盖

- 不修改套件源码
- 不定义完整的 OpenCode runtime 协议
- 不实现事件持久化文件格式的第二版本
- 不重做现有 UI 组件结构

## Architecture

```text
Deployment Kit (/it-deploy)
  -> scenario detection
  -> workflow selection
  -> skill chain execution
  -> stdout JSONL business events
  -> local bridge
  -> SSE
  -> deployKitEventAdapter
  -> deployStore

OpenCode runtime
  -> runtime bridge / client
  -> runtimeStore

deployStore + runtimeStore
  -> City HUD / Workshop / Run / Agent Office
```

## Event Model

### Design Principles

- 业务优先：先表达场景、workflow、skill，不先表达 tool 细节
- 简单优先：第一阶段不保留 `skill_progress`
- 单向流：每一行 stdout 输出一个 JSON 对象
- 可桥接：bridge 不理解业务，只负责转发和轻量标准化
- 可扩展：后续可增加文件落盘或 `dk events --follow`

### Event Types

第一阶段最小事件集如下：

```ts
type DeployKitEvent =
  | {
      kind: 'entry_invoked'
      sessionId: string
      command: '/it-deploy'
      rawPrompt: string
      at: number
    }
  | {
      kind: 'scenario_detected'
      sessionId: string
      scenario: 'init' | 'update' | 'validate' | 'deploy' | 'rollback' | 'auto'
      confidence?: number
      at: number
    }
  | {
      kind: 'workflow_selected'
      sessionId: string
      workflowId: string
      workflowName: string
      totalSkills: number
      at: number
    }
  | {
      kind: 'workflow_started'
      sessionId: string
      workflowId: string
      phase: string
      at: number
    }
  | {
      kind: 'workflow_phase_changed'
      sessionId: string
      workflowId: string
      phase: string
      progress?: number
      at: number
    }
  | {
      kind: 'skill_started'
      sessionId: string
      workflowId: string
      skillId: string
      skillName: string
      index: number
      total: number
      params?: Record<string, unknown>
      at: number
    }
  | {
      kind: 'skill_completed'
      sessionId: string
      workflowId: string
      skillId: string
      result: 'success'
      outputs?: Record<string, unknown>
      artifactRefs?: string[]
      at: number
    }
  | {
      kind: 'skill_failed'
      sessionId: string
      workflowId: string
      skillId: string
      error: string
      recoverable?: boolean
      at: number
    }
  | {
      kind: 'approval_required'
      sessionId: string
      workflowId: string
      gateId: string
      message: string
      approvers?: string[]
      at: number
    }
  | {
      kind: 'approval_resolved'
      sessionId: string
      workflowId: string
      gateId: string
      decision: 'approved' | 'rejected'
      at: number
    }
  | {
      kind: 'resource_delta'
      sessionId: string
      workflowId: string
      action: 'discover' | 'create' | 'update' | 'delete' | 'verify'
      resourceType: string
      resourceName: string
      district?: string
      at: number
    }
  | {
      kind: 'rollback_started'
      sessionId: string
      workflowId: string
      reason: string
      at: number
    }
  | {
      kind: 'rollback_completed'
      sessionId: string
      workflowId: string
      status: 'success' | 'failed'
      at: number
    }
  | {
      kind: 'workflow_completed'
      sessionId: string
      workflowId: string
      status: 'success' | 'failed'
      at: number
    }
```

### Why `skill_progress` Is Omitted

- 当前目标是尽快建立一条稳定的业务主线
- `skill_progress` 容易引入不同 skill 粒度不一致的问题
- 现有 UI 第一阶段并不依赖连续进度事件即可工作
- 后续可在第二阶段新增，不影响当前协议主键

## stdout JSONL Format

### Output Rule

- 每个业务事件输出为一行 JSON
- 标准输出仅输出协议对象
- 人类可读日志应输出到 stderr，避免污染事件流

### Example

```json
{"kind":"entry_invoked","sessionId":"ses_001","command":"/it-deploy","rawPrompt":"初始化订单服务","at":1775487000000}
{"kind":"scenario_detected","sessionId":"ses_001","scenario":"init","confidence":0.94,"at":1775487000200}
{"kind":"workflow_selected","sessionId":"ses_001","workflowId":"wf_init_order","workflowName":"init-order-service","totalSkills":5,"at":1775487000300}
{"kind":"skill_started","sessionId":"ses_001","workflowId":"wf_init_order","skillId":"discover-resources","skillName":"discover-resources","index":1,"total":5,"params":{"appid":"order-service"},"at":1775487000500}
{"kind":"skill_completed","sessionId":"ses_001","workflowId":"wf_init_order","skillId":"discover-resources","result":"success","outputs":{"resourceCount":42},"artifactRefs":["cache://resources/order-service"],"at":1775487005000}
{"kind":"workflow_completed","sessionId":"ses_001","workflowId":"wf_init_order","status":"success","at":1775487012000}
```

## Store Mapping

### `deployStore`

`deployStore` 负责消费 `Deployment Kit` 业务事件，并映射为：

- `scenario` -> `TaskScenario`
- `workflow / phase` -> `WorkshopStep`、`RunStep`
- `skill_started / completed / failed` -> `ChangeStatus`、`RunStatus`
- `approval_*` -> reviewer / gate queue
- `resource_delta` -> `ResourceChange` 与城市投影事件
- `workflow_completed / rollback_*` -> 最终运行态

### `runtimeStore`

`runtimeStore` 继续只负责：

- OpenCode agent
- tool runtime
- office ledger
- 角色动作

`runtimeStore` 不应承担 Deployment Kit 的主业务阶段判断。

## UI Mapping

### City HUD

消费：

- `workflow_phase_changed`
- `resource_delta`
- `rollback_*`

表现：

- `discover` -> 扫描波纹
- `create/update/delete` -> 城市施工
- `verify` -> 核验闪烁
- `rollback_started` -> 告警/复位动画

### Workshop

消费：

- `workflow_selected`
- `skill_started`
- `skill_completed`
- `skill_failed`

表现：

- 产物生成
- 校验结果
- skill 阶段推进

### Run Timeline

消费：

- `workflow_started`
- `workflow_phase_changed`
- `approval_*`
- `workflow_completed`
- `rollback_*`

### Agent Office

联合消费：

- `deployStore.currentSkill`
- `runtimeStore.agents`

规则：

- 业务上显示“当前在跑哪个 skill”
- 动作上显示 agent 当前 `thinking/working/blocked/done`

## Bridge Behavior

### Responsibilities

- 读取 `Deployment Kit` stdout JSONL
- 校验每行 JSON
- 以轻量 envelope 方式转成 SSE
- 不做业务决策
- 允许与 OpenCode runtime 流并行存在

### Non-Responsibilities

- 不负责解释 workflow 逻辑
- 不负责将 skill 结果变成 UI 语义
- 不负责保存业务状态快照

## Changes Required In This Repository

### New Pieces

- 新增 `deployKitEventAdapter`
  - 把 `DeployKitEvent` 映射为当前前端可消费结构
- 新增 `deployStore` 的事件 ingestion API
  - 例如 `ingestDeployKitEvent(event)`
- 扩展 bridge
  - 支持 `Deployment Kit stdout JSONL -> SSE`
- 可选新增 `liveDeployKitClient`
  - 与现有 `liveClient` 并列

### Existing Pieces To Reuse

- 复用现有 `runtimeStore` 作为执行态容器
- 复用现有 `deployStore` 作为业务态容器
- 复用现有 `City HUD / Workshop / Run` UI 结构

## Changes Required In Deployment Kit

由于当前环境不能直接修改套件实现，以下内容需在对应网络中同步落地：

### Required Modifications

1. `/it-deploy` 入口层补 `entry_invoked` 事件输出
2. 场景识别完成后补 `scenario_detected`
3. workflow 选定时补 `workflow_selected`
4. workflow 开始和 phase 变化时补：
   - `workflow_started`
   - `workflow_phase_changed`
5. 每个 skill 执行前后补：
   - `skill_started`
   - `skill_completed`
   - `skill_failed`
6. 审批门控补：
   - `approval_required`
   - `approval_resolved`
7. 部署/验证/回滚关键动作补：
   - `resource_delta`
   - `rollback_started`
   - `rollback_completed`
   - `workflow_completed`

### Output Constraints

- 事件必须写入 stdout
- 事件必须是单行 JSON
- 非结构化日志必须写 stderr
- 每个事件必须携带 `sessionId` 与 `at`
- `workflowId` 在 workflow 生命周期内保持稳定
- `skillId` 在单个 workflow 内唯一

## Recommended Implementation Order

### Phase 1

- 套件先输出这 6 个事件：
  - `scenario_detected`
  - `workflow_selected`
  - `skill_started`
  - `skill_completed`
  - `approval_required`
  - `workflow_completed`

### Phase 2

- 再补：
  - `skill_failed`
  - `approval_resolved`
  - `resource_delta`
  - `rollback_*`

### Phase 3

- 最后考虑：
  - `events.jsonl` 落盘
  - `dk events --follow`
  - `skill_progress`

## Sync Checklist For Deployment Kit

- emit `scenario_detected`
- emit `workflow_selected`
- emit `skill_started`
- emit `skill_completed`
- emit `approval_required`
- emit `workflow_completed`
- forward `stdout JSONL` to `POST /deploykit/ingest` when validating in the local visualization environment

## Success Criteria

- `Deployment Kit` 可以输出稳定的 stdout JSONL 业务事件
- bridge 可把事件转为 SSE
- 前端 `deployStore` 能消费这类事件并更新业务态
- 当前 UI 能在不依赖 OpenCode 微观 runtime 的情况下，正确展示 workflow/skill 主链路
- `runtimeStore` 继续作为办公室动画的补充数据源

## Self-Review

- Placeholder scan: 无 TBD/TODO/“后续补充”
- Scope check: 本文档只覆盖 Deployment Kit 可视化事件协议，不混入完整实现计划
- Ambiguity check: 已明确第一阶段仅采用 `stdout JSONL`，且不保留 `skill_progress`
- Internal consistency: 保持“Deployment Kit 业务态主导，OpenCode 执行态补充”的单一原则
