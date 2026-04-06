import React, { useState } from 'react';
import { Agent, AgentRole } from '@/types/agents';
import { clsx } from 'clsx';
import { Send, User, Briefcase, MapPin } from 'lucide-react';

export interface DispatchTask {
  id: string;
  type: string;
  skill: string;
  targetDistrict: string;
  description: string;
  requiredRole?: AgentRole;
}

interface DispatchPanelProps {
  tasks: DispatchTask[];
  agents: Agent[];
  onDispatch?: (taskId: string, agentId: string) => void;
}

export const DispatchPanel: React.FC<DispatchPanelProps> = ({
  tasks,
  agents,
  onDispatch
}) => {
  const [selectedAgents, setSelectedAgents] = useState<Record<string, string>>({});

  // Filter agents that are idle (in office)
  const idleAgents = agents.filter(agent => agent.state === 'idle');

  const handleAgentChange = (taskId: string, agentId: string) => {
    setSelectedAgents(prev => ({
      ...prev,
      [taskId]: agentId
    }));
  };

  const handleDispatch = (taskId: string) => {
    const agentId = selectedAgents[taskId];
    if (agentId) {
      onDispatch?.(taskId, agentId);
    }
  };

  const getAvailableAgentsForTask = (task: DispatchTask) => {
    if (task.requiredRole) {
      return idleAgents.filter(agent => agent.role === task.requiredRole);
    }
    return idleAgents;
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Briefcase className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No available tasks</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Task Dispatch
        </h3>
        <p className="text-sm text-gray-600">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {tasks.map((task) => {
          const availableAgents = getAvailableAgentsForTask(task);
          const selectedAgent = selectedAgents[task.id];
          const canDispatch = selectedAgent && availableAgents.some(a => a.id === selectedAgent);

          return (
            <div
              key={task.id}
              className="p-4 rounded-lg border-2 border-gray-200 bg-white hover:border-blue-300 transition-colors"
            >
              {/* Task Description */}
              <div className="mb-3">
                <div className="font-medium text-gray-900 mb-1">
                  {task.description}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    <span>{task.skill}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{task.targetDistrict}</span>
                  </div>
                  {task.requiredRole && (
                    <div className="text-blue-600">
                      Requires: {task.requiredRole}
                    </div>
                  )}
                </div>
              </div>

              {/* Agent Selection */}
              <div className="mb-3">
                <label htmlFor={`agent-${task.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                  Select Agent
                </label>
                <select
                  id={`agent-${task.id}`}
                  value={selectedAgent || ''}
                  onChange={(e) => handleAgentChange(task.id, e.target.value)}
                  className={clsx(
                    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm',
                    'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                    'bg-white'
                  )}
                >
                  <option value="">Choose an agent...</option>
                  {availableAgents.length === 0 ? (
                    <option disabled>No idle agents available</option>
                  ) : (
                    availableAgents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.icon} {agent.name} ({agent.role})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Dispatch Button */}
              <button
                onClick={() => handleDispatch(task.id)}
                disabled={!canDispatch}
                className={clsx(
                  'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                  canDispatch
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                )}
              >
                <Send className="w-4 h-4" />
                Dispatch Task
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
