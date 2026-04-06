# Deployment Kit Inner Sync Handoff

该目录用于把 Deployment Kit 可视化联调所需的最小资料整体带入内网。

## 目录内容

- `event-protocol-summary.md`
  - 第一阶段最小事件协议摘要
- `stdout-jsonl-examples.md`
  - 每类事件的 JSONL 输出示例
- `templates/deployment-kit-event-emitter.ts`
  - TypeScript 最小事件输出模板
- `templates/deployment-kit-event-emitter.py`
  - Python 最小事件输出模板
- `templates/sample-events.jsonl`
  - 可直接喂给本地 forwarder 的样例文件

## 最小联调流程

1. 在内网侧为 `/it-deploy` 输出 `stdout JSONL` 事件
2. 在本地仓库启动 `opencode-bridge`
3. 使用 `forward:deploykit` 把 JSONL 转发到 `/deploykit/ingest`
4. 打开前端页面，观察 `deployStore.activeWorkflow` 是否跟随变化

## 本地命令

启动 bridge：

```bash
cd opencode-bridge
npm run start
```

转发 JSONL 文件：

```powershell
Get-Content .\sample-events.jsonl -Raw | npm --prefix .\opencode-bridge run forward:deploykit
```

## 内网侧同步要求

- 结构化事件写到 `stdout`
- 每行一个 JSON
- 非结构化日志写到 `stderr`
- 每个事件都带：
  - `sessionId`
  - `at`
  - `workflowId`（适用时）

## 第一阶段必须输出的事件

- `scenario_detected`
- `workflow_selected`
- `skill_started`
- `skill_completed`
- `approval_required`
- `workflow_completed`
