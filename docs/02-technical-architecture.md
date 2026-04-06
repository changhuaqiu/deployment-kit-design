# IaC城市规划可视化系统 - 技术架构设计

## 1. 系统架构概览

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     用户层 (Client)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Web Browser │  │  VS Code     │  │  Mobile App  │      │
│  │  (3D Voxel)  │  │  Extension   │  │  (Future)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                          ↕ WebSocket/HTTP
┌─────────────────────────────────────────────────────────────┐
│                   API 网关层 (Gateway)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  FastAPI Gateway                                    │   │
│  │  - 认证授权 (SSO)                                    │   │
│  │  - 请求路由                                          │   │
│  │  - 限流熔断                                          │   │
│  │  - WebSocket 管理                                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────┐
│                   业务逻辑层 (Service)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 部署服务  │  │ 资源服务  │  │ 代码服务  │  │ 事件服务  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────┐
│                   核心引擎层 (Engine)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Deployment Kit (Existing)                          │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │   │
│  │  │Orchestrator│  │StateManager│  │ MCPCaller  │    │   │
│  │  └────────────┘  └────────────┘  └────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────┐
│                   数据访问层 (Data)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │现网资源  │  │ IaC代码  │  │ 状态存储  │  │ 缓存层   │   │
│  │(MCP)     │  │(Git)     │  │(File/DB) │  │(Redis)   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 技术栈选择

#### 前端技术栈
| 技术 | 版本 | 用途 | 选择理由 |
|------|------|------|----------|
| **Three.js** | 0.150.1 | 3D 渲染引擎 | 成熟稳定，生态完善 |
| **React** | 18.x | UI 框架 | 组件化，生态丰富 |
| **TypeScript** | 5.x | 类型系统 | 类型安全，开发体验好 |
| **Vite** | 5.x | 构建工具 | 开发体验好，HMR 快 |
| **Socket.IO** | 4.x | WebSocket 客户端 | 自动重连，兼容性好 |
| **Zustand** | 4.x | 状态管理 | 轻量级，API 简洁 |
| **Framer Motion** | 10.x | 动画库 | 声明式动画，性能好 |

#### 后端技术栈
| 技术 | 版本 | 用途 | 选择理由 |
|------|------|------|----------|
| **Python** | 3.11+ | 主要语言 | 与现有 Deployment Kit 兼容 |
| **FastAPI** | 0.104+ | API 框架 | 异步支持，自动文档 |
| **WebSocket** | - | 实时通信 | 双向推送，低延迟 |
| **Pydantic** | 2.x | 数据验证 | 类型安全，自动校验 |
| **Redis** | 7.x | 缓存/队列 | 高性能，支持 Pub/Sub |
| **PostgreSQL** | 15+ | 关系数据库 | 可靠性强，功能完善 |

#### 基础设施
| 技术 | 用途 | 选择理由 |
|------|------|----------|
| **Docker** | 容器化 | 环境一致性 |
| **Kubernetes** | 编排 | 自动扩缩容 |
| **Nginx** | 反向代理 | 高性能，负载均衡 |
| **GitHub Actions** | CI/CD | 集成度高 |

---

## 2. 前端架构设计

### 2.1 前端目录结构

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── game/
│   │   │   ├── GameCanvas.tsx        # 主3D画布
│   │   │   ├── VoxelBuilding.tsx     # 体素建筑组件
│   │   │   ├── GroundPlane.tsx       # 地面网格
│   │   │   └── SkyBox.tsx            # 天空盒
│   │   ├── ui/
│   │   │   ├── TopBar.tsx            # 顶部状态栏
│   │   │   ├── ToolsPanel.tsx        # 右侧工具栏
│   │   │   ├── InfoPanel.tsx         # 信息面板
│   │   │   ├── BottomBar.tsx         # 底部控制栏
│   │   │   └── Minimap.tsx           # 小地图
│   │   └── shared/
│   │       ├── Toast.tsx             # 通知组件
│   │       ├── Modal.tsx             # 模态框
│   │       └── Loading.tsx           # 加载动画
│   ├── hooks/
│   │   ├── useThree.ts               # Three.js 初始化
│   │   ├── useGame.ts                # 游戏状态管理
│   │   ├── useWebSocket.ts           # WebSocket 连接
│   │   └── useBuilding.ts            # 建筑操作
│   ├── stores/
│   │   ├── gameStore.ts              # 游戏状态
│   │   ├── uiStore.ts                # UI 状态
│   │   └── buildingStore.ts          # 建筑数据
│   ├── services/
│   │   ├── api.ts                    # API 调用
│   │   ├── websocket.ts              # WebSocket 服务
│   │   └── mcp.ts                    # MCP 调用封装
│   ├── types/
│   │   ├── game.ts                   # 游戏类型定义
│   │   ├── building.ts               # 建筑类型定义
│   │   └── events.ts                 # 事件类型定义
│   ├── utils/
│   │   ├── threeHelpers.ts           # Three.js 工具函数
│   │   ├── buildingGenerator.ts      # 建筑生成器
│   │   └── animationUtils.ts         # 动画工具
│   ├── constants/
│   │   ├── buildingTypes.ts          # 建筑配置
│   │   ├── colors.ts                 # 色彩配置
│   │   └── config.ts                 # 全局配置
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

### 2.2 核心 Hook 设计

#### useThree Hook
```typescript
function useThree() {
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    // 初始化 Three.js 场景
    const newScene = new THREE.Scene();
    const newCamera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    const newRenderer = new THREE.WebGLRenderer({ antialias: true });

    // 配置场景
    newScene.background = new THREE.Color(0x87CEEB);
    newScene.fog = new THREE.Fog(0x87CEEB, 30, 80);

    // 配置渲染器
    newRenderer.setSize(window.innerWidth, window.innerHeight);
    newRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    newRenderer.shadowMap.enabled = true;

    setScene(newScene);
    setCamera(newCamera);
    setRenderer(newRenderer);

    return () => {
      // 清理资源
      newRenderer.dispose();
    };
  }, []);

  return { scene, camera, renderer };
}
```

#### useWebSocket Hook
```typescript
function useWebSocket(url: string) {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<EventMessage[]>([]);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setConnected(true);
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages(prev => [...prev, message]);
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [url]);

  const send = (data: any) => {
    if (connected) {
      ws.send(JSON.stringify(data));
    }
  };

  return { connected, messages, send };
}
```

### 2.3 状态管理 (Zustand)

```typescript
// gameStore.ts
interface GameState {
  buildings: Building[];
  selectedTool: string | null;
  selectedBuilding: Building | null;
  addBuilding: (building: Building) => void;
  removeBuilding: (id: string) => void;
  selectTool: (tool: string) => void;
}

export const useGameStore = create<GameState>((set) => ({
  buildings: [],
  selectedTool: null,
  selectedBuilding: null,

  addBuilding: (building) =>
    set((state) => ({ buildings: [...state.buildings, building] })),

  removeBuilding: (id) =>
    set((state) => ({
      buildings: state.buildings.filter((b) => b.id !== id),
    })),

  selectTool: (tool) => set({ selectedTool: tool }),
}));
```

### 2.4 性能优化策略

#### Three.js 优化
1. **实例化渲染** (InstancedMesh)
   - 相同建筑使用同一个几何体
   - 减少 draw calls

2. **LOD (Level of Detail)**
   - 远距离建筑使用简化模型
   - 动态切换细节级别

3. **视锥体裁剪**
   - 只渲染视野内的对象
   - 启用 frustumCulling

4. **阴影优化**
   - 限制阴影贴图分辨率
   - 使用 PCFSoftShadowMap

#### React 优化
1. **代码分割**
   ```typescript
   const GameCanvas = lazy(() => import('./components/game/GameCanvas'));
   ```

2. **虚拟化长列表**
   - 使用 react-window 渲染大量建筑

3. **Memo 优化**
   ```typescript
   const VoxelBuilding = React.memo(({ building }) => {
     // ...
   });
   ```

4. **防抖/节流**
   - WebSocket 消息处理
   - 鼠标移动事件

---

## 3. 后端架构设计

### 3.1 后端目录结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                      # FastAPI 应用入口
│   ├── config.py                    # 配置管理
│   ├── dependencies.py              # 依赖注入
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── buildings.py         # 建筑 API
│   │   │   ├── deployments.py       # 部署 API
│   │   │   ├── drifts.py            # 漂移检测 API
│   │   │   └── blueprints.py        # 蓝图 API
│   │   └── websocket/
│   │       ├── __init__.py
│   │       └── handler.py           # WebSocket 处理
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── orchestrator.py          # 编排器（复用现有）
│   │   ├── state_manager.py         # 状态管理（复用现有）
│   │   └── mcp_caller.py            # MCP 调用（复用现有）
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── building.py              # 建筑模型
│   │   ├── deployment.py            # 部署模型
│   │   └── event.py                 # 事件模型
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── building.py              # 建筑 Schema
│   │   └── event.py                 # 事件 Schema
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── building_service.py      # 建筑服务
│   │   ├── deployment_service.py    # 部署服务
│   │   ├── drift_service.py         # 漂移检测服务
│   │   └── event_service.py         # 事件服务
│   │
│   └── utils/
│       ├── __init__.py
│       ├── websocket.py             # WebSocket 工具
│       └── logger.py                # 日志工具
│
├── tests/
│   ├── test_api.py
│   ├── test_services.py
│   └── test_websocket.py
│
├── Dockerfile
├── requirements.txt
└── pyproject.toml
```

### 3.2 WebSocket 服务器实现

```python
# app/api/websocket/handler.py
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
import asyncio

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        if client_id not in self.active_connections:
            self.active_connections[client_id] = set()
        self.active_connections[client_id].add(websocket)

    def disconnect(self, websocket: WebSocket, client_id: str):
        self.active_connections[client_id].discard(websocket)

    async def broadcast(self, message: dict, client_id: str = None):
        if client_id:
            # 发送给特定客户端
            for connection in self.active_connections.get(client_id, set()):
                await connection.send_json(message)
        else:
            # 广播给所有客户端
            for connections in self.active_connections.values():
                for connection in connections:
                    await connection.send_json(message)

manager = ConnectionManager()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            # 处理客户端消息
            message = json.loads(data)
            await handle_client_message(message, client_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_id)
```

### 3.3 事件驱动架构

```python
# app/services/event_service.py
from typing import Callable, Dict, List
import asyncio

class EventBus:
    def __init__(self):
        self.subscribers: Dict[str, List[Callable]] = {}

    def subscribe(self, event_type: str, callback: Callable):
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(callback)

    async def publish(self, event_type: str, data: dict):
        if event_type in self.subscribers:
            for callback in self.subscribers[event_type]:
                await callback(data)

# 全局事件总线
event_bus = EventBus()

# 订阅 StateManager 的事件
@event_bus.subscribe('state_updated')
async def on_state_updated(data: dict):
    await manager.broadcast({
        'type': 'state_updated',
        'data': data
    })
```

### 3.4 MCP 调用集成

```python
# app/services/mcp_service.py
from app.core.mcp_caller import MCPCaller

class MCPService:
    def __init__(self):
        self.mcp_caller = MCPCaller()

    async def scan_resources(self, appid: str) -> List[Resource]:
        """扫描现网资源（城市普查）"""
        return await self.mcp_caller.fetch_all_resources(appid)

    async def detect_drift(self, appid: str, blueprint: dict) -> DriftReport:
        """检测配置漂移（违建稽查）"""
        current = await self.scan_resources(appid)
        planned = blueprint['resources']

        return self._compute_drift(current, planned)

    def _compute_drift(self, current: List[Resource], planned: dict) -> DriftReport:
        added = []
        changed = []
        removed = []

        # 计算差异逻辑
        # ...

        return DriftReport(added=added, changed=changed, removed=removed)
```

---

## 4. 数据模型设计

### 4.1 核心数据模型

```typescript
// Building 类型
interface Building {
  id: string;
  type: BuildingType;
  position: {
    x: number;  // 网格坐标
    z: number;
  };
  config: BuildingConfig;
  status: 'normal' | 'drift' | 'building' | 'error';
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
  };
}

// BuildingType 枚举
type BuildingType =
  | 'office'      // 办公楼 - 微服务
  | 'factory'     // 工厂 - 批处理
  | 'bank'        // 银行金库 - 数据库
  | 'warehouse'   // 仓库 - 缓存
  | 'station'     // 车站 - 消息队列
  | 'network'     // 网络中心 - VPC
  | 'security'    // 警察局 - 安全组
  | 'observatory' // 观测塔 - 监控
  | 'power'       // 电厂 - 计算
  | 'road';       // 道路 - 连接

// Event 类型
interface DeploymentEvent {
  type: 'workflow_started' |
        'workflow_step_started' |
        'workflow_step_completed' |
        'workflow_step_failed' |
        'resource_created' |
        'resource_updated' |
        'resource_deleted';
  timestamp: string;
  data: any;
}
```

### 4.2 OAM 到 Building 映射

```typescript
// OAM Component 到 Building 的映射
const componentToBuilding: Record<ComponentType, BuildingType> = {
  'Service': 'office',
  'Job': 'factory',
  'Database': 'bank',
  'Cache': 'warehouse',
  'Queue': 'station',
  'VPC': 'network',
  'SecurityGroup': 'security',
  'Monitoring': 'observatory',
  'Compute': 'power',
  'LoadBalancer': 'road',
};

// OAM Trait 到 Building Upgrade 的映射
const traitToUpgrade: Record<TraitType, UpgradeType> = {
  'HighAvailability': 'ha_upgrade',
  'AutoScaling': 'scaling_upgrade',
  'Backup': 'backup_upgrade',
  'Encryption': 'security_upgrade',
};
```

---

## 5. 接口设计

### 5.1 REST API

```yaml
# 建筑 API
GET    /api/v1/buildings           # 获取建筑列表
GET    /api/v1/buildings/:id       # 获取建筑详情
POST   /api/v1/buildings           # 创建建筑
PUT    /api/v1/buildings/:id       # 更新建筑
DELETE /api/v1/buildings/:id       # 删除建筑

# 部署 API
POST   /api/v1/deployments/plan    # 生成执行计划
POST   /api/v1/deployments/apply   # 执行部署
GET    /api/v1/deployments/:id     # 获取部署状态

# 漂移检测 API
POST   /api/v1/drifts/detect       # 检测配置漂移
GET    /api/v1/drifts/:id          # 获取漂移详情

# 蓝图 API
GET    /api/v1/blueprints          # 获取蓝图列表
POST   /api/v1/blueprints/generate # 生成蓝图（扫描现网）
GET    /api/v1/blueprints/:id      # 获取蓝图详情
```

### 5.2 WebSocket 事件

```typescript
// 客户端 → 服务器
type ClientMessage =
  | { type: 'subscribe', data: { channel: string } }
  | { type: 'unsubscribe', data: { channel: string } }
  | { type: 'place_building', data: { type: BuildingType, x: number, z: number } }
  | { type: 'remove_building', data: { id: string } };

// 服务器 → 客户端
type ServerEvent =
  | { type: 'workflow_started', data: { workflowId: string, steps: string[] } }
  | { type: 'step_started', data: { step: string, progress: number } }
  | { type: 'step_completed', data: { step: string, result: any } }
  | { type: 'building_created', data: Building }
  | { type: 'building_updated', data: Building }
  | { type: 'building_deleted', data: { id: string } }
  | { type: 'drift_detected', data: DriftReport };
```

---

## 6. 部署架构

### 6.1 容器化部署

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制代码
COPY ./app ./app

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 6.2 Kubernetes 配置

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: citybuilder-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: citybuilder-backend
  template:
    metadata:
      labels:
        app: citybuilder-backend
    spec:
      containers:
      - name: backend
        image: citybuilder-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

---
apiVersion: v1
kind: Service
metadata:
  name: citybuilder-backend-service
spec:
  selector:
    app: citybuilder-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: LoadBalancer
```

---

## 7. 监控和日志

### 7.1 监控指标

```python
# 应用指标
from prometheus_client import Counter, Histogram, Gauge

# 请求计数
request_count = Counter(
    'citybuilder_requests_total',
    'Total requests',
    ['method', 'endpoint', 'status']
)

# 请求延迟
request_latency = Histogram(
    'citybuilder_request_duration_seconds',
    'Request latency',
    ['method', 'endpoint']
)

# WebSocket 连接数
websocket_connections = Gauge(
    'citybuilder_websocket_connections',
    'Active WebSocket connections'
)

# 建筑数量
building_count = Gauge(
    'citybuilder_buildings_total',
    'Total buildings',
    ['type', 'status']
)
```

### 7.2 日志结构

```json
{
  "timestamp": "2026-04-06T10:30:00Z",
  "level": "INFO",
  "service": "citybuilder-backend",
  "trace_id": "abc123",
  "message": "Building created",
  "data": {
    "building_id": "bld_123",
    "building_type": "office",
    "user_id": "user_456"
  }
}
```

---

## 8. 安全设计

### 8.1 认证授权

```python
# JWT 认证
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return get_user(user_id)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# 使用示例
@app.post("/api/v1/buildings")
async def create_building(
    building: BuildingCreate,
    current_user: User = Depends(get_current_user)
):
    # 创建建筑逻辑
    pass
```

### 8.2 权限控制

```python
from enum import Enum

class Permission(str, Enum):
    READ = "read"
    WRITE = "write"
    DEPLOY = "deploy"
    ADMIN = "admin"

def check_permission(required_permission: Permission):
    def dependency(user: User = Depends(get_current_user)):
        if required_permission not in user.permissions:
            raise HTTPException(status_code=403, detail="Permission denied")
        return user
    return dependency

# 使用示例
@app.post("/api/v1/deployments/apply")
async def deploy(
    user: User = Depends(check_permission(Permission.DEPLOY))
):
    # 部署逻辑
    pass
```

---

## 9. 测试策略

### 9.1 单元测试

```python
# tests/test_building_service.py
import pytest
from app.services.building_service import BuildingService

@pytest.fixture
def building_service():
    return BuildingService()

def test_create_building(building_service):
    building = BuildingCreate(
        type='office',
        x=10,
        z=10
    )
    result = building_service.create(building)
    assert result.type == 'office'
    assert result.id is not None

def test_create_building_invalid_position(building_service):
    building = BuildingCreate(
        type='office',
        x=-1,  # 无效位置
        z=10
    )
    with pytest.raises(ValidationError):
        building_service.create(building)
```

### 9.2 集成测试

```python
# tests/test_api_integration.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_building_api():
    response = client.post(
        "/api/v1/buildings",
        json={
            "type": "office",
            "x": 10,
            "z": 10
        },
        headers={"Authorization": "Bearer test_token"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "office"
```

### 9.3 E2E 测试

```typescript
// tests/e2e/deployment.spec.ts
import { test, expect } from '@playwright/test';

test('complete deployment flow', async ({ page }) => {
  // 打开应用
  await page.goto('http://localhost:3000');

  // 选择建筑工具
  await page.click('[data-type="office"]');

  // 放置建筑
  await page.click('#game-canvas', { position: { x: 500, y: 500 } });

  // 验证建筑已创建
  const buildingCount = await page.textContent('#stat-buildings');
  expect(buildingCount).toBe('1');

  // 点击部署按钮
  await page.click('button:has-text("🚀 部署")');

  // 验证部署流程启动
  await expect(page.locator('.stage-item.in-progress')).toBeVisible();
});
```

---

## 10. 性能基准

### 10.1 前端性能目标

| 指标 | 目标 | 测量方法 |
|------|------|----------|
| 首屏加载 (FCP) | < 1.5s | Lighthouse |
| 可交互时间 (TTI) | < 3s | Lighthouse |
| 3D 渲染帧率 | 60 FPS | Three.js Stats |
| 建筑放置延迟 | < 100ms | Performance API |
| WebSocket 消息延迟 | < 50ms | WebSocket Timing |

### 10.2 后端性能目标

| 指标 | 目标 | 测量方法 |
|------|------|----------|
| API 响应时间 (P50) | < 100ms | Prometheus |
| API 响应时间 (P99) | < 500ms | Prometheus |
| WebSocket 消息延迟 | < 50ms | 自定义监控 |
| 并发连接数 | 1000+ | 负载测试 |
| 内存占用 | < 512MB | 容器监控 |

---

**文档版本**: v1.0
**最后更新**: 2026-04-06
**维护者**: Architecture Team
**审核状态**: ✅ 已批准
