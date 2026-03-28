# 入口层和编排器设计

## 文档概述

本文档详细说明 Deployment Kit 的入口层（CLI/Web UI）和编排器的设计，重点关注如何协调技能执行、管理数据流和提供友好的用户交互。

---

## 🎯 设计原则

### 核心理念

```
入口层：智能、友好、自动化
├── 自动检测前置条件
├── 提供友好的交互提示
├── 智能处理常见场景
└── 减少用户认知负担

编排器：协调、驱动、状态管理
├── 协调技能执行顺序
├── 管理数据在技能间传递
├── 自动确定缓存策略
└── 持久化执行状态
```

### 设计目标

- ✅ **零配置起步**：新用户可以直接使用
- ✅ **智能提示**：告诉用户下一步做什么
- ✅ **自动处理**：常见情况自动处理
- ✅ **状态可见**：用户随时知道执行到哪一步
- ✅ **错误友好**：清晰的错误提示和解决方案

---

## 📋 入口层设计

### 1. 项目初始化

#### 自动初始化

```python
class DeploymentKitCLI:
    def __init__(self):
        # 1. 确定工作目录
        self.working_dir = os.getcwd()

        # 2. 确定项目数据目录
        self.data_dir = Path(self.working_dir) / ".deployment-kit"

        # 3. 自动初始化（如果需要）
        if not self.data_dir.exists():
            self.init_project()

        # 4. 加载项目状态
        self.state = self.load_state()

    def init_project(self):
        """初始化项目"""
        print(f"→ 初始化项目: {self.working_dir}")
        self.data_dir.mkdir(parents=True, exist_ok=True)

        # 创建必要的子目录
        (self.data_dir / "cache").mkdir(exist_ok=True)

        # 创建初始状态文件
        self.state = {
            "project_id": str(Path(self.working_dir).name),
            "initialized_at": datetime.now().isoformat(),
            "last_operation": None,
            "workflow_state": {
                "current_phase": "initialized",
                "completed_skills": [],
                "pending_skills": []
            }
        }
        self.save_state()

        print("✓ 项目初始化完成")
```

#### 显式初始化命令（可选）

```bash
# 用户可以选择显式初始化
dk init

# 输出：
# → 初始化项目: /path/to/project/
# ✓ 创建项目数据目录: .deployment-kit/
# ✓ 创建缓存目录: .deployment-kit/cache/
# ✓ 创建状态文件: .deployment-kit/state.json
# ✓ 项目初始化完成
#
# 下一步：
#   dk discover --appid <appid>     # 发现现网资源
#   dk workflow new-user --appid <appid>  # 使用新用户工作流
```

### 2. 智能检查系统

#### 执行前检查

```python
class PreFlightChecker:
    """执行前检查系统"""

    def check_all(self, skill, params):
        """执行所有检查"""

        checks = []

        # 1. 检查项目初始化
        checks.append(self.check_project_initialized())

        # 2. 技能特定检查
        if skill == "generate-xac":
            checks.extend(self.check_for_generate_xac(params))
        elif skill == "validate-plan":
            checks.extend(self.check_for_validate_plan(params))
        elif skill == "deploy-production":
            checks.extend(self.check_for_deploy_production(params))

        return checks

    def check_for_generate_xac(self, params):
        """generate-xac 的特定检查"""

        appid = params.get('appid')
        checks = []

        # 检查1: 资源数据是否存在
        cache_dir = self.data_dir / "cache" / appid
        if not cache_dir.exists():
            checks.append({
                'type': 'error',
                'category': 'prerequisite',
                'message': '未找到资源数据',
                'solution': f'请先运行: dk discover --appid {appid}',
                'auto_fix': 'discover'  # 可以自动修复
            })
        else:
            # 检查2: 缓存是否过期
            manifest = load_json(cache_dir / "manifest.json")
            if is_cache_expired(manifest):
                checks.append({
                    'type': 'warning',
                    'category': 'cache',
                    'message': '资源数据已过期',
                    'solution': f'建议运行: dk discover --appid {appid} --refresh',
                    'auto_fix': 'refresh'
                })

        # 检查3: 依赖关系是否存在
        deps_file = self.data_dir / "dependencies.json"
        if not deps_file.exists():
            checks.append({
                'type': 'warning',
                'category': 'dependency',
                'message': '未找到依赖关系文件',
                'solution': f'建议运行: dk dependencies edit --appid {appid}',
                'impact': '生成的 XaC 不包含 depends_on，可能导致部署失败'
            })

        return checks
```

#### 检查结果展示

```python
def display_checks(checks):
    """展示检查结果"""

    if not checks:
        print("✓ 所有检查通过")
        return True

    print("=" * 70)
    print("执行前检查：")
    print("=" * 70)

    error_count = 0
    warning_count = 0

    for i, check in enumerate(checks, 1):
        icon = {'error': '❌', 'warning': '⚠️ ', 'info': 'ℹ️ '}
        print(f"{icon.get(check['type'], '•')} [{check['category'].upper()}] {check['message']}")
        print(f"   {check['solution']}")
        if 'impact' in check:
            print(f"   影响: {check['impact']}")
        if 'auto_fix' in check:
            print(f"   [可自动修复]")
        print()

        if check['type'] == 'error':
            error_count += 1
        elif check['type'] == 'warning':
            warning_count += 1

    # 错误处理
    if error_count > 0:
        print(f"发现 {error_count} 个错误，无法继续。请解决错误后重试。")
        return False

    # 警告处理
    if warning_count > 0:
        print(f"发现 {warning_count} 个警告。")
        choice = input("是否继续？[y/N]: ")
        return choice.lower() == 'y'

    return True
```

### 3. 自动修复机制

```python
class AutoFixer:
    """自动修复常见问题"""

    def fix(self, checks, params):
        """尝试自动修复问题"""

        fixed = []

        for check in checks:
            if 'auto_fix' not in check:
                continue

            fix_type = check['auto_fix']

            if fix_type == 'discover':
                # 自动调用 discover-resources
                print(f"→ 自动调用 discover-resources...")
                result = self.run_skill('discover-resources', params)
                fixed.append('discover-resources')

            elif fix_type == 'refresh':
                # 自动刷新缓存
                print(f"→ 自动刷新缓存...")
                params['mode'] = 'fresh'
                result = self.run_skill('discover-resources', params)
                fixed.append('refresh-cache')

        return fixed
```

### 4. 命令行接口设计

#### 基本命令结构

```bash
# 技能命令
dk <skill> [options]

# 工作流命令
dk workflow <workflow-name> [options]

# 管理命令
dk cache <command> [options]
dk dependencies <command> [options]
dk status [options]

# 帮助命令
dk help [<skill> | <workflow>]
dk --help
```

#### 典型使用场景

```bash
# 场景1：首次 XaC 化（完整流程）
dk discover --appid xxx               # 1. 发现资源
# → 提示："建议指定依赖关系：dk dependencies edit --appid xxx"
dk dependencies edit --appid xxx      # 2. 编辑依赖
dk generate-xac --appid xxx           # 3. 生成 XaC
dk validate-syntax                    # 4. 验证语法
dk validate-plan --appid xxx          # 5. 验证计划
dk deploy-production --appid xxx      # 6. 部署

# 场景2：快速模式
dk quick-deploy --appid xxx
# → 自动执行完整流程

# 场景3：工作流模式
dk workflow new-user --appid xxx
# → 按照预定义工作流执行，支持断点续传

# 场景4：单步执行（带自动检查和修复）
dk generate-xac --appid xxx
# → 自动检查：
#   ✓ 项目已初始化
#   ⚠️  未找到依赖关系
#   建议: dk dependencies edit --appid xxx
#   是否继续？[y/N]: y
# → 执行生成...
```

---

## 🎼 编排器设计

### 1. 编排器职责

```
编排器核心职责：
├── 技能执行编排
│   ├── 确定执行顺序
│   ├── 检查前置条件
│   └── 处理执行结果
├── 数据流管理
│   ├── 传递技能间数据
│   ├── 管理缓存策略
│   └── 转换数据格式
├── 状态管理
│   ├── 加载项目状态
│   ├── 更新执行进度
│   └── 支持断点续传
└── 错误处理
    ├── 捕获执行错误
    ├── 尝试自动恢复
    └── 提供恢复建议
```

### 2. 编排器实现

```python
class Orchestrator:
    """编排器"""

    def __init__(self, data_dir):
        self.data_dir = Path(data_dir)
        self.state = self.load_state()
        self.checker = PreFlightChecker(self.data_dir)
        self.auto_fixer = AutoFixer(self.data_dir)

    def execute_skill(self, skill_name, params):
        """执行单个技能"""

        print(f"\n{'='*70}")
        print(f"执行技能: {skill_name}")
        print(f"{'='*70}\n")

        # 1. 执行前检查
        print("→ 检查前置条件...")
        checks = self.checker.check_all(skill_name, params)

        if not display_checks(checks):
            # 尝试自动修复
            auto_fixed = self.auto_fixer.fix(checks, params)
            if auto_fixed:
                print("✓ 自动修复完成，重新检查...")
                checks = self.checker.check_all(skill_name, params)
                if not display_checks(checks):
                    raise Exception("前置条件不满足")

        # 2. 确定缓存模式
        cache_mode = self.determine_cache_mode(skill_name, params)
        params['mode'] = cache_mode

        # 3. 准备技能上下文
        context = self.prepare_context(skill_name, params)

        # 4. 执行技能
        print(f"→ 执行 {skill_name}...")
        result = self.run_skill(skill_name, context)

        # 5. 验证结果
        if not self.validate_result(skill_name, result):
            raise Exception(f"{skill_name} 执行结果验证失败")

        # 6. 更新状态
        self.update_state(skill_name, result)

        print(f"\n✓ {skill_name} 执行完成")

        return result

    def determine_cache_mode(self, skill_name, params):
        """智能确定缓存模式"""

        # generate-xac 特殊处理
        if skill_name == 'generate-xac':
            appid = params.get('appid')
            cache_dir = self.data_dir / "cache" / appid

            if not cache_dir.exists():
                print("→ 缓存不存在，将自动调用 discover-resources")
                return 'fresh'

            # 检查缓存是否过期
            manifest = load_json(cache_dir / "manifest.json")
            if is_cache_expired(manifest):
                print("⚠️  缓存已过期")
                print("→ 使用过期缓存（建议运行 dk discover --refresh）")
                return 'cache'  # 使用缓存，但已提示

        # 默认混合模式
        return params.get('mode', 'hybrid')

    def prepare_context(self, skill_name, params):
        """准备技能执行上下文"""

        context = {
            'working_dir': str(self.data_dir.parent),
            'data_dir': str(self.data_dir),
            'state': self.state,
            'params': params
        }

        # 根据技能类型准备特定上下文
        if skill_name == 'generate-xac':
            # 加载依赖关系
            deps_file = self.data_dir / "dependencies.json"
            if deps_file.exists():
                context['dependencies'] = load_json(deps_file)
                print("✓ 使用依赖关系文件")
            else:
                context['dependencies'] = None
                print("⚠️  未找到依赖关系文件")

        return context

    def update_state(self, skill_name, result):
        """更新执行状态"""

        self.state['last_operation'] = {
            'skill': skill_name,
            'timestamp': datetime.now().isoformat(),
            'status': 'completed',
            'result': result
        }

        # 更新工作流状态
        if skill_name not in self.state['workflow_state']['completed_skills']:
            self.state['workflow_state']['completed_skills'].append(skill_name)

        if skill_name in self.state['workflow_state']['pending_skills']:
            self.state['workflow_state']['pending_skills'].remove(skill_name)

        # 保存状态
        self.save_state()
```

### 3. 工作流编排

```python
class WorkflowExecutor:
    """工作流执行器"""

    def execute_workflow(self, workflow_name, params):
        """执行工作流"""

        # 1. 加载工作流定义
        workflow = self.load_workflow(workflow_name)

        # 2. 检查断点续传
        if self.can_resume(workflow, params):
            print(f"→ 检测到未完成的工作流: {workflow_name}")
            choice = input("是否继续？[Y/n]: ")
            if choice.lower() != 'n':
                return self.resume_workflow(workflow, params)

        # 3. 执行工作流
        print(f"\n{'='*70}")
        print(f"执行工作流: {workflow_name}")
        print(f"{'='*70}\n")

        for step in workflow['steps']:
            skill_name = step['skill']
            step_params = {**params, **step.get('params', {})}

            try:
                result = self.execute_skill(skill_name, step_params)

                # 检查是否需要停止
                if step.get('stop_here', False):
                    print(f"\n⏸️  工作流暂停于: {skill_name}")
                    print(f"   使用 'dk workflow resume {workflow_name}' 继续")
                    break

            except Exception as e:
                print(f"\n❌ 执行失败: {skill_name}")
                print(f"   错误: {str(e)}")
                print(f"\n工作流已暂停，可以使用 'dk workflow resume {workflow_name}' 继续")
                raise

        print(f"\n✓ 工作流 {workflow_name} 执行完成")
```

### 4. 数据流管理

```python
class DataFlowManager:
    """数据流管理器"""

    def pass_data_between_skills(self, from_skill, to_skill, data):
        """在技能间传递数据"""

        # 定义数据传递规则
        flow_rules = {
            'discover-resources → generate-xac': {
                'source': 'cache/{appid}/resources.json',
                'target': 'generate-xac.input',
                'transform': None
            },
            'discover-resources → validate-plan': {
                'source': 'cache/{appid}/resources.json',
                'target': 'validate-plan.input',
                'transform': 'extract_plan_info'
            },
            'generate-xac → validate-syntax': {
                'source': 'xac/main.yaml',
                'target': 'validate-syntax.input',
                'transform': None
            }
        }

        # 查找传递规则
        key = f"{from_skill} → {to_skill}"
        rule = flow_rules.get(key)

        if not rule:
            print(f"⚠️  未定义数据传递规则: {key}")
            return None

        # 加载源数据
        source_path = self.data_dir / rule['source'].format(**data)
        if not source_path.exists():
            print(f"❌ 源数据不存在: {source_path}")
            return None

        source_data = load_json(source_path)

        # 应用转换
        if rule['transform']:
            transformed_data = self.apply_transform(rule['transform'], source_data)
        else:
            transformed_data = source_data

        return transformed_data

    def apply_transform(self, transform_name, data):
        """应用数据转换"""

        transforms = {
            'extract_plan_info': lambda x: {
                'resources': x['resources'],
                'total_count': x['manifest']['total_resources']
            }
        }

        transform_func = transforms.get(transform_name)
        if transform_func:
            return transform_func(data)

        return data
```

---

## 🎯 状态管理

### state.json 结构

```json
{
  "project_id": "my-deployment-project",
  "initialized_at": "2026-03-26T16:00:00Z",
  "current_appid": "xxx",
  "last_operation": {
    "skill": "generate-xac",
    "timestamp": "2026-03-26T16:45:00Z",
    "status": "completed",
    "result": "success"
  },
  "workflow_state": {
    "current_workflow": "new-user",
    "current_phase": "xac-generation",
    "completed_skills": [
      "discover-resources",
      "generate-xac"
    ],
    "pending_skills": [
      "validate-syntax",
      "validate-plan",
      "deploy-production"
    ],
    "total_progress": 0.4
  },
  "agent_context": {
    "working_directory": "/path/to/project/",
    "deployment_kit_version": "1.0.0",
    "last_cli_version": "1.0.0"
  }
}
```

### 状态查询命令

```bash
# 查看整体状态
dk status

# 输出：
# 项目: my-deployment-project
# 当前应用: xxx
# 当前工作流: new-user (40% 完成)
# 最后执行: generate-xac (2026-03-26 16:45:00)
#
# 已完成:
#   ✓ discover-resources
#   ✓ generate-xac
#
# 待执行:
#   ⏳ validate-syntax
#   ⏳ validate-plan
#   ⏳ deploy-production

# 查看详细状态
dk status --verbose

# 查看特定技能状态
dk status --skill discover-resources
```

---

## 🔄 错误处理和恢复

### 错误分类

```python
class ErrorHandler:
    """错误处理器"""

    def handle_error(self, skill, error):
        """处理技能执行错误"""

        error_type = self.classify_error(error)

        # 根据错误类型处理
        if error_type == 'mcp_service_unavailable':
            return self.handle_mcp_error(error)
        elif error_type == 'cache_missing':
            return self.handle_cache_error(error)
        elif error_type == 'validation_failed':
            return self.handle_validation_error(error)
        else:
            return self.handle_generic_error(error)

    def classify_error(self, error):
        """分类错误类型"""

        error_message = str(error).lower()

        if 'mcp' in error_message and 'connect' in error_message:
            return 'mcp_service_unavailable'
        elif 'cache' in error_message and 'not found' in error_message:
            return 'cache_missing'
        elif 'validation' in error_message or 'syntax' in error_message:
            return 'validation_failed'
        else:
            return 'generic'

    def handle_mcp_error(self, error):
        """处理MCP服务错误"""

        print(f"\n❌ MCP 服务连接失败")
        print(f"   错误: {str(error)}")
        print()
        print("可能的解决方案：")
        print("  1. 检查 MCP 服务是否运行")
        print("  2. 检查 MCP 服务配置")
        print("  3. 查看日志: dk logs")
        print()

        return {
            'can_retry': True,
            'suggested_action': 'check_mcp_service'
        }

    def handle_cache_error(self, error):
        """处理缓存错误"""

        print(f"\n❌ 缓存数据缺失")
        print(f"   错误: {str(error)}")
        print()
        print("建议操作：")
        print(f"   dk discover --appid {self.state['current_appid']}")
        print()

        # 提供自动修复选项
        choice = input("是否现在执行 discover-resources？[Y/n]: ")
        if choice.lower() == 'y':
            return {
                'can_retry': True,
                'auto_fix': 'discover'
            }

        return {
            'can_retry': False
        }
```

---

## 🎯 典型工作流

### 新用户首次部署工作流

```yaml
workflow_name: new-user
description: 新用户首次 XaC 化和部署

steps:
  - skill: discover-resources
    params:
      appid: xxx
    stop_here: true    # 暂停，让用户编辑依赖关系

  - skill: generate-xac
    params:
      appid: xxx
    pre_check:
      - check_dependencies

  - skill: validate-syntax
    params: {}

  - skill: validate-plan
    params:
      appid: xxx

  - skill: deploy-production
    params:
      appid: xxx
    pre_check:
      - check_approval
      - check_maintenance_window
```

### 执行流程

```bash
$ dk workflow new-user --appid xxx

============================================================
执行工作流: new-user
============================================================

→ 检查前置条件...
✓ 项目已初始化

→ 执行 discover-resources...
✓ discover-resources 执行完成

⏸️  工作流暂停于: discover-resources
   说明: 建议编辑依赖关系
   使用 'dk workflow resume new-user' 继续

$ dk dependencies edit --appid xxx
# 用户编辑依赖关系...

$ dk workflow resume new-user
# 从暂停点继续...

→ 执行 generate-xac...
✓ generate-xac 执行完成

→ 执行 validate-syntax...
✓ validate-syntax 执行完成

...

✓ 工作流 new-user 执行完成
```

---

## 📊 监控和调试

### 执行日志

```bash
# 查看实时日志
dk logs --follow

# 查看特定技能的日志
dk logs --skill discover-resources

# 查看最近的错误
dk logs --errors
```

### 调试模式

```bash
# 启用调试模式
dk --debug generate-xac --appid xxx

# 输出详细的执行信息
# → 缓存目录: .deployment-kit/cache/xxx/
# → 加载资源数据: resources.json
# → 应用转换规则...
# → 生成 XaC 代码...
```

---

## 🎯 总结

### 入口层核心功能

1. **自动初始化**：自动创建 `.deployment-kit/` 目录
2. **智能检查**：执行前检查前置条件
3. **友好提示**：告诉用户问题和解决方案
4. **自动修复**：自动处理常见问题

### 编排器核心功能

1. **技能编排**：协调技能执行顺序
2. **数据流管理**：在技能间传递数据
3. **状态管理**：持久化执行状态
4. **错误处理**：友好的错误提示和恢复

### 关键设计点

- ✅ **零配置**：用户无需手动配置
- ✅ **智能提示**：告诉用户下一步做什么
- ✅ **状态可见**：用户随时知道执行进度
- ✅ **断点续传**：支持工作流暂停和恢复

---

## 版本信息

- **文档版本**：1.0.0
- **创建日期**：2026-03-26
- **作者**：Deployment Kit 设计团队
- **状态**：稳定版
