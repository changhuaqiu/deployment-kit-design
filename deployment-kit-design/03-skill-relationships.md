# 技能关系和依赖

本文档描述 Deployment Kit 中 20 个技能之间的关系、依赖和数据流。

## 技能关系类型

### 关系类型定义

```
1. 顺序依赖（Sequential）
   定义：技能 B 必须在技能 A 之后执行
   表示：A → B
   示例：generate-xac → validate-syntax

2. 条件触发（Conditional）
   定义：满足条件时才执行技能
   表示：if condition then skill
   示例：if deploy_failed then analyze-failure

3. 门控（Gate）
   定义：技能必须通过才能继续
   表示：A [gate] → B
   示例：review-code [gate] → test-deploy

4. 可选依赖（Optional）
   定义：可以使用其他技能的输出，但不是必须
   表示：A [optional] → B
   示例：generate-xac [optional] → review-code

5. 并发执行（Parallel）
   定义：多个技能可以同时执行
   表示：A || B
   示例：monitor-deployment || monitor-resources

6. 嵌套（Nested）
   定义：一个技能包含另一个技能
   表示：A 包含 B
   示例：test-deploy 包含 monitor-deployment
```

## 技能依赖矩阵

### 完整依赖关系图

```
开发阶段：
discover-resources → generate-xac → review-code [gate]
                            ↓
                      validate-syntax
                            ↓
                      validate-plan

更新阶段：
discover-resources → update-xac → review-code [gate]
                            ↓
                      validate-syntax
                            ↓
                      validate-plan

部署阶段：
validate-plan → test-deploy → monitor-deployment
                            ↓
                      monitor-resources

生产部署：
review-code [gate] → check-compliance [gate] → validate-plan
                                      ↓
                                dry-run-rehearsal
                                      ↓
                                evaluate-canary [gate]
                                      ↓
                                deploy-production
                                      ↓
                                monitor-deployment
                                      ↓
                                monitor-resources

应急流程：
任何部署失败 → analyze-failure → diagnose-error → auto-fix [optional]
                                                      ↓
                                                rollback-deployment
```

### 技能依赖表

| 技能 | 依赖的技能 | 被依赖的技能 |
|------|-----------|-----------|
| discover-resources | 无 | generate-xac, update-xac |
| generate-xac | discover-resources [可选] | review-code, validate-syntax, validate-plan |
| update-xac | discover-resources | review-code, validate-syntax, validate-plan |
| review-code | generate-xac, update-xac | validate-plan [gate] |
| validate-syntax | generate-xac, update-xac | validate-plan |
| validate-plan | validate-syntax | test-deploy, deploy-production, dry-run-rehearsal |
| check-compliance | 无 | deploy-production [gate] |
| test-deploy | validate-plan | monitor-deployment, monitor-resources |
| deploy-production | dry-run-rehearsal, evaluate-canary | monitor-deployment, monitor-resources |
| analyze-failure | 任何部署技能 | diagnose-error, rollback-deployment |
| diagnose-error | analyze-failure | auto-fix, rollback-deployment |
| auto-fix | diagnose-error | rollback-deployment |
| rollback-deployment | diagnose-error, auto-fix | 无 |
| dry-run-rehearsal | validate-plan | evaluate-canary |
| evaluate-canary | monitor-resources, monitor-deployment | deploy-production [gate] |
| deploy-canary | evaluate-canary | monitor-resources, monitor-deployment |
| monitor-deployment | test-deploy, deploy-production, deploy-canary | 无 |
| monitor-resources | test-deploy, deploy-production, deploy-canary | evaluate-canary |
| manage-config | 无 | 所有技能 [optional] |
| manage-version | 无 | 所有技能 [optional] |

## 数据流

### 核心数据流

```
┌─────────────────────────────────────────────────────────────┐
│  开发阶段数据流                                              │
└─────────────────────────────────────────────────────────────┘

discover-resources
  └─→ resource_inventory
      └─→ dependency_graph
          └─→ generate-xac
              └─→ XaC_package
                  ├─→ review-code → review_report
                  ├─→ validate-syntax → syntax_report
                  └─→ validate-plan → plan_report + risk_assessment

┌─────────────────────────────────────────────────────────────┐
│  部署阶段数据流                                              │
└─────────────────────────────────────────────────────────────┘

validate-plan
  └─→ plan_report + risk_assessment
      └─→ test-deploy
          └─→ deploy_result + test_report
              ├─→ monitor-deployment → monitor_status
              └─→ monitor-resources → health_status

┌─────────────────────────────────────────────────────────────┐
│  失败处理数据流                                              │
└─────────────────────────────────────────────────────────────┘

任何部署失败
  └─→ error_info
      └─→ analyze-failure → diagnosis
          ├─→ diagnose-error → root_cause
          ├─→ auto-fix [optional] → fix_result
          └─→ rollback-deployment → rollback_result
```

## 技能组合模式

### 模式 1：线性流水线

```
适用场景：标准部署流程

discover → generate → review → validate → test → monitor
```

### 模式 2：带门控的流水线

```
适用场景：生产部署流程

review [gate] → compliance [gate] → validate → dry-run [gate] → deploy
```

### 模式 3：应急处理流程

```
适用场景：部署失败

failed → analyze → diagnose → [auto-fix] → rollback
```

### 模式 4：监控增强流程

```
适用场景：任何部署

deploy → [monitor-deployment || monitor-resources]
```

## 技能分类关系

```
核心技能（主要流程）
├─ 开发类：discover, generate, update
├─ 验证类：validate-syntax, validate-plan
├─ 部署类：test-deploy, deploy-production
└─ 分析类：analyze-failure, evaluate-canary

质量技能（质量保证）
├─ 审查类：review-code, check-compliance
└─ 监控类：monitor-deployment, monitor-resources

管理技能（跨阶段）
├─ 配置类：manage-config
└─ 版本类：manage-version

应急技能（异常处理）
├─ 诊断类：diagnose-error
├─ 修复类：auto-fix
├─ 回滚类：rollback-deployment
└─ 预防类：dry-run-rehearsal, deploy-canary
```

## 关键依赖路径

### 路径 1：新用户完整路径

```
discover → generate → review → validate-syntax → validate-plan → test → monitor
```

**关键点**：
- review 是门控，必须通过
- validate-plan 是关键检查点

### 路径 2：失败处理路径

```
任何部署失败 → analyze → diagnose → [auto-fix] → rollback
```

**关键点**：
- analyze 是必需的
- auto-fix 是可选的
- rollback 是最后手段

### 路径 3：生产部署路径

```
review [gate] → compliance [gate] → validate → dry-run → canary-eval [gate] → deploy
```

**关键点**：
- 多个门控
- dry-run 是演练
- canary-eval 是最后决策点

## 技能版本兼容性

### 版本兼容规则

```
MAJOR 版本变更：
- 不兼容的变更
- 需要手动迁移
- 可能影响依赖的技能

MINOR 版本变更：
- 向后兼容
- 新增功能
- 自动升级

PATCH 版本变更：
- bug 修复
- 向后兼容
- 建议升级
```

## 依赖冲突处理

### 冲突类型和解决

```
冲突类型 1：循环依赖
示例：A → B → A
解决：重构技能，消除循环

冲突类型 2：版本冲突
示例：A v1.0 依赖 B v2.0，但只有 B v1.0
解决：升级 B 到 v2.0，或降级 A

冲突类型 3：资源冲突
示例：A 和 B 同时修改同一资源
解决：串行执行，或设置优先级
```

## 图表

### 技能关系图

详见 [diagrams/skill-relationships.png](./diagrams/skill-relationships.png)

### 数据流图

详见 [diagrams/data-flow.png](./diagrams/data-flow.png)

### 状态转换图

详见 [diagrams/state-transitions.png](./diagrams/state-transitions.png)

## 版本信息

- **文档版本**：2.0.0
- **创建日期**：2026-03-25
- **更新日期**：2026-03-26
- **作者**：部署桌面设计团队
