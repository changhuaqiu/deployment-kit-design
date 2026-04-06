# OpenCode CLI Bridge Design

**Goal:** 将已启动的 OpenCode CLI 作为当前 Web 原型的真实事件源，通过本地 bridge 转换为前端可消费的 SSE 事件流。

**Decision:** 使用 `CLI -> bridge -> SSE -> runtimeStore`，不让前端直接执行 CLI、读取日志文件或解析 stdout。

## Context

- 当前前端 Runtime 基础层已经具备：
  - `client.ts`
  - `adapter.ts`
  - `office/city/run projectors`
  - `runtimeStore`
- 当前系统缺少“真实事件源接入层”。
- OpenCode 当前可用出口为 `CLI`，且输出接近 `JSONL/JSON`，适合由本地 bridge 做结构化转发。

## Architecture

```text
OpenCode CLI
  -> cliRunner
  -> rawParser
  -> eventMapper
  -> SSE /runtime/events
  -> pixel-prototype/src/runtime/opencode/client.ts
  -> adapter.ts
  -> projectors
  -> runtimeStore
  -> UI
```

## Scope

本次实施只覆盖最小闭环：

- 新建本地 `opencode-bridge` 服务
- 启动或附着 CLI 进程
- 解析 JSONL/JSON 行输出
- 转换为统一 `OpenCodeEventEnvelope`
- 通过 `SSE` 暴露 `/runtime/events`
- 在前端增加连接逻辑，把真实事件送入 `runtimeStore`
- 保留现有 `mockOpenCodeApi`，不做 UI 大规模切换

本次不覆盖：

- 双向命令控制
- 历史事件回放
- 多会话持久化
- 生产部署
- 替换全部 UI 为真实 runtime 优先

## Bridge Layout

```text
opencode-bridge/
  package.json
  tsconfig.json
  src/
    server.ts
    cliRunner.ts
    rawParser.ts
    eventMapper.ts
    sseHub.ts
    types.ts
```

## Component Responsibilities

### `cliRunner.ts`
- 启动 `opencode` CLI
- 读取 stdout/stderr
- 提供进程生命周期状态
- 在进程退出时触发 bridge error/session end

### `rawParser.ts`
- 以“逐行”为单位读取 stdout
- 解析 JSONL/JSON
- 坏行跳过并记录错误，不中断整个流

### `eventMapper.ts`
- 把 OpenCode 原始 JSON 映射为：
  - `OpenCodeEventEnvelope`
- 不做 UI 语义解释
- 保持字段尽量贴近 CLI 原始输出

### `sseHub.ts`
- 管理多个浏览器订阅连接
- 广播事件
- 可选保留最近若干条缓存，支持新连接拿到上下文

### `server.ts`
- 暴露：
  - `GET /health`
  - `GET /runtime/events`
  - `POST /runtime/connect` 或启动即连接

## Event Contract

第一阶段最小事件集：

- `session.started`
- `session.ended`
- `agent.spawned`
- `tool.called`
- `approval.required`
- `approval.resolved`
- `run.log`
- `error`

第二阶段扩展事件：

- `artifact.ready`
- `resource.detected`
- `resource.changed`
- `run.step.changed`
- `run.completed`

## Frontend Integration

### Existing Files Used
- `pixel-prototype/src/runtime/opencode/client.ts`
- `pixel-prototype/src/runtime/opencode/adapter.ts`
- `pixel-prototype/src/store/runtimeStore.ts`

### Integration Strategy
- 为前端增加一个真实 SSE 连接入口
- 连接成功后，把原始桥接事件直接送入 `runtimeStore.ingestRawEvent()`
- 第一阶段不移除 mock 路径，只增加真实 runtime 通道

## Error Handling

- CLI 启动失败：
  - `GET /health` 返回失败状态
  - SSE 推送 `error`
- 单行 JSON 解析失败：
  - 记录 bridge 日志
  - 继续解析下一行
- SSE 连接断开：
  - 前端自动重连
- CLI 异常退出：
  - bridge 发送 `session.ended` 或 `error`

## Success Criteria

- 启动 bridge 后，浏览器可从 `/runtime/events` 收到结构化事件
- 前端 `runtimeStore` 能接收 bridge 事件并更新实时状态
- Runtime 聚焦测试继续通过
- bridge 自身有最小健康检查与事件映射测试

## Self-Review

- 无占位词、无 TBD
- 范围聚焦在 bridge 最小闭环
- 与现有 Runtime 基础层边界清晰：bridge 只负责“来源接入与结构化转发”，前端继续负责“语义映射与投影”
