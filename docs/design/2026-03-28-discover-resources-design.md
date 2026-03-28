# discover-resources 技能设计文档

**日期**: 2026-03-28
**版本**: 1.0.0
**状态**: 设计完成，待实施
**作者**: Deployment Kit Team

---

## Overview

discover-resources 技能用于从现网 HuaweiHIS 系统收集现有资源信息，包括 ADS 集群、工作负载、服务、配置映射等。它是 Deployment Kit 的核心技能之一，为后续的代码生成、验证和部署提供基础数据。

**核心价值**：
- 自动收集现网资源（30+ ADS 集群，50+ 工作负载，70+ 服务）
- 通过 MCP 服务与 HuaweiHIS 平台集成
- 支持缓存机制（1 小时默认过期）
- 按资源类型分组输出
- 为 generate-xac 技能提供输入数据

**规模考虑**：
- 大规模资源收集（每类 30+ 个资源）
- 串行 MCP 调用（每类 30 秒超时）
- 总执行时间：约 3-5 分钟（5 类资源）

---

## Success Criteria

- [x] 能通过 MCP 服务连接到 HuaweiHIS 平台
- [ ] 能列出可用的资源工具（list_tools）
- [ ] 能列出可用的资源类型（list_resources）
- [ ] 能收集指定类型的资源（ads, workload, service, configmap, persistentvolumeclaim）
- [ ] 能处理大规模资源（每类 30+ 个资源）
- [ ] 能正确解析和标准化资源数据
- [ ] 能按资源类型分组输出
- [ ] 能缓存收集结果（带版本和完整性检查）
- [ ] 能处理 MCP 调用超时和错误
- [ ] 符合 Superpowers 技能规范（SKILL.md、TDD）
- [ ] 集成到 CLI 工具（`dk discover-resources`）
- [ ] 支持 CLI 参数指定资源类型（--resource-types）
- [ ] 支持进度显示（可选）

---

## Architecture

### 技能结构

```
discover-resources/
├── SKILL.md              # Superpowers 格式的技能文档（入口）
├── skill.yaml            # 技能元数据
├── scripts/              # 实现代码
│   ├── __init__.py
│   ├── main.py           # Skill 主类
│   ├── mcp_client.py     # MCP 客户端封装
│   ├── collector.py      # 资源收集器
│   ├── parser.py         # 资源解析器
│   └── cache_manager.py  # 缓存管理器（复用 core/cache_manager.py）
└── references/           # 可选：参考文档和模板
    ├── examples.md       # 使用示例
    └── mcp-api-reference.md  # MCP API 参考
```

**遵循 Superpowers 规范**：
- ✅ SKILL.md 作为入口文档
- ✅ scripts/ 存放实现代码
- ✅ references/ 存放辅助参考（可选）
- ✅ 支持技能的独立性和可扩展性

### 执行流程

```
用户输入
    ↓
CLI 参数解析
    ↓
┌─────────────────────────────────┐
│ Skill.execute()                 │
│                                 │
│ 1. 初始化和验证                  │
│    └─ MCPClient              │
│    └─ ResourceCollector      │
│    └─ ResourceParser        │
│    └─ CacheManager         │
│                                 │
│ 2. 检查缓存                      │
│    ├─ is_cache_valid()?        │
│    └─ YES → 返回缓存数据         │
│    └─ NO → 继续执行             │
│                                 │
│ 3. 收集资源（串行）              │
│    ├─ list_tools()            │
│    ├─ list_resources()        │
│    ├─ call_tool('ads')        │  ← 第 1 类
│    ├─ call_tool('workloads')   │  ← 第 2 类
│    └─ call_tool('services')    │  ← 第 3 类
│        每类 30 秒超时           │
│                                 │
│ 4. 解析和整理                    │
│    ├─ Parser.parse()         │
│    └─ Collector.add()        │
│                                 │
│ 5. 保存到缓存                    │
│    ├─ CacheManager.save()     │
│    ├─ manifest.json           │
│    ├─ resources.json         │
│    └─ metadata.json          │
│                                 │
│ 6. 返回结果                      │
└─────────────────────────────────┘
```

### 数据流

#### 输入上下文

```python
context = {
    'appid': 'app-123',                    # 应用 ID
    'params': {
        'resource_types': ['ads', 'workload', 'service'],  # 资源类型列表
        'cache_ttl': 3600,                 # 缓存过期时间（秒，默认 1 小时）
        'enable_progress': False            # 是否启用进度显示（默认 False）
    }
}
```

#### 输出结果

```python
result = {
    'status': 'success' | 'partial' | 'failed',
    'message': str,
    'data': {
        'manifest': {
            'appid': 'app-123',
            'collected_at': '2026-03-28T10:00:00Z',
            'resource_types': ['ads', 'workload', 'service'],
            'total_resources': {
                'ads': 30,
                'workload': 50,
                'service': 70,
                'total': 150
            },
            'cache_info': {
                'version': 'v1',
                'expires_at': '2026-03-28T11:00:00Z'
            }
        },
        'resources': {
            'ads': [
                {
                    'id': 'cluster-1',
                    'name': 'app-cluster',
                    'namespace': 'default',
                    'type': 'ads',
                    'status': 'Running',
                    'metadata': {...}
                },
                ...
            ],
            'workload': [...],
            'service': [...]
        }
    },
    'errors': [
        {
            'resource_type': 'services',
            'error': 'Timeout after 30 seconds',
            'action': '建议重试或联系管理员'
        }
    ]
}
```

### 组件职责

```
┌─────────────────────────────────────────┐
│  Skill (main.py)                        │
│  - 协调所有组件                          │
│  - 管理执行流程                          │
│  - 处理缓存逻辑                          │
└─────────────────────────────────────────┘
           ↓
           ↓ 使用
           ↓
┌──────────────────────────────────────────────────────┐
│  MCPClient (mcp_client.py)                           │
│  - 封装 MCP 调用（core/mcp_caller.py）                │
│  - list_tools()                                      │
│  - list_resources()                                  │
│  - call_tool(resource_type)                          │
└──────────────────────────────────────────────────────┘
           ↓
           ↓ 返回原始数据
           ↓
┌──────────────────────────────────────────────────────┐
│  Parser (parser.py)                                  │
│  - 解析原始数据                                       │
│  - 标准化格式                                         │
│  - 提取公共字段                                       │
└──────────────────────────────────────────────────────┘
           ↓
           ↓ 返回标准化对象
           ↓
┌──────────────────────────────────────────────────────┐
│  Collector (collector.py)                            │
│  - 按类型分组存储                                     │
│  - 管理收集进度                                       │
│  - defaultdict(list) 存储结构                        │
└──────────────────────────────────────────────────────┘
           ↓
           ↓ 返回分组数据
           ↓
┌──────────────────────────────────────────────────────┐
│  CacheManager (cache_manager.py)                     │
│  - 复用 core/cache_manager.py                        │
│  - 保存 manifest.json、resources.json、metadata.json  │
│  - 版本和完整性检查                                   │
└──────────────────────────────────────────────────────┘
```

---

## Components

### 1. MCPClient（scripts/mcp_client.py）

**职责**：
- 封装 MCP 服务调用
- 提供 list_tools、list_resources、call_tool 接口
- 处理连接和超时错误

**接口**：
```python
# scripts/mcp_client.py
from core.mcp_caller import MCPCaller

class MCPClient:
    def __init__(self, service_name: str = "huaweihis"):
        """
        初始化 MCP 客户端

        Args:
            service_name: MCP 服务名称
        """
        self.caller = MCPCaller(service_name)

    def list_tools(self) -> List[str]:
        """
        列出可用的工具

        Returns:
            工具名称列表
        """

    def list_resources(self) -> List[str]:
        """
        列出可用的资源类型

        Returns:
            资源类型列表（如 ['ads', 'workload', 'service']）
        """

    def call_tool(self, resource_type: str, timeout: int = 30) -> Dict:
        """
        调用资源收集工具

        Args:
            resource_type: 资源类型
            timeout: 超时时间（秒）

        Returns:
            资源数据（JSON）

        Raises:
            MCPConnectionError: 连接失败
            MCPTimeoutError: 调用超时
            ResourceTypeNotFoundError: 工具不存在
        """
```

**实现要点**：
- 复用 `core/mcp_caller.py` 的 `MCPCaller`
- 每次调用设置 30 秒超时
- 错误转换：MCP 异常 → 自定义异常

### 2. Collector（scripts/collector.py）

**职责**：
- 协调资源收集流程
- 管理收集进度
- 按类型分组存储资源

**接口**：
```python
# scripts/collector.py
from collections import defaultdict
from typing import List, Dict

class ResourceCollector:
    def __init__(self, resource_types: List[str]):
        """
        初始化收集器

        Args:
            resource_types: 要收集的资源类型列表
        """
        self.resource_types = resource_types
        self.resources = defaultdict(list)  # {type: [resources]}
        self.progress = {
            'total': len(resource_types),
            'completed': 0,
            'failed': 0
        }

    def collect(self, mcp_client: MCPClient, parser: 'ResourceParser') -> Dict:
        """
        收集所有资源

        Args:
            mcp_client: MCP 客户端
            parser: 资源解析器

        Returns:
            收集结果（分组数据）
        """

    def add_resources(self, resource_type: str, resources: List):
        """
        添加资源到分组

        Args:
            resource_type: 资源类型
            resources: 资源列表
        """

    def get_progress(self) -> Dict:
        """
        获取收集进度

        Returns:
            进度信息（百分比、消息）
        """
```

**实现要点**：
- 串行调用 MCP 工具（避免并发问题）
- 使用 `defaultdict(list)` 存储分组数据
- 记录收集进度（成功/失败数量）

### 3. Parser（scripts/parser.py）

**职责**：
- 解析 MCP 返回的原始数据
- 标准化资源格式
- 提取公共字段

**接口**：
```python
# scripts/parser.py
from dataclasses import dataclass
from typing import Dict, List, Optional

@dataclass
class Resource:
    """标准化资源格式"""
    id: str
    type: str
    name: str
    namespace: str
    status: str
    metadata: Dict
    raw_data: Dict  # 原始数据（备用）

class ResourceParser:
    def parse(self, resource_type: str, raw_data: Dict) -> List[Resource]:
        """
        解析原始数据

        Args:
            resource_type: 资源类型
            raw_data: MCP 返回的原始数据

        Returns:
            标准化资源列表

        Raises:
            ResourceParseError: 解析失败
        """

    def _extract_common_fields(self, raw_item: Dict) -> Dict:
        """
        提取公共字段

        Args:
            raw_item: 原始资源项

        Returns:
            公共字段字典
        """
```

**实现要点**：
- 使用 `dataclass` 定义标准格式
- 提取公共字段（id, name, namespace, status）
- 保留 `raw_data` 以备后用
- 容错处理：缺失字段使用默认值

### 4. CacheManager（scripts/cache_manager.py）

**职责**：
- 管理缓存存储
- 生成 manifest、resources、metadata 文件
- 版本和完整性检查

**接口**：
```python
# scripts/cache_manager.py
from core.cache_manager import CacheManager as CoreCacheManager

class CacheManager(CoreCacheManager):
    def save_resources(
        self,
        appid: str,
        manifest: Dict,
        resources: Dict,
        ttl: int = 3600
    ) -> str:
        """
        保存资源到缓存

        Args:
            appid: 应用 ID
            manifest: 清单数据
            resources: 资源数据
            ttl: 过期时间（秒）

        Returns:
            缓存目录路径
        """

    def load_resources(self, appid: str, version: str) -> Optional[Dict]:
        """
        从缓存加载资源

        Args:
            appid: 应用 ID
            version: 缓存版本

        Returns:
            资源数据（如果有效）
        """

    def is_cache_valid(self, appid: str, version: str, ttl: int) -> bool:
        """
        检查缓存是否有效

        Args:
            appid: 应用 ID
            version: 缓存版本
            ttl: 过期时间（秒）

        Returns:
            True 如果缓存有效
        """
```

**实现要点**：
- 继承 `core/cache_manager.py`
- 缓存路径：`.deployment-kit/cache/{appid}/resources/`
- 生成三个文件：
  - `manifest.json`：清单（统计信息）
  - `resources.json`：资源数据
  - `metadata.json`：元数据（版本、时间、SHA256）

### 5. Skill 主类（scripts/main.py）

**职责**：
- 协调所有组件
- 管理执行流程
- 生成最终报告

**接口**：
```python
# scripts/main.py
from core.skill_base import SkillBase
from .mcp_client import MCPClient
from .collector import ResourceCollector
from .parser import ResourceParser
from .cache_manager import CacheManager

class Skill(SkillBase):
    def execute(self, context: Dict) -> Dict:
        """
        执行技能

        Args:
            context: 上下文（appid, params）

        Returns:
            执行结果（status, message, data）
        """
```

**执行逻辑**：
```python
def execute(self, context: Dict) -> Dict:
    appid = context['appid']
    params = context.get('params', {})
    resource_types = params.get('resource_types', ['ads', 'workload', 'service'])
    ttl = params.get('cache_ttl', 3600)

    # 1. 初始化组件
    mcp_client = MCPClient()
    collector = ResourceCollector(resource_types)
    parser = ResourceParser()
    cache_mgr = CacheManager(appid, 'resources')

    # 2. 检查缓存
    if cache_mgr.is_cache_valid('v1', ttl):
        cached_data = cache_mgr.load_resources('v1')
        return {
            'status': 'success',
            'message': '从缓存加载资源数据',
            'data': cached_data
        }

    # 3. 收集资源
    resources = collector.collect(mcp_client, parser)

    # 4. 生成清单
    manifest = {
        'appid': appid,
        'collected_at': datetime.now().isoformat(),
        'resource_types': resource_types,
        'total_resources': collector.get_totals(),
        'cache_info': {
            'version': 'v1',
            'expires_at': (datetime.now() + timedelta(seconds=ttl)).isoformat()
        }
    }

    # 5. 保存到缓存
    try:
        cache_mgr.save_resources(appid, manifest, resources, ttl)
    except CacheSaveError as e:
        logger.warning(f"缓存保存失败: {e}")

    # 6. 返回结果
    return {
        'status': 'success',
        'message': f'成功收集 {sum(manifest["total_resources"].values())} 个资源',
        'data': {
            'manifest': manifest,
            'resources': resources
        }
    }
```

---

## Data Flow

### 整体数据流

```
用户输入
    ↓
CLI 参数解析
    ↓
┌─────────────────────────────────┐
│ Skill.execute()                 │
│                                 │
│ 1. 初始化和验证                  │
│    └─ MCPClient              │
│    └─ ResourceCollector      │
│    └─ ResourceParser        │
│    └─ CacheManager         │
│                                 │
│ 2. 检查缓存                      │
│    ├─ is_cache_valid()?        │
│    └─ YES → 返回缓存数据         │
│    └─ NO → 继续执行             │
│                                 │
│ 3. 收集资源（串行）              │
│    ├─ list_tools()            │
│    ├─ list_resources()        │
│    ├─ call_tool('ads')        │  ← 第 1 类
│    ├─ call_tool('workloads')   │  ← 第 2 类
│    └─ call_tool('services')    │  ← 第 3 类
│        每类 30 秒超时           │
│                                 │
│ 4. 解析和整理                    │
│    ├─ Parser.parse()         │
│    └─ Collector.add()        │
│                                 │
│ 5. 保存到缓存                    │
│    ├─ CacheManager.save()     │
│    ├─ manifest.json           │
│    ├─ resources.json         │
│    └─ metadata.json          │
│                                 │
│ 6. 返回结果                      │
└─────────────────────────────────┘
```

### 详细数据流（单个资源类型收集）

```
call_tool('ads')
    ↓
MCP 服务
    ↓
返回原始数据（JSON）
{
  "items": [
    {
      "id": "cluster-1",
      "name": "app-cluster",
      "status": "Running",
      "nodeCount": 3,
      "version": "1.21"
    },
    ...
  ]
}
    ↓
Parser.parse()
    ↓
标准化格式
[
  Resource(
    id="cluster-1",
    type="ads",
    name="app-cluster",
    namespace="default",
    status="Running",
    metadata={...},
    ...
  ),
  ...
]
    ↓
Collector.add(resources)
    ↓
按类型分组存储
```

### 缓存数据流

```
首次收集：
  MCP 调用 → 数据收集 → 保存到缓存
                          ↓
                    manifest.json  ───────────────┐
                    resources.json ──→ metadata.json ─┘
                        ↑                               ↓
                        └─────── 版本号 + SHA256 ─────┘

后续使用：
  技能启动 → 检查 metadata.json
              ↓
            版本匹配？
              ↓
            数据完整？
              ↓
            未过期？
              ↓
          YES → 返回缓存数据
```

---

## Error Handling

### 错误分类

**1. MCP 连接错误**
```python
class MCPConnectionError(Exception):
    """MCP 服务连接失败"""
    status: "retryable"
    action: "自动重试（指数退避）"
```

**处理策略**：
- 使用 MCPCaller 的内置重试机制
- 最多重试 3 次
- 超时时间：每次调用 30 秒

**2. MCP 超时错误**
```python
class MCPTimeoutError(Exception):
    """MCP 调用超时"""
    status: "retryable"
    action: "记录日志，跳过该资源类型"
```

**处理策略**：
- 记录警告日志
- 标记该资源类型为失败
- 继续处理其他资源类型

**3. 资源类型不存在**
```python
class ResourceTypeNotFoundError(Exception):
    """请求的资源类型工具不存在"""
    status: "fatal"
    action: "立即失败，返回错误"
```

**处理策略**：
- 在 list_tools() 后验证工具可用性
- 提前检测工具是否存在
- 返回清晰的错误信息

**4. 数据解析错误**
```python
class ResourceParseError(Exception):
    """资源数据解析失败"""
    status: "partial"
    action: "记录错误，跳过该资源，继续处理其他"
```

**处理策略**：
- 捕获解析异常
- 记录到错误列表（errors 字段）
- 在 manifest.json 中标注失败的资源类型
- 尽可能多地收集成功数据

**5. 缓存保存失败**
```python
class CacheSaveError(Exception):
    """缓存保存失败"""
    status: "partial"
    action: "返回数据，但不保存到缓存，提示用户"
```

**处理策略**：
- 返回收集到的资源数据
- 在 message 中说明缓存未保存
- 提示用户手动保存或重试

### 错误输出格式

```json
{
  "status": "partial",
  "message": "资源收集部分完成",
  "data": {
    "manifest": {...},
    "resources": {...}
  },
  "errors": [
    {
      "resource_type": "services",
      "error": "Timeout after 30 seconds",
      "action": "建议重试或联系管理员"
    }
  ]
}
```

---

## CLI Integration

### 命令设计

```bash
# 基本用法
dk discover-resources --appid <appid>

# 指定资源类型
dk discover-resources --appid app-123 --resource-types ads,workload,service

# 自定义缓存时间
dk discover-resources --appid app-123 --cache-ttl 7200

# 详细输出
dk discover-resources --appid app-123 --verbose

# 强制重新收集（忽略缓存）
dk discover-resources --appid app-123 --force
```

### 输出格式

```bash
$ dk discover-resources --appid app-123 --resource-types ads,workload

✓ 开始收集资源...
✓ 应用 ID: app-123
✓ 资源类型: ads, workload
✓ 检查缓存... 无有效缓存，开始收集
✓ 正在收集 ads... (1/2)
  ✓ 收集到 30 个 ADS 集群
✓ 正在收集 workload... (2/2)
  ✓ 收集到 50 个工作负载

✓ 收集完成！

统计:
  ADS 集群: 30
  工作负载: 50
  总计: 80

缓存:
  位置: .deployment-kit/cache/app-123/resources/
  过期时间: 2026-03-28 11:00:00

$ dk discover-resources --appid app-123

✓ 从缓存加载资源数据
✓ 缓存有效期至: 2026-03-28 11:00:00
✓ 资源总数: 80
```

---

## Performance Considerations

### 性能目标

- 小规模（< 10 个资源/类）：< 30 秒
- 中规模（10-30 个资源/类）：< 1 分钟
- 大规模（> 30 个资源/类）：< 5 分钟

### 优化策略

1. **串行调用**：避免 MCP 服务并发限制
2. **缓存机制**：减少重复调用
3. **进度显示**：提供实时反馈
4. **超时控制**：每类 30 秒超时，避免长时间等待

### 进度报告

```python
def get_progress(self) -> Dict:
    return {
        'percentage': (self.completed_count / self.total_count) * 100,
        'current_type': self.current_type,
        'message': f'正在收集 {self.current_type}... ({self.completed_count}/{self.total_count})'
    }
```

---

## Security Considerations

### 安全风险

1. **MCP 服务未授权访问**
2. **敏感数据泄露**（资源配置、环境变量）
3. **缓存投毒**（篡改缓存数据）

### 缓解措施

```python
# 1. MCP 服务认证
# 使用 MCPCaller 的内置认证机制

# 2. 数据脱敏
def sanitize_resource(self, resource: Dict) -> Dict:
    """移除敏感字段"""
    sensitive_fields = ['password', 'token', 'secret']
    for field in sensitive_fields:
        resource.pop(field, None)
    return resource

# 3. 缓存完整性
# 使用 SHA256 校验和
# 版本号控制
```

---

## Implementation Steps

### 阶段 1：基础框架（1-2 天）
1. [ ] 创建技能目录结构
2. [ ] 编写 SKILL.md（Superpowers 格式）
3. [ ] 编写 skill.yaml（元数据）
4. [ ] 实现 Skill 主类框架
5. [ ] 集成到 CLI（`dk discover-resources --appid <appid> --resource-types ads,workload`）

### 阶段 2：MCP 集成（2-3 天）
1. [ ] 实现 MCPClient（复用 core/mcp_caller.py）
2. [ ] 编写 Collector（收集器）
3. [ ] 编写 Parser（解析器）
4. [ ] 单元测试：
   - [ ] test_mcp_client.py
   - [ ] test_collector.py
   - [ ] test_parser.py

### 阶段 3：数据处理（2 天）
1. [ ] 实现缓存管理（扩展 CacheManager）
2. [ ] 实现 manifest.json 生成
3. [ ] 实现 resources.json 生成
4. [ ] 实现 metadata.json 生成
5. [ ] 编写数据处理测试

### 阶段 4：完善和集成（2-3 天）
1. [ ] 添加进度显示支持
2. [ ] 错误处理完善
3. [ ] CLI 集成测试
4. [ ] 编写使用示例
5. [ ] 更新 AGENTS.md

### 阶段 5：测试和文档（1-2 天）
1. [ ] 端到端测试
2. [ ] 性能测试（大量资源场景）
3. [ ] 编写实施总结文档

**总预估**: 10-12 天

---

## Dependencies

### Python 库

```python
# requirements.txt
# 复用项目现有依赖
structlog>=24.1.0              # 日志（项目已有）
pydantic>=2.0.0                # 数据模型（可选）
```

### 内部依赖

```python
from core.skill_base import SkillBase, SkillExecutionError
from core.mcp_caller import MCPCaller
from core.cache_manager import CacheManager as CoreCacheManager
from core.exceptions import *  # 复用项目异常
```

### 外部依赖

- MCP 服务：huaweihis（需要在 MCP 配置中注册）
- HuaweiHIS 平台 API 访问权限

---

## Related Skills

- **generate-xac**: 使用收集的资源生成 XaC 代码
- **validate-plan**: 验证部署计划（基于现有资源）
- **analyze-failure**: 分析失败原因（需要资源状态信息）

---

## Future Enhancements

### 未实现的功能（ deferred）

1. **依赖关系分析**
   - 分析资源之间的依赖关系
   - 生成依赖图
   - 识别关键路径

2. **资源变更检测**
   - 对比两次收集的结果
   - 识别新增、删除、修改的资源
   - 生成变更报告

3. **并行收集**
   - 使用异步并发收集多个资源类型
   - 提升大规模收集性能

### 未来改进

- [ ] 支持更多资源类型（Ingress、Pod、Deployment 等）
- [ ] 支持自定义字段过滤
- [ ] 支持资源标签分组
- [ ] 集成到 CI/CD 流水线
- [ ] 提供可视化的资源拓扑图

---

## Notes

### 设计决策记录

1. **为什么选择串行调用？**
   - 避免 MCP 服务并发限制
   - 简化错误处理逻辑
   - 更可靠的进度报告

2. **为什么按资源类型分组？**
   - 符合用户使用习惯
   - 便于后续技能处理
   - 清晰的数据组织

3. **为什么使用缓存？**
   - 减少 MCP 调用开销
   - 提升响应速度
   - 离线工作能力

4. **为什么保留 raw_data？**
   - 便于调试和问题排查
   - 支持未来扩展
   - 保留完整信息

---

**版本历史**：
- v1.0.0 (2026-03-28): 初始设计
