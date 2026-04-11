import { create } from 'zustand';
import {
  Agent,
  AgentState,
  AgentRole,
  Task,
  Position,
  AgentLocation,
  District,
  DistrictType
} from '@/types/agents';
import { generatePersonality } from '@/types/agents';
import { AgentVisualState } from '@/types/agents';

// NEW: WorkerAgent interface for map coordinate system
export interface WorkerAgent {
  id: string
  role: AgentRole
  name: string
  icon: string
  status: AgentState
  currentTask: string | null

  // NEW: Map-based position
  position?: {
    mapX: number
    mapY: number
  }
  target?: {
    mapX: number
    mapY: number
    buildingId?: string
  }
}

interface AgentStore {
  // State
  agents: Record<string, Agent>;
  tasks: Record<string, Task>;
  selectedAgentId: string | null;

  // Actions
  createAgent: (id: string, role: AgentRole, icon: string, name: string) => Agent;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  removeAgent: (id: string) => void;

  // Task management
  assignTask: (agentId: string, task: Task) => void;
  completeTask: (agentId: string, taskId: string) => void;
  failTask: (agentId: string, taskId: string) => void;

  // Location and movement
  setPathToDistrict: (agentId: string, district: District) => void;
  updateAgentPosition: (agentId: string, position: Position) => void;
  moveToOffice: (agentId: string) => void;

  // State transitions
  updateAgentState: (agentId: string, state: AgentState) => void;

  // UI state
  setAgentBubble: (agentId: string, bubble: Agent['bubble']) => void;
  clearBubble: (agentId: string) => void;

  // Selection
  selectAgent: (agentId: string | null) => void;

  // Utilities
  getAgentById: (id: string) => Agent | undefined;
  getAgentsByRole: (role: AgentRole) => Agent[];
  getAgentsByState: (state: AgentState) => Agent[];
}

// Helper function to generate path from office to district
const generatePathToDistrict = (district: District): Position[] => {
  // Office position (center bottom)
  const officeStart: Position = { x: 400, y: 350, tileCol: 20, tileRow: 17 };
  // District position
  const districtEnd: Position = {
    x: district.position.x + district.position.width / 2,
    y: district.position.y + district.position.height / 2,
    tileCol: Math.floor(district.position.x / 20),
    tileRow: Math.floor(district.position.y / 20)
  };

  // Simple path generation - in a real implementation, you'd use A* or similar
  const path: Position[] = [];
  const steps = 20;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    path.push({
      x: officeStart.x + (districtEnd.x - officeStart.x) * t,
      y: officeStart.y + (districtEnd.y - officeStart.y) * t,
      tileCol: Math.floor(officeStart.tileCol + (districtEnd.tileCol - officeStart.tileCol) * t),
      tileRow: Math.floor(officeStart.tileRow + (districtEnd.tileRow - officeStart.tileRow) * t)
    });
  }

  return path;
};

const createAgentStore = () => create<AgentStore>((set, get) => ({
  // Initial state
  agents: {},
  tasks: {},
  selectedAgentId: null,

  // Agent creation and management
  createAgent: (id: string, role: AgentRole, icon: string, name: string) => {
    const personality = generatePersonality(role);

    const newAgent: Agent = {
      id,
      name,
      icon,
      role,
      state: AgentState.IDLE,
      location: { type: 'office' },
      position: { x: 400, y: 350, tileCol: 20, tileRow: 17 }, // Start in office
      path: [],
      currentTask: null,
      progress: 0,
      bubble: null,
      palette: Math.floor(Math.random() * 5), // 0-4 for visual variety
      frame: 0,
      frameTimer: 0,
      personality,
      visualState: AgentVisualState.IDLE,
      workSpeedMultiplier: 1.0,
      lastBreakTime: Date.now(),
      stateHistory: []
    };

    set((state) => ({
      agents: { ...state.agents, [id]: newAgent }
    }));

    return newAgent;
  },

  updateAgent: (id: string, updates: Partial<Agent>) => {
    set((state) => ({
      agents: {
        ...state.agents,
        [id]: { ...state.agents[id], ...updates }
      }
    }));
  },

  removeAgent: (id: string) => {
    set((state) => {
      const newAgents = { ...state.agents };
      delete newAgents[id];
      return { agents: newAgents };
    });
  },

  // Task management
  assignTask: (agentId: string, task: Task) => {
    const store = get();
    const agent = store.agents[agentId];

    if (!agent) return;

    // Add task to tasks record
    set((state) => ({
      tasks: {
        ...state.tasks,
        [task.id]: task
      },
      agents: {
        ...state.agents,
        [agentId]: {
          ...agent,
          currentTask: task,
          state: AgentState.WALKING,
          progress: 0
        }
      }
    }));
  },

  completeTask: (agentId: string, taskId: string) => {
    const store = get();
    const agent = store.agents[agentId];

    if (!agent || !agent.currentTask || agent.currentTask.id !== taskId) return;

    // Create a new task with preserved properties and updated status
    const completedTask: Task = {
      ...agent.currentTask,
      status: 'completed' as const,
      progress: 100
    };

    // Update task to completed and return agent to office
    set((state) => ({
      agents: {
        ...state.agents,
        [agentId]: {
          ...agent,
          currentTask: completedTask,
          state: AgentState.RETURNING,
          progress: 100
        }
      }
    }));
  },

  failTask: (agentId: string, taskId: string) => {
    const store = get();
    const agent = store.agents[agentId];

    if (!agent || !agent.currentTask || agent.currentTask.id !== taskId) return;

    // Create a new task with preserved properties and updated status
    const failedTask: Task = {
      ...agent.currentTask,
      status: 'failed' as const,
      progress: 0
    };

    // Update task to failed and return agent to office
    set((state) => ({
      agents: {
        ...state.agents,
        [agentId]: {
          ...agent,
          currentTask: failedTask,
          state: AgentState.RETURNING,
          progress: 0
        }
      }
    }));
  },

  // Location and movement
  setPathToDistrict: (agentId: string, district: District) => {
    const store = get();
    const agent = store.agents[agentId];

    if (!agent) return;

    const path = generatePathToDistrict(district);

    set((state) => ({
      agents: {
        ...state.agents,
        [agentId]: {
          ...agent,
          path,
          location: {
            type: 'city',
            city: district.city,
            district: district.type
          }
        }
      }
    }));
  },

  updateAgentPosition: (agentId: string, position: Position) => {
    set((state) => ({
      agents: {
        ...state.agents,
        [agentId]: {
          ...state.agents[agentId],
          position
        }
      }
    }));
  },

  moveToOffice: (agentId: string) => {
    const store = get();
    const agent = store.agents[agentId];

    if (!agent) return;

    // Clear path and return to office
    set((state) => ({
      agents: {
        ...state.agents,
        [agentId]: {
          ...agent,
          path: [],
          location: { type: 'office' },
          state: AgentState.IDLE,
          currentTask: null
        }
      }
    }));
  },

  // State transitions
  updateAgentState: (agentId: string, newState: AgentState) => {
    set((state) => ({
      agents: {
        ...state.agents,
        [agentId]: {
          ...state.agents[agentId],
          state: newState
        }
      }
    }));
  },

  // Selection
  selectAgent: (agentId: string | null) => {
    set({ selectedAgentId: agentId });
  },

  // Utilities

  // UI state
  setAgentBubble: (agentId: string, bubble: Agent['bubble']) => {
    set((state) => ({
      agents: {
        ...state.agents,
        [agentId]: {
          ...state.agents[agentId],
          bubble
        }
      }
    }));
  },

  clearBubble: (agentId: string) => {
    set((state) => ({
      agents: {
        ...state.agents,
        [agentId]: {
          ...state.agents[agentId],
          bubble: null
        }
      }
    }));
  },

  // Utilities
  getAgentById: (id: string) => {
    return get().agents[id];
  },

  getAgentsByRole: (role: AgentRole) => {
    return Object.values(get().agents).filter(agent => agent.role === role);
  },

  getAgentsByState: (state: AgentState) => {
    return Object.values(get().agents).filter(agent => agent.state === state);
  }
}));

// Create singleton instance
export const useAgentStore = createAgentStore();

export { createAgentStore };
export type { AgentStore };