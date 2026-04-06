# Deployment Kit Event Protocol Summary

## Phase 1 Event List

- `scenario_detected`
- `workflow_selected`
- `skill_started`
- `skill_completed`
- `approval_required`
- `workflow_completed`

## Required Fields

- `sessionId`
- `at`
- `workflowId`（适用时）

## Output Rules

- 所有结构化事件输出到 `stdout`
- 每行一个 JSON 对象
- 普通日志输出到 `stderr`
- `workflowId` 在 workflow 生命周期内保持稳定
- `skillId` 在单个 workflow 内唯一

## Event Notes

- `scenario_detected`
  - 标识 `/it-deploy` 已完成场景判断
- `workflow_selected`
  - 标识已确定 workflow 和总 skill 数量
- `skill_started`
  - 标识某个 skill 进入执行
- `skill_completed`
  - 标识某个 skill 成功结束
- `approval_required`
  - 标识 workflow 被门控阻塞，等待批准
- `workflow_completed`
  - 标识 workflow 最终完成，可为 `success` 或 `failed`
