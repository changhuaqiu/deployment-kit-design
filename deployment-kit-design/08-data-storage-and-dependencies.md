# 数据存储和依赖关系管理

## 文档概述

本文档详细说明 Deployment Kit 的数据存储结构和依赖关系管理机制，专门为 Agent 框架集成设计。

---

## 📁 数据存储架构

### 设计原则

参考 Superpowers 的设计模式，Deployment Kit 采用**项目级数据存储**：

```
✅ 技能定义：框架安装目录（只读）
✅ 全局配置：~/.deployment-kit/config/（可选）
✅ 项目数据：项目目录/.deployment-kit/（Agent工作区）
```

### 为什么采用项目级数据存储？

1. **Agent工作模式**：Agent在项目目录下工作，数据就近存储更方便
2. **数据隔离**：不同项目的数据完全隔离，避免冲突
3. **上下文保持**：数据跟随项目，Agent能更好理解上下文
4. **简化设计**：不需要考虑跨项目、版本管理等复杂问题

---

## 🗂️ 目录结构

### 完整目录结构

```
# 1. 技能定义（框架安装，只读）
~/.deployment-kit/skills/ 或 <框架路径>/skills/
├── discover-resources/
├── generate-xac/
├── validate-syntax/
├── validate-plan/
└── ...（20个技能）

# 2. 全局配置（可选）
~/.deployment-kit/
└── config/
    └── config.yaml               # MCP服务配置、用户偏好

# 3. 项目数据（Agent工作区）⭐
项目目录/
├── .deployment-kit/
│   ├── cache/
│   │   └── {appid}/
│   │       ├── manifest.json
│   │       ├── resources.json
│   │       └── metadata.json
│   ├── dependencies.json         # 依赖关系（人工指定）
│   └── state.json               # 技能执行状态
│
├── .claude/                     # Superpowers的数据（如有）
│   └── memory/
│
└── 项目文件...
```

---

## 💾 项目数据详解

### 1. Cache 目录

```
.deployment-kit/cache/{appid}/
├── manifest.json                # 资源清单总览
├── resources.json               # 完整资源数据
└── metadata.json                # 缓存元数据
```

#### manifest.json（资源清单）

```json
{
  "manifest": {
    "appid": "xxx",
    "discovered_at": "2026-03-26T16:30:00Z",
    "total_resources": 42,
    "resource_types": ["ads", "config", "vpc", "security_group"],
    "mcp_tools_used": [
      "mcp.get_resource_stats",
      "mcp.get_ads_list",
      "mcp.get_config_list"
    ]
  },
  "resources": {
    "ads": {
      "count": 5,
      "items": [
        {
          "id": "ads-001",
          "name": "my-ads-cluster",
          "region": "cn-north-1",
          "status": "active",
          "config": {...}
        }
      ]
    },
    "config": {
      "count": 12,
      "items": [...]
    }
  },
  "cache_info": {
    "location": ".deployment-kit/cache/xxx/",
    "cached_at": "2026-03-26T16:30:00Z",
    "ttl": 3600,
    "expires_at": "2026-03-26T17:30:00Z"
  }
}
```

#### resources.json（完整数据）

包含从MCP服务获取的所有资源的详细数据，用于后续skill的处理。

```json
{
  "appid": "xxx",
  "fetched_at": "2026-03-26T16:30:00Z",
  "data": {
    "ads": [...],
    "config": [...],
    "vpc": [...],
    "security_group": [...]
  }
}
```

#### metadata.json（缓存元数据）

```json
{
  "appid": "xxx",
  "cache_info": {
    "created_at": "2026-03-26T16:30:00Z",
    "last_accessed": "2026-03-26T17:00:00Z",
    "ttl": 3600,
    "expires_at": "2026-03-26T17:30:00Z",
    "size_bytes": 102400,
    "mcp_version": "1.0.0"
  }
}
```

### 2. dependencies.json（依赖关系）

**重要**：依赖关系由**人工指定**，不做自动推断。

```json
{
  "project_id": "my-deployment-project",
  "appid": "xxx",
  "version": "1.0.0",
  "created_at": "2026-03-26T16:30:00Z",
  "updated_at": "2026-03-26T16:30:00Z",
  "dependencies": [
    {
      "id": "dep-001",
      "type": "explicit",
      "description": "应用依赖ADS集群部署",
      "depends_on": [
        {
          "resource_type": "ads",
          "resource_id": "ads-001",
          "relationship": "application_runs_on"
        }
      ]
    },
    {
      "id": "dep-002",
      "type": "explicit",
      "description": "配置依赖VPC和网络",
      "depends_on": [
        {
          "resource_type": "vpc",
          "resource_id": "vpc-001",
          "relationship": "config_requires_network"
        },
        {
          "resource_type": "security_group",
          "resource_id": "sg-001",
          "relationship": "config_uses_security_group"
        }
      ]
    }
  ],
  "execution_order": [
    "vpc-001",
    "sg-001",
    "ads-001",
    "app-config-001"
  ]
}
```

### 3. state.json（技能执行状态）

```json
{
  "project_id": "my-deployment-project",
  "current_appid": "xxx",
  "last_operation": {
    "skill": "discover-resources",
    "timestamp": "2026-03-26T16:30:00Z",
    "status": "completed",
    "result": "success"
  },
  "workflow_state": {
    "current_phase": "resource-discovery",
    "completed_skills": [
      "discover-resources"
    ],
    "pending_skills": [
      "generate-xac",
      "validate-syntax",
      "validate-plan"
    ]
  },
  "agent_context": {
    "working_directory": "/path/to/project/",
    "deployment_kit_version": "1.0.0"
  }
}
```

---

## 🔄 缓存策略

### 缓存模式

**混合模式**（推荐，默认）：

```bash
# 默认行为：优先使用缓存
dk discover --appid xxx
# → 检查缓存，如果存在且未过期则使用
# → 如果过期，提示用户："缓存已过期，是否刷新？[Y/n]"

# 强制刷新
dk discover --appid xxx --refresh

# 忽略缓存，直接调用MCP
dk discover --appid xxx --no-cache

# 查看缓存状态
dk discover --appid xxx --status
```

### 缓存配置

```yaml
# ~/.deployment-kit/config/config.yaml（全局）
cache:
  enabled: true
  default_ttl: 3600              # 默认1小时
  max_size_mb: 500
  auto_clean: true               # 自动清理过期缓存
```

```yaml
# 项目目录/.deployment-kit/project-config.yaml（项目级，可选）
cache:
  ttl: 7200                      # 这个项目缓存2小时
```

---

## 🔗 依赖关系管理

### 为什么人工指定依赖？

1. **准确性**：只有人真正了解业务依赖关系
2. **灵活性**：可以根据实际场景调整
3. **可控性**：避免自动推断的错误
4. **可审计**：明确的依赖关系便于审查

### 依赖关系管理命令

```bash
# 1. 编辑依赖关系
dk dependencies edit --appid xxx
# → 打开编辑器编辑 .deployment-kit/dependencies.json

# 2. 验证依赖关系
dk dependencies validate --appid xxx
# → 检查：
#   - 引用的资源ID是否存在于cache中
#   - 是否有循环依赖
#   - 执行顺序是否合理

# 3. 可视化依赖关系
dk dependencies visualize --appid xxx
# → 生成依赖关系图（graphviz或mermaid）

# 4. 从依赖关系生成执行顺序
dk dependencies order --appid xxx
# → 生成拓扑排序

# 5. （可选）智能建议
dk dependencies suggest --appid xxx
# → 基于命名规则、标签等给出建议（仅建议，不自动应用）
```

### 依赖关系验证

```python
def validate_dependencies(appid):
    """验证依赖关系"""
    # 1. 加载依赖关系
    deps = load_json(f".deployment-kit/dependencies.json")

    # 2. 加载资源清单
    manifest = load_json(f".deployment-kit/cache/{appid}/manifest.json")

    # 3. 验证资源ID存在性
    resource_ids = set()
    for type, resources in manifest['resources'].items():
        for item in resources['items']:
            resource_ids.add(item['id'])

    # 4. 检查依赖的资源是否存在
    for dep in deps['dependencies']:
        for ref in dep['depends_on']:
            if ref['resource_id'] not in resource_ids:
                print(f"❌ 错误：依赖的资源 {ref['resource_id']} 不存在")

    # 5. 检查循环依赖
    if has_circular_dependency(deps):
        print("❌ 错误：存在循环依赖")

    # 6. 验证执行顺序
    order = deps.get('execution_order', [])
    if not validate_execution_order(order, deps):
        print("❌ 错误：执行顺序不合理")
```

---

## 🤖 Agent 集成

### Agent 工作流程

```python
class DeploymentKitAgent:
    def __init__(self, project_dir):
        self.project_dir = Path(project_dir)
        self.data_dir = self.project_dir / ".deployment-kit"

    def discover_resources(self, appid, mode='hybrid'):
        """Agent执行资源发现"""
        cache_dir = self.data_dir / "cache" / appid

        # 1. 检查缓存
        if mode != 'fresh' and cache_dir.exists():
            manifest = load_json(cache_dir / "manifest.json")
            if not is_cache_expired(manifest):
                print("✓ 使用缓存数据")
                return load_cached_resources(cache_dir)

        # 2. 调用MCP服务
        print("→ 调用MCP服务获取资源...")
        resources = self.call_mcp_service(appid)

        # 3. 保存到项目缓存
        self.save_to_cache(cache_dir, resources)

        # 4. 更新执行状态
        self.update_state("discover-resources", "completed")

        return resources

    def get_dependencies(self):
        """获取依赖关系"""
        deps_file = self.data_dir / "dependencies.json"
        if deps_file.exists():
            return load_json(deps_file)
        else:
            print("⚠️  未找到依赖关系文件，请手动指定")
            return None

    def call_mcp_service(self, appid):
        """调用MCP服务"""
        # 1. 获取资源统计
        stats = mcp_call("get_resource_stats", appid)

        # 2. 调用各个tools获取详细数据
        resources = {}
        for resource_type in stats['types']:
            tool_name = f"get_{resource_type}_list"
            resources[resource_type] = mcp_call(tool_name, appid)

        return resources
```

### Agent 上下文感知

```bash
# Agent在项目目录下工作
cd /path/to/project/

# 执行技能
dk discover --appid xxx

# Agent自动：
# 1. 检测当前目录
# 2. 读取 .deployment-kit/cache/
# 3. 读取 .deployment-kit/dependencies.json（如果存在）
# 4. 读取 .deployment-kit/state.json
# 5. 执行技能逻辑
# 6. 更新项目数据
```

---

## 📊 数据流转

### 典型工作流

```
1. discover-resources
   ↓
   调用MCP → 获取资源数据 → 保存到 .deployment-kit/cache/{appid}/

2. 人工编辑依赖关系
   ↓
   编辑 .deployment-kit/dependencies.json

3. generate-xac
   ↓
   读取 cache/{appid}/resources.json
   读取 dependencies.json
   生成XaC代码

4. validate-syntax
   ↓
   验证XaC代码语法

5. validate-plan
   ↓
   调用CF平台MCP服务进行计划验证

6. deploy-production
   ↓
   调用CF平台MCP服务执行部署

7. 更新状态
   ↓
   更新 .deployment-kit/state.json
```

---

## 🎯 总结

### 关键要点

1. **项目级数据存储**
   - 数据放在项目目录 `.deployment-kit/`
   - Agent在工作目录直接访问数据
   - 数据跟随项目，便于上下文理解

2. **缓存策略**
   - 混合模式：优先使用缓存，支持强制刷新
   - 缓存隔离：按项目隔离，不同项目不共享
   - TTL管理：默认1小时，可配置

3. **依赖关系管理**
   - 人工指定，不做自动推断
   - 提供验证、可视化等辅助工具
   - 依赖关系随项目存储

4. **Agent友好**
   - 项目数据目录固定：`.deployment-kit/`
   - 数据结构清晰，易于读写
   - 状态管理：`state.json`

### 与Superpowers的对比

| 维度 | Superpowers | Deployment Kit |
|------|-------------|----------------|
| **项目数据目录** | `.claude/memory/` | `.deployment-kit/` |
| **配置文件** | `.claude/settings.local.json` | `.deployment-kit/project-config.yaml` |
| **数据隔离** | 项目级 | 项目级 |
| **Agent工作模式** | 项目上下文 | 项目上下文 |

---

## 版本信息

- **文档版本**：1.0.0
- **创建日期**：2026-03-26
- **作者**：Deployment Kit 设计团队
- **状态**：稳定版
