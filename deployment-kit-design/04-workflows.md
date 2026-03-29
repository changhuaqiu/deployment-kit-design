# 预定义工作流

本文档定义 Deployment Kit 的 9 个预定义工作流，包括技能组合、执行顺序、门控条件和处理逻辑。

## 工作流概述

### 工作流列表

1. **new-user-full** - 新用户完整流程
2. **existing-user-update** - 老用户更新流程
3. **auto-deploy-on-merge** - 自动触发部署
4. **production-deployment** - 生产部署流程
5. **failure-handling** - 失败处理流程
6. **validate-only** - 仅验证流程
7. **canary-deployment** - 灰度发布流程
8. **emergency-rollback** - 紧急回滚流程
9. **intelligent-auto-deploy** - 智能自动部署（基于业务规格）🆕

---

## 工作流详细定义

### 1. new-user-full（新用户完整流程）

#### 概述

**目的**：帮助新用户从现网资源到测试部署的完整流程

**适用场景**：
- 第一次使用 XaC 部署
- 从现有资源导入
- 完整的端到端流程

#### 技能序列

```
discover-resources
    ↓
generate-xac
    ↓
review-code [gate]
    ↓
validate-syntax
    ↓
validate-plan
    ↓
test-deploy
    ↓
monitor-deployment
    ↓
monitor-resources
```

#### 门控条件

| 门控点 | 条件 | 失败处理 |
|--------|------|---------|
| review-code | 必须通过 | 阻止，返回修复 |
| validate-syntax | 必须通过 | 阻止，返回修复 |
| validate-plan | 风险可接受 | 风险高则警告，继续 |

#### 输入

```yaml
user_info:
  name: "新用户"
  provider: "huawei-cloud"
  region: "cn-north-1"

resources:
  scan_existing: true
  filters:
    types: ["ADS", "ELB", "RDS"]

deployment:
  target_environment: "test"
  auto_deploy: true
```

#### 预期输出

```yaml
result:
  status: "suadsss"

  discovered_resources:
    total: 42
    by_type: {...}

  XaC_package:
    path: "./XaC-output"
    format: "terraform"

  review_result:
    status: "approved"

  validation_result:
    syntax: "passed"
    plan: "passed"

  deploy_result:
    status: "suadsss"
    resources_created: 8
    duration: "5m 23s"

  monitoring:
    deployment_id: "deploy-20250325-001"
    status: "monitoring"
```

---

### 2. existing-user-update（老用户更新流程）

#### 概述

**目的**：帮助老用户更新已有 XaC 代码

**适用场景**：
- 已有 XaC 代码
- 需要更新配置
- 增量部署

#### 技能序列

```
discover-resources（检测变化）
    ↓
update-xac
    ↓
review-code [gate]
    ↓
validate-syntax
    ↓
validate-plan
    ↓
test-deploy
    ↓
monitor-deployment
    ↓
monitor-resources
```

#### 关键差异

与新建流程的差异：
- 使用 update-xac 而不是 generate-xac
- discover-resources 用于检测变化，不是全量扫描

---

### 3. auto-deploy-on-merge（自动触发部署）

#### 概述

**目的**：代码合入时自动触发部署

**适用场景**：
- CI/CD 集成
- 自动化测试部署
- 持续集成/持续部署

#### 技能序列

```
manage-trigger（接收代码合入事件）
    ↓
validate-syntax（快速验证）
    ↓
validate-plan
    ↓
test-deploy
    ↓
monitor-deployment
    ↓
manage-notification（发送通知）
```

#### 触发方式

```yaml
trigger:
  type: "code_merge"
  source: "git"
  events:
    - pull_request_merged
    - push_to_main_branch

conditions:
  branches:
    - "develop"
    - "feature/*"

  files:
    patterns:
      - "**/*.tf"
      - "**/modules/**"
```

#### 执行策略

```yaml
execution:
  async: true

  queue:
    max_concurrent: 3
    priority: "first-come-first-served"

  timeout:
    deployment: "30m"

  on_failure:
    notify: ["author", "team-leads"]
    block_merge: false
```

---

### 4. production-deployment（生产部署流程）

#### 概述

**目的**：安全地将 XaC 代码部署到生产环境

**适用场景**：
- 生产环境首次部署
- 生产环境更新
- 需要严格风险控制

#### 技能序列

```
review-code [gate]
    ↓
check-compliance [gate]
    ↓
validate-plan
    ↓
dry-run-rehearsal [gate]
    ↓
evaluate-canary [gate]
    ↓
deploy-production
    ↓
monitor-deployment
    ↓
monitor-resources
```

#### 多层门控

```yaml
gates:
  review-code:
    approvers: ["tech-lead", "architect"]
    min_approvals: 2

  check-compliance:
    checks:
      - security_scan
      - policy_check
      - risk_assessment
    all_must_pass: true

  dry-run-rehearsal:
    suadsss_criteria:
      - all_tests_passed
      - no_critical_issues

  evaluate-canary:
    metrics:
      - suadsss_rate: "> 99%"
      - error_rate: "< 0.1%"
      - latency_p95: "< 200ms"
    duration: "24h"
```

#### 预演环节

```yaml
dry-run-rehearsal:
  type: "simulation"
  environment: "staging-like-production"

  steps:
    - name: "plan_validation"
      execute: terraform plan

    - name: "resource_creation_test"
      create_resources: true
      cleanup_after: true

    - name: "connectivity_test"
      test_endpoints: true

    - name: "load_test"
      simulate_production_traffic: true
```

---

### 5. failure-handling（失败处理流程）

#### 概述

**目的**：处理部署失败，诊断和恢复

**适用场景**：
- 任何部署失败
- 需要快速诊断
- 需要快速恢复

#### 技能序列

```
analyze-failure（捕获失败）
    ↓
diagnose-error（诊断根因）
    ↓
auto-fix [optional]（尝试自动修复）
    ↓
rollback-deployment（回滚）
    ↓
manage-notification（通知相关人员）
```

#### 失败分类

```yaml
failure_types:
  syntax_error:
    severity: "low"
    auto_fix_available: true
    action: "fix_and_retry"

  validation_error:
    severity: "medium"
    auto_fix_available: true
    action: "fix_and_retry"

  resource_creation_error:
    severity: "high"
    auto_fix_available: false
    action: "rollback_and_notify"

  deployment_timeout:
    severity: "high"
    auto_fix_available: false
    action: "rollback_and_investigate"

  runtime_error:
    severity: "high"
    auto_fix_available: false
    action: "rollback_and_notify"
```

#### 自动修复策略

```yaml
auto_fix:
  enabled_fixes:
    - syntax_errors: true
    - validation_warnings: true
    - configuration_issues: true

  disabled_fixes:
    - resource_deletion: true
    - critical_resources: true

  rollback_threshold:
    max_fix_attempts: 3
    fix_duration: "10m"
```

---

### 6. validate-only（仅验证流程）

#### 概述

**目的**：只验证 XaC 代码，不执行部署

**适用场景**：
- XaC代码审查阶段
- 部署前检查
- 风险评估

#### 技能序列

```
validate-syntax
    ↓
validate-plan
    ↓
review-code
    ↓
check-compliance
```

#### 输出

```yaml
validation_report:
  syntax:
    status: "passed"

  plan:
    status: "passed"
    changes:
      create: 5
      update: 2
      delete: 0

  review:
    status: "approved"
    comments: []

  compliance:
    status: "passed"
    checks:
      security: "passed"
      policy: "passed"

  overall:
    status: "passed"
    can_deploy: true
    risk_level: "low"
```

---

### 7. canary-deployment（灰度发布流程）

#### 概述

**目的**：通过灰度发布降低风险

**适用场景**：
- 生产环境重要更新
- 需要逐步切换
- 需要实时监控

#### 技能序列

```
deploy-canary（部署灰度版本）
    ↓
monitor-resources（持续监控）
    ↓
evaluate-canary（评估效果）[gate]
    ↓
    ├─ suadsss → deploy-all（全量部署）
    └─ failed → rollback-deployment（回滚）
```

#### 灰度策略

```yaml
canary_strategy:
  phases:
    - name: "phase-1"
      percentage: 5
      duration: "1h"
      suadsss_criteria:
        - error_rate: "< 0.5%"
        - latency_p99: "< 500ms"

    - name: "phase-2"
      percentage: 20
      duration: "2h"
      suadsss_criteria:
        - error_rate: "< 0.3%"
        - latency_p99: "< 300ms"

    - name: "phase-3"
      percentage: 50
      duration: "4h"
      suadsss_criteria:
        - error_rate: "< 0.2%"
        - latency_p99: "< 200ms"

    - name: "phase-4"
      percentage: 100
      duration: "24h"
      suadsss_criteria:
        - error_rate: "< 0.1%"
        - latency_p99: "< 150ms"

  rollback_triggers:
    error_rate_threshold: 1.0
    latency_threshold: "5s"
    manual_abort: true
```

---

### 8. emergency-rollback（紧急回滚流程）

#### 概述

**目的**：快速回滚失败的部署

**适用场景**：
- 部署失败
- 生产问题
- 紧急恢复

#### 技能序列

```
rollback-deployment（立即回滚）
    ↓
verify-rollback（验证回滚）
    ↓
monitor-resources（监控恢复）
    ↓
manage-notification（通知相关人员）
```

#### 回滚策略

```yaml
rollback:
  type: "fast"

  triggers:
    - deployment_failure
    - manual_trigger
    - health_check_failed
    - error_rate_threshold_exceeded

  actions:
    - stop_current_deployment
    - restore_previous_state
    - verify_resources
    - notify_status

  verification:
    - check_resource_state: true
    - check_connectivity: true
    - health_check: true
```

---

## 工作流组合

### 工作流选择树

```
用户需求
    │
    ├─ 新用户？
    │   ├─ 是 → new-user-full
    │   └─ 否 → 继续
    │
    ├─ 代码合入？
    │   ├─ 是 → auto-deploy-on-merge
    │   └─ 否 → 继续
    │
    ├─ 生产环境？
    │   ├─ 是 → production-deployment
    │   └─ 否 → 继续
    │
    ├─ 需要验证？
    │   ├─ 是 → validate-only
    │   └─ 否 → 继续
    │
    ├─ 需要灰度？
    │   ├─ 是 → canary-deployment
    │   └─ 否 → 继续
    │
    └─ 部署失败？
        ├─ 是 → failure-handling
        └─ 紧急 → emergency-rollback
```

---

## 工作流元数据

每个工作流都包含以下元数据：

```yaml
workflow_name:
  id: "unique-id"
  name: "工作流名称"
  version: "1.0.0"

  triggers:
    - trigger_type: "user_intent"
      conditions: {...}

  skills:
    - skill_name
      order: 1
      required: true
      parameters: {...}

  gates:
    - skill_name
      condition: "must_pass"
      action_on_fail: "stop"

  input_schema:
    type: "object"
    properties: {...}

  output_schema:
    type: "object"
    properties: {...}

  estimated_duration: "10m"

  rollback_workflow: "emergency-rollback"
```

---

## 工作流版本管理

### 版本演进

```
v1.0.0 (初始版本)
- 基础工作流定义
- 核心技能组合

v1.1.0 (优化版本)
- 优化技能顺序
- 增加新的门控
- 改进错误处理

v2.0.0 (重大变更)
- 重新设计工作流结构
- 新增工作流类型
- 调整技能依赖
```

---

### 9. intelligent-auto-deploy（智能自动部署）

#### 概述

**目的**：为零基础设施经验的用户提供端到端自动化部署

**适用场景**：
- 首次部署微服务，无现网资源
- 用户不了解云资源或 XaC
- 快速原型验证
- 需要从业务需求自动生成基础设施

**核心特点**：
- ✅ **零门槛**：用户只需提供业务规格（QPS、DAU 等）
- ✅ **端到端自动化**：从业务规格到运行中的服务
- ✅ **内化智能**：规格匹配逻辑对用户透明
- ✅ **快速部署**：分钟级完成

#### 技能序列

```
analyze-business-specs
    ↓
generate-xac-from-specs (内化规格匹配)
    ↓
validate-xac
    ├─ validate-syntax
    ├─ validate-plan
    └─ check-compliance
    ↓
execute-xac (执行 HEAM 动作)
    ├─ create-resources
    ├─ deploy-service
    └─ verify-deployment
```

#### 门控条件

| 门控点 | 条件 | 失败处理 |
|--------|------|---------|
| validate-xac | 必须通过 | 阻止，显示错误并提供优化建议 |
| execute-xac | 成功创建资源 | 失败自动回滚 |

#### 输入

```yaml
business_specs:
  service:
    name: "order-service"
    description: "订单微服务"
    type: "web-service"

  traffic:
    qps: 5000              # 每秒请求数
    peak_qps: 10000        # 峰值 QPS
    dau: 100000            # 日活用户

  storage:
    type: "relational"     # 存储类型
    capacity: "1TB"        # 容量
    cache: true            # 是否需要缓存

  availability:
    level: "high"          # 可用性等级
    sla: "99.9%"           # SLA 目标

  cost:
    strategy: "performance-first"  # 成本策略
    budget: "5000/month"           # 预算
```

#### 预期输出

```yaml
result:
  status: "success"

  business_analysis:
    service_type: "web-service"
    workload_profile: "io-intensive"
    availability_requirement: "high"

  xac_artifact:
    path: "./order-service-xac"
    resources:
      compute:
        - type: "CCE.Deployment"
          replicas: 5
          instance_type: "high-io-8c16gb"
      network:
        - type: "ELB.LoadBalancer"
          bandwidth: 20
          crossAZ: true
      storage:
        - type: "RDS.Instance"
          mode: "master-slave"
          flavor: "8c32gb"
          volume: { size: 1000 }

  validation_result:
    syntax: "passed"
    plan:
      resources_to_create: 7
      estimated_time: "8 minutes"
      estimated_cost: "¥2,500/month"
    compliance: "passed"

  execution_result:
    status: "success"
    duration: "7m50s"

    actions_executed:
      - name: create-infrastructure
        status: "completed"
        duration: "5m32s"
      - name: deploy-service
        status: "completed"
        duration: "2m18s"

    access_info:
      service_url: "http://order-service.example.com"
      database_connection: "mysql-rds-xxx.huaweicloud.com:3306"
      console_url: "https://console.huaweicloud.com/xxx"
```

#### 详细说明

**步骤 1：analyze-business-specs**
```
功能：分析用户的业务规格

处理：
├─ 识别服务类型（Web/批处理/数据处理）
├─ 分析负载特征（CPU密集/IO密集/内存密集）
├─ 评估可用性要求（标准/高可用/容灾）
└─ 评估存储需求（数据库类型、缓存、容量）

输出：结构化的业务规格对象（BusinessSpec）
```

**步骤 2：generate-xac-from-specs**
```
功能：基于业务规格直接生成完整的 XaC 制品

内部处理（黑盒）：
├─ 【内化】规格匹配引擎
│  └─ 规则库匹配 → 资源规格计算
├─ 自动选择合适的 XaC 模板
├─ 填充模板参数
└─ 添加 HEAM 动作定义

输出：完整的 XaC 代码（包含资源定义 + HEAM 动作）
```

**步骤 3：validate-xac**
```
功能：确保生成的 XaC 代码正确、合规、可执行

校验内容：
├─ 语法校验（validate-syntax）
├─ 计划预览（validate-plan）
└─ 合规检查（check-compliance）
```

**步骤 4：execute-xac**
```
功能：执行 XaC 中的 HEAM 动作，完成资源申请和服务部署

执行流程：
├─ 解析 XaC 中的 HEAM 动作
├─ 构建动作执行图（DAG）
├─ 按拓扑顺序执行
│  ├─ heam.resource.create（资源申请）
│  ├─ heam.service.deploy（服务部署）
│  └─ heam.service.verify（部署验证）
└─ 错误处理和自动回滚
```

#### 错误处理

```yaml
error_handling:
  analyze-business-specs:
    on_invalid_input:
      action: "prompt_for_correction"
      message: "请提供完整的业务规格信息"

  generate-xac-from-specs:
    on_no_matching_template:
      action: "use_default_template"
      message: "未找到匹配的模板，使用默认模板"
    on_validation_failure:
      action: "show_optimization_suggestions"
      message: "生成的 XaC 存在问题，建议优化"

  validate-xac:
    on_syntax_error:
      action: "auto_fix_or_report"
      message: "语法错误，尝试自动修复"
    on_compliance_failure:
      action: "show_compliance_issues"
      message: "合规检查失败，请查看问题详情"

  execute-xac:
    on_resource_creation_failure:
      action: "auto_rollback"
      message: "资源创建失败，自动回滚已创建的资源"
    on_deployment_failure:
      action: "diagnose_and_rollback"
      message: "部署失败，诊断问题并回滚"
```

#### 使用示例

```bash
# CLI 命令
dk auto-deploy \
  --service-type "web-service" \
  --qps 5000 \
  --dau 100000 \
  --storage "relational" \
  --availability "high"

# 或使用配置文件
dk auto-deploy --config business-specs.yaml
```

#### 相关文档

- [03-scenario-c-intelligent-auto-deploy.md](./03-scenario-c-intelligent-auto-deploy.md) - 详细场景说明

---

## 图表

### 工作流流程图

详见 [diagrams/workflows.png](./diagrams/workflows.png)

### 状态转换图

详见 [diagrams/workflow-state-transitions.png](./diagrams/workflow-state-transitions.png)

---

## 版本信息

- **文档版本**：1.1.0
- **创建日期**：2026-03-25
- **更新日期**：2026-03-29
- **工作流数量**：9 个
- **变更记录**：新增 intelligent-auto-deploy 工作流
