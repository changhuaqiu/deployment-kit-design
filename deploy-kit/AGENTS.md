# Deployment Kit - Agent 指南

> **重要**：这是一份约100行的"地图"，用于快速理解 Deployment Kit。详细信息请参考 `docs/` 目录。

---

## 🎯 我是什么？

**Deployment Kit** 是华为HIS XaC部署自动化套件，专为智能体优化设计。

**核心特点**：
- ✅ 技能化：将部署流程分解为可组合的技能（20个技能）
- ✅ 可编排：通过编排器灵活组合技能
- ✅ Agent友好：项目级数据存储（`.deployment-kit/`）
- ✅ 独立套件：CLI工具，可独立运行

---

## 🚀 30秒快速开始

```bash
# 1. 发现现网资源
dk discover --appid <appid>

# 2. 生成 XaC 代码
dk generate-xac --appid <appid>

# 3. 部署到测试环境
dk deploy --appid <appid> --environment test
```

**完整工作流**：
```bash
dk workflow new-user --appid <appid>  # 一键完成所有步骤
```

---

## 📂 项目结构（智能体视角）

```
my-app/                           # 应用仓库
├── .deployment-kit/              # 👈 智能体专用数据目录
│   ├── cache/                    # 资源缓存
│   │   └── {appid}/
│   │       ├── manifest.json     # 资源清单
│   │       ├── resources.json    # 详细资源
│   │       └── metadata.json     # 缓存元数据（版本+校验和）
│   ├── state.json                # 项目状态（支持断点续传）
│   └── dependencies.json         # 依赖关系
│
├── xac/                          # 👈 XaC 代码（智能体生成/管理）
│   ├── main.yaml                 # 主入口
│   ├── app/                      # 应用特定资源
│   │   ├── ads.tf                # ADS集群
│   │   ├── config.tf             # 配置资源
│   │   └── vpc.tf                # 网络资源
│   └── outputs.tf                # 输出定义
│
├── AGENTS.md                     # 👈 本文件（智能体地图）
│
└── deployment-kit-design/        # 详细文档（记录系统）
    └── docs/
        ├── quickstart.md         # 📖 详细快速开始
        ├── skills.md             # 📖 20个技能完整文档
        ├── scenarios.md          # 📖 使用场景说明
        └── troubleshooting.md    # 📖 问题排查
```

---

## 🔑 核心概念（最小集合）

| 概念 | 说明 |
|------|------|
| **XaC** | HEAM协议的表现形式，描述基础设施的代码 |
| **Skill** | 可独立执行并组合的部署单元（20个） |
| **Workflow** | 由多个技能组成的完整部署流程 |
| **Orchestrator** | 协调技能执行的核心引擎 |
| **Cache** | 资源数据缓存，避免重复MCP调用 |
| **Dependencies** | 资源间的依赖关系（人工+自动提取） |

---

## 🤔 常见问题（智能体会遇到）

### Q1: 如何判断缓存是否有效？

```bash
# 查看缓存状态
dk cache status --appid <appid>

# 输出示例：
# ✓ 缓存有效
#   创建时间: 2026-03-28 10:30:00
#   过期时间: 2026-03-28 11:30:00
#   版本: HEAM=1.2.0, Terraform=1.5.7
#   校验和: sha256:abc123...
```

**手动检查**：
```bash
# 查看 metadata.json
cat .deployment-kit/cache/<appid>/metadata.json

# 关键字段：
# - expires_at: 过期时间
# - versions.heam_protocol: HEAM版本
# - integrity.state_hash: 状态哈希
```

### Q2: 如何理解/编辑依赖关系？

```bash
# 编辑依赖关系
dk dependencies edit --appid <appid>

# 这会打开编辑器，格式如下：
{
  "dependencies": [
    {
      "id": "dep-001",
      "type": "explicit",
      "description": "应用依赖ADS集群",
      "depends_on": [
        {
          "resource_type": "ads",
          "resource_id": "ads-001",
          "relationship": "application_runs_on"
        }
      ]
    }
  ]
}
```

### Q3: XaC代码生成失败怎么办？

**常见原因**：
1. 缓存不存在 → 运行 `dk discover --appid <appid>`
2. 依赖关系未定义 → 运行 `dk dependencies edit --appid <appid>`
3. MCP服务异常 → 检查MCP服务状态

**调试命令**：
```bash
# 查看详细日志
dk logs --skill generate-xac

# 诊断问题
dk diagnose --appid <appid>
```

### Q4: 如何调试部署问题？

```bash
# 1. 查看部署状态
dk status --appid <appid>

# 2. 查看部署日志
dk logs --skill deploy-production

# 3. 运行诊断
dk diagnose --appid <appid> --full

# 4. 验证配置
dk validate-plan --appid <appid> --dry-run
```

### Q5: 智能体如何长时间运行？

**断点续传支持**：
```bash
# 工作流会自动保存状态
dk workflow new-user --appid <appid>

# 如果中断，可以恢复
dk workflow resume

# 查看恢复点
dk status --verbose
```

---

## ⚠️ 关键约束（智能体必须遵守）

### 1. 不绕过编排器
❌ **错误**：技能直接调用MCP服务
✅ **正确**：技能通过编排器调用MCP

### 2. 数据不可变性
❌ **错误**：技能直接修改缓存文件
✅ **正确**：技能返回数据，编排器负责缓存

### 3. 版本管理
✅ **要求**：所有缓存数据必须包含版本号和校验和
```json
{
  "versions": {
    "heam_protocol": "1.2.0",
    "terraform": "1.5.7"
  },
  "integrity": {
    "state_hash": "sha256:abc123..."
  }
}
```

### 4. 错误必须分类
✅ **要求**：每个错误必须指定类型
- `MCPConnectionError`: MCP连接失败（可重试）
- `MCPTimeoutError`: MCP超时（可重试）
- `ValidationError`: 验证失败（不可重试）
- `CacheError`: 缓存错误（可刷新）

---

## 🔗 深入阅读（按需查询）

| 需求 | 文档 |
|------|------|
| 需要完整技能文档？ | `docs/skills.md` |
| 需要架构理解？ | `docs/architecture.md` |
| 需要场景参考？ | `docs/scenarios.md` |
| 遇到问题？ | `docs/troubleshooting.md` |
| 需要API参考？ | `docs/api/cli-reference.md` |

---

## 📊 项目状态查询

```bash
# 查看整体状态
dk status

# 查看缓存状态
dk cache status --appid <appid>

# 查看依赖关系
dk dependencies list --appid <appid>

# 查看工作流状态
dk workflow list
```

---

## 🎯 20个技能速览

### 核心技能（9个）
| 技能 | 功能 | CLI命令 |
|------|------|---------|
| discover-resources | 发现现网资源 | `dk discover --appid <appid>` |
| generate-xac | 生成XaC代码 | `dk generate-xac --appid <appid>` |
| update-xac | 更新XaC代码 | `dk update-xac --appid <appid>` |
| validate-syntax | 语法校验 | `dk validate-syntax` |
| validate-plan | 计划验证 | `dk validate-plan --appid <appid>` |
| test-deploy | 测试环境部署 | `dk deploy --appid <appid> --environment test` |
| deploy-production | 生产环境部署 | `dk deploy --appid <appid> --environment prod` |
| analyze-failure | 分析部署失败 | `dk analyze-failure --appid <appid>` |
| evaluate-canary | 评估灰度效果 | `dk evaluate-canary --appid <appid>` |

### 质量技能（4个）
| 技能 | 功能 | CLI命令 |
|------|------|---------|
| review-code | XaC代码审查 | `dk review-code` |
| check-compliance | 合规检查 | `dk check-compliance --appid <appid>` |
| monitor-deployment | 部署监控 | `dk monitor --deployment <id>` |
| monitor-resources | 资源监控 | `dk monitor --resources --appid <appid>` |

### 管理技能（2个）
| 技能 | 功能 | CLI命令 |
|------|------|---------|
| manage-config | 配置管理 | `dk config <command>` |
| manage-version | 版本管理 | `dk version <command>` |

### 应急技能（5个）
| 技能 | 功能 | CLI命令 |
|------|------|---------|
| diagnose-error | 错误诊断 | `dk diagnose --appid <appid>` |
| auto-fix | 自动修复 | `dk auto-fix --appid <appid>` |
| rollback-deployment | 快速回滚 | `dk rollback --appid <appid>` |
| dry-run-rehearsal | 生产演练 | `dk rehearsal --appid <appid> --dry-run` |
| deploy-canary | 灰度部署 | `dk deploy --appid <appid> --canary` |

---

## 🛠️ 常用工作流

```bash
# 新用户首次部署
dk workflow new-user --appid <appid>

# 资源更新
dk workflow update-resources --appid <appid>

# 快速部署
dk quick-deploy --appid <appid>

# 生产部署（带演练）
dk workflow production-deploy --appid <appid> --with-rehearsal

# 紧急回滚
dk workflow emergency-rollback --appid <appid>
```

---

## 📞 获取帮助

```bash
# 查看帮助
dk --help

# 查看技能帮助
dk <skill> --help

# 查看工作流帮助
dk workflow --help
```

---

**最后更新**: 2026-03-28
**版本**: 1.0.0
**维护**: Deployment Kit 团队

**提示**: 这是一份"地图"，不是百科全书。详细信息请参考 `docs/` 目录。
