# Superpowers 启动信息收集机制深度分析

**分析日期**: 2026-03-30
**核心发现**: Superpowers **并没有从 IDE 收集运行时信息**

---

## 🎯 核心结论

### ❌ Superpowers 没有做的事情

1. ❌ **不扫描项目文件**（pom.xml, package.json 等）
2. ❌ **不检查运行时环境**（Java 版本、Maven 版本等）
3. ❌ **不读取 IDE 配置**（IDEA 设置、.vscode 等）
4. ❌ **不收集系统信息**（OS、PATH、环境变量等）
5. ❌ **不分析依赖关系**（Maven dependencies, npm modules 等）

### ✅ Superpowers 实际做的事情

只做了一件简单的事情：
```
读取静态文件 → 注入到会话上下文
```

---

## 📋 实际实现分析

### 1️⃣ Hook 触发机制

#### Cursor 配置 ([`hooks/hooks-cursor.json`](https://github.com/obra/superpowers/blob/master/hooks/hooks-cursor.json))

```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [
      {
        "command": "./hooks/session-start"
      }
    ]
  }
}
```

#### Claude Code 配置 ([`hooks/hooks.json`](https://github.com/obra/superpowers/blob/master/hooks/hooks.json))

```json
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
```

**触发时机**：
- Cursor: 会话开始（sessionStart）
- Claude Code: 启动/清空/压缩对话时

### 2️⃣ Session-Start 脚本分析

[`hooks/session-start`](https://github.com/obra/superpowers/blob/master/hooks/session-start) 的完整工作流程：

```bash
#!/usr/bin/env bash

# === 步骤 1: 确定插件根目录 ===
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# === 步骤 2: 检查旧的技能目录（废弃警告） ===
warning_message=""
legacy_skills_dir="${HOME}/.config/superpowers/skills"
if [ -d "$legacy_skills_dir" ]; then
    warning_message="⚠️ WARNING: Superpowers now uses Claude Code's skills system..."
fi

# === 步骤 3: 读取 using-superpowers 技能内容 ===
using_superpowers_content=$(cat "${PLUGIN_ROOT}/skills/using-superpowers/SKILL.md")

# === 步骤 4: JSON 转义 ===
escape_for_json() {
    local s="$1"
    s="${s//\\/\\\\}"        # 转义反斜杠
    s="${s//\"/\\\"}"        # 转义双引号
    s="${s//$'\n'/\\n}"      # 转义换行符
    s="${s//$'\r'/\\r}"      # 转义回车符
    s="${s//$'\t'/\\t}"      # 转义制表符
    printf '%s' "$s"
}

# === 步骤 5: 组装会话上下文 ===
session_context="<EXTREMELY_IMPORTANT>
You have superpowers.

**Below is the full content of your 'superpowers:using-superpowers' skill:**

${using_superpowers_content}

${warning_message}
</EXTREMELY_IMPORTANT>"

# === 步骤 6: 输出 JSON（根据平台选择格式） ===
if [ -n "${CURSOR_PLUGIN_ROOT:-}" ]; then
  # Cursor 格式
  printf '{"additional_context": "%s"}\n' "$session_context"
elif [ -n "${CLAUDE_PLUGIN_ROOT:-}" ]; then
  # Claude Code 格式
  printf '{"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "%s"}}\n' "$session_context"
else
  # 其他平台（后备）
  printf '{"additional_context": "%s"}\n' "$session_context"
fi

exit 0
```

### 3️⃣ 收集的信息内容

**只收集了 2 项静态信息**：

| 信息项 | 来源 | 用途 |
|-------|------|------|
| **using-superpowers 技能内容** | `skills/using-superpowers/SKILL.md` | 注入技能使用指南 |
| **废弃警告** | 检查 `~/.config/superpowers/skills` 是否存在 | 提醒用户迁移 |

**示例输出**：
```json
{
  "additional_context": "<EXTREMELY_IMPORTENT>\nYou have superpowers.\n\n**Below is the full content of your 'superpowers:using-superpowers' skill:**\n\n# Using Superpowers\n\nSuperpowers are skills - proven workflows and techniques...\n\n</EXTREMELY_IMPORTANT>"
}
```

---

## 🔍 为什么不收集运行时信息？

### 设计理念分析

#### 1️⃣ **保持简单**

```diff
- 复杂的环境扫描
- 平台特定的配置读取
- 依赖关系分析
- 运行时版本检测

+ 静态文件读取
+ 跨平台兼容
+ 快速执行（< 100ms）
+ 可预测的行为
```

#### 2️⃣ **避免敏感信息**

```bash
# ❌ 不收集这些敏感信息
- 环境变量（API keys, tokens）
- 系统路径（用户名、机器名）
- 网络配置（IP 地址、代理）
- 凭证文件（~/.aws/credentials, ~/.m2/settings.xml）
```

#### 3️⃣ **技能按需加载**

```
不是在启动时收集所有信息，
而是在需要时通过 Skill 工具加载：

Agent: "我需要 TDD 指导"
   ↓
使用 Skill 工具加载 test-driven-development
   ↓
获得完整的 TDD 工作流程
```

---

## 💡 与用户期望的对比

### 用户期望的启动信息收集

```
用户期望：
├─ Java 项目信息
│  ├─ pom.xml 解析
│  ├─ 依赖列表
│  ├─ Java 版本
│  └─ Maven 配置
├─ 运行时环境
│  ├─ JAVA_HOME
│  ├─ M2_HOME
│  └─ PATH 配置
└─ IDE 配置
   ├─ IntelliJ IDEA 设置
   ├─ 运行配置
   └─ 调试配置
```

### Superpowers 实际收集的

```
Superpowers 实际：
└─ 插件内的静态文件
   └─ skills/using-superpowers/SKILL.md
```

**差距**：巨大！

---

## 🎯 如何实现运行时信息收集？

### 方案 1：增强 Session-Start Hook

修改 `hooks/session-start` 脚本，添加环境检测：

```bash
#!/usr/bin/env bash
# Enhanced session-start hook with runtime context

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# === 新增：收集项目上下文 ===
project_context=""

# 检测项目类型
if [ -f "pom.xml" ]; then
    project_type="Java Maven"
    # 读取 Java 版本
    java_version=$(java -version 2>&1 | head -n 1)
    # 读取 Maven 版本
    maven_version=$(mvn -version 2>&1 | head -n 1)
    # 检查本地仓库
    m2_repo="${HOME}/.m2/repository"
    m2_size=$(du -sh "$m2_repo" 2>/dev/null | cut -f1)

    project_context="
**Project Type**: Java Maven
**Java**: ${java_version}
**Maven**: ${maven_version}
**Local Repository**: ${m2_repo} (${m2_size})
"

elif [ -f "package.json" ]; then
    project_type="Node.js"
    node_version=$(node -v)
    npm_version=$(npm -v)

    project_context="
**Project Type**: Node.js
**Node**: ${node_version}
**NPM**: ${npm_version}
"

elif [ -f "requirements.txt" ] || [ -f "setup.py" ]; then
    project_type="Python"
    python_version=$(python --version)
    pip_version=$(pip --version)

    project_context="
**Project Type**: Python
**Python**: ${python_version}
**Pip**: ${pip_version}
"
fi

# 读取 using-superpowers 内容
using_superpowers_content=$(cat "${PLUGIN_ROOT}/skills/using-superpowers/SKILL.md")

# 组装最终上下文
session_context="<EXTREMELY_IMPORTENT>
You have superpowers.

**Project Runtime Context**:${project_context}

**Below is the full content of your 'superpowers:using-superpowers' skill:**

${using_superpowers_content}
</EXTREMELY_IMPORTENT>"

# 输出 JSON
printf '{"additional_context": "%s"}\n' "$session_context"
```

### 方案 2：创建环境检测技能

创建 `skills/diagnose-environment/SKILL.md`：

```markdown
---
name: diagnose-environment
description: Use when encountering environment issues - Automatically detect and diagnose project runtime environment
---

# Diagnose Environment

This skill helps you diagnose project environment issues automatically.

## What It Does

1. **Detects project type**: Java, Node.js, Python, etc.
2. **Checks runtime versions**: Java, Maven, Node, npm, Python, pip
3. **Verifies dependencies**: Checks if dependencies are installed
4. **Identifies common issues**:
   - Missing JAVA_HOME
   - Corrupted Maven local repository
   - npm dependency conflicts
   - Python virtual environment issues

## How to Use

**User**: "I can't build this Java project"
**Agent**:
1. Loads diagnose-environment skill
2. Runs environment checks
3. Identifies issue: "JAVA_HOME not set"
4. Provides solution: "Set JAVA_HOME=/usr/lib/jvm/java-11"
5. Verifies fix
6. Builds successfully

## Supporting Tools

- `scripts/check-java.sh` - Java environment check
- `scripts/check-maven.sh` - Maven environment check
- `scripts/check-node.sh` - Node.js environment check
```

### 方案 3：IDE 集成（高级）

**对于 IntelliJ IDEA**：

创建 IDEA 插件，通过 Project API 收集信息：

```java
// IntelliJ IDEA Plugin
public class SuperpowersProjectComponent implements ProjectComponent {
    @Override
    public void projectOpened() {
        Project project = getProject();

        // 收集项目信息
        ProjectContext context = new ProjectContext();
        context.setProjectType(detectProjectType(project));
        context.setJavaVersion(getJavaVersion(project));
        context.setMavenVersion(getMavenVersion(project));
        context.setDependencies(getDependencies(project));

        // 注入到 Agent 会话
        AgentSession.getInstance().injectContext(context);
    }

    private String detectProjectType(Project project) {
        if (project.getBaseDir().findChild("pom.xml") != null) {
            return "Maven";
        } else if (project.getBaseDir().findChild("build.gradle") != null) {
            return "Gradle";
        }
        return "Unknown";
    }

    private String getJavaVersion(Project project) {
        JavaSdkExtension javaExt = project.getExtension(JavaSdkExtension.class);
        if (javaExt != null) {
            Sdk sdk = javaExt.getSdk();
            if (sdk != null) {
                return sdk.getVersionString();
            }
        }
        return "Unknown";
    }

    private List<Dependency> getDependencies(Project project) {
        MavenProject mavenProject = project.getComponent(MavenProject.class);
        if (mavenProject != null) {
            return mavenProject.getDependencies();
        }
        return Collections.emptyList();
    }
}
```

---

## 📊 方案对比

| 方案 | 优点 | 缺点 | 实现难度 |
|------|------|------|---------|
| **增强 Session Hook** | ✅ 自动执行<br>✅ 无需手动调用 | ⚠️ 只能收集基础信息 | 🟢 简单 |
| **环境检测技能** | ✅ 按需执行<br>✅ 详细诊断 | ❌ 需要手动调用 | 🟡 中等 |
| **IDE 插件集成** | ✅ 完整信息<br>✅ 深度集成 | ❌ 平台特定<br>❌ 维护成本高 | 🔴 复杂 |

---

## 🎯 对 Deployment Kit 的建议

### 推荐方案：增强 Session Hook + 环境检测技能

#### 1. 基础层：Session Hook 自动收集

```javascript
// .opencode/plugin/deployment-kit.js

export const DeploymentKitPlugin = async ({ client, directory, $ }) => {
  return {
    'session.started': async () => {
      // 收集基础运行时信息
      const runtimeContext = await collectRuntimeContext(directory);

      return {
        context: `<EXTREMELY_IMPORTENT>
You have Deployment Kit capabilities.

**Runtime Environment**:
${runtimeContext}

**HEAM Protocol**:
...
</EXTREMELY_IMPORTENT>`
      };
    }
  };
};

async function collectRuntimeContext(projectDir) {
  const exec = require('child_process').execSync;
  let context = '';

  // 检测项目类型
  if (fs.existsSync(path.join(projectDir, 'pom.xml'))) {
    try {
      const javaVersion = exec('java -version', { encoding: 'utf8' });
      const mavenVersion = exec('mvn -version', { encoding: 'utf8' });
      context += `- Project: Java Maven\n`;
      context += `- Java: ${parseVersion(javaVersion)}\n`;
      context += `- Maven: ${parseVersion(mavenVersion)}\n`;
    } catch (e) {
      context += `- ⚠️ Java/Maven not found in PATH\n`;
    }
  }

  // 检查云平台 CLI
  try {
    const hcloudVersion = exec('hcloud version', { encoding: 'utf8' });
    context += `- Huawei Cloud CLI: installed\n`;
  } catch (e) {
    context += `- ⚠️ Huawei Cloud CLI: not installed\n`;
    context += `- Install: pip install hcloud\n`;
  }

  return context;
}
```

#### 2. 进阶层：环境诊断技能

```markdown
---
name: diagnose-deployment-environment
description: Use when deployment fails - Diagnose cloud platform and deployment environment
---

# Diagnose Deployment Environment

Automatically checks:
- Cloud platform CLI installation
- Credential configuration
- Network connectivity
- Resource availability

**Usage**: Agent will automatically use this when deployment fails
```

#### 3. 高级层：IDE 集成（可选）

如果需要深度集成，可以考虑 IDEA/VSCode 插件。

---

## 📝 总结

### 核心发现

1. **Superpowers 不收集运行时信息**：
   - 只读取静态文件（using-superpowers 技能）
   - 不扫描项目、不检查环境、不读取 IDE 配置
   - 设计理念：保持简单、避免敏感信息、技能按需加载

2. **用户的需求是合理的**：
   - Agent 确实需要运行时信息才能自主 debug
   - Java/Maven 环境信息对构建至关重要
   - IDE 配置信息有助于理解项目结构

3. **解决方案有多种选择**：
   - **简单**：增强 Session Hook（自动收集基础信息）
   - **中等**：环境检测技能（按需详细诊断）
   - **复杂**：IDE 插件集成（完整信息）

### 对 Deployment Kit 的启示

Deployment Kit **应该**收集运行时信息：
- ✅ 云平台 CLI 状态
- ✅ 凭证配置检查
- ✅ 网络连接测试
- ✅ 项目类型检测
- ✅ 部署历史分析

这样 Agent 才能：
- 自主诊断部署失败原因
- 自动修复环境问题
- 减少人工介入

---

**参考资料**:
- [Superpowers session-start hook](https://github.com/obra/superpowers/blob/master/hooks/session-start)
- [Claude Code hooks documentation](https://docs.anthropic.com/claude-code/hooks)
- [OpenCode plugin API](https://opencode.ai/docs/plugins)
