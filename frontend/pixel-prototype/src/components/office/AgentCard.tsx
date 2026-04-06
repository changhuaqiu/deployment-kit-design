import React from 'react';
import { Agent, AgentState } from '@/types/agents';
import { clsx } from 'clsx';
import { User, CheckCircle2, Clock, Home, Loader2 } from 'lucide-react';

interface AgentCardProps {
  agent: Agent;
  onClick?: (agent: Agent) => void;
  isSelected?: boolean;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  onClick,
  isSelected = false
}) => {
  const {
    name,
    icon,
    state,
    currentTask,
    progress
  } = agent;

  const handleClick = () => {
    onClick?.(agent);
  };

  const getStatusLabel = () => {
    switch (state) {
      case AgentState.IDLE:
        return 'Idle';
      case AgentState.WALKING:
        return 'Walking';
      case AgentState.WORKING:
        return 'Working';
      case AgentState.RETURNING:
        return 'Returning';
    }
  };

  const getStatusIcon = () => {
    switch (state) {
      case AgentState.IDLE:
        return <Home className="w-4 h-4 text-gray-500" />;
      case AgentState.WALKING:
        return <User className="w-4 h-4 text-blue-500" />;
      case AgentState.WORKING:
        return <Loader2 className="w-4 h-4 text-green-500 animate-spin" />;
      case AgentState.RETURNING:
        return <Clock className="w-4 h-4 text-orange-500" />;
    }
  };

  const getStatusColor = () => {
    switch (state) {
      case AgentState.IDLE:
        return 'bg-gray-50 border-gray-200';
      case AgentState.WALKING:
        return 'bg-blue-50 border-blue-200';
      case AgentState.WORKING:
        return 'bg-green-50 border-green-200';
      case AgentState.RETURNING:
        return 'bg-orange-50 border-orange-200';
    }
  };

  return (
    <button
      onClick={handleClick}
      className={clsx(
        'agent-card w-full p-3 rounded-lg border-2 text-left transition-all hover:shadow-md',
        getStatusColor(),
        isSelected && 'selected ring-2 ring-blue-500 ring-offset-2'
      )}
    >
      {/* Header: Icon, Name, Status */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl" role="img" aria-label="agent-icon">
            {icon}
          </span>
          <div>
            <div className="font-semibold text-sm text-gray-900">
              {name}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-600">
              {getStatusIcon()}
              <span>{getStatusLabel()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Current Task */}
      {currentTask ? (
        <div className="space-y-2">
          <div className="text-xs">
            <div className="text-gray-600 mb-1">
              Task: {currentTask.skill}
            </div>
            <div className="text-gray-500">
              Target: {currentTask.targetDistrict}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-bar">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="progress-fill h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="text-xs text-gray-500 italic">
          No active task
        </div>
      )}
    </button>
  );
};
