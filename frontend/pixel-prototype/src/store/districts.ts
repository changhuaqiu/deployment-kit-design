import { create } from 'zustand';
import {
  District,
  Supervisor,
  Issue,
  DistrictMetrics,
  DistrictType,
  ViewDimension
} from '@/types/agents';

// Supervisor mapping for different district types
const SUPERVISORS: Record<DistrictType, Omit<Supervisor, 'id'>> = {
  [DistrictType.COMPUTE]: {
    name: '👨‍💼 运营总监',
    icon: 'user',
    role: 'Operations Manager',
    statusMessage: '监控系统性能',
    active: false
  },
  [DistrictType.DATA]: {
    name: '👨‍💼 数据总监',
    icon: 'database',
    role: 'Data Manager',
    statusMessage: '管理数据存储和传输',
    active: false
  },
  [DistrictType.NETWORK]: {
    name: '👨‍💼 网络总监',
    icon: 'wifi',
    role: 'Network Manager',
    statusMessage: '维护网络连接',
    active: false
  },
  [DistrictType.CONFIG]: {
    name: '👨‍💼 配置总监',
    icon: 'settings',
    role: 'Config Manager',
    statusMessage: '管理配置文件',
    active: false
  }
};

interface DistrictStore {
  // State
  districts: Record<string, District>;
  selectedCity: 'test' | 'prod' | null;
  viewDimension: ViewDimension;

  // Actions
  createDistrict: (districtId: string, city: 'test' | 'prod', type: DistrictType) => void;
  addIssue: (districtId: string, issue: Issue) => void;
  resolveIssue: (districtId: string, issueId: string) => void;
  updateMetrics: (districtId: string, metrics: Partial<DistrictMetrics>) => void;
  setCity: (city: 'test' | 'prod' | null) => void;
  setViewDimension: (dimension: ViewDimension) => void;
}

const createDistrictStore = () => create<DistrictStore>((set, get) => ({
  // Initial state
  districts: {},
  selectedCity: null,
  viewDimension: 'environment',

  // Create a new district with supervisor
  createDistrict: (districtId: string, city: 'test' | 'prod', type: DistrictType) => {
    const supervisorTemplate = SUPERVISORS[type];
    const supervisor: Supervisor = {
      ...supervisorTemplate,
      id: `${city}-${type}-supervisor`
    };

    const newDistrict: District = {
      id: districtId,
      city,
      type,
      supervisor,
      resources: [],
      issues: [],
      status: 'healthy',
      metrics: {
        resourceCount: 0,
        healthPercent: 100,
        customMetric: 'CPU',
        customValue: '100%'
      },
      position: {
        x: Math.floor(Math.random() * 700) + 50,  // Random position within canvas
        y: Math.floor(Math.random() * 200) + 50,
        width: 120,
        height: 80
      }
    };

    set((state) => ({
      districts: { ...state.districts, [districtId]: newDistrict }
    }));
  },

  // Add an issue to a district
  addIssue: (districtId: string, issue: Issue) => {
    set((state) => {
      const district = state.districts[districtId];
      if (!district) return state;

      const updatedIssues = [...district.issues, issue];

      // Determine new status based on issue severity
      let newStatus: District['status'] = 'healthy';
      if (updatedIssues.length > 0) {
        // Check if there are any high severity issues
        const hasHighSeverity = updatedIssues.some(issue => issue.severity === 'high');
        const hasMediumSeverity = updatedIssues.some(issue => issue.severity === 'medium');

        if (hasHighSeverity) {
          newStatus = 'error';
        } else if (hasMediumSeverity) {
          newStatus = 'warning';
        }
      }

      const updatedDistrict = {
        ...district,
        issues: updatedIssues,
        status: newStatus
      };

      return {
        districts: { ...state.districts, [districtId]: updatedDistrict }
      };
    });
  },

  // Resolve an issue by ID
  resolveIssue: (districtId: string, issueId: string) => {
    set((state) => {
      const district = state.districts[districtId];
      if (!district) return state;

      // Filter out the resolved issue
      const updatedIssues = district.issues.filter(issue => issue.id !== issueId);

      // Determine new status based on remaining issues
      let newStatus: District['status'] = 'healthy';
      if (updatedIssues.length > 0) {
        // Check if there are any high severity issues
        const hasHighSeverity = updatedIssues.some(issue => issue.severity === 'high');
        const hasMediumSeverity = updatedIssues.some(issue => issue.severity === 'medium');

        if (hasHighSeverity) {
          newStatus = 'error';
        } else if (hasMediumSeverity) {
          newStatus = 'warning';
        }
      }

      const updatedDistrict = {
        ...district,
        issues: updatedIssues,
        status: newStatus
      };

      return {
        districts: { ...state.districts, [districtId]: updatedDistrict }
      };
    });
  },

  // Update district metrics
  updateMetrics: (districtId: string, metrics: Partial<DistrictMetrics>) => {
    set((state) => {
      const district = state.districts[districtId];
      if (!district) return state;

      const updatedMetrics = {
        ...district.metrics,
        ...metrics
      };

      const updatedDistrict = {
        ...district,
        metrics: updatedMetrics
      };

      return {
        districts: { ...state.districts, [districtId]: updatedDistrict }
      };
    });
  },

  // Set selected city
  setCity: (city: 'test' | 'prod' | null) => {
    set({ selectedCity: city });
  },

  // Set view dimension
  setViewDimension: (dimension: ViewDimension) => {
    set({ viewDimension: dimension });
  }
}));

// Create singleton instance
export const useDistrictStore = createDistrictStore();

export { createDistrictStore };
export type { DistrictStore };