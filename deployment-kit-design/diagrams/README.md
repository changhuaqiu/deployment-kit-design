# Deployment Kit 设计文档图表

本目录包含 Deployment Kit 设计文档中引用的所有架构图、流程图和状态图。

## 图表列表

### 架构图

#### 1. architecture.png
**描述**：Deployment Kit 整体架构图
**内容**：
- 20 个技能
- 编排器
- 8 个预定义工作流
- 质量保证体系
- 与外部系统的集成

**引用位置**：
- [01-overview.md](../01-overview.md)
- [README.md](../README.md)

---

#### 2. orchestrator-architecture.png
**描述**：编排器架构图
**内容**：
- API 接口层
- 编排层（6 个核心组件）
- 技能层
- 各层之间的交互

**引用位置**：
- [05-orchestrator-design.md](../05-orchestrator-design.md)

---

### 流程图

#### 3. skill-relationships.png
**描述**：技能关系图
**内容**：
- 20 个技能之间的关系
- 6 种关系类型（顺序、条件、门控、可选、并发、嵌套）
- 依赖关系箭头
- 关键路径高亮

**引用位置**：
- [03-skill-relationships.md](../03-skill-relationships.md)

---

#### 4. workflows.png
**描述**：工作流流程图
**内容**：
- 8 个预定义工作流的流程
- 每个工作流的技能序列
- 门控点标记
- 条件分支

**引用位置**：
- [04-workflows.md](../04-workflows.md)

---

#### 5. data-flow.png
**描述**：数据流图
**内容**：
- 开发阶段数据流
- 部署阶段数据流
- 失败处理数据流
- 数据转换点

**引用位置**：
- [03-skill-relationships.md](../03-skill-relationships.md)

---

### 状态图

#### 6. state-transitions.png
**描述**：执行状态转换图
**内容**：
- 主要状态：pending, running, completed, failed, paused
- 状态转换条件
- 转换动作

**引用位置**：
- [03-skill-relationships.md](../03-skill-relationships.md)

---

#### 7. workflow-state-transitions.png
**描述**：工作流状态转换图
**内容**：
- 工作流的主要状态
- 状态之间的转换
- 转换触发条件

**引用位置**：
- [04-workflows.md](../04-workflows.md)

---

### 演进图

#### 8. evolution-mechanism.png
**描述**：演进机制图
**内容**：
- 数据收集流程
- 数据分析流程
- 优化策略
- A/B 测试流程
- PDCA 改进循环

**引用位置**：
- [06-evolution-mechanism.md](../06-evolution-mechanism.md)

---

## 创建建议

### 工具推荐

1. **Draw.io (diagrams.net)**
   - 免费、在线
   - 支持多种导出格式
   - 模板丰富

2. **Lucidchart**
   - 专业级工具
   - 协作功能强大
   - 需要订阅

3. **PlantUML**
   - 代码生成图
   - 版本控制友好
   - 适合开发者

4. **Mermaid**
   - Markdown 集成
   - 轻量级
   - GitHub/GitLab 支持

### 创建规范

1. **命名规范**
   - 使用小写字母和连字符
   - 名称应清晰描述图表内容
   - 使用 `.png` 格式

2. **尺寸规范**
   - 宽度：最小 1200px
   - 高度：根据内容自适应
   - 分辨率：150 DPI

3. **样式规范**
   - 使用一致的配色方案
   - 字体清晰可读
   - 图例完整
   - 对齐整齐

4. **内容规范**
   - 简洁明了
   - 重点突出
   - 层次清晰
   - 易于理解

### 创建顺序

建议按以下顺序创建图表：

1. **优先级 1（必需）**
   - architecture.png
   - orchestrator-architecture.png
   - workflows.png

2. **优先级 2（重要）**
   - skill-relationships.png
   - data-flow.png
   - state-transitions.png

3. **优先级 3（补充）**
   - workflow-state-transitions.png
   - evolution-mechanism.png

---

## 占位符说明

当前本目录仅包含此 README 文件。实际的图表文件需要根据设计文档内容创建。

在图表创建之前，设计文档中的图表引用会显示为链接，点击后显示 404 错误。这是正常的，待图表创建后即可正常显示。

---

## 版本信息

- **创建日期**：2026-03-25
- **最后更新**：2026-03-25
- **状态**：待创建
