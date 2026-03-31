# Claude Code 工具系统深度分析

**基于**: decode-claude-code Chapter 03
**分析日期**: 2026-03-31

---

## 🎯 核心概览

```
40+ 工具 · Zod v4 验证 · 自动分发 · 权限集成 · MCP 扩展
```

### 工具系统架构

```
┌─────────────────────────────────────────────────────┐
│              Claude Code CLI                        │
│                                                     │
│  ┌──────────────┐      ┌──────────────┐           │
│  │ Tool Registry │      │  Dispatcher  │           │
│  │              │      │              │           │
│  │ - Register    │─────▶│ - Route      │           │
│  │ - Validate    │      │ - Execute    │           │
│  │ - Schema      │      │ - Error      │           │
│  └──────────────┘      │  Handling    │           │
│         │              └──────┬───────┘           │
│         │                     │                   │
│         │                     ▼                   │
│         │      ┌──────────────────────────┐       │
│         │      │    Tool Executor          │       │
│         │      │  - File Operations       │       │
│         │      │  - Bash Execution         │       │
│         │      │  - Agent Spawning        │       │
│         │      │  - MCP Calls             │       │
│         │      └──────────────────────────┘       │
│         │                     │                   │
│         └─────────────────────┼───────────────────┘
│                               │
└───────────────────────────────┼───────────────────────
                                │
         ┌──────────────────────┴─────────────────────┐
         │              Permission System             │
         │  (Always Allow · Always Ask · Block · ...) │
         └────────────────────────────────────────────┘
```

---

## 📊 内置工具清单（40+）

### 文件操作工具（File Operations）

| 工具名 | 功能 | Schema | Permission |
|--------|------|--------|------------|
| **Read** | 读取文件内容 | `path: string` | Always Allow |
| **Write** | 写入文件（覆盖） | `path: string, content: string` | Always Ask |
| **Edit** | 编辑文件（部分替换） | `path: string, old: string, new: string` | Always Ask |
| **Glob** | 文件模式匹配 | `pattern: string` | Always Allow |
| **Grep** | 内容搜索 | `pattern: string, path?: string` | Always Allow |

### 执行工具（Execution Tools）

| 工具名 | 功能 | Schema | Permission |
|--------|------|--------|------------|
| **Bash** | 执行 Shell 命令 | `command: string, timeout?: number` | User Config |
| **Agent** | 生成 Sub-agent | `prompt: string, tools?: string[]` | Always Ask |

### 高级工具（Advanced Tools）

| 工具名 | 功能 | Schema | Permission |
|--------|------|--------|------------|
| **TodoWrite** | 任务列表管理 | `todos: [{content, status}]` | Always Allow |
| **Skill** | 加载技能 | `name: string` | Always Allow |
| **MCP** | MCP 服务器调用 | `server: string, tool: string, args: object` | User Config |

### 辅助工具（Utility Tools）

| 工具名 | 功能 | Schema | Permission |
|--------|------|--------|------------|
| **AskUserQuestion** | 询问用户 | `questions: [{question, options}]` | Always Allow |
| **ExitPlanMode** | 退出计划模式 | - | Always Allow |
| **CronCreate** | 创建定时任务 | `cron: string, prompt: string` | Always Ask |
| **CronDelete** | 删除定时任务 | `id: string` | Always Ask |

---

## 🔧 工具注册机制

### 1️⃣ **定义阶段**

```typescript
// src/tools/read.ts
import { z } from 'zod';

export const ReadTool = {
  name: 'read',
  description: 'Read a file from the filesystem',

  // Zod schema 定义
  schema: z.object({
    path: z.string()
      .describe('Path to the file to read')
      .refine((val) => !val.includes('..'), 'No parent directory traversal')
  }),

  // 执行函数
  execute: async ({ path }) => {
    try {
      const content = await fs.readFile(path, 'utf-8');
      return {
        success: true,
        content,
        lineCount: content.split('\n').length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};
```

### 2️⃣ **注册阶段**

```typescript
// src/core/tool-registry.ts
import { z } from 'zod';

class ToolRegistry {
  private tools = new Map<string, Tool>();

  // 注册工具
  register(tool: Tool): void {
    // 1. 验证 schema
    if (!(tool.schema instanceof z.ZodType)) {
      throw new Error('Tool schema must be a Zod schema');
    }

    // 2. 生成 JSON Schema
    const jsonSchema = this.zodToJsonSchema(tool.schema);

    // 3. 存储工具
    this.tools.set(tool.name, {
      name: tool.name,
      description: tool.description,
      schema: jsonSchema,
      execute: tool.execute,
      permission: tool.permission || 'user_config'
    });

    console.log(`✅ Registered tool: ${tool.name}`);
  }

  // 批量注册
  registerAll(tools: Tool[]): void {
    tools.forEach(tool => this.register(tool));
  }

  // 获取工具
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  // 获取所有工具的 JSON Schema（用于 prompt）
  getAllSchemas(): Record<string, any> {
    const schemas = {};
    for (const [name, tool] of this.tools) {
      schemas[name] = {
        name: tool.name,
        description: tool.description,
        input_schema: tool.schema
      };
    }
    return schemas;
  }

  // Zod 转 JSON Schema
  private zodToJsonSchema(zodSchema: z.ZodType): any {
    return zodToOpenAPI(zodSchema);
  }
}
```

### 3️⃣ **初始化阶段**

```typescript
// src/index.ts
const registry = new ToolRegistry();

// 注册所有内置工具
registry.registerAll([
  ReadTool,
  WriteTool,
  EditTool,
  GlobTool,
  GrepTool,
  BashTool,
  AgentTool,
  // ... 40+ 工具
]);
```

---

## 🚀 工具分发机制

### 1️⃣ **Prompt 注入**

工具定义被注入到 System Prompt 中：

```markdown
## Tool Definitions

You have access to the following tools:

### read
Read a file from the filesystem

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "description": "Path to the file to read"
    }
  },
  "required": ["path"]
}
```

### write
Write content to a file (overwrites existing content)

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "path": {"type": "string"},
    "content": {"type": "string"}
  },
  "required": ["path", "content"]
}
```

... (40+ tools)

## Tool Usage Rules

1. ALWAYS validate required parameters before calling a tool
2. If a tool call fails, try to recover or explain the error
3. For destructive operations (Write, Edit, Bash), ask the user first unless permission is "always_allow"
4. Use tools in parallel when possible
```

**关键**：这部分是**静态的**，可以被 prompt cache 缓存！

### 2️⃣ **动态部分（不可缓存）**

```markdown
__DYNAMIC_BOUNDARY__

## Current Session Permissions

- Bash: user_config (always ask for sudo, rm, curl)
- Write: always_ask
- Edit: always_ask
- Agent: always_ask

## Available MCP Servers

- github: connected
- filesystem: connected
- database: connected

## Agent List

- general-purpose: available
- security-reviewer: available
- test-runner: available
```

**关键**：Agent 列表移到这里避免缓存失效（10.2% 灾难）。

---

## ⚙️ 工具执行流程

### 完整流程图

```
User Request: "Read package.json and update the version"
      │
      ▼
┌─────────────────────────────────────────┐
│  1. Request Analysis                    │
│     - Claude 理解用户意图               │
│     - 决定需要哪些工具                   │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  2. Tool Planning                       │
│     - 确定工具调用序列                   │
│     - read(package.json)                │
│     - edit(package.json, version)       │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  3. Permission Check                   │
│     - 检查工具权限                       │
│     - read: always_allow ✓              │
│     - edit: always_ask → 提示用户        │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  4. Tool Execution                     │
│     ├── read(package.json)              │
│     │   ↓                               │
│     │   { success: true, content: ... } │
│     │                                   │
│     └── edit(package.json, ...)         │
│         ↓                               │
│         { success: true, path: ... }    │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  5. Response Generation                │
│     - 合并工具结果                       │
│     - 生成最终回复                       │
│     - "Updated version from 1.0.0 →     │
│        1.0.1"                           │
└─────────────────────────────────────────┘
```

### 核心代码

```typescript
// src/core/agent-loop.ts

async function executeToolCall(
  toolCall: ToolCall,
  context: ExecutionContext
): Promise<ToolResult> {
  const { name, input } = toolCall;

  // 1. 获取工具
  const tool = toolRegistry.get(name);
  if (!tool) {
    throw new Error(`Tool not found: ${name}`);
  }

  // 2. 检查权限
  const permission = await permissionSystem.check(
    tool.name,
    tool.permission,
    context
  );

  if (permission === 'denied') {
    return {
      error: 'Permission denied',
      reason: 'User rejected this operation'
    };
  }

  if (permission === 'ask') {
    // 提示用户
    const approved = await askUserPermission(tool, input);
    if (!approved) {
      return { error: 'User rejected' };
    }
  }

  // 3. 执行工具
  try {
    const result = await tool.execute(input, context);

    // 4. 记录遥测
    telemetry.record('tool_execution', {
      tool: name,
      success: true,
      duration: result.duration
    });

    return result;
  } catch (error) {
    // 错误处理
    telemetry.record('tool_execution', {
      tool: name,
      success: false,
      error: error.message
    });

    return {
      error: error.message,
      recovery: suggestRecovery(error)
    };
  }
}
```

---

## 🔐 权限系统集成

### 权限模式

| 模式 | 行为 | 适用工具 |
|------|------|---------|
| **always_allow** | 无需确认，直接执行 | Read, Glob, Grep, Skill |
| **always_ask** | 每次都询问用户 | Write, Edit, Agent |
| **block** | 禁止执行 | - (通过配置) |
| **user_config** | 用户配置决定 | Bash, MCP |
| **tool_specific** | 工具特定规则 | Bash (sudo, rm 特殊处理) |

### 权限检查流程

```typescript
// src/permissions/permission-system.ts

class PermissionSystem {
  private config: PermissionConfig;

  async check(
    toolName: string,
    defaultPermission: string,
    context: ExecutionContext
  ): Promise<PermissionDecision> {
    // 1. 检查工具特定规则
    const toolRule = this.config.toolSpecific?.[toolName];
    if (toolRule) {
      return this.evaluateRule(toolRule, context);
    }

    // 2. 检查全局规则
    const globalRule = this.config.global?.[defaultPermission];
    if (globalRule) {
      return this.evaluateRule(globalRule, context);
    }

    // 3. 默认行为
    return defaultPermission;
  }

  private async evaluateRule(
    rule: PermissionRule,
    context: ExecutionContext
  ): Promise<PermissionDecision> {
    // Bash 特殊处理
    if (rule.commandPatterns) {
      for (const pattern of rule.commandPatterns) {
        if (this.matchesPattern(context.command, pattern)) {
          return pattern.action;
        }
      }
    }

    return rule.defaultAction;
  }

  private matchesPattern(command: string, pattern: CommandPattern): boolean {
    // 检查是否包含危险命令
    const dangerous = ['sudo', 'rm', 'curl', 'wget', 'chmod', 'chown'];
    return dangerous.some(cmd => command.includes(cmd));
  }
}
```

### Bash 安全示例（7,000+ 行）

```typescript
// src/permissions/bash-security.ts

export class BashSecurity {
  private readonly DANGEROUS_COMMANDS = [
    'sudo',
    'rm -rf',
    'mkfs',
    'dd if=',
    'chmod 000',
    '> /dev/',
    '| sh',
    '| bash'
  ];

  validate(command: string): ValidationResult {
    const issues = [];

    // 1. 检查危险命令
    for (const dangerous of this.DANGEROUS_COMMANDS) {
      if (command.includes(dangerous)) {
        issues.push({
          severity: 'high',
          message: `Contains dangerous command: ${dangerous}`,
          suggestion: 'Consider using safer alternative'
        });
      }
    }

    // 2. 检查命令注入
    if (this.hasCommandInjection(command)) {
      issues.push({
        severity: 'critical',
        message: 'Possible command injection detected',
        suggestion: 'Use parameterized tools instead'
      });
    }

    // 3. 检查路径遍历
    if (this.hasPathTraversal(command)) {
      issues.push({
        severity: 'high',
        message: 'Path traversal attempt detected',
        suggestion: 'Use absolute paths or validate input'
      });
    }

    // 4. 检查管道到 shell
    if (command.includes('|') &&
        command.match(/\|\s*(sh|bash|zsh)/)) {
      issues.push({
        severity: 'medium',
        message: 'Piping to shell detected',
        suggestion: 'Use explicit tool instead'
      });
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  private hasCommandInjection(command: string): boolean {
    // 检查 $(...), `...`, 未引用的变量
    return /\$\(|`|\$\{[^}]*\}[^(]/.test(command);
  }

  private hasPathTraversal(command: string): boolean {
    // 检查 ../, ~/等
    return /\.\.\/|~\/|\$HOME|\$USER/.test(command);
  }
}
```

---

## 🌐 MCP 扩展机制

### MCP 工具自动注册

```typescript
// src/mcp/mcp-tool-adapter.ts

class MCPToolAdapter {
  async registerMCP Servers(servers: MCPServer[]): Promise<void> {
    for (const server of servers) {
      const tools = await server.listTools();

      for (const tool of tools) {
        // 将 MCP 工具包装为标准工具
        const wrappedTool = {
          name: `${server.name}.${tool.name}`,
          description: tool.description,
          schema: this.mcpSchemaToZod(tool.inputSchema),
          execute: async (input) => {
            return await server.callTool(tool.name, input);
          },
          permission: 'user_config',
          source: 'mcp'
        };

        toolRegistry.register(wrappedTool);
      }
    }
  }

  private mcpSchemaToZod(mcpSchema: any): z.ZodType {
    // MCP JSON Schema → Zod Schema
    return z.object(
      Object.fromEntries(
        Object.entries(mcpSchema.properties || {}).map(
          ([key, prop]) => [
            key,
            this.jsonSchemaTypeToZod(prop)
          ]
        )
      )
    );
  }
}
```

### MCP 工具执行

```typescript
// 执行 MCP 工具时
async function executeMCPTool(
  serverName: string,
  toolName: string,
  args: object
): Promise<ToolResult> {
  const server = mcpRegistry.get(serverName);
  if (!server) {
    throw new Error(`MCP server not found: ${serverName}`);
  }

  // 调用 MCP 工具
  const result = await server.callTool(toolName, args);

  return {
    success: true,
    data: result.data,
    server: serverName,
    tool: toolName
  };
}
```

---

## 🎨 工具设计模式

### 1️⃣ **纯函数工具**

```typescript
// 无副作用的工具
const GrepTool = {
  name: 'grep',
  schema: z.object({
    pattern: z.string(),
    path: z.string().optional()
  }),
  execute: async ({ pattern, path }) => {
    const results = await rg(pattern, path || '.');
    return {
      matches: results,
      count: results.length
    };
  }
};
```

### 2️⃣ **副作用工具**

```typescript
// 有副作用的工具（需要权限）
const WriteTool = {
  name: 'write',
  schema: z.object({
    path: z.string(),
    content: z.string()
  }),
  execute: async ({ path, content }) => {
    await fs.writeFile(path, content, 'utf-8');
    return {
      success: true,
      path,
      bytesWritten: content.length
    };
  }
};
```

### 3️⃣ **复合工具**

```typescript
// 组合多个操作的工具
const DeployTool = {
  name: 'deploy',
  schema: z.object({
    service: z.string(),
    environment: z.enum(['dev', 'staging', 'prod'])
  }),
  execute: async ({ service, environment }) => {
    // 1. 验证配置
    await validateConfig(service);

    // 2. 运行测试
    await runTests(service);

    // 3. 构建
    await build(service);

    // 4. 部署
    await deploy(service, environment);

    return {
      success: true,
      url: `https://${service}.${environment}.example.com`
    };
  }
};
```

---

## 📊 性能优化

### 1️⃣ **并行工具执行**

```typescript
// Claude 可以同时调用多个工具
async function executeParallelToolCalls(
  toolCalls: ToolCall[]
): Promise<ToolResult[]> {
  // 并行执行所有工具调用
  const results = await Promise.allSettled(
    toolCalls.map(call => executeToolCall(call, context))
  );

  return results.map((result, i) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        error: result.reason.message,
        tool: toolCalls[i].name
      };
    }
  });
}
```

### 2️⃣ **工具结果缓存**

```typescript
class ToolResultCache {
  private cache = new Map<string, ToolResult>();

  async execute(
    tool: Tool,
    input: object,
    options?: { cache?: boolean }
  ): Promise<ToolResult> {
    // 检查缓存
    if (options?.cache !== false) {
      const key = this.getCacheKey(tool.name, input);
      const cached = this.cache.get(key);
      if (cached) {
        console.log(`🎯 Cache hit: ${tool.name}`);
        return cached;
      }
    }

    // 执行工具
    const result = await tool.execute(input);

    // 缓存结果
    if (options?.cache !== false) {
      const key = this.getCacheKey(tool.name, input);
      this.cache.set(key, result);
    }

    return result;
  }

  private getCacheKey(toolName: string, input: object): string {
    return `${toolName}:${JSON.stringify(input)}`;
  }
}
```

### 3️⃣ **延迟加载**

```typescript
// 只在需要时加载工具
class LazyToolLoader {
  private loadedTools = new Set<string>();

  async getTool(name: string): Promise<Tool> {
    if (this.loadedTools.has(name)) {
      return toolRegistry.get(name);
    }

    // 动态导入
    const module = await import(`./tools/${name}.ts`);
    const tool = module.default || module[name];

    // 注册工具
    toolRegistry.register(tool);
    this.loadedTools.add(name);

    return tool;
  }
}
```

---

## 💡 对 Deployment Kit 的启发

### 1️⃣ **工具定义模板**

```typescript
// deployment-kit/tools/generate-xac.ts

export const GenerateXacTool = {
  name: 'generate_xac',
  description: 'Generate XaC code from business specifications',

  // Zod schema 验证
  schema: z.object({
    service_type: z.enum(['web', 'batch', 'microservice']),
    qps: z.number().positive().optional().describe('Expected QPS'),
    dau: z.number().positive().optional().describe('Daily active users'),
    storage_required: z.boolean().optional().describe('Storage needed'),
    environment: z.enum(['dev', 'test', 'prod']).default('dev')
  }),

  // 权限
  permission: 'always_allow',  // 生成代码不危险

  // 执行
  execute: async ({ service_type, qps, dau, storage_required, environment }) => {
    // 1. 分析业务规格
    const spec = await analyzeBusinessSpecs({
      service_type,
      qps,
      dau,
      storage_required
    });

    // 2. 选择资源
    const resources = await selectResources(spec);

    // 3. 生成 XaC 代码
    const xacCode = await generateXaCCode(resources);

    // 4. 验证语法
    const validation = await validateSyntax(xacCode);

    return {
      success: validation.valid,
      spec,
      xac_code: xacCode,
      validation,
      next_steps: [
        'Review the generated XaC code',
        'Run validate_plan to see execution plan',
        'Deploy to test environment'
      ]
    };
  }
};
```

### 2️⃣ **权限分级**

```typescript
// deployment-kit/permissions.ts

export const DEPLOYMENT_KIT_PERMISSIONS = {
  // 安全操作
  'validate_plan': 'always_allow',
  'validate_syntax': 'always_allow',
  'check_compliance': 'always_allow',

  // 需要确认
  'generate_xac': 'always_allow',
  'update_xac': 'always_ask',
  'test_deploy': 'always_ask',

  // 高风险操作
  'deploy_canary': 'always_ask',
  'deploy_production': 'always_ask',

  // 危险操作
  'delete_resources': 'block',
  'rollback_deployment': 'always_ask'
};
```

### 3️⃣ **工具注册**

```typescript
// deployment-kit/index.ts

import { ToolRegistry } from './core/tool-registry';
import * as tools from './tools';

const registry = new ToolRegistry();

// 注册所有 Deployment Kit 工具
registry.registerAll([
  tools.GenerateXacTool,
  tools.UpdateXacTool,
  tools.ValidatePlanTool,
  tools.ValidateSyntaxTool,
  tools.CheckComplianceTool,
  tools.TestDeployTool,
  tools.DeployCanaryTool,
  tools.DeployProductionTool,
  tools.EvaluateCanaryTool,
  tools.RollbackDeploymentTool,
  tools.AnalyzeFailureTool
]);

// 导出工具 Schema（用于 prompt）
export const toolSchemas = registry.getAllSchemas();
```

### 4️⃣ **MCP 扩展**

```typescript
// deployment-kit/mcp/huawei-cloud.ts

export class HuaweiCloudMCPAdapter {
  async registerTools(registry: ToolRegistry): Promise<void> {
    const huaweiTools = [
      {
        name: 'huawei_create_ecs',
        description: 'Create ECS instance',
        schema: z.object({
          instance_type: z.string(),
          image_id: z.string(),
          flavor_id: z.string()
        }),
        execute: async (input) => {
          return await huaweiClient.createECS(input);
        }
      },
      {
        name: 'huawei_create_elb',
        description: 'Create load balancer',
        schema: z.object({
          type: z.enum(['classic', 'enhanced']),
          bandwidth: z.number()
        }),
        execute: async (input) => {
          return await huaweiClient.createELB(input);
        }
      }
      // ... 更多华为云工具
    ];

    // 注册为 MCP 工具
    for (const tool of huaweiTools) {
      registry.register({
        ...tool,
        source: 'mcp',
        server: 'huawei-cloud',
        permission: 'user_config'
      });
    }
  }
}
```

---

## 🎯 总结

### Claude Code 工具系统的核心优势

1. **类型安全**：Zod v4 确保参数验证
2. **权限分层**：5 种模式灵活控制
3. **无限扩展**：MCP 支持任意工具
4. **性能优化**：并行执行、缓存、延迟加载
5. **安全优先**：7,000+ 行 Bash 安全代码

### Deployment Kit 可以借鉴

| 特性 | Claude Code | Deployment Kit |
|------|-------------|----------------|
| **Schema 验证** | Zod v4 | Zod v4 |
| **权限模式** | 5 种 | 5 种（类似） |
| **MCP 扩展** | ✅ | ✅（华为云 MCP） |
| **并行执行** | ✅ | ✅ |
| **结果缓存** | ✅ | ✅（XaC 代码） |
| **延迟加载** | ✅ | ✅（按需加载场景） |

### 下一步行动

1. ✅ 使用 Zod 定义工具 Schema
2. ✅ 实现 5 层权限系统
3. ✅ 添加华为云 MCP 支持
4. ✅ 实现工具结果缓存
5. ✅ 添加安全验证

---

**参考资料**:
- [decode-claude-code Chapter 03](https://github.com/agenmod/decode-claude-code)
- [Zod Documentation](https://zod.dev/)
- [MCP Specification](https://modelcontextprotocol.io/)
