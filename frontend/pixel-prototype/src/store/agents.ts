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

interface AgentStore {
  // State
  agents: Record<string, Agent>;

  // Actions
  createAgent: (id: string, role: AgentRole, icon: string, name: string) => Agent;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  deleteAgent: (id: string) => void;

  // Task management
  assignTask: (agentId: string, task: Task) => void;
  completeTask: (agentId: string, taskId: string) => void;
  failTask: (agentId: string, taskId: string) => void;

  // Location and movement
  setPathToDistrict: (agentId: string, district: District) => void;
  updatePosition: (agentId: string, position: Position) => void;
  moveToOffice: (agentId: string) => void;

  // State transitions
  startWorking: (agentId: string) => void;
  startReturning: (agentId: string) => void;

  // UI state
  setBubble: (agentId: string, bubble: Agent['bubble']) => void;
  clearBubble: (agentId: string) => void;

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

  // Agent creation and management
  createAgent: (id: string, role: AgentRole, icon: string, name: string) => {
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
      frameTimer: 0
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

  deleteAgent: (id: string) => {
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

    // Update agent with task and change state to walking
    set((state) => ({
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

    // Update task to completed and return agent to office
    set((state) => ({
      agents: {
        ...state.agents,
        [agentId]: {
          ...agent,
          currentTask: { ...agent.currentTask, status: 'completed' },
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

    // Update task to failed and return agent to office
    set((state) => ({
      agents: {
        ...state.agents,
        [agentId]: {
          ...agent,
          currentTask: { ...agent.currentTask, status: 'failed' },
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

  updatePosition: (agentId: string, position: Position) => {
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
  startWorking: (agentId: string) => {
    set((state) => ({
      agents: {
        ...state.agents,
        [agentId]: {
          ...state.agents[agentId],
          state: AgentState.WORKING
        }
      }
    }));
  },

  startReturning: (agentId: string) => {
    set((state) => ({
      agents: {
        ...state.agents,
        [agentId]: {
          ...state.agents[agentId],
          state: AgentState.RETURNING
        }
      }
    }));
  },

  // UI state
  setBubble: (agentId: string, bubble: Agent['bubble']) => {
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

export { createAgentStore };
export type { AgentStore };