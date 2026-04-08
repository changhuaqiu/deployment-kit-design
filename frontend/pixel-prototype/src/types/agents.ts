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

// Personality traits
export type PersonalityTrait = 'perfectionist' | 'artistic' | 'strict' | 'relaxed';
export type WorkStyle = 'fast' | 'thorough' | 'creative';

export interface AgentPersonality {
  trait: PersonalityTrait;
  quirks: string[];
  workStyle: WorkStyle;
  relationships: Record<string, number>; // -100 to 100
  stats: {
    deploymentsCompleted: number;
    deploymentsRejected: number;
    averageSpeed: number; // seconds per task
  };
  preferences: {
    favoriteBuilding?: string;
    coffeePreference: 'black' | 'latte' | 'cappuccino';
    breakFrequency: number; // minutes between breaks
  };
}

// Visual states for agents
export enum AgentVisualState {
  IDLE = 'idle',
  WORKING = 'working',
  THINKING = 'thinking',
  EXCITED = 'excited',
  BLOCKED = 'blocked',
  SLEEPING = 'sleeping',
  OFFLINE = 'offline'
}

// Coffee buff
export interface CoffeeBuff {
  agentId: string;
  boostAmount: number; // 0.2 = 20% speed boost
  expiresAt: number;
}

// Dialogue bubble
export interface DialogueBubble {
  agentId: string;
  emoji: string;
  text: string;
  duration: number;
  timestamp: number;
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
  personality?: AgentPersonality;
  visualState?: AgentVisualState;
  workSpeedMultiplier?: number;
  lastCoffeeTime?: number;
  lastBreakTime?: number;
  stateHistory: AgentState[]; // Track state changes
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

// Personality generation function
export function generatePersonality(role: AgentRole): AgentPersonality {
  const traitMapping: Record<AgentRole, PersonalityTrait> = {
    [AgentRole.SCANNER]: 'perfectionist',
    [AgentRole.PLANNER]: 'artistic',
    [AgentRole.MONITOR]: 'strict'
  };

  const workStyleMapping: Record<PersonalityTrait, WorkStyle> = {
    perfectionist: 'thorough',
    artistic: 'creative',
    strict: 'thorough',
    relaxed: 'fast'
  };

  const quirksByTrait: Record<PersonalityTrait, string[]> = {
    perfectionist: [
      '收集放大镜', '反复检查', '追求完美', '注重细节'
    ],
    artistic: [
      '追求优雅', '喜欢emoji', '注重美学', '创意无限'
    ],
    strict: [
      '喝茶解压', '严格review', '遵循流程', '合规第一'
    ],
    relaxed: [
      '善于沟通', '乐观积极', '轻松应对', '团队协作'
    ]
  };

  const trait = traitMapping[role];
  const allQuirks = quirksByTrait[trait];

  // Randomly select 2-3 quirks
  const numQuirks = 2 + Math.floor(Math.random() * 2);
  const quirks: string[] = [];
  for (let i = 0; i < numQuirks; i++) {
    const randomIndex = Math.floor(Math.random() * allQuirks.length);
    if (!quirks.includes(allQuirks[randomIndex])) {
      quirks.push(allQuirks[randomIndex]);
    }
  }

  return {
    trait,
    quirks,
    workStyle: workStyleMapping[trait],
    relationships: {},
    stats: {
      deploymentsCompleted: 0,
      deploymentsRejected: 0,
      averageSpeed: 0
    },
    preferences: {
      coffeePreference: ['black', 'latte', 'cappuccino'][Math.floor(Math.random() * 3)] as any,
      breakFrequency: 30 + Math.floor(Math.random() * 60) // 30-90 minutes
    }
  };
}