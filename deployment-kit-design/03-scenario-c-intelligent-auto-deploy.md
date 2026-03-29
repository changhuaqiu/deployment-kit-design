# 场景 C：智能自动部署（基于业务规格）

**文档版本**: 1.0.0
**创建日期**: 2026-03-29
**作者**: Deployment Kit 设计团队
**状态**: 设计阶段

---

## 📋 场景概述

### 场景定义

**场景 C：智能自动部署**是一种面向零基础设施经验用户的端到端自动化部署场景。用户只需提供业务规格信息（如 QPS、用户量等），Deployment Kit 即可自动分析需求、生成 XaC 制品、校验并完成部署。

### 核心特点

- ✅ **零基础设施门槛**：用户无需了解云资源、XaC 代码或部署细节
- ✅ **业务驱动**：基于业务规格（QPS、DAU 等）自动匹配基础设施规格
- ✅ **端到端自动化**：从业务规格到运行中的服务，全自动完成
- ✅ **内化智能**：规格匹配逻辑内化，对用户透明
- ✅ **快速部署**：分钟级完成从需求到部署的全流程

### 适用场景

| 适用人群 | 适用场景 | 不适用场景 |
|---------|---------|-----------|
| 新用户 | 首次部署微服务 | 已有现网资源 |
| 业务开发者 | 不了解基础设施 | 需要从现网导入 |
| 快速原型 | 快速验证业务想法 | 复杂的多服务架构 |
| 小型团队 | 缺乏运维人员 | 需要精细化资源配置 |

---

## 🎯 完整流程

### 流程图

```
用户业务规格
    │
    ├─ "我想部署一个订单服务"
    ├─ QPS: 5000
    ├─ DAU: 10万
    ├─ 存储: 关系型数据库
    └─ 高可用: 是
    │
    ▼
┌─────────────────────────────────┐
│ ① analyze-business-specs       │
│    分析业务规格                 │
│  └─ 识别服务类型、负载特征      │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ ② generate-xac-from-specs       │
│    直接生成 XaC 制品             │
│  └─ 【内化】规格匹配 → 模板选择  │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ ③ validate-xac                  │
│    校验 XaC                      │
│  └─ 语法、计划、合规性检查        │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ ④ execute-xac                   │
│    执行 XaC                      │
│  └─ HEAM 动作：资源申请 → 部署   │
└─────────────────────────────────┘
    │
    ▼
  ✅ 部署成功
```

### 详细步骤

#### 步骤 1：业务规格分析 (analyze-business-specs)

**功能**：理解用户的业务需求

**输入**：
```yaml
user_description: "我想部署一个订单服务"
business_specs:
  traffic:
    qps: 5000              # 每秒请求数
    dau: 100000            # 日活用户
    peak_qps: 10000        # 峰值 QPS
  storage:
    type: "relational"     # 存储类型
    capacity: "1TB"        # 容量
    persistence: true      # 是否持久化
  availability:
    level: "high"          # 可用性等级
    sla: "99.9%"           # SLA 目标
  cost:
    strategy: "performance-first"  # 成本策略
```

**处理**：
```
┌─────────────────────────────────────┐
│ 业务规格分析引擎                     │
├─────────────────────────────────────┤
│ ① 服务类型识别                      │
│    └─ Web服务 / 批处理 / 数据处理   │
│                                     │
│ ② 负载特征分析                      │
│    └─ CPU密集 / IO密集 / 内存密集   │
│                                     │
│ ③ 可用性要求评估                    │
│    └─ 标准 / 高可用 / 容灾          │
│                                     │
│ ④ 存储需求评估                      │
│    └─ 数据库类型、缓存、容量        │
└─────────────────────────────────────┘
```

**输出**：
```yaml
business_spec_analysis:
  service_type: "web-service"
  workload_profile: "io-intensive"
  availability_requirement: "high"
  storage_requirement:
    database: "relational"
    cache: true
  cost_optimization: "performance-first"
```

---

#### 步骤 2：直接生成 XaC 制品 (generate-xac-from-specs)

**功能**：基于业务规格直接生成完整的 XaC 制品（含 HEAM 动作定义）

**核心特点**：
- ✅ **内化规格匹配**：不需要用户理解基础设施规格
- ✅ **自动选择模板**：基于业务特征自动选择合适的 XaC 模板
- ✅ **HEAM 动作内置**：XaC 代码包含完整的资源申请和部署动作

**内部处理流程（黑盒）**：
```
┌─────────────────────────────────────────────────────────┐
│ generate-xac-from-specs 内部流程                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  输入：BusinessSpec                                      │
│    │                                                     │
│    ▼                                                     │
│  ┌─────────────────────────────────────┐                │
│  │ ① 【内化】规格匹配引擎               │                │
│  │                                     │                │
│  │   规则库示例：                       │                │
│  │   IF qps > 1000 AND io_intensive    │                │
│  │   THEN                               │                │
│  │     instance_type = "high-io-8c16gb"│                │
│  │     enable_cache = true             │                │
│  │     db_mode = "master-slave"        │                │
│  │   END IF                             │                │
│  │                                     │                │
│  │   输出：InfraSpec                    │                │
│  └─────────────────────────────────────┘                │
│    │                                                     │
│    ▼                                                     │
│  ┌─────────────────────────────────────┐                │
│  │ ② 模板选择                           │                │
│  │                                     │                │
│  │   基于服务类型 + 规模选择模板：       │                │
│  │   - io-intensive-service.yaml        │                │
│  │   - high-availability-web.yaml       │                │
│  │   - standard-service.yaml            │                │
│  └─────────────────────────────────────┘                │
│    │                                                     │
│    ▼                                                     │
│  ┌─────────────────────────────────────┐                │
│  │ ③ 参数填充                           │                │
│  │                                     │                │
│  │   将 InfraSpec 映射到模板参数：       │                │
│  │   instance_count: 5                 │                │
│  │   instance_type: "high-io-8c16gb"    │                │
│  │   db_spec: "8c32gb-1tb"              │                │
│  │   cache_size: "8gb"                  │                │
│  └─────────────────────────────────────┘                │
│    │                                                     │
│    ▼                                                     │
│  ┌─────────────────────────────────────┐                │
│  │ ④ 添加 HEAM 动作定义                 │                │
│  │                                     │                │
│  │   actions:                          │                │
│  │     - create-resources              │                │
│  │     - deploy-service                │                │
│  │     - verify-deployment             │                │
│  └─────────────────────────────────────┘                │
│    │                                                     │
│    ▼                                                     │
│  输出：完整的 XaC 制品                                   │
└─────────────────────────────────────────────────────────┘
```

**输出示例**：

```yaml
# XaC 制品结构
order-service-xac/
├── main.yaml                    # 主入口（含资源定义 + HEAM 动作）
├── resources/
│   ├── compute.yaml             # 5台高IO实例
│   ├── network.yaml             # 20Mbps ELB，跨AZ
│   └── storage.yaml             # RDS主备 + DCS主备
└── variables.yaml
```

**main.yaml 示例**：
```yaml
metadata:
  name: order-service
  version: 1.0.0

resources:
  compute:
    - name: order-service-deployment
      spec:
        replicas: 5
        template:
          spec:
            containers:
            - resources:
                requests:
                  cpu: "4000m"
                  memory: "8Gi"

  network:
    - name: order-service-elb
      spec:
        bandwidth: 20
        crossAZ: true

  storage:
    - name: order-db
      spec:
        mode: master-slave
        flavor: "8c32gb"
        volume:
          size: 1000

# 🔑 关键：HEAM 动作定义
actions:
  - name: create-infrastructure
    type: heam.resource.create
    steps:
      - name: create-network
        resources: [network]
      - name: create-storage
        resources: [storage]
      - name: create-compute
        resources: [compute]

  - name: deploy-service
    type: heam.service.deploy
    depends_on: [create-infrastructure]
    spec:
      strategy: RollingUpdate
      healthCheck:
        enabled: true
        path: /health

  - name: verify-deployment
    type: heam.service.verify
    depends_on: [deploy-service]
```

---

#### 步骤 3：XaC 校验 (validate-xac)

**功能**：确保生成的 XaC 代码正确、合规、可执行

**校验内容**：
```
┌─────────────────────────────────────┐
│ ① 语法校验 (validate-syntax)       │
│    ├─ YAML 语法检查                 │
│    ├─ 资源定义完整性                │
│    └─ HEAM 动作定义检查             │
│                                     │
│ ② 计划预览 (validate-plan)         │
│    ├─ 解析 HEAM 动作依赖            │
│    ├─ 资源创建顺序预览              │
│    ├─ 预估成本                      │
│    └─ 风险评估                      │
│                                     │
│ ③ 合规检查 (check-compliance)      │
│    ├─ 安全策略检查                  │
│    ├─ 配额检查                      │
│    └─ 命名规范检查                  │
└─────────────────────────────────────┘
```

**输出示例**：
```yaml
validation_result:
  status: "passed"

  syntax_check:
    status: "passed"
    errors: []

  plan_preview:
    resources_to_create: 7
    estimated_time: "8 minutes"
    estimated_cost: "¥2,500/month"
    execution_order:
      - create-network (30s)
      - create-storage (3min)
      - create-compute (2min)
      - deploy-service (2min)
      - verify-deployment (30s)

  compliance_check:
    status: "passed"
    security_group: "compliant"
    quota: "sufficient"
```

---

#### 步骤 4：执行 XaC (execute-xac)

**功能**：执行 XaC 中的 HEAM 动作，完成资源申请和服务部署

**执行流程**：
```
┌─────────────────────────────────────────────────────────┐
│ ① 解析 XaC 代码                                         │
│    └─ 读取 resources 和 actions 定义                    │
│                                                         │
│ ② 构建 HEAM 动作执行图（DAG）                           │
│    create-network                                      │
│         │                                              │
│         ▼                                              │
│    create-storage ─────────┐                           │
│         │                  │                           │
│         ▼                  ▼                           │
│    create-compute      [备用]                           │
│         │                                              │
│         ▼                                              │
│    deploy-service                                       │
│         │                                              │
│         ▼                                              │
│    verify-deployment                                     │
│                                                         │
│ ③ 按拓扑顺序执行 HEAM 动作                              │
│    ├─ heam.resource.create（资源申请）                 │
│    ├─ heam.service.deploy（服务部署）                  │
│    └─ heam.service.verify（部署验证）                  │
│                                                         │
│ ④ 处理执行结果                                         │
│    ├─ 成功：记录资源信息、访问地址                      │
│    ├─ 失败：自动回滚已创建的资源                        │
│    └─ 超时：重试或告警                                  │
└─────────────────────────────────────────────────────────┘
```

**输出示例**：
```yaml
execution_result:
  status: "success"

  actions_executed:
    - name: create-infrastructure
      status: "completed"
      duration: "5m32s"
      resources_created:
        - type: "VPC"
          id: "vpc-xxx"
        - type: "RDS"
          id: "rds-xxx"
          mode: "master-slave"
        - type: "CCE"
          replicas: 5

    - name: deploy-service
      status: "completed"
      duration: "2m18s"
      deployment_status: "running"

    - name: verify-deployment
      status: "completed"
      health_check: "passed"

  access_info:
    service_url: "http://order-service.example.com"
    database_connection: "mysql-rds-xxx.huaweicloud.com:3306"
    console_url: "https://console.huaweicloud.com/xxx"
```

---

## 🔑 核心技能定义

### 1. analyze-business-specs

**技能类型**：分析技能

**功能**：分析用户的业务规格，生成结构化的业务需求描述

**输入**：
- 用户描述（自然语言）
- 业务规格参数（QPS、DAU、存储需求等）

**输出**：
- 结构化的业务规格对象（BusinessSpec）

**实现要点**：
- 自然语言处理（解析用户描述）
- 规则引擎（识别服务类型、负载特征）
- 专家系统（评估可用性、存储需求）

### 2. generate-xac-from-specs

**技能类型**：生成技能

**功能**：基于业务规格直接生成完整的 XaC 制品

**输入**：
- BusinessSpec（业务规格对象）

**输出**：
- 完整的 XaC 代码（包含资源定义 + HEAM 动作）

**核心特点**：
- **内化规格匹配**：规格匹配逻辑对用户透明
- **自动模板选择**：基于业务特征自动选择模板
- **HEAM 动作内置**：生成的 XaC 可直接执行

**内部模块**：
```
generate-xac-from-specs/
├── spec_matcher/        # 规格匹配引擎（内化）
│   ├── rules.yaml       # 匹配规则库
│   └── matcher.py       # 匹配引擎
├── templates/           # XaC 模板库
│   ├── lightweight-service.yaml
│   ├── standard-service.yaml
│   ├── io-intensive-service.yaml
│   └── high-availability-service.yaml
└── heam_builder/        # HEAM 动作构建器
    └── builder.py       # 生成 HEAM 动作定义
```

### 3. execute-xac

**技能类型**：执行技能

**功能**：执行 XaC 代码，通过 HEAM 协议完成资源申请和服务部署

**输入**：
- XaC 代码（包含 HEAM 动作定义）

**输出**：
- 部署结果报告

**核心功能**：
- 解析 HEAM 动作定义
- 构建动作执行图（DAG）
- 按拓扑顺序执行动作
- 错误处理和自动回滚

---

## 📊 与其他场景的对比

| 维度 | 场景 A（新建-从现网） | 场景 B（更新已有） | **场景 C（智能自动部署）** |
|------|---------------------|-------------------|-------------------------|
| **适用场景** | 已有现网资源 | 已有服务，需要更新 | **全新服务，零基础** |
| **用户技能要求** | 需要了解云资源 | 需要了解 XaC | **仅需了解业务** |
| **触发时机** | 测试阶段 | 开发阶段 | **需求/编码阶段** |
| **输入** | 现网资源 | 代码变更 + 基线 | **业务规格（QPS、DAU等）** |
| **XaC 生成方式** | 从现网反向生成 | 增量更新 | **从业务规格正向生成** |
| **技能链路** | discover → generate → validate | update → validate → test | **analyze → generate → validate → execute** |
| **自动化程度** | 半自动 | 半自动 | **全自动** |
| **部署方式** | 手动触发 | 手动触发 | **自动执行** |
| **门槛** | 中 | 中 | **低** |
| **速度** | 慢（需要现网） | 中 | **快** |
| **成本优化** | 无 | 手动优化 | **内置成本优化** |

---

## 💡 核心价值

### 1️⃣ 零门槛

```
传统方式：
开发者需要学习：
├─ 云平台资源类型（ECS、RDS、ELB...）
├─ 资源规格选择（4核8G vs 8核16G？）
├─ 网络安全配置（VPC、子网、安全组...）
└─ Terraform/XaC 语法

场景 C 方式：
开发者只需要：
└─ 描述业务需求（QPS、用户量等）
```

### 2️⃣ 标准化最佳实践

```
内置规则库 = 专家经验

✅ 资源选型最佳实践
   └─ 自动选择合适的实例类型、存储类型

✅ 高可用配置最佳实践
   └─ 自动配置多实例、跨可用区、主备

✅ 成本优化最佳实践
   └─ 自动在性能和成本间平衡

✅ 安全配置最佳实践
   └─ 自动配置安全组、网络隔离
```

### 3️⃣ 端到端自动化

```
用户请求 → 自动生成 XaC → 自动执行 → 部署完成
             │                  │
             └──────────────────┘
                        全自动，零人工干预
```

### 4️⃣ 快速交付

```
时间对比：

传统方式：1-2天
├─ 学习资源类型：2小时
├─ 手动编写 XaC：4小时
├─ 测试验证：2小时
└─ 部署调试：4小时

场景 C：10分钟
├─ 描述业务需求：2分钟
├─ 自动生成 XaC：1分钟
├─ 自动校验：2分钟
└─ 自动部署：5分钟
```

---

## 🚀 使用示例

### CLI 命令

```bash
# 交互式方式
dk auto-deploy

# 通过参数指定
dk auto-deploy \
  --service-type "web-service" \
  --qps 5000 \
  --dau 100000 \
  --storage "relational" \
  --availability "high" \
  --cost-strategy "performance-first"

# 通过配置文件
dk auto-deploy --config business-specs.yaml
```

### 配置文件示例

**business-specs.yaml**：
```yaml
service:
  name: "order-service"
  description: "订单微服务"
  type: "web-service"

traffic:
  qps: 5000
  peak_qps: 10000
  dau: 100000

storage:
  type: "relational"
  capacity: "1TB"
  cache: true

availability:
  level: "high"
  sla: "99.9%"

cost:
  strategy: "performance-first"
  budget: "5000/month"
```

### 执行输出

```bash
$ dk auto-deploy --config business-specs.yaml

✅ 分析业务规格...
   ✓ 服务类型：Web 服务
   ✓ 负载特征：IO 密集型
   ✓ 可用性要求：高可用

✅ 生成 XaC 制品...
   ✓ 选择模板：io-intensive-service
   ✓ 匹配规格：5台高IO实例
   ✓ 添加 HEAM 动作定义

✅ 校验 XaC...
   ✓ 语法检查：通过
   ✓ 计划预览：7个资源，预计8分钟，¥2,500/月
   ✓ 合规检查：通过

✅ 执行部署...
   ✓ create-infrastructure (5m32s)
   ✓ deploy-service (2m18s)
   ✓ verify-deployment (30s)

🎉 部署成功！

访问信息：
  • 服务地址：http://order-service.example.com
  • 数据库：mysql-rds-xxx.huaweicloud.com:3306
  • 控制台：https://console.huaweicloud.com/xxx
```

---

## 🔧 实现路线图

### Phase 1：MVP（最小可行产品）

**目标**：支持基础 Web 服务的自动部署

**功能**：
- ✅ 支持基础服务类型（Web服务）
- ✅ 基于规则引擎的规格匹配
- ✅ 预定义模板库（3个模板）
- ✅ HEAM 动作定义和执行
- ✅ 基础校验（语法、计划）

**预计时间**：2个月

### Phase 2：增强版

**目标**：支持更多服务类型和优化

**功能**：
- ✅ 支持多种服务类型（批处理、数据处理）
- ✅ 引入 ML 模型优化规格推荐
- ✅ 支持成本优化建议
- ✅ 支持多环境部署（dev/test/prod）
- ✅ 增强的校验能力（合规性、安全）

**预计时间**：2个月

### Phase 3：智能化

**目标**：基于 AI 的智能化推荐和优化

**功能**：
- ✅ 自然语言理解（解析用户描述）
- ✅ 基于历史数据的持续学习
- ✅ 智能成本优化
- ✅ 自动化容量规划
- ✅ 故障自愈

**预计时间**：3个月

---

## 📚 相关文档

- [01-overview.md](./01-overview.md) - Deployment Kit 概述
- [02-skills-definition-standard.md](./02-skills-definition-standard.md) - 技能定义规范
- [03-skill-relationships.md](./03-skill-relationships.md) - 技能关系
- [04-workflows.md](./04-workflows.md) - 预定义工作流

---

## 🔗 参考资源

**内部参考**：
- HEAM 协议规范
- XaC 代码规范
- 资源匹配规则库

**外部参考**：
- [Terraform 最佳实践](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)
- [基础设施即代码（IaC）指南](https://www.atlassian.com/devops/devops-practices/infrastructure-as-code)

---

**文档结束**
