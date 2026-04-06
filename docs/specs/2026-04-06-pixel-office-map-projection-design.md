# Pixel Office + Map Projection Design

## Goal
把右侧的多 Agent 执行变成“建筑公司办公室”的可视化剧情；左侧地图不是静态展示，而是对右侧动作的**具象化投影**：当 Agent 执行扫描/生成/部署时，城市会出现对应的**施工现场动画**、建筑“拔地而起”的过程，提升可玩性与参与感。

## Key Principles
- **3:2 布局**：左侧是城市画布（Map 60%），右侧是办公室（Office 40%）。
- **办公室不是“审批台”**：统一用“办公室 / Office / 工位 / 文件流转”的叙事，不出现“审批台”字眼。
- **右边动作 = 左边变化**：右侧每个子智能体的状态变化必须能在左侧映射为“动画 + 结果落地”。
- **参与感优先**：用户的点击/选择/确认应当触发“可见的变化”，而不是只改变数字或文本。

## User Stories
1. 用户点击“智能普查（scan）”，办公室出现若干工人入座执行任务；地图对应街区出现扫描效果，逐步揭示或标注建筑。
2. 用户点击“智能生成（generate）”，办公室工位进入“敲代码”状态；地图出现施工脚手架/塔吊，进度完成后建筑生成/升级。
3. 用户打开“历史账本”，能看到每个工人的关键日志；点击某个建筑，能看到它对应的 Agent 施工记录与当前状态。

## UI/UX Overview

### Layout
- **Left: Tactical Map (flex 3)**
  - Canvas 城市画布。
  - 顶部：极简 KPI bar（BUILDINGS / DRIFT / COST / RISK）。
  - 左下：Selected Building 的信息卡（仅在选中时出现）。
  - 底部：核心操作条（智能普查、智能生成、提交审批、重置）。
- **Right: Office (flex 2)**
  - 像素风办公室剖面（或横截面）表达：
    - 监工室（Deacon）
    - 工位区（Subagents desks）
    - 文件流转（deliverables）

### Office UX (Reference: pixel-agents)
目标效果：右侧不再是“列表 UI”，而是一个“工位舞台”。

**具象化表达**
- 每个 subagent = 一个工位/一名员工（像素小人 + 桌子 + 小屏幕）。
- 员工状态：
  - `working`：敲键盘动画 + 气泡（短日志）
  - `done`：举手/✅ + 文件递交动画
  - `blocked`：红色感叹号 + 闪烁
- Deacon（监工）在监工室，接收文件并显示“待处理文件堆”。

**信息密度**
- 默认显示：工位状态 + 1 行短日志。
- 点开（点击工位/建筑）：展开 Ledger Drawer，查看完整日志。

### Map UX (Projection)
核心：地图是办公室动作的镜像。

**Scan（普查）投影**
- 在目标街区出现“扫描波纹/扫描框”动画。
- 被扫描到的建筑从“线框/暗影”逐步显形。
- 对 drift 的建筑显示显眼但像素友好的标记（⚠ + 轻微抖动/漏电）。

**Generate/Deploy（生成/部署）投影**
- 生成开始：目标格子出现“施工占位”对象：脚手架 / 塔吊 / 施工围挡。
- 过程：进度条（极简）/ 施工粒子（像素粉尘）。
- 完成：脚手架爆开（像素粒子）→ 建筑实体出现（或升级）。

## Data Model Additions (Frontend)

### Agent-to-Map Projection Events
新增一个轻量的“投影事件”流，用于驱动 Canvas 动画，不直接耦合到资源数据。

```ts
type ProjectionKind = 'scan_ping' | 'build_start' | 'build_progress' | 'build_complete' | 'drift_alert'

type ProjectionEvent = {
  id: string
  at: number
  kind: ProjectionKind
  env: 'dev' | 'stage' | 'prod'
  changeId: string
  agentId?: string
  target: {
    district?: string
    resourceType?: string
    resourceName?: string
    x?: number
    y?: number
  }
  intensity?: number
  progress?: number
}
```

### Building Spawn/Upgrade Rules
- 当 `generate` 的 subagents 全部完成时：
  - 从 `runWorkshopGenerate(changeId)` 得到 `resources`。
  - 对每条 `ResourceChange`，在 map 上找到/分配一个位置，产生 `build_start -> build_progress -> build_complete` 投影事件。
- 当 `scan` 完成时：
  - 从 `runWorkshopScan(changeId)` 得到 `inventory`。
  - 对 drift 项产生 `scan_ping` 与 `drift_alert`。

## Interaction Details

### Controls (Keep Minimal)
- 智能普查：触发 OpenCode subagents（scanner）。
- 智能生成：触发 OpenCode subagents（generator）。
- 提交审批：进入变化详情页（后续可扩展“签字”机制，但 UI 叙事为“文件递交/签收”）。
- 重置：清空 demo 数据。

### Click Mapping
- 点击办公室工位：打开 Ledger Drawer，定位该 agent 的日志。
- 点击地图建筑：
  - 选中建筑 → 左下信息卡显示。
  - 若建筑与某次 change 相关 → 允许一键跳转到对应工作流页（工坊/审批大厅）。

## Visual Direction
- 画面风格：二次元+像素风（偏赛博/蓝图），但避免“大块硬框”切割。
- 颜色建议：
  - 扫描/信息：Cyan
  - 施工/进行中：Blue
  - 漂移/风险：Yellow/Red
  - 完成：Green

## Success Criteria
- 用户点击“智能生成”后，左侧地图在 1-2 秒内出现施工占位对象，并在 3-6 秒内完成一次建筑生成/升级动画。
- 用户能从办公室直观看到“谁在干活、干到哪一步、产生了哪些文件/产出”。
- UI 叙事统一为“办公室/工位/文件流转”，不出现“审批台”。

## Out of Scope (This Iteration)
- 真实 IaC 文件 diff 视图与编辑器集成（可后续接入）。
- 多环境（dev/stage/prod）切换入口的复杂化（先保持极简）。
- 物理碰撞/路径规划等重型游戏机制。

