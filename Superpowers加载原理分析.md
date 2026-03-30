# Superpowers 加载到 OpenCode 的原理分析

**分析日期**: 2026-03-30
**分析目标**: 理解 obra/superpowers 如何作为插件加载到 OpenCode.ai
**参考仓库**: https://github.com/obra/superpowers

---

## 📋 目录

1. [加载流程](#1-加载流程)
2. [插件执行原理](#2-插件执行原理)
3. [核心机制](#3-核心机制)
4. [平台对比](#4-平台对比)
5. [对 Deployment Kit 的启发](#5-对-deployment-kit-的启发)
6. [关键要点](#6-关键要点)

---

## 1. 加载流程

### 1️⃣ 配置阶段

用户在 `opencode.json` 中配置插件：

```json
{
  "plugin": ["superpowers@git+https://github.com/obra/superpowers.git"]
}
```

### 2️⃣ 自动安装流程

```
OpenCode 启动
    ↓
读取 opencode.json
    ↓
发现 plugin 数组
    ↓
使用 Bun 从 git URL 克隆仓库
    ↓
安装到 Bun 插件目录
    ↓
读取 package.json 的 main 字段
    ↓
加载 .opencode/plugins/superpowers.js
    ↓
调用 SuperpowersPlugin 函数
```

### 3️⃣ 文件结构

```
superpowers/
├── lib/
│   └── skills-core.js           # 共享核心模块
├── .opencode/
│   ├── plugin/
│   │   └── superpowers.js       # OpenCode 插件入口
│   └── INSTALL.md
├── skills/                       # 技能目录
│   ├── brainstorming/
│   │   └── SKILL.md
│   ├── test-driven-development/
│   │   └── SKILL.md
│   └── using-superpowers/
│       └── SKILL.md
└── package.json
    {
      "main": ".opencode/plugin/superpowers.js"
    }
```

---

## 2. 插件执行原理

### 插件入口

[`package.json:4`](https://github.com/obra/superpowers/blob/master/package.json#L4) 定义了插件入口：

```json
{
  "name": "superpowers",
  "version": "5.0.6",
  "type": "module",
  "main": ".opencode/plugins/superpowers.js"
}
```

### 插件结构

根据 OpenCode 插件设计文档，插件的结构如下：

```javascript
// .opencode/plugins/superpowers.js

/**
 * Superpowers plugin for OpenCode.ai
 *
 * 提供自定义工具用于加载和发现技能，
 * 并在会话启动时自动注入 Bootstrap 上下文
 */

const skillsCore = require('../../lib/skills-core.js');
const path = require('path');
const fs = require('fs');
const { z } = require('zod');

export const SuperpowersPlugin = async ({ client, directory, $ }) => {
  // 技能目录路径
  const superpowersSkillsDir = path.join(
    process.env.HOME,
    '.config/opencode/superpowers/skills'
  );
  const personalSkillsDir = path.join(
    process.env.HOME,
    '.config/opencode/skills'
  );

  return {
    // === 1. Session Hooks ===
    'session.started': async () => {
      // 读取 using-superpowers 技能内容
      const usingSuperpowersPath = skillsCore.resolveSkillPath(
        'using-superpowers',
        superpowersSkillsDir,
        personalSkillsDir
      );

      let usingSuperpowersContent = '';
      if (usingSuperpowersPath) {
        const fullContent = fs.readFileSync(
          usingSuperpowersPath.skillFile,
          'utf8'
        );
        // 去除 frontmatter
        usingSuperpowersContent = stripFrontmatter(fullContent);
      }

      // 工具映射说明
      const toolMapping = `
**Tool Mapping for OpenCode:**
When skills reference tools you don't have, substitute OpenCode equivalents:
- \`TodoWrite\` → \`update_plan\` (your planning/task tracking tool)
- \`Task\` tool with subagents → Use OpenCode's subagent system (@mention syntax)
- \`Skill\` tool → \`use_skill\` custom tool (already available)
- \`Read\`, \`Write\`, \`Edit\`, \`Bash\` → Use your native tools

**Skill directories contain:**
- Scripts you can run with bash tool
- Additional documentation you can read
- Utilities and helpers specific to that skill
`;

      // 检查更新（非阻塞）
      const hasUpdates = skillsCore.checkForUpdates(
        path.join(process.env.HOME, '.config/opencode/superpowers')
      );

      const updateNotice = hasUpdates ?
        '\n\n⚠️ **Updates available!** Run `cd ~/.config/opencode/superpowers && git pull`' :
        '';

      // 返回要注入到会话的上下文
      return {
        context: `<EXTREMELY_IMPORTANT>
You have superpowers.

**Below is the full content of your 'superpowers:using-superpowers' skill:**

${usingSuperpowersContent}

${toolMapping}${updateNotice}
</EXTREMELY_IMPORTANT>`
      };
    },

    // === 2. 自定义工具 ===
    tools: [
      {
        name: 'use_skill',
        description: 'Load and read a specific skill to guide your work. Skills contain proven workflows, mandatory processes, and expert techniques.',
        schema: z.object({
          skill_name: z.string().describe(
            'Name of the skill to load (e.g., "superpowers:brainstorming" or "my-custom-skill")'
          )
        }),
        execute: async ({ skill_name }) => {
          // 解析技能路径（处理覆盖：personal > superpowers）
          const resolved = skillsCore.resolveSkillPath(
            skill_name,
            superpowersSkillsDir,
            personalSkillsDir
          );

          if (!resolved) {
            return `Error: Skill "${skill_name}" not found.\n\nRun find_skills to see available skills.`;
          }

          // 读取技能内容
          const fullContent = fs.readFileSync(resolved.skillFile, 'utf8');
          const { name, description } = skillsCore.extractFrontmatter(
            resolved.skillFile
          );

          // 提取 frontmatter 之后的内容
          const content = stripFrontmatter(fullContent);
          const skillDirectory = path.dirname(resolved.skillFile);

          // 格式化输出（类似 Claude Code 的 Skill 工具）
          return `# ${name || skill_name}
# ${description || ''}
# Supporting tools and docs are in ${skillDirectory}
# ============================================

${content}`;
        }
      },

      {
        name: 'find_skills',
        description: 'List all available skills in the superpowers and personal skill libraries.',
        schema: z.object({}),
        execute: async () => {
          // 在两个目录中查找技能
          const superpowersSkills = skillsCore.findSkillsInDir(
            superpowersSkillsDir,
            'superpowers',
            3  // 最大递归深度
          );
          const personalSkills = skillsCore.findSkillsInDir(
            personalSkillsDir,
            'personal',
            3
          );

          // 合并并格式化技能列表
          const allSkills = [...personalSkills, ...superpowersSkills];

          if (allSkills.length === 0) {
            return 'No skills found. Install superpowers skills to ~/.config/opencode/superpowers/skills/';
          }

          let output = 'Available skills:\n\n';

          for (const skill of allSkills) {
            const namespace = skill.sourceType === 'personal' ? '' : 'superpowers:';
            const skillName = skill.name || path.basename(skill.path);

            output += `${namespace}${skillName}\n`;
            if (skill.description) {
              output += `  ${skill.description}\n`;
            }
            output += `  Directory: ${skill.path}\n\n`;
          }

          return output;
        }
      }
    ]
  };
};

// 辅助函数：去除 YAML frontmatter
function stripFrontmatter(content) {
  const lines = content.split('\n');
  let inFrontmatter = false;
  let frontmatterEnded = false;
  const contentLines = [];

  for (const line of lines) {
    if (line.trim() === '---') {
      if (inFrontmatter) {
        frontmatterEnded = true;
        continue;
      }
      inFrontmatter = true;
      continue;
    }

    if (frontmatterEnded || !inFrontmatter) {
      contentLines.push(line);
    }
  }

  return contentLines.join('\n').trim();
}
```

---

## 3. 核心机制

### 3.1 共享核心模块

**文件**: [`lib/skills-core.js`](https://github.com/obra/superpowers/blob/master/docs/plans/2025-11-22-opencode-support-design.md#L101)

这个模块被 Codex 和 OpenCode 共享，提供以下功能：

```javascript
module.exports = {
  /**
   * 解析 SKILL.md 的 YAML frontmatter
   * @param {string} filePath - SKILL.md 文件路径
   * @returns {{name: string, description: string}}
   */
  extractFrontmatter(filePath),

  /**
   * 递归查找目录中的所有 SKILL.md 文件
   * @param {string} dir - 要搜索的目录
   * @param {string} sourceType - 'personal' 或 'superpowers'
   * @param {number} maxDepth - 最大递归深度（默认 3）
   * @returns {Array<{path, name, description, sourceType}>}
   */
  findSkillsInDir(dir, sourceType, maxDepth = 3),

  /**
   * 解析技能名称到文件路径，处理覆盖（personal > superpowers）
   * @param {string} skillName - 技能名称（如 "superpowers:brainstorming"）
   * @param {string} superpowersDir - Superpowers 技能目录
   * @param {string} personalDir - 个人技能目录
   * @returns {{skillFile, sourceType, skillPath} | null}
   */
  resolveSkillPath(skillName, superpowersDir, personalDir),

  /**
   * 检查 git 仓库是否有更新可用
   * @param {string} repoDir - git 仓库路径
   * @returns {boolean} - 如果有更新返回 true
   */
  checkForUpdates(repoDir)
};
```

### 3.2 Session Hook 机制

```
session.started 事件触发
    ↓
执行插件中的 session.started 函数
    ↓
读取 using-superpowers 技能内容
    ↓
生成工具映射说明
    ↓
检查 Git 更新（非阻塞）
    ↓
返回 context 字段
    ↓
OpenCode 将 context 注入到每个会话的系统提示中
```

**注入的上下文示例**:

```markdown
<EXTREMELY_IMPORTANT>
You have superpowers.

**Below is the full content of your 'superpowers:using-superpowers' skill:**

# Using Superpowers

Superpowers are skills - proven workflows and techniques...

**Tool Mapping for OpenCode:**
When skills reference tools you don't have, substitute OpenCode equivalents:
...

</EXTREMELY_IMPORTANT>
```

### 3.3 技能发现机制

**目录优先级**:

```
~/.config/opencode/skills/                  (个人技能 - 高优先级)
    ↓ 覆盖同名技能
~/.config/opencode/superpowers/skills/      (Superpowers 技能 - 低优先级)
```

**技能格式** (SKILL.md):

```markdown
---
name: test-driven-development
description: Use when implementing features - TDD workflow with red-green-refactor cycle
---

# Test-Driven Development

[技能内容...]
```

**发现逻辑**:

1. 扫描个人技能目录（递归深度 3）
2. 扫描 Superpowers 技能目录（递归深度 3）
3. 查找每个子目录中的 `SKILL.md` 文件
4. 解析 YAML frontmatter 获取名称和描述
5. 个人技能会覆盖同名的 Superpowers 技能

---

## 4. 平台对比

| 平台 | 加载方式 | Hook 机制 | 技能发现 | 自定义工具 |
|------|---------|-----------|---------|-----------|
| **Claude Code** | 原生插件系统 | `experimental.chat.system.transform` | `~/.claude/skills/` | Skill 工具 |
| **Codex** | Bootstrap 脚本 + symlink | SessionStart hook (bash) | `~/.agents/skills/` (symlink) | CLI 命令 |
| **OpenCode** | Bun 插件管理 | `session.started` (JavaScript) | 配置路径 + 递归扫描 | 自定义 tools 数组 |

### Codex 加载方式（对比）

```bash
# 安装
git clone https://github.com/obra/superpowers.git ~/.codex/superpowers
mkdir -p ~/.agents/skills
ln -s ~/.codex/superpowers/skills ~/.agents/skills/superpowers

# Hook 文件
~/.codex/superpowers/hooks/hooks.json:
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd\" session-start",
            "async": false
          }
        ]
      }
    ]
  }
}

# Hook 执行脚本（bash）
hooks/session-start:
  - 读取 using-superpowers 技能
  - 输出 JSON 格式的 additional_context
  - 注入到会话中
```

---

## 5. 对 Deployment Kit 的启发

### 5.1 目录结构设计

如果要让 Deployment Kit 作为 OpenCode 插件：

```
deployment-kit/
├── lib/
│   └── core.js                        # 共享核心模块
├── .opencode/
│   ├── plugin/
│   │   └── deployment-kit.js          # OpenCode 插件入口
│   └── INSTALL.md                     # 安装指南
├── skills/                            # Deployment Kit 技能
│   ├── generate-xac/
│   │   └── SKILL.md
│   ├── validate-plan/
│   │   └── SKILL.md
│   ├── deploy-canary/
│   │   └── SKILL.md
│   ├── deploy-production/
│   │   └── SKILL.md
│   └── analyze-business-specs/
│       └── SKILL.md
└── package.json
    {
      "name": "deployment-kit",
      "version": "1.0.0",
      "type": "module",
      "main": ".opencode/plugin/deployment-kit.js"
    }
```

### 5.2 插件实现示例

```javascript
// .opencode/plugin/deployment-kit.js

const core = require('../../lib/core.js');
const path = require('path');
const fs = require('fs');
const { z } = require('zod');

export const DeploymentKitPlugin = async ({ client, directory, $ }) => {
  const kitSkillsDir = path.join(
    process.env.HOME,
    '.config/opencode/deployment-kit/skills'
  );

  return {
    // === Session Hook ===
    'session.started': async () => {
      // 检查环境配置
      const envConfig = checkEnvironment();

      // HEAM 协议说明
      const heamProtocol = `
**HEAM Protocol (Huawei HIS Environment Application Management):**

Deployment Kit uses the HEAM protocol to define resource applications and deployment actions.

**Key Concepts:**
- XaC (Everything as Code): Infrastructure as Code
- Three deployment scenarios:
  * Scenario A: New service from existing resources
  * Scenario B: Update existing service
  * Scenario C: Intelligent auto-deployment
`;

      // 可用工具列表
      const toolsList = `
**Available Deployment Kit Tools:**
- generate_xac: Generate XaC code from business specs
- validate_plan: Validate execution plan
- deploy_canary: Deploy to canary environment
- deploy_production: Deploy to production
- analyze_failure: Analyze deployment failures
`;

      return {
        context: `<EXTREMELY_IMPORTANT>
You have Deployment Kit capabilities.

${heamProtocol}

${toolsList}

Environment: ${envConfig.platform}
</EXTREMELY_IMPORTANT>`
      };
    },

    // === 自定义工具 ===
    tools: [
      {
        name: 'generate_xac',
        description: 'Generate XaC code from business specifications',
        schema: z.object({
          service_type: z.string(),
          qps: z.number().optional(),
          dau: z.number().optional(),
          storage_required: z.boolean().optional()
        }),
        execute: async ({ service_type, qps, dau, storage_required }) => {
          // 调用 Deployment Kit 核心逻辑
          const spec = core.analyzeBusinessSpecs({
            service_type,
            qps,
            dau,
            storage_required
          });

          const xacCode = core.generateXaC(spec);

          return {
            xac_code: xacCode,
            spec: spec,
            next_steps: [
              '1. Review the generated XaC code',
              '2. Run validate_plan to check execution plan',
              '3. Deploy to test environment'
            ]
          };
        }
      },

      {
        name: 'validate_plan',
        description: 'Validate XaC execution plan and show resource changes',
        schema: z.object({
          xac_code: z.string()
        }),
        execute: async ({ xac_code }) => {
          const validation = core.validatePlan(xac_code);

          return {
            valid: validation.valid,
            errors: validation.errors,
            resource_changes: validation.changes,
            cost_estimate: validation.cost,
            risk_assessment: validation.risks
          };
        }
      },

      {
        name: 'deploy_canary',
        description: 'Deploy service to canary environment',
        schema: z.object({
          xac_code: z.string(),
          percentage: z.number().default(5)
        }),
        execute: async ({ xac_code, percentage }) => {
          const deployment = core.deployCanary(xac_code, percentage);

          return {
            status: deployment.status,
            canary_url: deployment.url,
            monitoring: deployment.metrics,
            next_step: 'Run evaluate_canary after monitoring'
          };
        }
      },

      {
        name: 'deploy_production',
        description: 'Deploy service to production environment',
        schema: z.object({
          xac_code: z.string(),
          canary_eval: z.boolean().default(true)
        }),
        execute: async ({ xac_code, canary_eval }) => {
          if (canary_eval) {
            // 先执行灰度部署
            const canary = await core.deployCanary(xac_code, 5);
            const evalResult = await core.evaluateCanary(canary);

            if (!evalResult.passed) {
              return {
                status: 'aborted',
                reason: 'Canary evaluation failed',
                details: evalResult
              };
            }
          }

          const deployment = core.deployProduction(xac_code);

          return {
            status: deployment.status,
            production_url: deployment.url,
            deployment_id: deployment.id
          };
        }
      }
    ]
  };
};

// 辅助函数
function checkEnvironment() {
  // 检查华为云凭证、环境配置等
  return {
    platform: 'huawei-his',
    configured: true,
    region: 'cn-north-1'
  };
}
```

### 5.3 配置方式

```json
// opencode.json
{
  "plugin": [
    "deployment-kit@git+https://github.com/your-org/deployment-kit.git"
  ]
}
```

### 5.4 技能示例

**文件**: `skills/generate-xac/SKILL.md`

```markdown
---
name: generate-xac
description: Use when creating XaC code - Generate XaC code from business specifications
---

# Generate XaC Code

This skill helps you generate XaC (Everything as Code) code from business specifications.

## When to Use

- **Scenario A**: You have existing resources and want to generate standard XaC
- **Scenario C**: You have business requirements and want to auto-generate XaC

## Workflow

1. **Analyze business specs**:
   - Service type (web service, batch job, etc.)
   - Expected QPS (queries per second)
   - DAU (daily active users)
   - Storage requirements

2. **Generate XaC code**:
   - Use the `generate_xac` tool
   - Review the generated code
   - Adjust parameters if needed

3. **Validate execution plan**:
   - Use `validate_plan` tool
   - Review resource changes
   - Check cost estimate

4. **Deploy to test**:
   - Use `deploy_canary` with small percentage
   - Monitor metrics
   - Verify functionality

## Example

```
User: I need a web service with 5000 QPS for 100k users

Assistant: I'll generate XaC code for your web service.

[Uses generate_xac tool]

Generated XaC code includes:
- ECS instances: 4 cores, 8GB RAM
- Load balancer: 1000 Mbps
- Database: RDS MySQL 2C4G

Next: Run validate_plan to see the execution plan.
```

## Supporting Files

- `scripts/generate-xac.sh` - Shell script for XaC generation
- `templates/web-service.yaml` - XaC template for web services
- `docs/resource-selection.md` - Resource selection guide
```

---

## 6. 关键要点

### 6.1 OpenCode 插件系统特点

1. **使用 Bun 作为包管理器**
   - 可以从 git URL 自动安装插件
   - 支持版本锁定（branch 或 tag）

2. **插件必须导出一个函数**
   ```javascript
   export const PluginName = async ({ client, directory, $ }) => {
     return {
       'session.started': () => {},
       tools: []
     };
   };
   ```

3. **Session Hooks**
   - `session.started`: 在每个会话开始时触发
   - 返回 `{ context: string }` 注入到系统提示
   - 可以执行异步操作（检查更新、读取配置等）

4. **自定义工具**
   - 通过 `tools` 数组定义
   - 使用 Zod schema 验证参数
   - `execute` 函数包含实际逻辑
   - 可以调用任何 Node.js 模块

### 6.2 技能化组织的好处

1. **模块化**: 每个技能是一个独立的目录和文件
2. **可发现性**: 通过 `find_skills` 工具列出所有技能
3. **可扩展性**: 用户可以创建个人技能覆盖核心技能
4. **一致性**: 所有技能使用相同的 frontmatter 格式

### 6.3 共享核心模块的优势

1. **代码复用**: Codex 和 OpenCode 共享同一套核心逻辑
2. **维护性**: Bug 修复自动应用到所有平台
3. **一致性**: 确保技能解析在所有平台上行为一致
4. **可测试性**: 核心逻辑可以独立测试

### 6.4 Deployment Kit 可借鉴的设计

| 特性 | Superpowers | Deployment Kit 可用性 |
|------|-------------|---------------------|
| **插件系统** | Bun + git URL | ✅ 适合作为 OpenCode 插件 |
| **Session Hook** | 注入 Bootstrap 上下文 | ✅ 注入 HEAM 协议说明 |
| **自定义工具** | generate-xac, validate-plan | ✅ 完全匹配 |
| **技能化组织** | SKILL.md + frontmatter | ✅ 适合场景化能力组织 |
| **共享核心** | lib/skills-core.js | ✅ 可部署到多个平台 |
| **优先级覆盖** | 个人技能 > 核心技能 | ✅ 支持自定义覆盖 |

---

## 7. 总结

### 核心原理

1. **配置驱动**: 通过 `opencode.json` 配置插件
2. **自动安装**: Bun 从 git URL 自动克隆和安装
3. **模块化设计**: 共享核心 + 平台特定插件
4. **Hook 机制**: Session 注入上下文
5. **工具扩展**: 自定义工具数组
6. **技能发现**: 递归扫描 + YAML frontmatter

### 对 Deployment Kit 的价值

通过参考 Superpowers 的设计，Deployment Kit 可以：

- ✅ 作为 OpenCode 插件加载
- ✅ 提供自定义部署工具（generate-xac, validate-plan 等）
- ✅ 在会话启动时注入 HEAM 协议说明
- ✅ 支持技能化组织（场景 A/B/C）
- ✅ 跨平台复用核心逻辑
- ✅ 支持用户自定义覆盖

### 下一步行动

1. **创建 Deployment Kit 插件结构**
   - 实现 `lib/core.js` 共享核心
   - 实现 `.opencode/plugin/deployment-kit.js`
   - 创建技能目录和 SKILL.md 文件

2. **实现核心功能**
   - XaC 代码生成
   - 执行计划验证
   - 部署工具链

3. **测试和文档**
   - 在 OpenCode 中测试插件加载
   - 编写安装指南
   - 创建示例技能

---

**参考资料**:
- [Superpowers GitHub 仓库](https://github.com/obra/superpowers)
- [OpenCode 文档](https://opencode.ai/docs/)
- [OpenCode Support Design Document](https://github.com/obra/superpowers/blob/master/docs/plans/2025-11-22-opencode-support-design.md)
- [OpenCode Support Implementation Plan](https://github.com/obra/superpowers/blob/master/docs/plans/2025-11-22-opencode-support-implementation.md)
