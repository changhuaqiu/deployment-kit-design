# Living City: Agent-Powered Districts & Interactive Office - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pixel-art agents that patrol between office and city districts, with clickable office cards and district supervisors, creating an immersive IaC deployment experience.

**Architecture:** Extend existing Zustand store with agent movement system (IDLE/WALKING/WORKING/RETURNING states), add district entities with supervisor characters, implement office interaction (cards, quality desk, dispatch panel), and create city-district view switching.

**Tech Stack:** React 19, TypeScript, Zustand, Canvas 2D for pixel rendering, BFS pathfinding

---

## Task 1: Core Type Definitions

**Files:**
- Create: `frontend/pixel-prototype/src/types/agents.ts`

- [ ] **Step 1: Write the type definitions**

```typescript
// Agent state machine (inspired by Pixel Agents)
export enum AgentState {
  IDLE = 'idle',           // In office, wandering
  WALKING = 'walking',     // Moving to/from district
  WORKING = 'working',     // Executing task in district
  RETURNING = 'returning'  // Returning to office to report
}

export enum AgentRole {
  SCANNER = 'scanner',     // 🕵️ scans resources
  PLANNER = 'planner',     // 👨‍🎨 generates code
  MONITOR = 'monitor'      // 👮 reviews/approves
}

// Location: either office or a specific district
export interface AgentLocation {
  type: 'office' | 'city';
  city?: 'test' | 'prod';
  district?: DistrictType;
}

export interface Position {
  x: number;  // Canvas pixel X
  y: number;  // Canvas pixel Y
  tileCol: number;
  tileRow: number;
}

export interface Agent {
  id: string;
  name: string;
  icon: string;
  role: AgentRole;
  state: AgentState;
  location: AgentLocation;
  position: Position;
  path: Position[];  // Pathfinding waypoints
  currentTask: Task | null;
  progress: number;  // 0-100
  bubble: Bubble | null;
  palette: number;  // For visual variety
  frame: number;   // Animation frame
  frameTimer: number;
}

export interface Task {
  id: string;
  type: 'scan' | 'generate' | 'review' | 'fix';
  skill: string;  // Deployment Kit skill name
  targetDistrict: string;  // 'test-compute', 'prod-data', etc.
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  result?: any;
}

export interface Bubble {
  type: 'permission' | 'waiting' | 'info' | 'warning';
  message: string;
  timer: number;
  duration: number;
}

// District types
export enum DistrictType {
  COMPUTE = 'compute',
  DATA = 'data',
  NETWORK = 'network',
  CONFIG = 'config'
}

export interface District {
  id: string;  // 'test-compute', 'prod-data'
  city: 'test' | 'prod';
  type: DistrictType;
  supervisor: Supervisor;
  resources: Resource[];
  issues: Issue[];
  status: 'healthy' | 'warning' | 'error';
  metrics: DistrictMetrics;
  position: {  // For map rendering
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Supervisor {
  id: string;
  name: string;  // "👨‍💼 运营总监"
  icon: string;
  role: string;
  statusMessage: string;
  active: boolean;  // Is agent currently working here?
}

export interface Resource {
  id: string;
  type: string;
  name: string;
  status: 'normal' | 'drift' | 'building' | 'error';
}

export interface Issue {
  id: string;
  type: 'drift' | 'capacity' | 'error';
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export interface DistrictMetrics {
  resourceCount: number;
  healthPercent: number;
  customMetric: string;  // CPU, capacity, QPS, etc.
  customValue: string;
}

// View dimensions
export type ViewDimension = 'environment' | 'resource' | 'application';

export interface CityView {
  dimension: ViewDimension;
  selectedCity: 'test' | 'prod' | null;  // null in resource/app view
  selectedDistrict: string | null;
}
```

- [ ] **Step 2: Run TypeScript compiler to verify types**

Run: `cd frontend/pixel-prototype && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit types**

```bash
git add frontend/pixel-prototype/src/types/agents.ts
git commit -m "feat(agent-system): add core type definitions

- Add AgentState enum (IDLE/WALKING/WORKING/RETURNING)
- Add AgentRole, Task, District, Supervisor interfaces
- Add ViewDimension for three-dimensional switching
"
```

---

## Task 2: Agent Store (State Management)

**Files:**
- Create: `frontend/pixel-prototype/src/store/agents.ts`

- [ ] **Step 1: Write failing tests for agent store**

```typescript
// frontend/pixel-prototype/__tests__/store/agents.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createAgentStore } from '@/store/agents';

describe('Agent Store', () => {
  let store: ReturnType<typeof createAgentStore>;

  beforeEach(() => {
    store = createAgentStore();
  });

  it('should create agent with IDLE state', () => {
    const agent = store.getState().createAgent('scanner-1', 'scanner', '🕵️ 普查员');
    
    expect(agent).toBeDefined();
    expect(agent.state).toBe('idle');
    expect(agent.location.type).toBe('office');
  });

  it('should update agent state to WALKING when task assigned', () => {
    const agent = store.getState().createAgent('scanner-1', 'scanner', '🕵️ 普查员');
    
    store.getState().assignTask(agent.id, {
      id: 'task-1',
      type: 'scan',
      targetDistrict: 'test-compute',
      status: 'pending'
    });
    
    expect(store.getState().agents[agent.id].state).toBe('walking');
  });

  it('should generate path from office to district', () => {
    const agent = store.getState().createAgent('scanner-1', 'scanner', '🕵️ 普查员');
    const district = { id: 'test-compute', position: { x: 200, y: 150 } };
    
    store.getState().setPathToDistrict(agent.id, district);
    
    const path = store.getState().agents[agent.id].path;
    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toMatchObject({ x: 200, y: 150 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend/pixel-prototype && npm test -- agents.test.ts`
Expected: FAIL with "createAgentStore is not defined"

- [ ] **Step 3: Implement agent store**

```typescript
// frontend/pixel-prototype/src/store/agents.ts
import { create } from 'zustand';
import type { Agent, Task, Bubble, Position, AgentState, AgentLocation } from '@/types/agents';

interface AgentStore {
  agents: Record<string, Agent>;
  tasks: Record<string, Task>;
  selectedAgentId: string | null;
  
  // Actions
  createAgent: (id: string, role: Agent['role'], name: string, icon?: string) => Agent;
  removeAgent: (id: string) => void;
  assignTask: (agentId: string, task: Task) => void;
  setPathToDistrict: (agentId: string, district: { id: string; position: Position }) => void;
  updateAgentPosition: (agentId: string, position: Position, tileCol: number, tileRow: number) => void;
  updateAgentState: (agentId: string, state: AgentState) => void;
  setAgentBubble: (agentId: string, bubble: Bubble | null) => void;
  completeTask: (taskId: string, result: any) => void;
  selectAgent: (agentId: string | null) => void;
}

export const createAgentStore = () =>
  create<AgentStore>((set, get) => ({
    agents: {},
    tasks: {},
    selectedAgentId: null,

    createAgent: (id, role, name, icon) => {
      const agent: Agent = {
        id,
        role,
        name,
        icon: icon || (role === 'scanner' ? '🕵️' : role === 'planner' ? '👨‍🎨' : '👮'),
        state: 'idle',
        location: { type: 'office' },
        position: { x: 50, y: 100, tileCol: 1, tileRow: 1 },  // Office position
        path: [],
        currentTask: null,
        progress: 0,
        bubble: null,
        palette: 0,
        frame: 0,
        frameTimer: 0
      };
      
      set((state) => ({
        agents: { ...state.agents, [id]: agent }
      }));
      
      return agent;
    },

    removeAgent: (id) => {
      set((state) => {
        const agents = { ...state.agents };
        delete agents[id];
        return { agents };
      });
    },

    assignTask: (agentId, task) => {
      set((state) => ({
        agents: {
          ...state.agents,
          [agentId]: {
            ...state.agents[agentId],
            state: 'walking',
            currentTask: task,
            progress: 0
          }
        },
        tasks: { ...state.tasks, [task.id]: task }
      }));
    },

    setPathToDistrict: (agentId, district) => {
      // Simple linear path for now (BFS in later task)
      const agent = get().agents[agentId];
      const targetPosition = {
        x: district.position.x,
        y: district.position.y,
        tileCol: Math.floor(district.position.x / 32),
        tileRow: Math.floor(district.position.y / 32)
      };
      
      // Create waypoints
      const midX = (agent.position.x + targetPosition.x) / 2;
      const path: Position[] = [
        { ...agent.position, tileCol: agent.position.tileCol, tileRow: agent.position.tileRow },
        { x: midX, y: agent.position.y, tileCol: Math.floor(midX / 32), tileRow: agent.position.tileRow },
        targetPosition
      ];
      
      set((state) => ({
        agents: {
          ...state.agents,
          [agentId]: {
            ...state.agents[agentId],
            path
          }
        }
      }));
    },

    updateAgentPosition: (agentId, position, tileCol, tileRow) => {
      set((state) => ({
        agents: {
          ...state.agents,
          [agentId]: {
            ...state.agents[agentId],
            position: { ...position, tileCol, tileRow }
          }
        }
      }));
    },

    updateAgentState: (agentId, newState) => {
      set((state) => ({
        agents: {
          ...state.agents,
          [agentId]: {
            ...state.agents[agentId],
            state: newState,
            frameTimer: 0,
            frame: newState === state.agents[agentId].state ? 0 : 0
          }
        }
      }));
    },

    setAgentBubble: (agentId, bubble) => {
      set((state) => ({
        agents: {
          ...state.agents,
          [agentId]: {
            ...state.agents[agentId],
            bubble
          }
        }
      ));
    },

    completeTask: (taskId, result) => {
      set((state) => ({
        tasks: {
          ...state.tasks,
          [taskId]: {
            ...state.tasks[taskId],
            status: 'completed',
            result
          }
        }
      }));
    },

    selectAgent: (agentId) => {
      set({ selectedAgentId: agentId });
    }
  }));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend/pixel-prototype && npm test -- agents.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/pixel-prototype/src/store/agents.ts
git add frontend/pixel-prototype/__tests__/store/agents.test.ts
git commit -m "feat(agent-store): implement agent state management

- Add Zustand store for agent CRUD
- Implement task assignment and path generation
- Add state transitions (idle → walking → working → returning)
- Test: agent creation, task assignment, path generation
"
```

---

## Task 3: District Store

**Files:**
- Create: `frontend/pixel-prototype/src/store/districts.ts`

- [ ] **Step 1: Write failing tests for district store**

```typescript
// frontend/pixel-prototype/__tests__/store/districts.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createDistrictStore } from '@/store/districts';

describe('District Store', () => {
  let store: ReturnType<typeof createDistrictStore>;

  beforeEach(() => {
    store = createDistrictStore();
  });

  it('should create district with supervisor', () => {
    const district = store.getState().createDistrict({
      id: 'test-compute',
      city: 'test',
      type: 'compute',
      position: { x: 100, y: 100, width: 200, height: 150 }
    });
    
    expect(district).toBeDefined();
    expect(district.supervisor.name).toBe('👨‍💼 运营总监');
    expect(district.status).toBe('healthy');
  });

  it('should add issue to district', () => {
    const district = store.getState().createDistrict({
      id: 'test-compute',
      city: 'test',
      type: 'compute',
      position: { x: 100, y: 100, width: 200, height: 150 }
    });
    
    store.getState().addIssue(district.id, {
      id: 'issue-1',
      type: 'drift',
      severity: 'medium',
      message: '配置漂移'
    });
    
    expect(store.getState().districts[district.id].issues).toHaveLength(1);
    expect(store.getState().districts[district.id].status).toBe('warning');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend/pixel-prototype && npm test -- districts.test.ts`
Expected: FAIL with "createDistrictStore is not defined"

- [ ] **Step 3: Implement district store**

```typescript
// frontend/pixel-prototype/src/store/districts.ts
import { create } from 'zustand';
import type { District, Supervisor, Issue, DistrictType } from '@/types/agents';

const SUPERVISORS: Record<DistrictType, Omit<Supervisor, 'id'>> = {
  compute: {
    name: '👨‍💼 运营总监',
    icon: '👨‍💼',
    role: '监控服务健康度',
    statusMessage: '🟢 15个实例运行中'
  },
  data: {
    name: '👨‍💻 数据管家',
    icon: '👨‍💻',
    role: '管理数据库/数据制品',
    statusMessage: '📊 85%容量'
  },
  network: {
    name: '🚦 交通指挥',
    icon: '🚦',
    role: '监控流量/负载均衡',
    statusMessage: '🔄 1.2K QPS'
  },
  config: {
    name: '📝 配置管理员',
    icon: '📝',
    role: '检测配置漂移',
    statusMessage: '⚠️ 3处配置漂移'
  }
};

interface DistrictStore {
  districts: Record<string, District>;
  selectedCity: 'test' | 'prod' | null;
  viewDimension: 'environment' | 'resource' | 'application';
  
  // Actions
  createDistrict: (config: {
    id: string;
    city: 'test' | 'prod';
    type: DistrictType;
    position: { x: number; y: number; width: number; height: number };
  }) => District;
  addIssue: (districtId: string, issue: Issue) => void;
  resolveIssue: (districtId: string, issueId: string) => void;
  updateMetrics: (districtId: string, metrics: Partial<District['metrics']>) => void;
  setCity: (city: 'test' | 'prod' | null) => void;
  setViewDimension: (dimension: 'environment' | 'resource' | 'application') => void;
}

export const createDistrictStore = () =>
  create<DistrictStore>((set, get) => ({
    districts: {},
    selectedCity: null,
    viewDimension: 'environment',

    createDistrict: (config) => {
      const supervisorData = SUPERVISORS[config.type];
      const district: District = {
        id: config.id,
        city: config.city,
        type: config.type,
        position: config.position,
        supervisor: {
          id: `supervisor-${config.id}`,
          ...supervisorData,
          active: false
        },
        resources: [],
        issues: [],
        status: 'healthy',
        metrics: {
          resourceCount: 0,
          healthPercent: 100,
          customMetric: 'CPU',
          customValue: '45%'
        }
      };
      
      set((state) => ({
        districts: { ...state.districts, [config.id]: district }
      }));
      
      return district;
    },

    addIssue: (districtId, issue) => {
      set((state) => {
        const district = { ...state.districts[districtId] };
        district.issues = [...district.issues, issue];
        district.status = district.issues.length > 0 ? 'warning' : 'healthy';
        return {
          districts: { ...state.districts, [districtId]: district }
        };
      });
    },

    resolveIssue: (districtId, issueId) => {
      set((state) => {
        const district = { ...state.districts[districtId] };
        district.issues = district.issues.filter(i => i.id !== issueId);
        district.status = district.issues.length > 0 ? 'warning' : 'healthy';
        return {
          districts: { ...state.districts, [districtId]: district }
        };
      });
    },

    updateMetrics: (districtId, metrics) => {
      set((state) => ({
        districts: {
          ...state.districts,
          [districtId]: {
            ...state.districts[districtId],
            metrics: { ...state.districts[districtId].metrics, ...metrics }
          }
        }
      }));
    },

    setCity: (city) => set({ selectedCity: city }),
    setViewDimension: (dimension) => set({ viewDimension: dimension })
  }));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend/pixel-prototype && npm test -- districts.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/pixel-prototype/src/store/districts.ts
git add frontend/pixel-prototype/__tests__/store/districts.test.ts
git commit -m "feat(district-store): add district state management

- Implement district store with supervisors
- Add issue tracking (add/resolve updates status)
- Add metrics update functionality
- Test: district creation, issue tracking
"
```

---

## Task 4: Pathfinding Utility

**Files:**
- Create: `frontend/pixel-prototype/src/utils/pathfinding.ts`

- [ ] **Step 1: Write failing tests for pathfinding**

```typescript
// frontend/pixel-prototype/__tests__/utils/pathfinding.test.ts
import { describe, it, expect } from 'vitest';
import { findPath, getWalkableNeighbors } from '@/utils/pathfinding';

describe('Pathfinding', () => {
  it('should find path from office to district', () => {
    const start = { col: 1, row: 1, x: 32, y: 32 };
    const target = { col: 10, row: 5, x: 320, y: 160 };
    const tileMap = [
      [0, 0, 0, 0],  // All walkable for test
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ];
    
    const path = findPath(start, target, tileMap);
    
    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toMatchObject({ col: 10, row: 5 });
  });

  it('should avoid obstacles', () => {
    const start = { col: 1, row: 1, x: 32, y: 32 };
    const target = { col: 3, row: 1, x: 96, y: 32 };
    const tileMap = [
      [0, 1, 0],  // Middle cell blocked
      [0, 0, 0]
    ];
    
    const path = findPath(start, target, tileMap);
    
    // Should go around via row 0 or row 2
    expect(path.length).toBeGreaterThan(2);
    expect(path.some(p => p.col === 1 && p.row === 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend/pixel-prototype && npm test -- pathfinding.test.ts`
Expected: FAIL with "findPath is not defined"

- [ ] **Step 3: Implement BFS pathfinding**

```typescript
// frontend/pixel-prototype/src/utils/pathfinding.ts
export interface Tile {
  col: number;
  row: number;
  x: number;
  y: number;
}

export interface Position extends Tile {
  tileCol: number;
  tileRow: number;
}

const TILE_SIZE = 32;

export function findPath(
  start: Position,
  target: Position,
  tileMap: number[][],
  obstacles: Set<string> = new Set()
): Position[] {
  const queue: { pos: Position; path: Position[] }[] = [{ pos: start, path: [] }];
  const visited = new Set<string>();
  const targetKey = `${target.col},${target.row}`;

  while (queue.length > 0) {
    const { pos, path } = queue.shift()!;
    const key = `${pos.col},${pos.row}`;

    if (visited.has(key)) continue;
    visited.add(key);

    // Check if reached target
    if (pos.col === target.col && pos.row === target.row) {
      return path;
    }

    // Explore neighbors
    for (const neighbor of getWalkableNeighbors(pos, tileMap, obstacles)) {
      const neighborKey = `${neighbor.col},${neighbor.row}`;
      if (!visited.has(neighborKey)) {
        queue.push({
          pos: neighbor,
          path: [...path, pos]
        });
      }
    }
  }

  return []; // No path found
}

export function getWalkableNeighbors(
  pos: Position,
  tileMap: number[][],
  obstacles: Set<string>
): Tile[] {
  const neighbors: Tile[] = [];
  const directions = [
    { dc: 0, dr: -1 },  // up
    { dc: 0, dr: 1 },   // down
    { dc: -1, dr: 0 },  // left
    { dc: 1, dr: 0 }    // right
  ];

  for (const { dc, dr } of directions) {
    const newCol = pos.col + dc;
    const newRow = pos.row + dr;

    // Check bounds
    if (newRow < 0 || newRow >= tileMap.length) continue;
    if (newCol < 0 || newCol >= tileMap[0].length) continue;

    // Check if walkable
    if (tileMap[newRow][newCol] === 1) continue;  // 1 = blocked

    // Check obstacles
    const key = `${newCol},${newRow}`;
    if (obstacles.has(key)) continue;

    neighbors.push({
      col: newCol,
      row: newRow,
      x: newCol * TILE_SIZE,
      y: newRow * TILE_SIZE
    });
  }

  return neighbors;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend/pixel-prototype && npm test -- pathfinding.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/pixel-prototype/src/utils/pathfinding.ts
git add frontend/pixel-prototype/__tests__/utils/pathfinding.test.ts
git commit -m "feat(pathfinding): add BFS pathfinding for agents

- Implement BFS algorithm for office-to-district navigation
- Add obstacle avoidance support
- Add walkable neighbor detection
- Test: path finding, obstacle avoidance
"
```

---

## Task 5: Agent Rendering Component (Canvas Pixel Sprites)

**Files:**
- Create: `frontend/pixel-prototype/src/components/map/AgentRenderer.tsx`
- Create: `frontend/pixel-prototype/src/utils/spriteData.ts`

- [ ] **Step 1: Write failing test for sprite rendering**

```typescript
// frontend/pixel-prototype/__tests__/components/AgentRenderer.test.tsx
import { describe, it, expect } from 'vitest';
import { getSpriteFrame } from '@/utils/spriteData';

describe('Agent Sprite System', () => {
  it('should return correct frame for idle state', () => {
    const frame = getSpriteFrame('idle', 0, 0);
    
    expect(frame).toBeDefined();
    expect(frame.length).toBe(64);  // 8x8 sprite = 64 pixels
  });

  it('should animate through walking frames', () => {
    const frame1 = getSpriteFrame('walking', 0, 0);
    const frame2 = getSpriteFrame('walking', 1, 0);
    
    expect(frame1).not.toEqual(frame2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend/pixel-prototype && npm test -- AgentRenderer.test.tsx`
Expected: FAIL with "getSpriteFrame is not defined"

- [ ] **Step 3: Define pixel sprite data**

```typescript
// frontend/pixel-prototype/src/utils/spriteData.ts
// 8x8 pixel sprites for agents (0=transparent, 1-4=palette colors)

const SPRITE_SIZE = 8;

// Idle frame: agent standing
const IDLE_FRAME: number[][] = [
  [0,0,0,1,1,0,0,0],
  [0,0,1,2,2,1,0,0],
  [0,0,1,3,3,1,0,0],
  [0,0,1,2,2,1,0,0],
  [0,0,1,1,4,4,0,0],
  [0,0,1,1,4,4,0,0],
  [0,0,0,1,1,0,0,0],
  [0,0,0,0,0,0,0,0]
];

// Walking frames 1-4
const WALKING_FRAMES: number[][][] = [
  [  // Frame 1: left foot forward
    [0,0,0,1,1,0,0,0],
    [0,0,1,2,2,1,0,0],
    [0,0,1,3,3,1,0,0],
    [0,0,1,2,2,1,0,0],
    [0,0,1,1,4,0,0,0],
    [0,0,1,1,4,4,0,0],
    [0,0,0,1,1,0,0,0],
    [0,0,0,0,4,0,0,0]
  ],
  [  // Frame 2: standing
    ...[IDLE_FRAME]
  ],
  [  // Frame 3: right foot forward
    [0,0,0,1,1,0,0,0],
    [0,0,1,2,2,1,0,0],
    [0,0,1,3,3,1,0,0],
    [0,0,1,2,2,1,0,0],
    [0,0,0,1,4,4,0,0],
    [0,0,1,1,4,4,0,0],
    [0,0,0,1,1,0,0,0],
    [0,0,4,0,0,0,0,0]
  ],
  [  // Frame 4: standing
    ...[IDLE_FRAME]
  ]
];

// Working frame: typing animation
const WORKING_FRAMES: number[][][] = [
  [  // Frame 1
    [0,0,0,1,1,0,0,0],
    [0,0,1,2,2,1,0,0],
    [0,0,1,3,3,1,0,0],
    [0,0,1,2,2,1,2,0],
    [0,0,1,1,4,4,0,0],
    [0,0,1,1,4,4,0,0],
    [0,0,0,1,1,0,0,0],
    [0,0,0,0,0,0,0,0]
  ],
  [  // Frame 2
    [0,0,0,1,1,0,0,0],
    [0,0,1,2,2,1,0,0],
    [0,0,1,3,3,1,0,0],
    [0,0,1,2,2,1,0,2],
    [0,0,1,1,4,4,0,0],
    [0,0,1,1,4,4,0,0],
    [0,0,0,1,1,0,0,0],
    [0,0,0,0,0,0,0,0]
  ]
];

// Color palettes for variety
const PALETTES: number[][][][] = [
  [  // Palette 0: Blue scanner
    [[0,0,0], [100,150,255], [50,100,200], [200,200,255], [50,50,100]]
  ],
  [  // Palette 1: Purple planner
    [[0,0,0], [180,100,255], [120,50,200], [230,200,255], [100,50,100]]
  ],
  [  // Palette 2: Green monitor
    [[0,0,0], [100,255,150], [50,200,100], [200,255,200], [50,100,50]]
  ]
];

export function getSpriteFrame(
  state: 'idle' | 'walking' | 'working' | 'returning',
  frameIndex: number,
  paletteIndex: number
): Uint8ClampedArray {
  // Select frame based on state
  let frame: number[][];
  if (state === 'idle') {
    frame = IDLE_FRAME;
  } else if (state === 'walking' || state === 'returning') {
    frame = WALKING_FRAMES[frameIndex % WALKING_FRAMES.length];
  } else {
    frame = WORKING_FRAMES[frameIndex % WORKING_FRAMES.length];
  }

  // Flatten to pixel array
  const pixels = new Uint8ClampedArray(SPRITE_SIZE * SPRITE_SIZE * 4);
  const palette = PALETTES[paletteIndex % PALETTES.length][0];

  for (let row = 0; row < SPRITE_SIZE; row++) {
    for (let col = 0; col < SPRITE_SIZE; col++) {
      const colorIndex = frame[row][col];
      const idx = (row * SPRITE_SIZE + col) * 4;

      if (colorIndex === 0) {
        // Transparent
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
      } else {
        const color = palette[colorIndex];
        pixels[idx] = color[0];
        pixels[idx + 1] = color[1];
        pixels[idx + 2] = color[2];
        pixels[idx + 3] = 255;
      }
    }
  }

  return pixels;
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  state: 'idle' | 'walking' | 'working' | 'returning',
  frame: number,
  palette: number,
  x: number,
  y: number,
  scale: number = 4
): void {
  const pixels = getSpriteFrame(state, frame, palette);
  const imageData = new ImageData(pixels, SPRITE_SIZE, SPRITE_SIZE);
  
  // Create temporary canvas to scale
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = SPRITE_SIZE * scale;
  tempCanvas.height = SPRITE_SIZE * scale;
  const tempCtx = tempCanvas.getContext('2d')!;
  
  tempCtx.putImageData(imageData, 0, 0);
  
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tempCanvas, x, y);
}
```

- [ ] **Step 4: Implement AgentRenderer component**

```typescript
// frontend/pixel-prototype/src/components/map/AgentRenderer.tsx
import { useEffect, useRef } from 'react';
import type { Agent } from '@/types/agents';
import { drawSprite } from '@/utils/spriteData';

interface AgentRendererProps {
  agents: Agent[];
  width: number;
  height: number;
}

export function AgentRenderer({ agents, width, height }: AgentRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw each agent
      for (const agent of agents) {
        const { position, state, frame, palette } = agent;
        
        // Draw sprite at position (centered)
        drawSprite(
          ctx,
          state,
          frame,
          palette,
          position.x - 16,
          position.y - 16,
          4  // 4x scale = 32x32 pixels
        );

        // Draw speech bubble if present
        if (agent.bubble) {
          drawBubble(ctx, agent.bubble, position.x, position.y - 30);
        }
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [agents, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    />
  );
}

function drawBubble(
  ctx: CanvasRenderingContext2D,
  bubble: { type: string; message: string },
  x: number,
  y: number
): void {
  const padding = 8;
  ctx.font = '12px monospace';
  const metrics = ctx.measureText(bubble.message);
  const width = metrics.width + padding * 2;
  const height = 24;

  // Bubble background
  ctx.fillStyle = bubble.type === 'warning' ? '#ff6b6b' : '#ffffff';
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  
  ctx.beginPath();
  ctx.roundRect(x - width / 2, y - height, width, height, 4);
  ctx.fill();
  ctx.stroke();

  // Text
  ctx.fillStyle = '#333';
  ctx.textAlign = 'center';
  ctx.fillText(bubble.message, x, y - 8);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend/pixel-prototype && npm test -- AgentRenderer.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/pixel-prototype/src/components/map/AgentRenderer.tsx
git add frontend/pixel-prototype/src/utils/spriteData.ts
git add frontend/pixel-prototype/__tests__/components/AgentRenderer.test.tsx
git commit -m "feat(agent-renderer): add pixel sprite agent rendering

- Implement 8x8 pixel sprites for agents (idle/walking/working)
- Add color palette system for visual variety
- Add Canvas renderer with speech bubble support
- Test: sprite frame generation
"
```

---

## Task 6: District Rendering Component

**Files:**
- Create: `frontend/pixel-prototype/src/components/map/DistrictRenderer.tsx`

- [ ] **Step 1: Write failing test for district rendering**

```typescript
// frontend/pixel-prototype/__tests__/components/DistrictRenderer.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DistrictRenderer } from '@/components/map/DistrictRenderer';
import type { District } from '@/types/agents';

describe('District Renderer', () => {
  it('should render district with supervisor', () => {
    const district: District = {
      id: 'test-compute',
      city: 'test',
      type: 'compute',
      supervisor: {
        id: 'sup-1',
        name: '👨‍💼 运营总监',
        icon: '👨‍💼',
        role: '监控服务健康度',
        statusMessage: '🟢 15个实例运行中',
        active: false
      },
      resources: [],
      issues: [],
      status: 'healthy',
      metrics: {
        resourceCount: 15,
        healthPercent: 100,
        customMetric: 'CPU',
        customValue: '45%'
      },
      position: { x: 100, y: 100, width: 200, height: 150 }
    };

    const { container } = render(
      <DistrictRenderer district={district} />
    );

    expect(container.textContent).toContain('运营总监');
    expect(container.textContent).toContain('15个实例运行中');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend/pixel-prototype && npm test -- DistrictRenderer.test.tsx`
Expected: FAIL with "DistrictRenderer is not defined"

- [ ] **Step 3: Implement DistrictRenderer component**

```typescript
// frontend/pixel-prototype/src/components/map/DistrictRenderer.tsx
import type { District } from '@/types/agents';

interface DistrictRendererProps {
  district: District;
  onClick?: () => void;
}

export function DistrictRenderer({ district, onClick }: DistrictRendererProps) {
  const { position, supervisor, status, issues, metrics } = district;

  // Status color
  const statusColor = status === 'healthy' ? '#4ade80' : status === 'warning' ? '#fbbf24' : '#ef4444';
  const borderColor = status === 'healthy' ? '#22c55e' : status === 'warning' ? '#f59e0b' : '#dc2626';

  return (
    <div
      className="district"
      onClick={onClick}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: position.width,
        height: position.height,
        border: `3px solid ${borderColor}`,
        borderRadius: '8px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        cursor: onClick ? 'pointer' : 'default',
        padding: '12px',
        fontFamily: 'monospace',
        color: '#fff',
        transition: 'transform 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {/* Supervisor header */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
          {supervisor.name}
        </div>
        <div style={{ fontSize: '11px', opacity: 0.8 }}>
          {supervisor.role}
        </div>
      </div>

      {/* Status indicator */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '8px',
        fontSize: '12px'
      }}>
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: statusColor,
            marginRight: '6px'
          }}
        />
        {supervisor.active ? (
          <span>🔧 Agent工作中...</span>
        ) : (
          <span>{supervisor.statusMessage}</span>
        )}
      </div>

      {/* Metrics */}
      <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '8px' }}>
        <div>📊 资源: {metrics.resourceCount}</div>
        <div>❤️ 健康: {metrics.healthPercent}%</div>
        <div>
          {metrics.customMetric === 'CPU' && '🖥️'}
          {metrics.customMetric === '容量' && '💾'}
          {metrics.customMetric === 'QPS' && '📈'}
          {metrics.customMetric === '配置' && '⚙️'}
          {' '}{metrics.customMetric}: {metrics.customValue}
        </div>
      </div>

      {/* Issues */}
      {issues.length > 0 && (
        <div style={{ 
          borderTop: '1px solid rgba(255,255,255,0.2)',
          paddingTop: '8px',
          marginTop: '8px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>
            ⚠️ 问题 ({issues.length})
          </div>
          {issues.map(issue => (
            <div
              key={issue.id}
              style={{
                fontSize: '10px',
                padding: '4px',
                marginBottom: '4px',
                backgroundColor: issue.severity === 'high' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(251, 191, 36, 0.3)',
                borderRadius: '4px'
              }}
            >
              {issue.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend/pixel-prototype && npm test -- DistrictRenderer.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/pixel-prototype/src/components/map/DistrictRenderer.tsx
git add frontend/pixel-prototype/__tests__/components/DistrictRenderer.test.tsx
git commit -m "feat(district-renderer): add district component display

- Render district with supervisor info
- Show status, metrics, and issues
- Add hover effects and click handling
- Test: district rendering with supervisor
"
```

---

## Task 7: AgentCard Office Component

**Files:**
- Create: `frontend/pixel-prototype/src/components/office/AgentCard.tsx`

- [ ] **Step 1: Write failing test for agent card**

```typescript
// frontend/pixel-prototype/__tests__/components/AgentCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { AgentCard } from '@/components/office/AgentCard';
import type { Agent } from '@/types/agents';

describe('AgentCard', () => {
  it('should display agent name and status', () => {
    const agent: Agent = {
      id: 'agent-1',
      name: '🕵️ 普查员 #1',
      icon: '🕵️',
      role: 'scanner',
      state: 'idle',
      location: { type: 'office' },
      position: { x: 50, y: 100, tileCol: 1, tileRow: 1 },
      path: [],
      currentTask: null,
      progress: 0,
      bubble: null,
      palette: 0,
      frame: 0,
      frameTimer: 0
    };

    const { container } = render(
      <AgentCard agent={agent} onClick={vi.fn()} />
    );

    expect(container.textContent).toContain('普查员 #1');
    expect(container.textContent).toContain('空闲');
  });

  it('should call onClick when clicked', () => {
    const agent: Agent = {
      id: 'agent-1',
      name: '🕵️ 普查员 #1',
      icon: '🕵️',
      role: 'scanner',
      state: 'idle',
      location: { type: 'office' },
      position: { x: 50, y: 100, tileCol: 1, tileRow: 1 },
      path: [],
      currentTask: null,
      progress: 0,
      bubble: null,
      palette: 0,
      frame: 0,
      frameTimer: 0
    };

    const handleClick = vi.fn();
    const { container } = render(
      <AgentCard agent={agent} onClick={handleClick} />
    );

    const card = container.querySelector('.agent-card');
    fireEvent.click(card!);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend/pixel-prototype && npm test -- AgentCard.test.tsx`
Expected: FAIL with "AgentCard is not defined"

- [ ] **Step 3: Implement AgentCard component**

```typescript
// frontend/pixel-prototype/src/components/office/AgentCard.tsx
import type { Agent } from '@/types/agents';

interface AgentCardProps {
  agent: Agent;
  onClick: () => void;
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
  const statusText = {
    idle: '空闲',
    walking: '路上',
    working: '工作中',
    returning: '返回中'
  }[agent.state];

  const statusColor = {
    idle: '#6b7280',
    walking: '#3b82f6',
    working: '#f59e0b',
    returning: '#8b5cf6'
  }[agent.state];

  return (
    <div
      className="agent-card"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px',
        marginBottom: '8px',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        border: `2px solid ${statusColor}`,
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontFamily: 'monospace'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: '48px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          marginRight: '12px'
        }}
      >
        {agent.icon}
      </div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
          {agent.name}
        </div>
        <div style={{ fontSize: '12px', color: statusColor }}>
          ● {statusText}
        </div>
        
        {agent.currentTask && (
          <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
            📋 {agent.currentTask.skill}
          </div>
        )}

        {agent.currentTask && agent.progress > 0 && (
          <div style={{ marginTop: '6px' }}>
            <div
              style={{
                height: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '2px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${agent.progress}%`,
                  backgroundColor: statusColor,
                  transition: 'width 0.3s'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Speech bubble */}
      {agent.bubble && (
        <div
          style={{
            position: 'absolute',
            top: '-20px',
            right: '10px',
            backgroundColor: agent.bubble.type === 'warning' ? '#ef4444' : '#fff',
            color: agent.bubble.type === 'warning' ? '#fff' : '#000',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            whiteSpace: 'nowrap'
          }}
        >
          {agent.bubble.message}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend/pixel-prototype && npm test -- AgentCard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/pixel-prototype/src/components/office/AgentCard.tsx
git add frontend/pixel-prototype/__tests__/components/AgentCard.test.tsx
git commit -m "feat(agent-card): add clickable agent card for office

- Display agent name, status, and current task
- Show progress bar for active tasks
- Add click handling and hover effects
- Test: card rendering and click interaction
"
```

---

## Task 8: QualityDesk Component (Approval Interface)

**Files:**
- Create: `frontend/pixel-prototype/src/components/office/QualityDesk.tsx`

- [ ] **Step 1: Write failing test for quality desk**

```typescript
// frontend/pixel-prototype/__tests__/components/QualityDesk.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { QualityDesk } from '@/components/office/QualityDesk';
import type { Agent, Task } from '@/types/agents';

describe('QualityDesk', () => {
  it('should display pending review items', () => {
    const agent: Agent = {
      id: 'agent-1',
      name: '👮 审核员 #1',
      icon: '👮',
      role: 'monitor',
      state: 'idle',
      location: { type: 'office' },
      position: { x: 50, y: 100, tileCol: 1, tileRow: 1 },
      path: [],
      currentTask: null,
      progress: 0,
      bubble: null,
      palette: 0,
      frame: 0,
      frameTimer: 0
    };

    const pendingReviews: Task[] = [
      {
        id: 'review-1',
        type: 'review',
        skill: 'review-xac-policy',
        targetDistrict: 'test-compute',
        status: 'pending',
        progress: 0
      }
    ];

    const { container } = render(
      <QualityDesk
        agent={agent}
        pendingReviews={pendingReviews}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(container.textContent).toContain('待审核');
    expect(container.textContent).toContain('review-xac-policy');
  });

  it('should call onApprove when approve clicked', () => {
    const agent: Agent = {
      id: 'agent-1',
      name: '👮 审核员 #1',
      icon: '👮',
      role: 'monitor',
      state: 'idle',
      location: { type: 'office' },
      position: { x: 50, y: 100, tileCol: 1, tileRow: 1 },
      path: [],
      currentTask: null,
      progress: 0,
      bubble: null,
      palette: 0,
      frame: 0,
      frameTimer: 0
    };

    const pendingReviews: Task[] = [
      {
        id: 'review-1',
        type: 'review',
        skill: 'review-xac-policy',
        targetDistrict: 'test-compute',
        status: 'pending',
        progress: 0
      }
    ];

    const handleApprove = vi.fn();
    const { getByText } = render(
      <QualityDesk
        agent={agent}
        pendingReviews={pendingReviews}
        onApprove={handleApprove}
        onReject={vi.fn()}
      />
    );

    fireEvent.click(getByText('✅ 签收'));
    expect(handleApprove).toHaveBeenCalledWith('review-1');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend/pixel-prototype && npm test -- QualityDesk.test.tsx`
Expected: FAIL with "QualityDesk is not defined"

- [ ] **Step 3: Implement QualityDesk component**

```typescript
// frontend/pixel-prototype/src/components/office/QualityDesk.tsx
import type { Agent, Task } from '@/types/agents';

interface QualityDeskProps {
  agent: Agent;
  pendingReviews: Task[];
  onApprove: (taskId: string) => void;
  onReject: (taskId: string) => void;
}

export function QualityDesk({
  agent,
  pendingReviews,
  onApprove,
  onReject
}: QualityDeskProps) {
  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        border: '2px solid #8b5cf6',
        borderRadius: '8px',
        marginBottom: '16px',
        fontFamily: 'monospace'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            backgroundColor: 'rgba(139, 92, 246, 0.2)',
            borderRadius: '8px',
            marginRight: '12px'
          }}
        >
          {agent.icon}
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
            {agent.name}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.8 }}>
            质量验收台
          </div>
        </div>
      </div>

      {/* Pending reviews */}
      {pendingReviews.length === 0 ? (
        <div
          style={{
            padding: '12px',
            textAlign: 'center',
            opacity: 0.6,
            fontSize: '12px'
          }}
        >
          暂无待审核项
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '12px', marginBottom: '8px', opacity: 0.8 }}>
            待审核 ({pendingReviews.length})
          </div>
          {pendingReviews.map(review => (
            <div
              key={review.id}
              style={{
                padding: '10px',
                marginBottom: '8px',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                borderRadius: '6px',
                border: '1px solid rgba(139, 92, 246, 0.3)'
              }}
            >
              <div style={{ fontSize: '12px', marginBottom: '6px' }}>
                <strong>{review.skill}</strong>
              </div>
              <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '8px' }}>
                目标: {review.targetDistrict}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => onApprove(review.id)}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    backgroundColor: '#22c55e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontFamily: 'monospace'
                  }}
                >
                  ✅ 签收
                </button>
                <button
                  onClick={() => onReject(review.id)}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontFamily: 'monospace'
                  }}
                >
                  ❌ 驳回
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend/pixel-prototype && npm test -- QualityDesk.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/pixel-prototype/src/components/office/QualityDesk.tsx
git add frontend/pixel-prototype/__tests__/components/QualityDesk.test.tsx
git commit -m "feat(quality-desk): add review approval interface

- Display pending review items
- Add approve/reject buttons
- Show agent info and review details
- Test: review display and approval interaction
"
```

---

## Task 9: DispatchPanel Component (Task Assignment)

**Files:**
- Create: `frontend/pixel-prototype/src/components/office/DispatchPanel.tsx`

- [ ] **Step 1: Write failing test for dispatch panel**

```typescript
// frontend/pixel-prototype/__tests__/components/DispatchPanel.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { DispatchPanel } from '@/components/office/DispatchPanel';

describe('DispatchPanel', () => {
  it('should display available tasks', () => {
    const availableTasks = [
      {
        id: 'task-1',
        type: 'scan' as const,
        skill: 'discover-resources',
        targetDistrict: 'test-compute',
        status: 'pending' as const,
        progress: 0
      }
    ];

    const agents = ['agent-1', 'agent-2'];

    const { container } = render(
      <DispatchPanel
        availableTasks={availableTasks}
        agents={agents}
        onDispatch={vi.fn()}
      />
    );

    expect(container.textContent).toContain('discover-resources');
    expect(container.textContent).toContain('派工');
  });

  it('should call onDispatch with task and agent', () => {
    const availableTasks = [
      {
        id: 'task-1',
        type: 'scan' as const,
        skill: 'discover-resources',
        targetDistrict: 'test-compute',
        status: 'pending' as const,
        progress: 0
      }
    ];

    const agents = ['agent-1', 'agent-2'];
    const handleDispatch = vi.fn();

    const { getByText } = render(
      <DispatchPanel
        availableTasks={availableTasks}
        agents={agents}
        onDispatch={handleDispatch}
      />
    );

    // Select agent first
    const agentSelect = getByText('选择 Agent').nextSibling as HTMLSelectElement;
    fireEvent.change(agentSelect, { target: { value: 'agent-1' } });

    // Click dispatch
    fireEvent.click(getByText('🚀 派工'));

    expect(handleDispatch).toHaveBeenCalledWith('task-1', 'agent-1');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend/pixel-prototype && npm test -- DispatchPanel.test.tsx`
Expected: FAIL with "DispatchPanel is not defined"

- [ ] **Step 3: Implement DispatchPanel component**

```typescript
// frontend/pixel-prototype/src/components/office/DispatchPanel.tsx
import { useState } from 'react';
import type { Task } from '@/types/agents';

interface DispatchPanelProps {
  availableTasks: Task[];
  agents: string[];
  onDispatch: (taskId: string, agentId: string) => void;
}

export function DispatchPanel({
  availableTasks,
  agents,
  onDispatch
}: DispatchPanelProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        border: '2px solid #3b82f6',
        borderRadius: '8px',
        fontFamily: 'monospace'
      }}
    >
      {/* Header */}
      <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>
        📋 任务调度台
      </div>

      {/* Agent selector */}
      {agents.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            选择 Agent:
          </label>
          <select
            value={selectedAgent || ''}
            onChange={(e) => setSelectedAgent(e.target.value || null)}
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              color: '#fff',
              border: '1px solid rgba(59, 130, 246, 0.5)',
              borderRadius: '4px',
              fontSize: '12px',
              fontFamily: 'monospace'
            }}
          >
            <option value="">-- 选择 Agent --</option>
            {agents.map(id => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </div>
      )}

      {/* Task list */}
      {availableTasks.length === 0 ? (
        <div
          style={{
            padding: '12px',
            textAlign: 'center',
            opacity: 0.6,
            fontSize: '12px'
          }}
        >
          暂无待处理任务
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '12px', marginBottom: '8px', opacity: 0.8 }}>
            待处理 ({availableTasks.length})
          </div>
          {availableTasks.map(task => (
            <div
              key={task.id}
              style={{
                padding: '10px',
                marginBottom: '8px',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                borderRadius: '6px',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}
            >
              <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                <strong>{task.skill}</strong>
              </div>
              <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '8px' }}>
                目标: {task.targetDistrict}
              </div>
              <button
                onClick={() => {
                  if (selectedAgent) {
                    onDispatch(task.id, selectedAgent);
                  } else {
                    alert('请先选择 Agent');
                  }
                }}
                disabled={!selectedAgent}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: selectedAgent ? '#3b82f6' : '#6b7280',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: selectedAgent ? 'pointer' : 'not-allowed',
                  fontFamily: 'monospace'
                }}
              >
                🚀 派工
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend/pixel-prototype && npm test -- DispatchPanel.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/pixel-prototype/src/components/office/DispatchPanel.tsx
git add frontend/pixel-prototype/__tests__/components/DispatchPanel.test.tsx
git commit -m "feat(dispatch-panel): add task assignment interface

- Display available tasks
- Add agent selector dropdown
- Implement task dispatch with agent assignment
- Test: task display and dispatch interaction
"
```

---

## Task 10: View Switching UI

**Files:**
- Create: `frontend/pixel-prototype/src/components/map/ViewSwitcher.tsx`

- [ ] **Step 1: Write failing test for view switcher**

```typescript
// frontend/pixel-prototype/__tests__/components/ViewSwitcher.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ViewSwitcher } from '@/components/map/ViewSwitcher';

describe('ViewSwitcher', () => {
  it('should display three dimension buttons', () => {
    const { container } = render(
      <ViewSwitcher
        currentDimension="environment"
        onDimensionChange={vi.fn()}
        currentCity="test"
        onCityChange={vi.fn()}
      />
    );

    expect(container.textContent).toContain('环境视图');
    expect(container.textContent).toContain('资源视图');
    expect(container.textContent).toContain('应用视图');
  });

  it('should call onDimensionChange when button clicked', () => {
    const handleChange = vi.fn();
    const { getByText } = render(
      <ViewSwitcher
        currentDimension="environment"
        onDimensionChange={handleChange}
        currentCity="test"
        onCityChange={vi.fn()}
      />
    );

    fireEvent.click(getByText('资源视图'));
    expect(handleChange).toHaveBeenCalledWith('resource');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend/pixel-prototype && npm test -- ViewSwitcher.test.tsx`
Expected: FAIL with "ViewSwitcher is not defined"

- [ ] **Step 3: Implement ViewSwitcher component**

```typescript
// frontend/pixel-prototype/src/components/map/ViewSwitcher.tsx'
interface ViewSwitcherProps {
  currentDimension: 'environment' | 'resource' | 'application';
  onDimensionChange: (dimension: 'environment' | 'resource' | 'application') => void;
  currentCity: 'test' | 'prod' | null;
  onCityChange: (city: 'test' | 'prod' | null) => void;
}

export function ViewSwitcher({
  currentDimension,
  onDimensionChange,
  currentCity,
  onCityChange
}: ViewSwitcherProps) {
  const dimensions = [
    { id: 'environment' as const, label: '环境视图', icon: '🌍' },
    { id: 'resource' as const, label: '资源视图', icon: '📦' },
    { id: 'application' as const, label: '应用视图', icon: '🚀' }
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        fontFamily: 'monospace'
      }}
    >
      {/* Dimension buttons */}
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: '12px',
          borderRadius: '8px',
          border: '2px solid #3b82f6'
        }}
      >
        <div style={{ fontSize: '12px', marginBottom: '8px', opacity: 0.8 }}>
          视图维度
        </div>
        {dimensions.map(dim => (
          <button
            key={dim.id}
            onClick={() => onDimensionChange(dim.id)}
            style={{
              width: '100%',
              padding: '8px 12px',
              marginBottom: '6px',
              backgroundColor: currentDimension === dim.id ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              border: currentDimension === dim.id ? '2px solid #60a5fa' : '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>{dim.icon}</span>
            <span>{dim.label}</span>
          </button>
        ))}
      </div>

      {/* City selector (only in environment view) */}
      {currentDimension === 'environment' && (
        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: '12px',
            borderRadius: '8px',
            border: '2px solid #22c55e'
          }}
        >
          <div style={{ fontSize: '12px', marginBottom: '8px', opacity: 0.8 }}>
            选择环境
          </div>
          {(['test', 'prod'] as const).map(city => (
            <button
              key={city}
              onClick={() => onCityChange(city)}
              style={{
                width: '100%',
                padding: '8px 12px',
                marginBottom: '6px',
                backgroundColor: currentCity === city ? '#22c55e' : 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                border: currentCity === city ? '2px solid #4ade80' : '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                textTransform: 'uppercase'
              }}
            >
              {city === 'test' ? '🧪 测试环境' : '🚀 生产环境'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend/pixel-prototype && npm test -- ViewSwitcher.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/pixel-prototype/src/components/map/ViewSwitcher.tsx
git add frontend/pixel-prototype/__tests__/components/ViewSwitcher.test.tsx
git commit -m "feat(view-switcher): add three-dimensional view switching

- Add dimension buttons (environment/resource/application)
- Add city selector for environment view
- Highlight active dimension/city
- Test: button rendering and dimension change
"
```

---

## Task 11: Agent Animation System

**Files:**
- Create: `frontend/pixel-prototype/src/hooks/useAgentAnimation.ts`

- [ ] **Step 1: Write failing test for animation system**

```typescript
// frontend/pixel-prototype/__tests__/hooks/useAgentAnimation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAgentAnimation } from '@/hooks/useAgentAnimation';
import type { Agent } from '@/types/agents';

describe('useAgentAnimation', () => {
  it('should update agent frame on animation tick', () => {
    const agent: Agent = {
      id: 'agent-1',
      name: 'Test Agent',
      icon: '🕵️',
      role: 'scanner',
      state: 'walking',
      location: { type: 'office' },
      position: { x: 50, y: 100, tileCol: 1, tileRow: 1 },
      path: [
        { x: 50, y: 100, tileCol: 1, tileRow: 1 },
        { x: 100, y: 100, tileCol: 3, tileRow: 1 }
      ],
      currentTask: null,
      progress: 0,
      bubble: null,
      palette: 0,
      frame: 0,
      frameTimer: 0
    };

    const { result } = renderHook(() => useAgentAnimation());

    act(() => {
      result.current.updateAgent(agent);
    });

    // After update, frame should increment for walking state
    expect(result.current.getAgents()['agent-1'].frame).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend/pixel-prototype && npm test -- useAgentAnimation.test.ts`
Expected: FAIL with "useAgentAnimation is not defined"

- [ ] **Step 3: Implement animation hook**

```typescript
// frontend/pixel-prototype/src/hooks/useAgentAnimation.ts
import { useEffect, useRef, useCallback } from 'react';
import type { Agent, AgentState, Position } from '@/types/agents';

const FRAME_DELAY = 150; // ms between frame updates
const MOVE_SPEED = 2;    // pixels per tick

export function useAgentAnimation() {
  const agentsRef = useRef<Record<string, Agent>>({});
  const animationFrameRef = useRef<number>();
  const lastUpdateRef = useRef<number>(Date.now());

  const updateAgentPosition = useCallback((agent: Agent): Agent => {
    if (agent.path.length === 0) return agent;

    const target = agent.path[0];
    const dx = target.x - agent.position.x;
    const dy = target.y - agent.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < MOVE_SPEED) {
      // Reached waypoint, remove it
      const newPath = agent.path.slice(1);
      return {
        ...agent,
        position: {
          ...target,
          tileCol: target.tileCol,
          tileRow: target.tileRow
        },
        path: newPath
      };
    }

    // Move towards target
    const moveX = (dx / distance) * MOVE_SPEED;
    const moveY = (dy / distance) * MOVE_SPEED;

    return {
      ...agent,
      position: {
        x: agent.position.x + moveX,
        y: agent.position.y + moveY,
        tileCol: agent.position.tileCol,
        tileRow: agent.position.tileRow
      }
    };
  }, []);

  const updateAgentFrame = useCallback((agent: Agent, now: number): Agent => {
    const elapsed = now - lastUpdateRef.current;

    if (elapsed < FRAME_DELAY) {
      return agent;
    }

    const newFrameTimer = agent.frameTimer + elapsed;
    const shouldIncrement = newFrameTimer >= FRAME_DELAY;

    if (!shouldIncrement) {
      return { ...agent, frameTimer: newFrameTimer };
    }

    // Increment frame
    const maxFrame = agent.state === 'walking' || agent.state === 'returning' ? 3 : 1;
    const newFrame = (agent.frame + 1) % (maxFrame + 1);

    return {
      ...agent,
      frame: newFrame,
      frameTimer: 0
    };
  }, []);

  const updateAgent = useCallback((agent: Agent): Agent => {
    let updatedAgent = agent;

    // Update position if walking or returning
    if (agent.state === 'walking' || agent.state === 'returning') {
      updatedAgent = updateAgentPosition(updatedAgent);
      
      // Check if reached destination
      if (updatedAgent.path.length === 0 && updatedAgent.state === 'walking') {
        updatedAgent = { ...updatedAgent, state: 'working' as AgentState };
      } else if (updatedAgent.path.length === 0 && updatedAgent.state === 'returning') {
        updatedAgent = { ...updatedAgent, state: 'idle' as AgentState };
      }
    }

    // Update animation frame
    const now = Date.now();
    updatedAgent = updateAgentFrame(updatedAgent, now);

    return updatedAgent;
  }, [updateAgentPosition, updateAgentFrame]);

  const tick = useCallback(() => {
    const now = Date.now();
    const agents = agentsRef.current;

    // Update each agent
    for (const id in agents) {
      agents[id] = updateAgent(agents[id]);
    }

    lastUpdateRef.current = now;
    animationFrameRef.current = requestAnimationFrame(tick);
  }, [updateAgent]);

  const start = useCallback(() => {
    if (animationFrameRef.current) return;
    tick();
  }, [tick]);

  const stop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
  }, []);

  const getAgents = useCallback(() => agentsRef.current, []);

  return {
    updateAgent,
    start,
    stop,
    getAgents
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend/pixel-prototype && npm test -- useAgentAnimation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/pixel-prototype/src/hooks/useAgentAnimation.ts
git add frontend/pixel-prototype/__tests__/hooks/useAgentAnimation.test.ts
git commit -m "feat(animation): add agent animation system

- Implement frame timing for walk/work animations
- Add position interpolation for smooth movement
- Handle path following and state transitions
- Test: frame updates and position changes
"
```

---

## Task 12: Complete City Map Component (Integration)

**Files:**
- Create: `frontend/pixel-prototype/src/components/map/CityMap.tsx`

- [ ] **Step 1: Write failing integration test**

```typescript
// frontend/pixel-prototype/__tests__/components/CityMap.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CityMap } from '@/components/map/CityMap';

describe('CityMap Integration', () => {
  it('should render agents and districts together', () => {
    const { container } = render(<CityMap />);
    
    // Should have canvas for agents
    expect(container.querySelector('canvas')).toBeDefined();
    
    // Should have view switcher
    expect(container.textContent).toContain('环境视图');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend/pixel-prototype && npm test -- CityMap.test.tsx`
Expected: FAIL with "CityMap is not defined"

- [ ] **Step 3: Implement CityMap component**

```typescript
// frontend/pixel-prototype/src/components/map/CityMap.tsx
import { useEffect } from 'react';
import { useAgentStore } from '@/store/agents';
import { useDistrictStore } from '@/store/districts';
import { AgentRenderer } from './AgentRenderer';
import { DistrictRenderer } from './DistrictRenderer';
import { ViewSwitcher } from './ViewSwitcher';
import { useAgentAnimation } from '@/hooks/useAgentAnimation';
import type { ViewDimension } from '@/types/agents';

const MAP_WIDTH = 1200;
const MAP_HEIGHT = 800;

export function CityMap() {
  const agents = useAgentStore(state => Object.values(state.agents));
  const districts = useDistrictStore(state => Object.values(state.districts));
  const viewDimension = useDistrictStore(state => state.viewDimension);
  const selectedCity = useDistrictStore(state => state.selectedCity);
  const setViewDimension = useDistrictStore(state => state.setViewDimension);
  const setCity = useDistrictStore(state => state.setCity);
  
  const { start, stop, getAgents } = useAgentAnimation();

  useEffect(() => {
    // Initialize agents
    const store = useAgentStore.getState();
    store.createAgent('scanner-1', 'scanner', '🕵️ 普查员 #1');
    store.createAgent('planner-1', 'planner', '👨‍🎨 规划师 #1');
    store.createAgent('monitor-1', 'monitor', '👮 审核员 #1');

    // Initialize districts
    const districtStore = useDistrictStore.getState();
    districtStore.createDistrict({
      id: 'test-compute',
      city: 'test',
      type: 'compute',
      position: { x: 200, y: 150, width: 180, height: 140 }
    });
    districtStore.createDistrict({
      id: 'test-data',
      city: 'test',
      type: 'data',
      position: { x: 420, y: 150, width: 180, height: 140 }
    });
    districtStore.createDistrict({
      id: 'prod-compute',
      city: 'prod',
      type: 'compute',
      position: { x: 200, y: 330, width: 180, height: 140 }
    });
    districtStore.createDistrict({
      id: 'prod-data',
      city: 'prod',
      type: 'data',
      position: { x: 420, y: 330, width: 180, height: 140 }
    });

    // Start animation
    start();

    return () => stop();
  }, [start, stop]);

  // Filter districts based on view
  const filteredDistricts = districts.filter(d => {
    if (viewDimension === 'environment') {
      return d.city === selectedCity;
    }
    return true; // Show all in resource/app view
  });

  return (
    <div
      style={{
        position: 'relative',
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
        backgroundColor: '#1a1a2e',
        overflow: 'hidden'
      }}
    >
      {/* View switcher */}
      <ViewSwitcher
        currentDimension={viewDimension}
        onDimensionChange={(dim) => setViewDimension(dim)}
        currentCity={selectedCity}
        onCityChange={(city) => setCity(city)}
      />

      {/* Districts */}
      {filteredDistricts.map(district => (
        <DistrictRenderer
          key={district.id}
          district={district}
          onClick={() => {
            // Handle district click (show details, dispatch agent, etc.)
            console.log('Clicked district:', district.id);
          }}
        />
      ))}

      {/* Agents */}
      <AgentRenderer agents={getAgents()} width={MAP_WIDTH} height={MAP_HEIGHT} />

      {/* Office area indicator */}
      <div
        style={{
          position: 'absolute',
          left: 20,
          bottom: 20,
          padding: '12px',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          border: '2px solid #8b5cf6',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#fff'
        }}
      >
        🏢 办公室区域
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend/pixel-prototype && npm test -- CityMap.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/pixel-prototype/src/components/map/CityMap.tsx
git add frontend/pixel-prototype/__tests__/components/CityMap.test.tsx
git commit -m "feat(city-map): integrate agents and districts

- Combine AgentRenderer and DistrictRenderer
- Add ViewSwitcher for dimension control
- Initialize default agents and districts
- Filter districts based on selected view
- Test: integrated rendering
"
```

---

## Task 13: Office Panel Integration

**Files:**
- Modify: `frontend/pixel-prototype/src/components/city/AgentOfficePanel.tsx`

- [ ] **Step 1: Update existing office panel**

```typescript
// frontend/pixel-prototype/src/components/city/AgentOfficePanel.tsx
import { useAgentStore } from '@/store/agents';
import { useDistrictStore } from '@/store/districts';
import { AgentCard } from '../office/AgentCard';
import { QualityDesk } from '../office/QualityDesk';
import { DispatchPanel } from '../office/DispatchPanel';
import type { Task } from '@/types/agents';

export function AgentOfficePanel() {
  const agents = useAgentStore(state => Object.values(state.agents));
  const selectedAgentId = useAgentStore(state => state.selectedAgentId);
  const selectAgent = useAgentStore(state => state.selectAgent);
  const assignTask = useAgentStore(state => state.assignTask);
  
  // Filter agents by role for quality desk
  const reviewerAgents = agents.filter(a => a.role === 'monitor');
  const reviewerAgent = reviewerAgents[0];

  // Mock pending reviews (will come from actual workflow later)
  const pendingReviews: Task[] = [
    // Populated by district events
  ];

  // Mock available tasks (will come from district issues)
  const availableTasks: Task[] = [];

  const handleDispatch = (taskId: string, agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    const task = availableTasks.find(t => t.id === taskId);
    
    if (agent && task) {
      assignTask(agentId, task);
    }
  };

  const handleApprove = (taskId: string) => {
    // Mark task as approved, proceed with deployment
    console.log('Approved:', taskId);
  };

  const handleReject = (taskId: string) => {
    // Send back for revision
    console.log('Rejected:', taskId);
  };

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        width: '360px',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderLeft: '3px solid #8b5cf6',
        padding: '20px',
        overflowY: 'auto',
        fontFamily: 'monospace',
        color: '#fff'
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
          🏢 DEACON OFFICE
        </h2>
        <div style={{ fontSize: '12px', opacity: 0.7 }}>
          Infrastructure Operations Center
        </div>
      </div>

      {/* Quality Desk */}
      {reviewerAgent && (
        <QualityDesk
          agent={reviewerAgent}
          pendingReviews={pendingReviews}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {/* Dispatch Panel */}
      <DispatchPanel
        availableTasks={availableTasks}
        agents={agents.filter(a => a.state === 'idle').map(a => a.id)}
        onDispatch={handleDispatch}
      />

      {/* Agent List */}
      <div style={{ marginTop: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
          👥 工作人员 ({agents.length})
        </div>
        {agents.map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onClick={() => selectAgent(agent.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript compiler**

Run: `cd frontend/pixel-prototype && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add frontend/pixel-prototype/src/components/city/AgentOfficePanel.tsx
git commit -m "feat(office-panel): integrate with agent system

- Connect to agent and district stores
- Add QualityDesk and DispatchPanel
- Display agent cards with state
- Handle task dispatch and review approval
"
```

---

## Task 14: Event System Integration

**Files:**
- Create: `frontend/pixel-prototype/src/utils/events.ts`

- [ ] **Step 1: Write failing test for event system**

```typescript
// frontend/pixel-prototype/__tests__/utils/events.test.ts
import { describe, it, expect } from 'vitest';
import { EventManager } from '@/utils/events';

describe('EventManager', () => {
  it('should register and trigger event listeners', () => {
    const manager = new EventManager();
    let triggered = false;
    
    manager.on('district:issue', () => {
      triggered = true;
    });
    
    manager.emit('district:issue', { districtId: 'test-compute' });
    
    expect(triggered).toBe(true);
  });

  it('should map skill to event', () => {
    const manager = new EventManager();
    const event = manager.skillToEvent('discover-resources');
    
    expect(event).toBe('district:scan-needed');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend/pixel-prototype && npm test -- events.test.ts`
Expected: FAIL with "EventManager is not defined"

- [ ] **Step 3: Implement event manager**

```typescript
// frontend/pixel-prototype/src/utils/events.ts
type EventListener = (data: any) => void;

// Skill to event mapping (from spec)
const SKILL_EVENTS: Record<string, string> = {
  'discover-resources': 'district:scan-needed',
  'generate-xac-definition': 'district:generate-definition',
  'generate-xac-policy': 'district:generate-policy',
  'review-xac-policy': 'district:review-request',
  'generate-xac-application': 'district:generate-application',
  'generate-terraform': 'district:generate-terraform',
  'apply-terraform': 'district:apply-terraform',
  'verify-drift': 'district:drift-detected',
  'fix-drift': 'district:fix-needed',
  // ... other skills
};

export class EventManager {
  private listeners: Map<string, EventListener[]> = new Map();

  on(event: string, listener: EventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: EventListener): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      for (const listener of eventListeners) {
        listener(data);
      }
    }
  }

  skillToEvent(skill: string): string | null {
    return SKILL_EVENTS[skill] || null;
  }
}

// Global event manager instance
export const eventManager = new EventManager();
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend/pixel-prototype && npm test -- events.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/pixel-prototype/src/utils/events.ts
git add frontend/pixel-prototype/__tests__/utils/events.test.ts
git commit -m "feat(events): add event manager for district events

- Implement pub/sub event system
- Map deployment kit skills to district events
- Add on/off/emit methods
- Test: event registration and triggering
"
```

---

## Phase 1 Completion Checkpoint

At this point, we've completed the **Basic Agent Flow** (Phase 1 of the design spec):

✅ **Completed:**
- Agent state management with movement (IDLE → WALKING → WORKING → RETURNING)
- District entities with supervisors
- Pixel-art sprite rendering
- Pathfinding for navigation
- Office components (AgentCard, QualityDesk, DispatchPanel)
- View switching (environment/resource/application)
- Event system foundation

**Phase 1 provides:**
- Agents move from office to districts and back
- Districts show supervisor status and issues
- Clickable office interface for monitoring
- Visual feedback through pixel sprites and animations

**Next phases** (Task 15+): Would implement interaction scenarios, complete workflow integrations, and polish. But this checkpoint delivers a functional "living city" baseline.

---

Would you like to:
1. **Continue to Phase 2 tasks** (interaction scenarios)
2. **Start execution** of the current plan
3. **Review and refine** any of the existing tasks
