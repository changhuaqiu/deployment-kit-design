# 方案 C：OpenCLI 动态 MCP 桥接架构方案 (Dynamic MCP Bridge)

## 1. 架构愿景与核心理念

本方案旨在解决 AI Agent (OpenCode) 在面对**“无 OpenAPI、强认证、重状态”**的内部 Web 系统时的自动化编排难题。

**核心理念**：将 OpenCLI 从一个独立的 CLI 工具，降级并融合为 Deployment Kit 的**底层驱动引擎**。Deployment Kit 充当一个 **动态 MCP Server (Model Context Protocol)**，它能够热加载 `clis/` 目录下的所有 OpenCLI 适配器（Adapters），并将它们动态映射（Translate）为大模型可识别、可调用的标准 MCP Tools/Skills。

**用户心智**：开发人员只需要用 `opencli explore/generate` 跑通一个网页操作，把生成的 `.js` 脚本扔进特定的文件夹，Agent 就自动学会了这个新技能，无需修改和重启 Deployment Kit 核心代码。

---

## 2. 整体架构设计

```text
┌────────────────────────────────────────────────────────────┐
│                  OpenCode Agent / LLM                      │
│ (Sees standardized MCP Tools: `deploy_trigger`, `jira_get`)│
└────────────────────────────┬───────────────────────────────┘
                             │ JSON-RPC / MCP Protocol
                             ▼
┌────────────────────────────────────────────────────────────┐
│               Deployment Kit (MCP Server)                  │
│                                                            │
│  ┌──────────────────────────┐   ┌───────────────────────┐  │
│  │ 1. Schema Translator     │   │ 2. Tool Registry      │  │
│  │ (Maps OpenCLI options to │──>│ (Exposes Tools to MCP)│  │
│  │  JSON Schema)            │   └───────────────────────┘  │
│  └──────────────────────────┘               │              │
│               ▲                             ▼              │
│  ┌──────────────────────────┐   ┌───────────────────────┐  │
│  │ 3. File Watcher/Scanner  │   │ 4. Execution Engine   │  │
│  │ (Scans ./clis/*.js)      │   │ (Invokes OpenCLI core)│  │
│  └──────────────────────────┘   └───────────────────────┘  │
└────────────────────────────┬───────────────────────────────┘
                             │ Spawn / Import
                             ▼
┌────────────────────────────────────────────────────────────┐
│                    OpenCLI Core                            │
│ (Handles Chrome CDP, User Profile, Anti-detect, Extension) │
└────────────────────────────┬───────────────────────────────┘
                             │ WebSocket (Port 9222)
                             ▼
┌────────────────────────────────────────────────────────────┐
│            Local Chrome (With OpenCLI Extension)           │
│         (Authenticated with internal SSO / Cookies)        │
└────────────────────────────┬───────────────────────────────┘
                             │ HTTP/HTTPS
                             ▼
┌────────────────────────────────────────────────────────────┐
│         Internal Web Platforms (Deploy, Jira, etc.)        │
└────────────────────────────────────────────────────────────┘
```

---

## 3. 详细运行机制与目录约定

### 3.1 目录结构约定

Deployment Kit 的工作目录中约定一个专用的扩展目录，例如 `web-skills/`：

```text
deployment-kit/
├── src/
│   ├── index.ts              # Deployment Kit (MCP Server) 主入口
│   ├── mcp-bridge.ts         # 动态桥接核心逻辑
│   └── opencli-runner.ts     # 负责拉起 Chrome 和执行 OpenCLI
├── web-skills/               # 存放所有 OpenCLI Web 适配器
│   ├── internal-deploy.js    # 内部部署平台适配器
│   ├── internal-jira.js      # 内部 Jira 适配器
│   └── internal-monitor.js   # 内部监控大盘适配器
└── package.json
```

### 3.2 动态转换映射 (Schema Translation)

当 Deployment Kit 启动时，`mcp-bridge.ts` 会遍历 `web-skills/` 目录，读取每一个 JS 导出的对象，并将 OpenCLI 的参数定义转换为 MCP Tool 的 JSON Schema。

**OpenCLI 侧的定义 (web-skills/internal-deploy.js):**
```javascript
module.exports = {
  name: 'internal-deploy',
  commands: {
    trigger: {
      description: '触发内部平台的应用部署',
      options: {
        app: { type: 'string', required: true, description: '应用名称，如 user-service' },
        env: { type: 'string', required: true, description: '目标环境，如 staging/prod' }
      },
      action: async ({ options, browser }) => { /* ...点击网页逻辑... */ }
    }
  }
}
```

**Bridge 转换后的 MCP Tool 结构:**
```json
{
  "name": "internal_deploy_trigger",
  "description": "触发内部平台的应用部署",
  "inputSchema": {
    "type": "object",
    "properties": {
      "app": { "type": "string", "description": "应用名称，如 user-service" },
      "env": { "type": "string", "description": "目标环境，如 staging/prod" }
    },
    "required": ["app", "env"]
  }
}
```

### 3.3 指令执行与回调 (Execution)

当 Agent 决定调用 `internal_deploy_trigger` 工具时，MCP Server 收到请求：
1. `Execution Engine` 拦截到请求，提取参数 `{"app": "user-service", "env": "staging"}`。
2. 将参数重新组装为 OpenCLI 的调用上下文。
3. 唤醒/复用后台的 Chrome 实例（带有持久化 User Data Dir 的实例）。
4. 执行 `internal-deploy.js` 中的 `action` 逻辑。
5. 捕获 `action` 返回的结构化 JSON，并包装为 MCP 的标准响应格式（如 `CallToolResult`）返回给大模型。

---

## 4. 结合「一键安装」的完整启动流

为了实现极致的开发者体验（DevEx），Deployment Kit 的启动流（`init` / `start`）应包含以下隐式操作：

1. **环境自检 (Doctor)**：检查宿主机是否安装了 Chrome。
2. **插件就绪 (Extension Prep)**：解压内置的 `opencli-extension.zip` 到临时目录。
3. **拉起浏览器 (Browser Launch)**：使用 `--load-extension` 和特定的 `--user-data-dir` 后台拉起 Chrome。
   * *如果这是用户首次运行，弹出一个前台窗口提示用户登录内部 SSO。*
   * *如果已有 Cookie 缓存，直接无头模式（Headless）或最小化后台运行。*
4. **加载技能 (Skill Load)**：读取 `web-skills/`，向 OpenCode 注册所有 MCP Tools。
5. **就绪监听 (Ready)**：开始接受大模型的指令编排。

---

## 5. 方案优势总结

1. **“降维打击”式的扩展性**：打破了传统 MCP 只能对接 API 的限制。任何人只要会点网页，用 OpenCLI 录制一下，就能给 Agent 增加一个新技能。
2. **极速上线，绕过后端排期**：业务方想要 Agent 能查 Jira 状态、能点某个审批流，不再需要求着各个后端团队开 OpenAPI，前端直接搞定。
3. **对 LLM 极其友好 (Deterministic)**：LLM 只需要理解标准 JSON Schema 并输出参数。它不需要知道底下是 Puppeteer 还是 Playwright，也不需要自己写容易报错的 CSS Selector，所有容易出错的 DOM 操作都被封装在了适配器内部。
4. **高安全性与防风控**：完全复用宿主机的 Chrome 和本地网络环境，内部网关/零信任系统看到的就是一个真实员工在点击网页。
