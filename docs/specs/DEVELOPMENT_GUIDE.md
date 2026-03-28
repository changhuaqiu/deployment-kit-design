# Deployment Kit 开发规范

**版本**: 1.0.0
**最后更新**: 2026-03-28
**基于**: [Superpowers](https://github.com/obra/superpowers) 规范

---

## 📋 目录

- [整体原则](#整体原则)
- [技能开发规范](#技能开发规范)
- [工作流程](#工作流程)
- [测试规范](#测试规范)
- [代码规范](#代码规范)
- [文档规范](#文档规范)
- [检查清单](#检查清单)

---

## 整体原则

### 核心价值

Deployment Kit 遵循 **Superpowers** 的开发哲学：

1. **地图原则**
   - AGENTS.md 是 100 行的"地图"，不是 1000 页的说明书
   - 渐进式披露：从小的入口点开始

2. **完整性原则**
   - 所有数据带版本和校验和
   - 智能体可自动判断有效性

3. **可靠性原则**
   - 智能体运行 6+ 小时必须可靠
   - 并发 + 重试 + 断点续传

4. **技能独立性原则**
   - 每个技能独立、可组合、可测试
   - 对扩展开放，对修改封闭（开闭原则）

### 开发流程

```
需求确认 → 设计阶段 → 实现阶段（TDD）→ 审查阶段 → 集成阶段
```

---

## 技能开发规范

### 技能目录结构（标准格式）

所有技能必须遵循以下结构：

```
skill-name/
├── SKILL.md              # 必需：Superpowers 格式的入口文档
├── skill.yaml            # 必需：技能元数据
├── scripts/              # 必需：实现代码
│   ├── __init__.py       # 包初始化，导出 Skill 类
│   ├── main.py           # 技能主类（继承 SkillBase）
│   └── *.py              # 其他辅助类/函数
└── references/           # 可选：参考文档
    ├── examples.md       # 使用示例
    ├── error-codes.md    # 错误码参考
    └── *.md              # 其他参考文档
```

**关键规则**：
- ✅ **SKILL.md 作为入口**：人类和智能体首先阅读的文档
- ✅ **scripts/ 存放代码**：所有 Python 实现代码
- ✅ **references/ 可选**：仅当技能复杂时需要
- ✅ **自包含优先**：简单技能只需 SKILL.md + skill.yaml + scripts/main.py

### SKILL.md 规范

#### Frontmatter（必需）

```yaml
---
name: skill-name                # 字母/数字/连字符，无空格
description: Use when <trigger condition>. <Additional context>.  # max 1024 字符
---
```

**Description 格式规则**：
- ✅ 必须以 "Use when" 开头
- ✅ 第三人称描述
- ✅ 描述触发条件，不是工作流
- ✅ 包含关键词（CSO - Claude Search Optimization）

**示例**：

```yaml
# ✅ 正确
---
name: validate-syntax
description: Use when you need to validate YAML syntax in XaC artifacts. Supports URLs, ZIP files, and directories.
---

# ❌ 错误
---
name: validate-syntax
description: This skill helps you validate YAML files by checking their syntax.
---
```

#### 内容结构（必需章节）

```markdown
## When To Use This Skill
<触发条件和场景>

## What This Skill Does
<技能功能概述>

## Inputs
<输入参数表格>

## Outputs
<输出数据表格>

## Error Handling
<错误类型和处理策略>

## Examples
<使用示例>

## Related Skills
<相关技能链接>
```

**Token 效率目标**：
- Getting-started 技能：< 150 词
- 频繁加载技能：< 200 词
- 其他技能：< 500 词

#### SKILL.md 模板

```markdown
---
name: <skill-name>
description: Use when <trigger condition>. <Additional context>.
---

<Short description - 1-2 sentences>

## When To Use This Skill

Use this skill when:
- <Condition 1>
- <Condition 2>
- <Condition 3>

## What This Skill Does

1. **Step 1**: <Brief description>
2. **Step 2**: <Brief description>
3. **Step 3**: <Brief description>

## Inputs

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| param1 | string | Yes | <Description> |
| param2 | integer | No | <Description> (default: <value>) |

## Outputs

| Field | Type | Description |
|-------|------|-------------|
| field1 | string | <Description> |
| field2 | boolean | <Description> |

## Error Handling

| Error Type | When it happens | Is retryable |
|------------|-----------------|--------------|
| ErrorName | <Condition> | Yes/No |

## Examples

```bash
# Example 1
dk <skill-name> --param1 value1

# Example 2
dk <skill-name> --param1 value1 --param2 value2
```

## Related Skills

- **[skill-a]**: <Relationship>
- **[skill-b]**: <Relationship>
```

### skill.yaml 规范

```yaml
# 技能元数据
name: <skill-name>              # 必需，与 SKILL.md frontmatter 一致
version: 1.0.0                  # 必需，语义化版本
description: <中文描述>          # 必需，简短描述
author: Deployment Kit Team     # 可选

# 前置条件
pre_conditions:
  requires_cache: boolean       # 是否需要缓存
  requires_appid: boolean       # 是否需要 appid
  requires_dependencies: boolean # 是否需要依赖关系
  requires_mcp: boolean         # 是否需要 MCP 服务

# 能力声明
capabilities:
  - <能力 1>
  - <能力 2>

# 输入定义
inputs:
  <param_name>:
    type: string|integer|float|boolean|array|object
    required: true|false
    description: <参数描述>

# 输出定义
outputs:
  <field_name>:
    type: string|integer|float|boolean|array|object
    description: <字段描述>
```

### scripts/ 目录规范

#### scripts/__init__.py（必需）

```python
"""
<skill-name> 技能包
"""

from .main import Skill

__all__ = ['Skill']
```

#### scripts/main.py（必需）

```python
"""
<skill-name> 技能实现

<详细描述>
"""

from core.skill_base import SkillBase
from typing import Dict, Any
import structlog

logger = structlog.get_logger(__name__)


class Skill(SkillBase):
    """
    <skill-name> 技能

    <简短描述>
    """

    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行技能

        Args:
            context: 执行上下文
                {
                    'appid': str,
                    'cache_dir': str,
                    'dependencies': dict,
                    'state': dict,
                    'params': dict  # 用户参数
                }

        Returns:
            {
                'status': 'success' | 'failed',
                'data': any,
                'message': str,
                'progress': dict  # 可选
            }
        """
        # 1. 验证输入
        # 2. 执行逻辑
        # 3. 返回结果
        pass
```

#### 其他辅助文件

- 命名：小写下划线（如 `input_handler.py`）
- 职责单一：每个类/模块一个明确职责
- 可测试：独立功能可单独测试

### references/ 目录规范（可选）

当技能复杂时，提供额外的参考文档：

```
references/
├── examples.md           # 使用示例
├── error-codes.md        # 错误码参考
├── api-reference.md      # API 详细说明
└── advanced-usage.md     # 高级用法
```

**何时需要 references/**：
- 技能有复杂的使用场景
- 需要详细的示例代码
- 有大量的错误类型或配置选项
- SKILL.md 已经超过 500 词

---

## 工作流程

### 技能开发工作流

```
1. 需求确认
   ↓
2. 设计阶段（Brainstorming）
   ├── 探索项目上下文
   ├── 澄清需求（一次一个问题）
   ├── 提出方案（2-3 个，含权衡）
   └── 编写设计文档
   ↓
3. 实现阶段（TDD）
   ├── RED: 写测试
   ├── GREEN: 写最小实现
   └── REFACTOR: 重构改进
   ↓
4. 审查阶段
   ├── 代码自审查
   └── 他人审查
   ↓
5. 集成阶段
   ├── 技能自动加载
   ├── 编排器集成
   └── CLI 集成
```

### 设计阶段规范

**遵循 Brainstorming 工作流**：

1. **探索上下文**
   - 检查现有代码结构
   - 阅读相关设计文档
   - 了解依赖关系

2. **澄清需求**（一次一个问题）
   - 功能范围
   - 输入输出
   - 错误处理
   - 边界情况

3. **提出方案**
   - 至少 2-3 个方案
   - 说明权衡和推荐
   - 获取用户确认

4. **编写设计文档**
   - 保存到 `docs/superpowers/specs/YYYY-MM-DD-<skill-name>-design.md`
   - 包含：架构、组件、数据流、错误处理、测试策略
   - 规格自审查（无占位符、无矛盾、范围清晰）

5. **用户审查**
   - 用户审查设计文档
   - 根据反馈调整
   - 获得批准后进入实施

### TDD 开发规范

#### 铁律（Iron Law）

```
NO PRODUCTION CODE WITHOUT FAILING TEST FIRST
```

#### RED-GREEN-REFACTOR 循环

**RED Phase**：先写失败的测试
```python
# tests/validate-syntax/test_input_handler.py
def test_download_zip_from_url():
    handler = InputHandler()
    path = handler.prepare_artifact('http://example.com/artifact.zip')
    assert os.path.exists(path)
```

**GREEN Phase**：写最少的代码让测试通过
```python
# scripts/input_handler.py
class InputHandler:
    def prepare_artifact(self, source: str, timeout: int = 300) -> str:
        # 最小实现，刚好通过测试
        return downloaded_path
```

**REFACTOR Phase**：重构改进设计
```python
# 改进代码结构，提取方法，优化逻辑
# 但不改变功能行为
```

#### TDD 违规处理

如果发现先写了生产代码：
```python
# ❌ 违规：先写了实现
def process_data(data):
    return transform(data)

# ✅ 纠正：删除实现，从测试开始
# del process_data
# 然后写测试 → 写实现
```

#### 测试文件组织

```
tests/
└── <skill-name>/
    ├── test_main.py              # 主类测试
    ├── test_input_handler.py     # 辅助类测试
    └── fixtures/                 # 测试数据
        ├── valid-xac.zip
        ├── invalid-yaml.zip
        └── no-yaml.zip
```

---

## 测试规范

### 测试金字塔

```
        /\
       /  \          E2E Tests (少量)
      /____\         集成测试（适量）
     /      \
    /        \      单元测试（大量）
   /__________\
```

### 单元测试规范

**覆盖率要求**：
- 核心逻辑：≥ 80%
- 辅助函数：≥ 70%
- 总体：≥ 75%

**命名规范**：
```python
def test_<功能>_<场景>_<期望>():
    """
    test_validate_valid_yaml_returns_none
    test_validate_invalid_yaml_returns_error
    test_download_with_timeout_raises_exception
    """
```

**测试结构（AAA 模式）**：
```python
def test_scanner_finds_yaml_files():
    # Arrange（准备）
    scanner = YamlScanner()
    test_dir = create_test_directory(['a.yaml', 'b.yml', 'c.txt'])

    # Act（执行）
    result = scanner.scan(test_dir)

    # Assert（断言）
    assert len(result) == 2
    assert 'a.yaml' in result
    assert 'b.yml' in result
```

### 集成测试规范

测试技能与编排器、缓存管理器等的集成：
```python
def test_skill_integration_with_orchestrator():
    skill = Skill(metadata)
    context = {
        'appid': 'test-app',
        'cache_dir': '/tmp/test',
        'params': {'artifact_source': './test.zip'}
    }
    result = skill.execute(context)
    assert result['status'] == 'success'
```

### E2E 测试规范

端到端测试完整工作流：
```python
def test_full_validation_workflow():
    # CLI 调用
    output = subprocess.run([
        'dk', 'validate-syntax',
        '--artifact', './test.zip'
    ], capture_output=True)

    # 验证输出
    assert output.returncode == 0
    assert '✓' in output.stdout.decode()
```

---

## 代码规范

### Python 代码风格

遵循 **PEP 8**，额外规则：

1. **命名规范**
   ```python
   # 类名：大驼峰
   class InputHandler:

   # 函数/变量：小写下划线
   def prepare_artifact():
       artifact_path = ...

   # 常量：大写下划线
   MAX_TIMEOUT = 300

   # 私有方法：前缀下划线
   def _validate_type():
       ...
   ```

2. **类型注解**（必需）
   ```python
   from typing import Dict, Any, List, Optional

   def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
       ...

   def validate(self, file_path: str) -> Optional[Dict]:
       ...
   ```

3. **文档字符串**（必需）
   ```python
   def prepare_artifact(self, source: str, timeout: int = 300) -> str:
       """
       准备制品，返回可扫描的目录路径

       Args:
           source: URL/ZIP/目录路径
           timeout: 下载超时时间（秒）

       Returns:
           目录路径（用于扫描 YAML 文件）

       Raises:
           ArtifactNotFoundError: 源不存在
           ArtifactAccessError: 无法访问
       """
   ```

4. **错误处理**
   ```python
   # ✅ 好的做法：明确捕获特定异常
   try:
       yaml.safe_load(content)
   except yaml.YAMLError as e:
       raise YamlSyntaxError(file, str(e))

   # ❌ 避免：裸 except
   try:
       ...
   except:
       pass
   ```

5. **日志记录**
   ```python
   import structlog

   logger = structlog.get_logger(__name__)

   # 结构化日志
   logger.info(
       "skill_executing",
       skill=self.name,
       version=self.version,
       appid=context.get('appid')
   )

   logger.error(
       "skill_error",
       skill=self.name,
       error_type=type(error).__name__,
       error_message=str(error)
   )
   ```

### 依赖管理

**requirements.txt**：
```
# 核心依赖
pyyaml>=6.0
requests>=2.31.0
structlog>=24.1.0

# 开发依赖
pytest>=8.0.0
pytest-cov>=4.1.0
black>=24.0.0
```

**依赖原则**：
- ✅ 最小化：只添加必需的依赖
- ✅ 成熟：优先使用广泛使用的库
- ✅ 轻量：避免重量级框架

---

## 文档规范

### 代码注释

**何时需要注释**：
- ✅ 复杂的业务逻辑
- ✅ 非显而易见的算法
- ✅ 临时解决方案（标记 TODO）
- ✅ 为什么这样做（不是做了什么）

**何时不需要注释**：
- ❌ 重复代码逻辑
- ```python
    # ❌ 坏的注释
    # Increment count by 1
    count += 1

    # ✅ 好的注释
    # Counter must be incremented before validation to avoid race condition
    count += 1
    ```

### README 和示例

每个技能应提供：
1. **SKILL.md**：人类和智能体的入口文档
2. **examples/<skill_name>_example.py**：使用示例
3. **references/examples.md**（可选）：更多示例

### 文档更新

**文档园艺**：
- 文档与代码同步更新
- 定期审查和过时内容移除
- 示例代码可运行

---

## 检查清单

### 技能开发完成检查清单

**设计阶段**：
- [ ] 需求明确，范围清晰
- [ ] 设计文档已编写并审查
- [ ] 方案经过讨论和确认
- [ ] 架构图和数据流清晰

**实现阶段**：
- [ ] 遵循 TDD 流程（测试先行）
- [ ] 所有测试通过
- [ ] 测试覆盖率 ≥ 75%
- [ ] 代码符合 PEP 8
- [ ] 类型注解完整
- [ ] 文档字符串完整

**文档阶段**：
- [ ] SKILL.md 符合 Superpowers 格式
  - [ ] Frontmatter 正确（name, description）
  - [ ] Description 以 "Use when" 开头
  - [ ] 第三人称描述
  - [ ] 包含所有必需章节
- [ ] skill.yaml 完整
- [ ] scripts/__init__.py 导出 Skill 类
- [ ] 使用示例可运行

**集成阶段**：
- [ ] 技能可被 SkillLoader 加载
- [ ] CLI 命令可调用（`dk <skill-name>`）
- [ ] 编排器可调用
- [ ] 错误处理完善
- [ ] 日志记录完整

**质量检查**：
- [ ] 无占位符（TBD, TODO）
- [ ] 无硬编码路径
- [ ] 无安全问题（SQL注入、XSS等）
- [ ] 性能满足要求
- [ ] 内存泄漏检查

### 提交前检查清单

- [ ] 代码通过 lint 检查
- [ ] 所有测试通过
- [ ] 文档已更新
- [ ] AGENTS.md 已更新（如需要）
- [ ] Commit message 清晰
- [ ] 变更已推送到远程

---

## 参考资源

### 内部文档

- [AGENTS.md](./AGENTS.md) - 智能体地图（必读）
- [README.md](./README.md) - 项目说明
- [deployment-kit-design/](../deployment-kit-design/) - 设计文档
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Tier 1 总结
- [TIER2_SUMMARY.md](./TIER2_SUMMARY.md) - Tier 2 总结

### 外部参考

- [Superpowers](https://github.com/obra/superpowers) - Agentic Skills Framework
- [PEP 8](https://peps.python.org/pep-0008/) - Python 代码风格指南
- [Test-Driven Development](https://github.com/obra/superpowers/tree/main/skills/test-driven-development) - TDD 技能规范

---

**版本历史**：
- v1.0.0 (2026-03-28): 初始版本，基于 Superpowers 规范
