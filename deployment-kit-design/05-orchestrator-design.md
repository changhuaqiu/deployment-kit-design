# 编排器设计

本文档描述 Deployment Kit 的编排器（Orchestrator）的设计，包括职责、架构、核心功能和接口概念。

## 编排器概述

### 核心职责

```
┌─────────────────────────────────────────────────────────────┐
│  编排器是 Deployment Kit 的大脑                                  │
│                                                             │
│  1. 技能管理                                                  │
│     - 发现和加载技能                                         │
│     - 管理技能版本                                           │
│     - 处理技能依赖                                           │
│                                                             │
│  2. 工作流执行                                                │
│     - 解析工作流定义                                         │
│     - 按顺序执行技能                                         │
│     - 处理条件分支                                           │
│     - 管理并发执行                                           │
│                                                             │
│  3. 上下文管理                                                │
│     - 在技能间传递数据                                       │
│     - 维护执行状态                                           │
│     - 处理数据转换                                           │
│                                                             │
│  4. 质量控制                                                  │
│     - 门控机制                                               │
│     - 验证机制                                               │
│     - 回滚机制                                               │
│                                                             │
│  5. 监控和日志                                                │
│     - 记录执行过程                                           │
│     - 提供状态查询                                           │
│     - 发送通知事件                                           │
└─────────────────────────────────────────────────────────────┘
```

### 设计原则

#### 原则 1：技能独立性

```
编排器不关心技能的内部实现
- 只通过接口调用技能
- 不依赖技能的具体逻辑
- 技能可以随时替换
```

#### 原则 2：工作流可组合

```
工作流是技能的组合
- 可以动态定义工作流
- 可以自定义工作流
- 可以嵌套工作流
```

#### 原则 3：状态可管理

```
执行状态必须可追踪
- 记录每一步执行
- 支持暂停和恢复
- 支持失败重试
```

#### 原则 4：错误可恢复

```
错误必须有明确的处理方式
- 分类错误类型
- 定义恢复策略
- 支持自动回滚
```

---

## 编排器架构

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        用户/系统                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  工作流请求    │    │   查询请求    │    │   事件通知    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    API 接口层                                │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Workflow API  │  Query API  │  Event API     │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    编排层                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ 工作流引擎    │    │  技能管理器    │    │  状态管理器   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ 门控管理器    │    │  上下文管理器  │    │  错误处理器   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    技能层                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  discover │ generate │ validate │ deploy │ rollback │ │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 核心组件设计

### 1. 工作流引擎

#### 职责

```
工作流引擎负责：
- 解析工作流定义
- 管理工作流执行
- 处理条件分支
- 管理并发执行
- 处理工作流生命周期
```

#### 执行模型

```
┌─────────────────────────────────────────────────────────────┐
│  工作流执行模型                                              │
│                                                             │
│  1. 线性执行（默认）                                        │
│     skills: [A, B, C, D]                                   │
│     执行：A → B → C → D                                     │
│     适用：大多数场景                                         │
│                                                             │
│  2. 条件执行                                                │
│     if condition1:                                         │
│       skills: [A, B]                                       │
│     else:                                                  │
│       skills: [C, D]                                       │
│     适用：需要分支决策                                       │
│                                                             │
│  3. 并发执行                                                │
│     skills: [A || B || C]                                   │
│     执行：A、B、C 同时执行                                  │
│     适用：独立任务                                         │
│                                                             │
│  4. 混合执行                                                │
│     skills: [A → [B || C], D]                               │
│     执行：A 执行后，B 和 C 并发，然后 D                │
│     适用：复杂场景                                         │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. 技能管理器

#### 职责

```
技能管理器负责：
- 发现和注册技能
- 加载技能实现
- 管理技能版本
- 处理技能依赖
- 提供技能查询
```

#### 技能注册

```
技能注册流程：

1. 扫描技能目录
2. 加载技能元数据
3. 验证技能接口
4. 注册到技能库
5. 建立索引
```

#### 技能查询

```
查询方式：
- 按名称查询
- 按类型查询
- 按能力查询
- 按依赖查询
```

---

### 3. 状态管理器

#### 职责

```
状态管理器负责：
- 维护执行上下文
- 追踪执行状态
- 支持暂停/恢复
- 支持重试
- 支持回滚
```

#### 状态转换

```
┌─────────────────────────────────────────────────────────────┐
│  状态转换                                                    │
│                                                             │
│  pending → running → completed                             │
│     ↓         ↓                                            │
│   failed   paused                                         │
│                                                             │
│  paused → resumed → running                               │
│  failed → retrying → running                              │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. 上下文管理器

#### 职责

```
上下文管理器负责：
- 在技能间传递数据
- 维护数据一致性
- 处理数据转换
- 支持数据合并
```

#### 上下文结构

```
context:
  execution_id: "exec-001"
  workflow_name: "new-user-full"
  current_step: 3
  total_steps: 8

  skill_contexts:
    discover-resources:
      output: {...}
    generate-XaC:
      output: {...}

  shared_state:
    user_info: {...}
    config: {...}
    metadata: {...}
```

---

### 5. 门控管理器

#### 职责

```
门控管理器负责：
- 定义门控规则
- 验证门控条件
- 处理门控失败
- 记录门控结果
```

#### 门控类型

```
┌─────────────────────────────────────────────────────────────┐
│  门控类型                                                    │
│                                                             │
│  1. 审查门控（Approval）                                   │
│     需要人工审批才能通过                                     │
│     例如：review-code, check-compliance                     │
│                                                             │
│  2. 验证门控（Validation）                                 │
│     需要满足条件才能通过                                     │
│     例如：validate-plan 风险评估                              │
│                                                             │
│  3. 时间门控（Time-based）                                 │
│     在特定时间段才能执行                                     │
│     例如：生产部署只能在维护窗口                             │
│                                                             │
│  4. 数量门控（Quota）                                     │
│     限制并发执行数量                                         │
│     例如：同时只能有 2 个生产部署                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 6. 错误处理器

#### 职责

```
错误处理器负责：
- 捕获执行错误
- 分类错误类型
- 执行恢复策略
- 触发回滚流程
- 记录错误日志
```

#### 错误分类

```
┌─────────────────────────────────────────────────────────────┐
│  错误分类                                                    │
│                                                             │
│  1. 输入错误（Input Error）                                  │
│     - 输入参数不合法                                          │
│     - 缺少必要参数                                            │
│     - 参数类型错误                                           │
│     处理：立即返回错误信息                                    │
│                                                             │
│  2. 验证错误（Validation Error）                              │
│     - 输入数据不满足验证条件                                  │
│     - 语法错误                                              │
│     - 格式错误                                              │
│     处理：返回验证失败，提供修复建议                          │
│                                                             │
│  3. 执行错误（Execution Error）                              │
│     - 技能执行失败                                            │
│     - 资源冲突                                              │
│     - 权限不足                                              │
│     处理：执行恢复策略                                      │
│                                                             │
│  4. 系统错误（System Error）                                │
│     - 网络错误                                              │
│     - 服务不可用                                            │
│     处理：重试或等待                                            │
│                                                             │
│  5. 业务错误（Business Error）                               │
│     - 资源配额不足                                          │
│     - 不满足业务规则                                          │
│     处理：返回错误信息，建议人工处理                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 入口层集成和智能功能

### 与入口层的协作

编排器需要与入口层（CLI/Web UI）紧密协作，提供智能化的用户体验：

```
入口层 → 编排器 → 技能层
  ↓        ↓        ↓
用户交互  智能编排  执行任务
检查条件  管理状态  调用服务
提供选项  传递数据  返回结果
```

### 智能缓存策略管理

编排器根据技能类型和当前状态，智能确定缓存策略：

```python
class CacheStrategyManager:
    """缓存策略管理器"""

    def determine_cache_mode(self, skill, params, state):
        """智能确定缓存模式"""

        # 规则1: generate-xac 默认使用缓存
        if skill == 'generate-xac':
            appid = params.get('appid')
            cache_dir = Path(state['data_dir']) / 'cache' / appid

            if not cache_dir.exists():
                # 缓存不存在，自动 discover
                return {
                    'mode': 'fresh',
                    'reason': 'cache_not_exist',
                    'auto_action': 'discover',
                    'message': '缓存不存在，将自动调用 discover-resources'
                }

            # 检查缓存过期
            manifest = load_json(cache_dir / 'manifest.json')
            if is_cache_expired(manifest):
                return {
                    'mode': 'stale_cache',
                    'cached_at': manifest['cache_info']['cached_at'],
                    'expires_at': manifest['cache_info']['expires_at'],
                    'message': '缓存已过期，建议刷新',
                    'user_choice': True  # 让用户选择
                }

            # 缓存有效
            return {
                'mode': 'cache',
                'cached_at': manifest['cache_info']['cached_at'],
                'message': '使用缓存数据'
            }

        # 规则2: validate-plan 总是使用实时数据
        if skill == 'validate-plan':
            return {
                'mode': 'fresh',
                'reason': 'realtime_required',
                'message': '计划验证需要最新数据'
            }

        # 默认混合模式
        return {
            'mode': 'hybrid',
            'message': '混合模式：优先缓存'
        }
```

### 前置条件智能检查

编排器在执行技能前，自动检查前置条件：

```python
class PreFlightChecker:
    """前置条件检查器"""

    def check_all(self, skill, params, state):
        """执行所有前置检查"""

        checks = []

        # 检查1: 项目初始化
        checks.append(self.check_project_initialized(state))

        # 检查2: 技能特定前置条件
        skill_checks = self.get_skill_checks(skill, params)
        checks.extend(skill_checks)

        # 检查3: 数据依赖
        data_checks = self.check_data_dependencies(skill, params, state)
        checks.extend(data_checks)

        return checks

    def check_data_dependencies(self, skill, params, state):
        """检查数据依赖"""

        checks = []

        # generate-xac 需要 discover-resources 的输出
        if skill == 'generate-xac':
            appid = params.get('appid')
            cache_dir = Path(state['data_dir']) / 'cache' / appid

            if not cache_dir.exists():
                checks.append({
                    'type': 'error',
                    'category': 'prerequisite',
                    'message': f'未找到资源数据 (appid: {appid})',
                    'solution': f'请先运行: dk discover --appid {appid}',
                    'auto_fix': True,
                    'fix_action': 'discover-resources'
                })
            else:
                # 检查缓存过期
                manifest = load_json(cache_dir / 'manifest.json')
                if is_cache_expired(manifest):
                    checks.append({
                        'type': 'warning',
                        'category': 'cache',
                        'message': f'资源数据已过期 (appid: {appid})',
                        'solution': f'建议运行: dk discover --appid {appid} --refresh',
                        'auto_fix': True,
                        'fix_action': 'refresh-cache'
                    })

        return checks
```

### 状态持久化和进度跟踪

编排器负责管理执行状态，支持断点续传：

```python
class StateManager:
    """状态管理器"""

    def load_state(self, data_dir):
        """加载项目状态"""

        state_file = Path(data_dir) / 'state.json'

        if not state_file.exists():
            # 创建初始状态
            return {
                'project_id': Path(data_dir).parent.name,
                'initialized_at': datetime.now().isoformat(),
                'last_operation': None,
                'workflow_state': {
                    'current_workflow': None,
                    'current_phase': 'initialized',
                    'completed_skills': [],
                    'pending_skills': [],
                    'total_progress': 0.0
                }
            }

        return load_json(state_file)

    def update_state(self, skill, result):
        """更新执行状态"""

        self.state['last_operation'] = {
            'skill': skill,
            'timestamp': datetime.now().isoformat(),
            'status': 'completed',
            'result': result
        }

        # 更新工作流进度
        if skill not in self.state['workflow_state']['completed_skills']:
            self.state['workflow_state']['completed_skills'].append(skill)

        if skill in self.state['workflow_state']['pending_skills']:
            self.state['workflow_state']['pending_skills'].remove(skill)

        # 计算总进度
        total = len(self.state['workflow_state']['completed_skills']) + \
                len(self.state['workflow_state']['pending_skills'])
        if total > 0:
            self.state['workflow_state']['total_progress'] = \
                len(self.state['workflow_state']['completed_skills']) / total

        self.save_state()

    def can_resume_workflow(self, workflow_name):
        """检查是否可以恢复工作流"""

        if self.state['workflow_state']['current_workflow'] != workflow_name:
            return False

        if len(self.state['workflow_state']['pending_skills']) == 0:
            return False

        return True
```

### 用户交互协调

编排器与入口层协作，提供友好的用户交互：

```python
class UserInteractionCoordinator:
    """用户交互协调器"""

    def present_check_results(self, checks):
        """展示检查结果并获取用户决策"""

        if not checks:
            print("✓ 所有检查通过")
            return True

        # 展示检查结果
        self.display_checks(checks)

        # 错误处理
        error_count = sum(1 for c in checks if c['type'] == 'error')
        if error_count > 0:
            print(f"\n❌ 发现 {error_count} 个错误，无法继续。")
            return False

        # 警告处理
        warning_count = sum(1 for c in checks if c['type'] == 'warning')
        if warning_count > 0:
            choice = input("\n是否继续？[y/N]: ")
            return choice.lower() == 'y'

        return True

    def offer_auto_fix(self, checks):
        """提供自动修复选项"""

        fixable_checks = [c for c in checks if c.get('auto_fix')]

        if not fixable_checks:
            return False

        print("\n可自动修复的问题：")
        for i, check in enumerate(fixable_checks, 1):
            print(f"  {i}. {check['message']}")
            print(f"     修复操作: {check.get('fix_action', 'unknown')}")

        choice = input("\n是否自动修复？[Y/n]: ")
        if choice.lower() == 'y':
            return True

        return False
```

### 智能工作流编排

编排器支持智能工作流，可以根据状态自动调整：

```python
class SmartWorkflowExecutor:
    """智能工作流执行器"""

    def execute_workflow(self, workflow, params, state):
        """执行智能工作流"""

        # 检查是否可以恢复
        if self.can_resume(workflow, state):
            print(f"→ 检测到未完成的工作流: {workflow['name']}")
            print(f"   已完成: {', '.join(state['workflow_state']['completed_skills'])}")
            print(f"   待执行: {', '.join(state['workflow_state']['pending_skills'])}")

            choice = input("\n是否继续？[Y/n]: ")
            if choice.lower() != 'y':
                return

            # 从断点恢复
            start_index = self.find_resume_point(workflow, state)
            steps = workflow['steps'][start_index:]
        else:
            steps = workflow['steps']

        # 执行工作流步骤
        for i, step in enumerate(steps):
            skill = step['skill']
            step_params = {**params, **step.get('params', {})}

            # 检查是否需要暂停
            if step.get('stop_here', False):
                print(f"\n⏸️  工作流暂停于: {skill}")
                print(f"   说明: {step.get('stop_reason', '用户交互')}")
                print(f"   使用 'dk workflow resume {workflow['name']}' 继续")
                break

            # 执行技能
            try:
                result = self.execute_skill(skill, step_params, state)

                # 更新状态
                state['workflow_state']['completed_skills'].append(skill)

            except Exception as e:
                print(f"\n❌ 执行失败: {skill}")
                print(f"   错误: {str(e)}")
                print(f"\n工作流已暂停，状态已保存")
                print(f"   使用 'dk workflow resume {workflow['name']}' 继续")
                raise
```

---

## 执行流程

### 标准执行流程

```
┌─────────────────────────────────────────────────────────────┐
│  1. 接收请求                                                  │
│     - 验证请求格式                                          │
│     - 验证请求权限                                          │
│     - 创建执行上下文                                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  2. 选择工作流                                                │
│     - 根据用户意图选择                                      │
│     - 或直接指定工作流                                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  3. 初始化上下文                                              │
│     - 加载工作流定义                                        │
│     - 加载技能依赖                                          │
│     - 准备初始数据                                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  4. 执行技能序列                                              │
│     for each skill in workflow.skills:                      │
│       4.1 前置检查（门控、条件）                              │
│       4.2 执行技能                                            │
│       4.3 后置处理（钩子、通知）                              │
│       4.4 更新上下文                                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  5. 返回结果                                                  │
│     - 汇总执行结果                                          │
│     - 生成执行报告                                          │
│     - 清理资源                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 接口概念

### 技能接口概念

#### 技能生命周期

```
┌─────────────────────────────────────────────────────────────┐
│  技能生命周期                                                │
│                                                             │
│  1. 注册（Register）                                         │
│     - 技能被发现并加载                                        │
│     - 验证接口合规性                                        │
│     - 注册到技能库                                            │
│                                                             │
│  2. 初始化（Initialize）                                     │
│     - 加载技能配置                                            │
│     - 准备执行环境                                          │
│                                                             │
│  3. 验证（Validate）                                         │
│     - 验证输入数据                                            │
│     - 检查依赖条件                                            │
│                                                             │
│  4. 执行（Execute）                                         │
│     - 执行核心逻辑                                            │
│     - 返回执行结果                                            │
│                                                             │
│  5. 清理（Cleanup）                                         │
│     - 清理临时数据                                          │
│     - 释放资源                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 数据流

### 执行数据流

```
用户请求
    ↓
┌─────────────────────────────────────────────────────────────┐
│  编排器处理                                                  │
│                                                             │
│  1. 解析请求                                                  │
│     input → parsed_request                                 │
│                                                             │
│  2. 选择工作流                                                │
│     intent → workflow                                     │
│                                                             │
│  3. 加载技能                                                  │
│     workflow.skills → skill_instances                      │
│                                                             │
│  4. 执行技能                                                  │
│     for skill in skills:                                   │
│       context + input → skill.execute() → skill_output       │
│                                                             │
│  5. 更新上下文                                                │
│     context + skill_output → updated_context                  │
│                                                             │
│  6. 返回结果                                                  │
│     updated_context → result                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 扩展性设计

### 技能插件化

```
技能插件化支持：
- 动态加载技能
- 支持第三方技能
- 技能市场
```

### 工作流自定义

```
工作流自定义支持：
- YAML 定义
- JSON 定义
- 可视化编辑器
```

### 钩子系统

```
钩子系统支持：
- 前置钩子（pre-skill）
- 后置钩子（post-skill）
- 环绕钩子（around-skill）
```

---

## 监控和日志

### 执行监控

```
监控指标：
- 工作流执行数量
- 技能执行数量
- 成功率统计
- 执行时间分布
- 错误类型分布
```

### 日志记录

```
日志级别：
- DEBUG：详细调试信息
- INFO：关键操作信息
- WARN：警告信息
- ERROR：错误信息

日志内容：
- 工作流执行日志
- 技能执行日志
- 错误堆栈信息
- 性能指标
```

---

## 安全考虑

### 权限控制

```
权限控制层次：
1. 工作流执行权限
2. 技能调用权限
3. 资源操作权限
4. 环境访问权限
```

### 审计日志

```
审计内容：
- 谁用操作者
- 执行时间
- 执行的工作流
- 执行的技能
- 修改的资源
- 操作结果
```

---

## 图表

详见 [diagrams/orchestrator-architecture.png](./diagrams/orchestrator-architecture.png)

---

## 版本信息

- **文档版本**：1.0.0
- **创建日期**：2026-03-25
-编排器版本**：1.0.0
