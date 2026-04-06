## 1.Architecture design
```mermaid
graph TD
  A["User Browser"] --> B["React Frontend (Pixel Prototype)"]
  B --> C["Deploy Control Plane API"]
  C --> D["deploy-kit Orchestrator + Skills"]
  D --> E["Cloud Providers / K8s / SaaS"]
  D --> F["IaC Tooling (Terraform/CFN)"]
  D --> G["SCM/CI (Git, Pipelines)"]

  subgraph "Client"
    B
  end
  subgraph "Control Plane"
    C
    D
  end
```

## 2.Technology Description
- Frontend: React@18 + Vite + TailwindCSS
- Backend: Python（deploy-kit：Orchestrator/StateManager/CacheManager/SkillLoader/MCPCaller）
- API Layer: 可选（将 deploy-kit 封装为 HTTP API，支持 run/stream logs/resume）；原型阶段可先本地模拟

## 3.Route definitions
| Route | Purpose |
|-------|---------|
| /map | 变更地图（首页）：关卡总览与任务列表 |
| /workshop/:id | IaC 工坊：现网扫描、生成/同步 IaC、输出 patch/工程 |
| /changes/:id | 变更关卡：diff、风险提示、评审与审批 |
| /runs/:id | 部署战报：时间轴、日志、复盘与回滚（原型为模拟） |

## 6.Data model(if applicable)

### 6.1 Data model definition
```mermaid
erDiagram
  WORKSPACES ||--o{ INVENTORY_SNAPSHOTS : scans
  WORKSPACES ||--o{ IAC_ARTIFACTS : generates
  WORKSPACES ||--o{ CHANGESETS : creates
  CHANGESETS ||--o{ GATE_CHECKS : requires
  CHANGESETS ||--o{ RUNS : executes
  RUNS ||--o{ RUN_EVENTS : emits

  WORKSPACES {
    string id
    string name
    string repo_url
    string repo_ref
    string toolchain
  }
  INVENTORY_SNAPSHOTS {
    string id
    string workspace_id
    string scope
    datetime captured_at
    string inventory_json
  }
  IAC_ARTIFACTS {
    string id
    string workspace_id
    string kind
    string content_ref
    datetime created_at
  }
  CHANGESETS {
    string id
    string workspace_id
    string env
    string scenario
    string status
    string summary
    datetime created_at
  }
  GATE_CHECKS {
    string id
    string changeset_id
    string type
    string status
    string report_ref
  }
  RUNS {
    string id
    string changeset_id
    string phase
    string status
    datetime started_at
    datetime finished_at
  }
  RUN_EVENTS {
    string id
    string run_id
    string level
    string message
    datetime at
  }
```

### 6.2 Data Definition Language
本仓库当前实现以本地落盘为主（`StateManager`/`CacheManager`），因此 DDL 仅在未来需要多租户/协作时引入。
