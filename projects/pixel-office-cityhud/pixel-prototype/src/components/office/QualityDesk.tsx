import React from 'react';
import { clsx } from 'clsx';
import { Check, X, FileText, AlertCircle } from 'lucide-react';

export interface ReviewItem {
  id: string;
  agentId: string;
  agentName: string;
  agentIcon: string;
  taskType: string;
  skill: string;
  result: any;
  timestamp: number;
}

interface QualityDeskProps {
  items: ReviewItem[];
  onApprove?: (itemId: string) => void;
  onReject?: (itemId: string) => void;
}

export const QualityDesk: React.FC<QualityDeskProps> = ({
  items,
  onApprove,
  onReject
}) => {
  const handleApprove = (itemId: string) => {
    onApprove?.(itemId);
  };

  const handleReject = (itemId: string) => {
    onReject?.(itemId);
  };

  const formatResult = (result: any): string => {
    if (!result) return 'No details';

    const parts: string[] = [];

    // Extract common result fields
    if (result.resourcesFound !== undefined) {
      parts.push(`Resources: ${result.resourcesFound}`);
    }
    if (result.filesGenerated !== undefined) {
      parts.push(`Files: ${result.filesGenerated}`);
    }
    if (result.changesDetected !== undefined) {
      parts.push(`Changes: ${result.changesDetected}`);
    }
    if (result.issues && result.issues.length > 0) {
      parts.push(`Issues: ${result.issues.length}`);
    }

    return parts.length > 0 ? parts.join(' | ') : 'Completed';
  };

  const hasIssues = (result: any): boolean => {
    return result?.issues && result.issues.length > 0;
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No pending reviews</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {items.length} Pending Review{items.length !== 1 ? 's' : ''}
        </h3>
      </div>

      {/* Review Items */}
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={clsx(
              'p-4 rounded-lg border-2 transition-all',
              hasIssues(item.result)
                ? 'border-yellow-300 bg-yellow-50'
                : 'border-gray-200 bg-white'
            )}
          >
            {/* Agent Info */}
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl" role="img">
                {item.agentIcon}
              </span>
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-900">
                  {item.agentName}
                </div>
                <div className="text-xs text-gray-600">
                  Task: {item.skill}
                </div>
              </div>

              {/* Issues Badge */}
              {hasIssues(item.result) && (
                <div className="flex items-center gap-1 text-yellow-700 text-xs">
                  <AlertCircle className="w-3 h-3" />
                  <span>{item.result.issues.length} issue{item.result.issues.length > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>

            {/* Result Details */}
            <div className="text-xs text-gray-700 mb-3 p-2 bg-gray-50 rounded">
              {formatResult(item.result)}
            </div>

            {/* Issues List */}
            {hasIssues(item.result) && (
              <div className="mb-3 space-y-1">
                {item.result.issues.map((issue: string, index: number) => (
                  <div
                    key={index}
                    className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded"
                  >
                    • {issue}
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(item.id)}
                className={clsx(
                  'flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors',
                  'bg-green-600 text-white hover:bg-green-700'
                )}
              >
                <Check className="w-4 h-4" />
                Approve
              </button>
              <button
                onClick={() => handleReject(item.id)}
                className={clsx(
                  'flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors',
                  'bg-red-600 text-white hover:bg-red-700'
                )}
              >
                <X className="w-4 h-4" />
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
