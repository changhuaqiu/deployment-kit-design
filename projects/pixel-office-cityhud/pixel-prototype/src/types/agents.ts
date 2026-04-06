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