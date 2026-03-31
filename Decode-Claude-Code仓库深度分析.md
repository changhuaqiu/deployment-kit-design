# Decode-Claude-Code 仓库深度分析

**仓库**: https://github.com/agenmod/decode-claude-code
**作者**: agenmod
**分析日期**: 2026-03-31

---

## 🎯 核心价值

这是一个**从 npm source map 中完整提取**的 Claude Code 架构分析：

```
2026-03-31：@anthropic-ai/claude-code@2.1.88 发布
           ↓
       包含 59.8MB source map (cli.js.map)
           ↓
    完整的 TypeScript 源代码（未混淆）
           ↓
   1,906 文件 · 515,029 行代码
           ↓
  结构化的架构分析和设计解释
```

---

## 📊 关键数据

| 指标 | 数值 |
|------|------|
| **源文件数** | 1,906 |
| **代码行数** | 515,029 |
| **内置工具** | 40+ |
| **斜杠命令** | 90+ |
| **上下文窗口** | 200K tokens |
| **Prompt 缓存命中率** | 92% |
| **Bash 安全代码** | 7,000+ 行 |

---

## 🏗️ 架构概览

### 整体架构

```
终端用户
    │
    ▼
┌─────────────────────────────────────────────┐
│      Claude Code CLI (Bun + React/Ink)       │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ System   │  │  Agent   │  │ Permission │  │
│  │ Prompt   │  │  Loop    │  │  System    │  │
│  │ Assembly │  │ (while)  │  │ (5 modes)  │  │
│  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │
│       │             │              │          │
│  ┌────┴─────────────┴──────────────┴───────┐  │
│  │      40+ Tools · 90+ Commands             │  │
│  │   Bash|Read|Write|Edit|Grep|Glob|Agent    │  │
│  └────────────────────┬────────────────────┘  │
│                       │                       │
│  ┌────────────────────┴────────────────────┐  │
│  │  Context Management (200K tokens)        │  │
│  │  Auto-compaction at 75-92% capacity      │  │
│  └────────────────────┬────────────────────┘  │
└───────────────────────┼───────────────────────┘
                        │
                        ▼
            Anthropic Messages API
           (Prompt Cache: 92% reuse)
```

---

## 📚 章节结构（12 章）

| # | 章节 | 核心问题 | 重要性 |
|---|------|---------|--------|
| 00 | **Architecture Overview** | Claude Code 的设计哲学是什么？ | ⭐⭐⭐ |
| 01 | **System Prompt Design** | 如何实现 92% 缓存命中率？ | ⭐⭐⭐⭐⭐ |
| 02 | **The Agentic Loop** | 单个请求内部发生了什么？ | ⭐⭐⭐⭐ |
| 03 | **Tool System** | 40+ 工具如何注册、分发、执行？ | ⭐⭐⭐⭐ |
| 04 | **Permission Model** | 5 种权限模式如何工作？ | ⭐⭐⭐⭐ |
| 05 | **Context Management** | 200K tokens 耗尽时如何处理？ | ⭐⭐⭐⭐⭐ |
| 06 | **Prompt Caching** | 如何设计 prompt 最大化缓存？ | ⭐⭐⭐⭐⭐ |
| 07 | **Multi-Agent** | Sub-agents 如何生成？Team 如何工作？ | ⭐⭐⭐⭐ |
| 08 | **MCP Integration** | MCP 如何无限扩展工具能力？ | ⭐⭐⭐⭐ |
| 09 | **Startup Optimization** | 并行预取 + 延迟加载 + 死代码消除？ | ⭐⭐⭐ |
| 10 | **Feature Flags** | KAIROS, PROACTIVE 等隐藏功能？ | ⭐⭐⭐⭐⭐ |
| 11 | **Security** | 7,000+ 行 Bash 安全代码检查什么？ | ⭐⭐⭐⭐ |

---

## 🔥 独家发现（其他地方找不到）

### 1️⃣ **Internal vs External Prompts**

```typescript
// 外部用户得到：
"Go straight to the point. Try the simplest approach first."

// 内部用户（USER_TYPE === 'ant'）得到：
"Write user-facing text in flowing prose while eschewing fragments,
 excessive em dashes, symbols and notation..."
// + 数字长度锚定："≤25 words between tool calls"
// + 断言性："If you notice the user's request is based
//   on a misconception, say so."
```

**关键差异**：
- **内部**：更冗长、更有主见、主动质疑用户假设
- **外部**：简洁、顺从

→ 详细分析在 Chapter 01

### 2️⃣ **10.2% 缓存灾难——一个动态列表耗资数百万**

**问题**：
```
Agent 列表嵌入在 AgentTool 的描述中（工具 schema 的一部分）
     ↓
MCP 连接改变 → agent 列表改变 → 工具 schema 改变
     ↓
整个 prompt 缓存失效
```

**影响**：
- 这个单一问题消耗了 **10.2% 的集群级缓存创建 tokens**

**修复**：
```typescript
// 将 agent 列表移到消息附件
agent_listing_delta

// 从可缓存的 schema 中移除
```

→ 详细分析在 Chapter 06

### 3️⃣ **KAIROS——Claude Code 的未发布"助手模式"**

隐藏在 `KAIROS` feature flag 后，这个模式将 Claude Code 从被动工具转变为**主动助手**：

```typescript
// 新增工具
- SleepTool              // 定时休眠和唤醒
- PushNotificationTool   // 推送到手机
- SubscribePRTool        // 订阅 PR 变更
- SendUserFileTool       // 发送文件给用户
- BriefTool              // 生成每日简报
```

→ 详细分析在 Chapter 10

### 4️⃣ **20 行启动技巧节省 65ms**

```typescript
// main.tsx — 前 20 行，在任何其他导入之前：
profileCheckpoint('main_tsx_entry');
startMdmRawRead();      // 启动 MDM 子进程
startKeychainPrefetch(); // 启动 2 个并行 keychain 读取
// ... 然后 135ms 的繁重模块导入 ...
// 当导入完成时，I/O 结果已经可用
```

**原理**：利用 JavaScript 的导入求值顺序，将 I/O 与模块加载重叠

→ 详细分析在 Chapter 09

### 5️⃣ **Auto Dream——Claude "做梦"整合记忆**

`src/services/autoDream/` 实现了后台记忆整合。当你 24+ 小时未使用 Claude Code 且积累了 5+ 会话时，它会生成 sub-agent：

1. **定向** —— 读取现有记忆目录
2. **收集** —— 扫描日志、grep 会话记录寻找新信号
3. **整合** —— 合并新信息、转换相对日期为绝对日期、删除矛盾事实
4. **修剪** —— 保持索引文件 < 25KB

```typescript
const DEFAULTS = { minHours: 24, minSessions: 5 }
```

Dream agent 使用只读 Bash（可以 `grep` 但不能 `rm`），使用文件锁防止并发梦境，在任务管理器 UI 中显示进度

→ 详细分析在 Chapter 10

### 6️⃣ **Undercover Mode——Anthropic 员工在公开仓库隐身**

`src/utils/undercover.ts` 揭示了一个在 Anthropic 员工在公开仓库工作时**自动激活**的模式：

```typescript
UNDERCOVER MODE — CRITICAL
You are operating UNDERCOVER in a PUBLIC/OPEN-SOURCE repository.
NEVER include: "Claude Code", model codenames, Co-Authored-By lines,
or any mention that you are an AI.
Write commit messages as a human developer would.
```

**关键**：**没有强制关闭开关**。如果不在白名单内部仓库中，undercover 模式保持开启。这意味着 Anthropic 员工的开源贡献与人类编写的代码无法区分。

→ 详细分析在 Chapter 10

### 7️⃣ **Buddy System——隐藏在编码工具中的完整电子宠物**

`src/buddy/` 包含完整的虚拟宠物系统：

- **18 个物种**：duck, goose, blob, cat, dragon, octopus, owl, penguin, turtle, snail, ghost, axolotl, capybara, cactus, robot, rabbit, mushroom, chonk
- **5 稀有度层级**：Common (60%) → Legendary (1%)，1% Shiny 变体
- **ASCII 艺术精灵**：每个物种 3 帧空闲动画
- **属性**：DEBUGGING / PATIENCE / CHAOS / WISDOM / SNARK
- **帽子**：crown, tophat, propeller, halo, wizard, beanie, tinyduck

从 `hash(userId)` 确定性生成 —— 每个用户永远得到相同的宠物。宠物坐在输入框旁边，偶尔通过气泡评论。

→ 详细分析在 Chapter 10

---

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| **运行时** | Bun |
| **语言** | TypeScript (strict) |
| **终端 UI** | React + Ink |
| **CLI 解析** | Commander.js (extra-typings) |
| **Schema 验证** | Zod v4 |
| **代码搜索** | ripgrep |
| **协议** | MCP SDK, LSP |
| **API** | Anthropic SDK |
| **遥测** | OpenTelemetry + gRPC |
| **Feature Flags** | GrowthBook |
| **认证** | OAuth 2.0, JWT, macOS Keychain |

---

## 🎓 学习价值

### 对 Deployment Kit 的启发

#### 1️⃣ **Prompt 缓存设计**

**Claude Code 的做法**：
```
静态部分（可缓存） + __DYNAMIC_BOUNDARY__ + 动态部分（不缓存）
```

**Deployment Kit 可以借鉴**：
```markdown
<!-- 静态：HEAM 协议说明（可缓存） -->
__DYNAMIC_BOUNDARY__
<!-- 动态：运行时环境信息（不缓存） -->
```

#### 2️⃣ **工具注册系统**

Claude Code 使用 Zod schema 验证 + 自动分发：

```typescript
tools: [
  {
    name: 'generate_xac',
    description: 'Generate XaC code',
    schema: z.object({
      service_type: z.string(),
      qps: z.number().optional()
    }),
    execute: async ({ service_type, qps }) => {
      // 实现逻辑
    }
  }
]
```

#### 3️⃣ **权限模型**

5 种模式：
1. **Always allow** - 无需确认
2. **Always ask** - 总是询问
3. **Block** - 禁止执行
4. **User config** - 用户配置决定
5. **Tool-specific** - 工具特定规则

Deployment Kit 可以采用类似模型：
```javascript
{
  'validate_plan': 'always_allow',
  'deploy_production': 'always_ask',
  'delete_resources': 'block'
}
```

#### 4️⃣ **Context 管理**

自动压缩策略：
- 75% 容量时：轻度压缩
- 92% 容量时：激进压缩
- 200K 上限：强制压缩

Deployment Kit 可以管理 XaC 代码上下文：
```javascript
if (contextSize > 150000) {
  // 移除旧的 XaC 代码
  // 保留最近的部署历史
}
```

#### 5️⃣ **Feature Flags**

隐藏功能通过 feature flag 控制：
```typescript
const KAIROS = featureFlags.isEnabled('kairos');
const PROACTIVE = featureFlags.isEnabled('proactive');
```

Deployment Kit 可以使用类似方法：
```typescript
const SCENARIO_C = featureFlags.isEnabled('scenario-c');
const AUTO_DEPLOY = featureFlags.isEnabled('auto-deploy');
```

---

## 📖 相关资源

### 源码和逆向工程

- [instructkr/claude-code](https://github.com/instructkr/claude-code) - 完整源码快照（5.5k stars）
- [hitmux/HitCC](https://github.com/hitmux/HitCC) - 最全面的 RE 文档（81 文件，27K 行）
- [Piebald-AI/claude-code-system-prompts](https://github.com/Piebald-AI/claude-code-system-prompts) - 136+ 版本的 system prompt 追踪
- [ghuntley/claude-code-source-code-deobfuscation](https://github.com/ghuntley/claude-code-source-code-deobfuscation) - LLM cleanroom 反混淆

### 分析文章

- **How Claude Code Actually Works** — KaraxAI
- **Under the Hood** — Pierce Freeman
- **Architecture & Internals** — Bruniaux
- **Digging into the Source** — Dave Schumaker

---

## 🔨 如何复现提取

```bash
# 1. 下载 npm 包
npm pack @anthropic-ai/claude-code@2.1.88 --registry https://registry.npmjs.org

# 2. 解包
tar -xzf anthropic-ai-claude-code-2.1.88.tgz

# 3. 从 map 文件提取源码
node scripts/extract-sources.js ./package/cli.js.map ./extracted-src
# → 1,906 文件，515,029 行
```

---

## 📅 时间线

| 日期 | 事件 |
|------|------|
| 2025-02-24 | v0.2.8 发布内联 base64 source map — 通过 Sublime Text 撤销恢复 |
| 2025-03 | Anthropic 推送更新移除 source maps，删除旧 npm 版本 |
| 2026-03-06 | Agent SDK 意外打包完整 CLI（v2.1.71，13,800 行压缩） |
| 2026-03-27 | CMS 配置错误暴露 ~3,000 内部文档，包括 Claude Mythos |
| 2026-03-31 | v2.1.88 发布 `cli.js.map`（59.8MB）- 所有 1,906 源文件可提取 |

---

## 💡 核心洞察

### 设计哲学

1. **简单即强大**：核心循环只是 `while(tool_call)`，没有 DAGs 或 planners
2. **性能至上**：92% 缓存命中率、并行 I/O、延迟加载
3. **安全优先**：7,000+ 行 Bash 安全代码
4. **用户体验**：Internal vs External prompts、Auto Dream、Buddy System

### 关键技术

1. **Prompt Caching**：静态/动态分离，`__DYNAMIC_BOUNDARY__` 标记
2. **Context Management**：自动压缩、智能裁剪
3. **Permission System**：5 种模式，细粒度控制
4. **MCP Integration**：无限扩展工具能力

### 对 Deployment Kit 的启示

| Claude Code | Deployment Kit 可以学习 |
|-------------|------------------------|
| Prompt 缓存设计 | HEAM 协议可缓存，环境信息动态 |
| 工具注册系统 | Zod schema + 自动分发 |
| 权限模型 | 5 种部署权限模式 |
| Context 管理 | XaC 代码上下文自动压缩 |
| Feature Flags | 场景 C、自动部署通过 flag 控制 |

---

## 🎯 总结

这个仓库的价值在于：

1. **完整性**：1,906 文件，515,029 行代码的完整分析
2. **深度**：不仅仅是代码 dump，而是架构分析和设计解释
3. **独家性**：Internal prompts、KAIROS、Undercover mode 等内部细节
4. **实用性**：可以直接应用到其他 AI 编码工具的设计中

**对于 Deployment Kit**：
- 学习其 Prompt 缓存策略
- 借鉴其工具注册系统
- 采用其权限模型
- 参考其 context 管理机制

---

**免责声明**：本项目仅供**教育和研究目的**。所有 Claude Code 知识产权属于 Anthropic。本仓库不包含原始源代码——仅包含架构分析和设计解释。
