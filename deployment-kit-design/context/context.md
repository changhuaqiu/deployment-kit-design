# Deployment Kit 设计上下文

## 📋 文档目的

本文档提供 Deployment Kit 设计项目的完整上下文，包括：
- 项目背景和目标
- 关键设计决策及其原因
- 架构模式和约定
- 已解决的技术问题
- 待讨论的开放问题
- 后续工作方向

**用途**：作为项目交流的参考文档，帮助快速理解设计背景和决策依据。

---

## 🎯 项目概述

### 项目定位

**Deployment Kit** 是一个给 **Agent 框架**使用的 **HIS 代码化部署套件**，采用技能化（Skills）的设计理念。

### 核心特点

```
✅ 技能化：将部署流程分解为 20 个独立技能
✅ 可编排：通过编排器灵活组合技能
✅ Agent 友好：项目级数据存储，便于 Agent 使用
✅ 智能化：自动检查、自动修复、智能提示
```

### 适用场景

**主要用户场景**：
1. **首次 XaC 化**：用户现网有资源但没有 XaC 代码，通过 Deployment Kit 快速生成 XaC 代码
2. **资源更新**：现网资源变化后，更新已有 XaC 代码
3. **自动部署**：代码合入自动触发部署
4. **生产部署**：多环节验证、风险控制的生产环境部署
5. **异常处理**：部署失败分析和快速恢复

---

## 🏗️ 架构设计

### 整体架构（分层模型）

```
┌─────────────────────────────────────────┐
│         用户交互层                       │
│  • CLI 工具    • Web UI                  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│          入口层 (Entry)                 │
│  • 项目初始化  • 前置检查               │
│  • 智能提示    • 自动修复               │
│  • 参数解析    • 交互协调               │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│        编排器 (Orchestrator)            │
│  • 技能编排    • 数据传递               │
│  • 缓存策略    • 状态管理               │
│  • 错误处理    • 工作流执行             │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         技能层 (Skills)                 │
│  • 20 个技能   • 工作流库               │
│  • 质量保证体系                         │
└─────────────────┬───────────────────────┘
                  │
                  │ MCP 调用
                  ▼
┌─────────────────────────────────────────┐
│       MCP 服务层 (Service Layer)         │
│  • 部署桌面 (XaC生成、资源管理、配置)   │
│  • CF 平台 (计划验证、部署执行)         │
│  • 其他 MCP 服务（监控、日志等）        │
└─────────────────────────────────────────┘
```

### 参考：Superpowers 设计模式

```
Superpowers:                    Deployment Kit:
.claude/                    .deployment-kit/
├── memory/                  ├── cache/
│   ├── user_*.md           │   └── {appid}/
│   ├── feedback_*.md        ├── dependencies.json
│   └── MEMORY.md           └── state.json
└── settings.local.json

核心模式：
• 项目级数据存储
• Agent 在工作目录直接访问
• 数据跟随项目移动
• 简化设计，专注 Agent 使用
```

---

## 🎯 关键设计决策

### 1. 项目级数据存储

**决策**：数据存储在项目目录 `.deployment-kit/`

**原因**：
- ✅ Agent 在项目上下文中工作
- ✅ 数据跟随项目，便于理解
- ✅ 不同项目数据隔离
- ✅ 参考 Superpowers 的 `.claude/` 模式
- ✅ 不需要考虑 git、版本管理（给 Agent 用）

**目录结构**：
```
项目目录/
├── .deployment-kit/
│   ├── cache/
│   │   └── {appid}/
│   │       ├── manifest.json
│   │       ├── resources.json
│   │       └── metadata.json
│   ├── dependencies.json
│   └── state.json
└── 项目文件...
```

### 2. 依赖关系人工指定

**决策**：依赖关系由人工指定，不做自动推断

**原因**：
- ✅ 准确性：只有人真正了解业务依赖
- ✅ 可控：避免自动推断的错误
- ✅ 可审计：明确的依赖关系便于审查
- ✅ 当前 MCP 服务不支持依赖关系查询

**实现**：
- 用户编辑 `.deployment-kit/dependencies.json`
- 提供 `dk dependencies edit` 命令
- 提供 `dk dependencies validate` 验证
- 提供 `dk dependencies visualize` 可视化

### 3. 混合缓存策略

**决策**：默认使用缓存，支持强制刷新

**原因**：
- ✅ 性能：避免重复调用 MCP
- ✅ 一致性：基于同一份数据生成
- ✅ 灵活性：支持 `--fresh`、`--no-cache` 选项

**实现**：
```bash
# 默认：优先缓存
dk generate-xac --appid xxx

# 强制刷新
dk generate-xac --appid xxx --fresh

# 忽略缓存
dk generate-xac --appid xxx --no-cache
```

### 4. 技能编排模式

**决策**：技能分为 generate-xac（全新生成）和 update-xac（增量更新）

**原因**：
- ✅ 明确的语义：用户知道用哪个
- ✅ generate-xac：覆盖模式，用于首次 XaC 化
- ✅ update-xac：保留模式，用于更新现有 XaC

### 5. discover-resources 不做依赖推断

**决策**：discover-resources 只收集资源数据，不做依赖关系分析和 DAG 生成

**原因**：
- ✅ MCP 服务不具备依赖关系查询能力
- ✅ 依赖推断可能不准确
- ✅ 依赖关系人工指定更可靠
- ✅ 职责单一：discover-resources 专注资源发现

---

## 📊 技能分类

### 核心技能（9 个）- 主工作流程

| 技能名称 | 功能描述 | 状态 |
|---------|---------|------|
| discover-resources | 发现现网资源 | 规划中 |
| generate-xac | 生成 XaC 代码 | ✅ 已完成 |
| update-xac | 更新 XaC 代码 | 规划中 |
| validate-syntax | 语法校验 | 规划中 |
| validate-plan | 计划验证 | 规划中（CF平台提供） |
| test-deploy | 测试环境部署 | 规划中（CF平台提供） |
| deploy-production | 生产环境部署 | 规划中（CF平台提供） |
| analyze-failure | 分析部署失败 | 规划中 |
| evaluate-canary | 评估灰度效果 | 规划中 |

### 质量技能（4 个）

| 技能名称 | 功能描述 | 状态 |
|---------|---------|------|
| review-code | XaC 代码审查 | 规划中 |
| check-compliance | 合规检查 | 规划中 |
| monitor-deployment | 部署监控 | 规划中 |
| monitor-resources | 资源监控 | 规划中 |

### 管理技能（2 个）

| 技能名称 | 功能描述 | 状态 |
|---------|---------|------|
| manage-config | 配置管理 | 规划中 |
| manage-version | 版本管理 | 规划中 |

### 应急技能（5 个）

| 技能名称 | 功能描述 | 状态 |
|---------|---------|------|
| diagnose-error | 错误诊断 | 规划中 |
| auto-fix | 自动修复 | 规划中 |
| rollback-deployment | 快速回滚 | 规划中 |
| dry-run-rehearsal | 生产演练 | 规划中 |
| deploy-canary | 灰度部署 | 规划中 |

---

## 🔧 MCP 服务能力

### 已知 MCP 服务

#### 1. 资源管理 MCP 服务（部署桌面）

**能力**：
- 根据 `appid` 获取应用下的资源统计
- 调用各个 tools 获取详细资源数据
- 每种资源类型有对应的 tool

**Tools**：
- `get_resource_stats`: 获取资源统计
- `get_ads_list`: 获取 ADS 资源列表
- `get_config_list`: 获取配置资源列表
- `get_...`: 其他资源类型

**能力边界**：
- ✅ 提供资源统计数据
- ✅ 提供详细资源数据
- ❌ 不提供依赖关系
- ❌ 不提供 DAG 生成

#### 2. XaC 编排 MCP 服务（CF 平台）

**能力**：
- `validate-plan`: 计划验证
- `deploy-production`: 生产部署
- `test-deploy`: 测试部署

**能力边界**：
- ✅ 计划验证和风险评估
- ✅ 部署执行
- ❌ 不提供资源发现
- ❌ 不提供 XaC 代码生成

### MCP 服务集成方式

```
技能层调用 MCP 服务：
├── 部署桌面 MCP 服务
│   ├── discover-resources（资源发现）
│   ├── generate-xac（XaC 代码生成）
│   └── manage-config（配置管理）
│
└── CF 平台 MCP 服务
    ├── validate-plan（计划验证）
    └── deploy-production（部署执行）
```

---

## 💾 数据流和缓存

### 数据流

```
用户请求 → 入口层 → 编排器 → 技能层 → MCP 服务层
    ↓          ↓        ↓       ↓        ↓
 用户目录  .deployment-kit  技能逻辑  网络调用
    ↓          ↓        ↓       ↓        ↓
  state.json  cache/   处理逻辑  返回数据
              ↓       ↓
          生成结果  技能输出
```

### 缓存策略

```
discover-resources:
  调用 MCP → 保存到 .deployment-kit/cache/{appid}/
  缓存内容：manifest.json, resources.json, metadata.json

generate-xac:
  读取缓存（默认）→ 生成 XaC 代码 → 保存到 xac/
  支持模式：cache（默认）、fresh、no-cache

validate-plan:
  调用 CF 平台 MCP → 验证计划 → 返回验证结果
  不使用缓存（总是实时）
```

---

## 🎯 核心使用场景

### 场景 1：首次 XaC 化

```
用户：现网有资源，从未写过 XaC 代码

流程：
1. dk discover --appid xxx
   → 调用 MCP 获取资源
   → 保存到缓存
   → 提示编辑依赖关系

2. dk dependencies edit --appid xxx
   → 编辑依赖关系文件

3. dk generate-xac --appid xxx
   → 从缓存读取资源数据
   → 读取依赖关系
   → 生成 XaC 代码

4. dk validate-syntax
   → 验证生成的代码

5. dk validate-plan --appid xxx
   → 调用 CF 平台验证

6. dk deploy-production --appid xxx
   → 调用 CF 平台部署
```

### 场景 2：资源更新

```
用户：现网资源有变化，需要更新 XaC

流程：
1. dk discover --appid xxx --refresh
   → 刷新资源数据

2. dk generate-xac --appid xxx
   → 重新生成 XaC 代码（覆盖）

3. dk validate-syntax
   → 验证代码

4. dk deploy-production
   → 部署
```

### 场景 3：快速部署

```
用户：一键部署，自动化

流程：
dk quick-deploy --appid xxx
→ 自动执行完整流程
→ 包含所有检查和验证
```

---

## 🔓 已解决的技术问题

### 问题 1：Cache 存放位置

**问题**：Cache 应该放用户主目录还是项目目录？

**解决方案**：项目目录 `.deployment-kit/cache/`

**原因**：
- Agent 在项目上下文中工作
- 数据跟随项目移动
- 参考 Superpowers 的 `.claude/memory/` 模式
- 简化设计，不需要考虑 git、版本管理

### 问题 2：依赖关系如何获取

**问题**：依赖关系自动推断还是人工指定？

**解决方案**：人工指定

**原因**：
- MCP 服务不提供依赖关系
- 自动推断可能不准确
- 人工指定更可靠、可控
- 提供辅助工具（验证、可视化）

### 问题 3：generate-xac 和 update-xac 的区别

**问题**：两个技能如何区分？

**解决方案**：
- `generate-xac`：全新生成（覆盖模式）
- `update-xac`：增量更新（保留模式）

**原因**：
- 明确的语义
- 用户知道用哪个
- 符合直觉

### 问题 4：缓存策略如何管理

**问题**：如何平衡性能和数据新鲜度？

**解决方案**：混合模式

- 默认：使用缓存
- 缓存过期：提示用户
- 支持 `--fresh` 强制刷新
- 支持 `--no-cache` 忽略缓存

### 问题 5：如何与 Agent 框架集成

**问题**：如何让 Agent 方便地使用这些技能？

**解决方案**：
- 项目级数据存储（`.deployment-kit/`）
- 自动初始化
- 智能检查和提示
- 状态持久化（`state.json`）
- 断点续传支持

---

## ❓ 待讨论的开放问题

### 问题 1：转换规则的具体设计

**背景**：`generate-xac` 的核心是资源 → XaC 的转换规则

**需要讨论**：
1. 资源类型映射表（HIS 资源 → XaC 资源）
2. 属性映射规则（HIS 属性 → XaC 参数）
3. 数据类型转换规则
4. 特殊资源处理（复杂对象、嵌套结构）
5. 最佳实践（命名规范、注释规范）

**当前状态**：已确定需要转换规则，具体规则后续讨论

### 问题 2：update-xac 的实现细节

**背景**：`update-xac` 需要保留用户自定义内容

**需要讨论**：
1. 如何识别用户自定义内容？
2. 如何保留用户自定义？
3. 如何合并新生成的内容？
4. 差异报告如何生成？

**当前状态**：概念已确定，实现细节待讨论

### 问题 3：validate-plan 的具体流程

**背景**：`validate-plan` 调用 CF 平台 MCP 服务

**需要讨论**：
1. MCP 服务调用协议
2. 计划结果解析
3. 风险评估标准
4. 用户如何查看和确认计划？

**当前状态**：知道调用 CF 平台，具体协议待讨论

### 问题 4：监控服务的实现

**背景**：监控服务（monitor-deployment、monitor-resources）规划中

**需要讨论**：
1. 监控数据的来源
2. 监控指标的采集
3. 告警规则的配置
4. 是否需要独立的监控 MCP 服务？

**当前状态**：规划中，暂不实现

### 问题 5：工作流的预定义

**背景**：需要提供预定义工作流

**需要讨论**：
1. 需要哪些预定义工作流？
2. 工作流定义格式
3. 如何支持用户自定义工作流？

**当前状态**：概念已确定，具体工作流待定义

---

## 📝 重要约定和规范

### 命名规范

```
目录命名：
.deployment-kit/          # 项目数据目录（固定）
cache/                    # 缓存目录（固定）
{appid}/                 # 应用 ID 变量

文件命名：
manifest.json            # 资源清单（固定）
resources.json           # 资源数据（固定）
metadata.json            # 缓存元数据（固定）
dependencies.json        # 依赖关系（固定）
state.json               # 执行状态（固定）

命令命名：
dk <skill> [options]      # 技能命令
dk workflow <name>        # 工作流命令
dk cache <command>        # 缓存管理
dk dependencies <command> # 依赖管理
dk status                  # 状态查询
```

### 文件格式

```
JSON 格式：
manifest.json
resources.json
dependencies.json
state.json

YAML 格式：
xac/main.yaml            # 生成的 XaC 配置
xac/variables.yaml
xac/outputs.yaml

HCL 格式：
xac/terraform/main.tf     # 生成的 Terraform 代码
```

### 状态码

```
技能执行状态：
success                  # 成功
failed                   # 失败
warning                  # 警告（但有输出）
skipped                  # 跳过

检查结果类型：
error                    # 错误（必须解决）
warning                  # 警告（可选）
info                     # 信息
```

---

## 🚀 后续工作方向

### 短期（当前）

1. ✅ **已完成**：架构设计文档
2. ✅ **已完成**：数据存储和依赖管理设计
3. ✅ **已完成**：入口层和编排器设计
4. ✅ **已完成**：generate-xac 技能定义

### 中期（下一步）

1. **讨论转换规则**：
   - 资源类型映射表
   - 属性映射规则
   - 特殊资源处理

2. **实现 discover-resources**：
   - MCP 服务调用
   - 数据收集和格式化
   - 缓存管理

3. **实现编排器**：
   - 技能编排逻辑
   - 状态管理
   - 错误处理

4. **实现入口层**：
   - CLI 框架
   - 命令解析
   - 交互逻辑

### 长期（未来）

1. **实现其他技能**：
   - update-xac
   - validate-syntax
   - validate-plan
   - deploy-production
   - ...

2. **监控服务**：
   - monitor-deployment
   - monitor-resources

3. **Web UI**：
   - 可视化界面
   - 流程可视化
   - 实时监控面板

---

## 📚 关键文档索引

### 设计文档

| 文档名称 | 描述 | 位置 |
|---------|------|------|
| 00-架构设计图.md | 整体架构概览 | deployment-kit-design/ |
| 01-overview.md | 概述和背景 | deployment-kit-design/ |
| 02-skills-definition.md | 20 个技能详细定义 | deployment-kit-design/ |
| 03-skill-relationships.md | 技能关系和依赖 | deployment-kit-design/ |
| 04-workflows.md | 预定义工作流 | deployment-kit-design/ |
| 05-orchestrator-design.md | 编排器设计 | deployment-kit-design/ |
| 06-evolution-mechanism.md | 演进机制 | deployment-kit-design/ |
| 08-data-storage-and-dependencies.md | 数据存储和依赖管理 | deployment-kit-design/ |
| 09-entry-and-orchestration.md | 入口层和编排器集成 | deployment-kit-design/ |

### 上下文文档

| 文档名称 | 描述 | 位置 |
|---------|------|------|
| context.md | 本文档：项目上下文 | deployment-kit-design/context/ |

---

## 🔄 变更记录

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| 1.0.0 | 2026-03-26 | 初始版本 | Deployment Kit 设计团队 |

---

## 💡 如何使用本文档

### 快速了解项目

1. **新加入团队成员**：阅读"项目概述"和"整体架构"
2. **技术实现**：阅读"关键设计决策"和"架构设计"
3. **具体问题**：查看"已解决的技术问题"
4. **继续工作**：查看"待讨论的开放问题"

### 与团队讨论

1. **讨论技术方案**：引用"关键设计决策"中的原因
2. **提出新问题**：添加到"待讨论的开放问题"
3. **更新上下文**：及时更新"变更记录"

### 后续参考

1. **查看约定**：使用"重要约定和规范"
2. **查找文档**：使用"关键文档索引"
3. **了解进展**：查看"后续工作方向"

---

## 📞 联系方式

- **项目名称**：Deployment Kit
- **创建日期**：2026-03-26
- **文档维护**：Deployment Kit 设计团队
- **文档位置**：deployment-kit-design/context/context.md

---

**提示**：本文档是活文档，随着项目进展持续更新。每次重要决策后请及时更新本文档。
