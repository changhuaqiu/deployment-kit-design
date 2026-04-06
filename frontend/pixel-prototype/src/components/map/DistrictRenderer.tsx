import React from 'react';
import { District } from '@/types/agents';
import { clsx } from 'clsx';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface DistrictRendererProps {
  district: District;
  onClick?: (district: District) => void;
  onHover?: (district: District, isHovering: boolean) => void;
}

export const DistrictRenderer: React.FC<DistrictRendererProps> = ({
  district,
  onClick,
  onHover
}) => {
  const {
    supervisor,
    status,
    metrics,
    issues,
    position
  } = district;

  const handleCardClick = () => {
    onClick?.(district);
  };

  const handleMouseEnter = () => {
    onHover?.(district, true);
  };

  const handleMouseLeave = () => {
    onHover?.(district, false);
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
        return 'border-green-300 bg-green-50';
      case 'warning':
        return 'border-yellow-300 bg-yellow-50';
      case 'error':
        return 'border-red-300 bg-red-50';
    }
  };

  return (
    <div
      data-testid="district-card"
      className={clsx(
        'district-card absolute p-3 rounded-lg border-2 shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-105',
        getStatusColor()
      )}
      style={{
        left: position.x,
        top: position.y,
        width: position.width,
        height: position.height
      }}
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Status Icon */}
      <div className="absolute top-2 right-2">
        {getStatusIcon()}
      </div>

      {/* Supervisor Info */}
      <div className="mb-2">
        <div className="font-semibold text-sm text-gray-900">
          {supervisor.name}
        </div>
        <div className="text-xs text-gray-600">
          {supervisor.role}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {supervisor.statusMessage}
        </div>
      </div>

      {/* Metrics */}
      <div className="text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-600">Resources:</span>
          <span className="font-medium">{metrics.resourceCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">{metrics.customMetric}:</span>
          <span className="font-medium">{metrics.customValue}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Health:</span>
          <span className="font-medium">{metrics.healthPercent}%</span>
        </div>
      </div>

      {/* Issues */}
      {issues.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-300">
          <div className="text-xs font-medium text-gray-700 mb-1">
            {issues.length} Issue{issues.length > 1 ? 's' : ''}
          </div>
          {issues.slice(0, 2).map((issue) => (
            <div
              key={issue.id}
              className={clsx(
                'text-xs px-1 py-0.5 rounded mb-1',
                issue.severity === 'high' && 'bg-red-100 text-red-800',
                issue.severity === 'medium' && 'bg-yellow-100 text-yellow-800',
                issue.severity === 'low' && 'bg-blue-100 text-blue-800'
              )}
            >
              {issue.message}
            </div>
          ))}
          {issues.length > 2 && (
            <div className="text-xs text-gray-500">
              +{issues.length - 2} more
            </div>
          )}
        </div>
      )}
    </div>
  );
};
