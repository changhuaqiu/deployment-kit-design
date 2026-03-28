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

#### metadata.json（缓存元数据 - 带版本管理）

**增强版本**（推荐）：

```json
{
  "appid": "xxx",
  "cache_info": {
    "basic": {
      "created_at": "2026-03-26T16:30:00Z",
      "last_accessed": "2026-03-26T17:00:00Z",
      "ttl": 3600,
      "expires_at": "2026-03-26T17:30:00Z",
      "size_bytes": 102400,
      "access_count": 5
    },
    "versions": {
      "heam_protocol": "1.2.0",
      "terraform": "1.5.7",
      "mcp_service": "1.0.0",
      "deployment_kit": "1.1.0"
    },
    "integrity": {
      "state_hash": "sha256:a1b2c3d4e5f6...",
      "data_checksum": "sha256:abcdef123456...",
      "resource_count": 42,
      "resource_types": ["ads", "config", "vpc", "security_group"]
    },
    "source": {
      "mcp_endpoint": "mcp.huawei.com",
      "fetch_method": "batch",
      "fetch_duration_ms": 1234,
      "fetched_at": "2026-03-26T16:30:00Z"
    },
    "compatibility": {
      "min_deployment_kit_version": "1.0.0",
      "max_deployment_kit_version": "1.999.999"
    }
  }
}
```

**字段说明**：

| 字段类别 | 字段名 | 说明 |
|---------|--------|------|
| **basic** | created_at | 缓存创建时间 |
| | last_accessed | 最后访问时间 |
| | ttl | 生存时间（秒） |
| | expires_at | 过期时间 |
| | size_bytes | 缓存大小（字节） |
| | access_count | 访问次数 |
| **versions** | heam_protocol | HEAM 协议版本 |
| | terraform | Terraform 版本 |
| | mcp_service | MCP 服务版本 |
| | deployment_kit | Deployment Kit 版本 |
| **integrity** | state_hash | 资源状态哈希（用于快速检测变化） |
| | data_checksum | 数据校验和 SHA256（检测数据损坏） |
| | resource_count | 资源总数 |
| | resource_types | 资源类型列表 |
| **source** | mcp_endpoint | MCP 服务端点 |
| | fetch_method | 获取方式（batch/single） |
| | fetch_duration_ms | 获取耗时（毫秒） |
| | fetched_at | 获取时间 |
| **compatibility** | min_deployment_kit_version | 最低兼容版本 |
| | max_deployment_kit_version | 最高兼容版本 |

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

## 🏷️ 缓存版本管理

### 设计目标

缓存版本管理解决以下核心问题：

1. **版本兼容性**: HEAM 协议、Terraform 版本变化时，缓存可能不兼容
2. **数据完整性**: 缓存文件可能损坏，需要检测机制
3. **状态一致性**: 资源状态可能已变化，但缓存未过期
4. **自动过期**: 支持 TTL 和自动清理过期缓存

### 架构设计

```
┌─────────────────────────────────────────────────────────┐
│  Cache Manager（缓存管理器）                             │
│  - 统一的缓存操作接口                                    │
│  - 协调版本管理和验证                                    │
└─────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ Version Manager  │ │ Cache Validator  │ │ Cache Expirer    │
│（版本管理器）     │ │（缓存验证器）     │ │（过期管理器）     │
│                  │ │                  │ │                  │
│ - 获取各组件版本  │ │ - 版本兼容性检查  │ │ - TTL 管理        │
│ - 版本比较        │ │ - 数据完整性验证  │ │ - 自动清理        │
│ - 兼容性判断      │ │ - 过期检查        │ │ - 统计报告        │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

### 版本兼容性规则

**语义化版本 (Semver)**:

```
格式: MAJOR.MINOR.PATCH (主版本.次版本.修订版)

兼容性规则:
- 主版本相同: 认为兼容（API 稳定）
- 主版本不同: 不兼容（API 变化）

示例:
- 1.2.0 ↔ 1.5.0  → 兼容（都是主版本 1）
- 1.2.0 ↔ 2.0.0  → 不兼容（主版本不同）
```

**特殊规则**:

1. **HEAM 协议**: 主版本号必须相同
2. **Terraform**: 主版本号相同，次版本可以向上兼容
3. **MCP 服务**: 精确匹配（因为变化较快）
4. **Deployment Kit**: 次版本向上兼容

### 状态哈希计算

**目的**: 快速判断资源状态是否发生变化，无需完整对比所有资源。

**计算方法**:

```python
def calculate_state_hash(resources: Dict[str, Any]) -> str:
    """计算资源状态哈希"""
    state_fields = []

    for resource_type, items in resources.items():
        for item in items:
            if resource_type == 'ads':
                # ADS 关键字段: id, status, node_count, flavor
                state_fields.append(
                    f"{item['id']}:{item['status']}:"
                    f"{item['node_count']}:{item['flavor_id']}"
                )
            elif resource_type == 'config':
                # 配置关键字段: id, version
                state_fields.append(
                    f"{item['id']}:{item['version']}"
                )
            else:
                # 通用字段
                state_fields.append(
                    f"{item['id']}:{item.get('status', 'unknown')}"
                )

    # 排序后拼接，计算 SHA256
    state_str = '|'.join(sorted(state_fields))
    return f"sha256:{hashlib.sha256(state_str.encode()).hexdigest()}"
```

**用途**:

```python
# 快速检测状态变化
current_hash = calculate_state_hash(current_resources)
cached_hash = metadata['cache_info']['integrity']['state_hash']

if current_hash != cached_hash:
    print("⚠️  资源状态已变化，建议刷新缓存")
```

### 缓存验证流程

```
1. 检查缓存是否存在
   ↓
2. 检查是否过期（TTL）
   ↓
3. 检查版本兼容性
   ├─ HEAM 协议版本
   ├─ Terraform 版本
   ├─ MCP 服务版本
   └─ Deployment Kit 版本
   ↓
4. 检查数据完整性（校验和）
   ↓
5. 返回验证结果
```

**验证规则**:

| 检查项 | 失败策略 | 可恢复 |
|--------|---------|--------|
| **缓存存在** | 返回 None | ❌ 不可恢复 |
| **TTL 过期** | 提示刷新 | ✅ 可刷新 |
| **版本不兼容** | 重新获取 | ❌ 不可恢复 |
| **校验和不匹配** | 删除缓存 | ❌ 不可恢复 |

### CLI 命令

**缓存管理命令**:

```bash
# 1. 查看缓存状态
dk cache status --appid xxx

# 2. 列出所有缓存
dk cache list

# 3. 清理过期缓存
dk cache clean

# 4. 验证缓存
dk cache validate --appid xxx

# 5. 删除指定缓存
dk cache delete --appid xxx
```

**命令输出示例**:

```bash
$ dk cache status --appid xxx

缓存状态
========

AppID: xxx
状态: ✅ 有效

版本信息:
  HEAM 协议:     1.2.0
  Terraform:     1.5.7
  MCP 服务:      1.0.0
  Deployment Kit: 1.1.0

完整性:
  状态哈希:      sha256:a1b2c3d4e5f6...
  数据校验和:    sha256:abcdef123456...
  资源总数:      42

时间信息:
  创建时间:      2026-03-26 16:30:00
  过期时间:      2026-03-26 17:30:00
  访问次数:      5
  最后访问:      2026-03-26 17:00:00

数据来源:
  MCP 端点:      mcp.huawei.com
  获取方式:      batch
  获取耗时:      1234 ms
```

### 关键优势

| 优势 | 说明 |
|------|------|
| **版本兼容性保证** | HEAM 协议升级时，自动失效旧缓存 |
| **数据完整性保证** | 通过校验和验证，自动删除损坏缓存 |
| **状态一致性保证** | 通过状态哈希快速检测变化 |
| **自动过期管理** | 支持 TTL 和自动清理过期缓存 |

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

- **文档版本**：1.1.0
- **创建日期**：2026-03-26
- **最后更新**：2026-03-26
- **作者**：Deployment Kit 设计团队
- **状态**：稳定版

## 变更日志

### v1.1.0 (2026-03-26)
- 增强 metadata.json 结构，添加版本管理字段
- 新增缓存版本管理章节
- 新增版本兼容性规则
- 新增状态哈希计算方法
- 新增缓存验证流程
- 新增 CLI 命令设计

### v1.0.0 (2026-03-26)
- 初始版本
- 定义数据存储架构
- 定义缓存策略
- 定义依赖关系管理机制
