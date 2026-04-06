import React from 'react'
import { ViewDimension } from '@/types/agents'
import { clsx } from 'clsx'

interface ViewSwitcherProps {
  currentView: ViewDimension
  onViewChange: (view: ViewDimension) => void
  selectedCity?: 'test' | 'prod' | null
  onCityChange?: (city: 'test' | 'prod' | null) => void
}

/**
 * View switcher for Living City map
 * Allows switching between environment, resource, and application dimensions
 * Shows city selector in environment view
 */
export function ViewSwitcher({
  currentView,
  onViewChange,
  selectedCity,
  onCityChange
}: ViewSwitcherProps) {
  const views: { key: ViewDimension; label: string; icon: string }[] = [
    { key: 'environment', label: 'ENV', icon: '🌍' },
    { key: 'resource', label: 'RES', icon: '⚡' },
    { key: 'application', label: 'APP', icon: '📦' }
  ]

  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
      {/* Dimension Buttons */}
      <div className="flex gap-1">
        {views.map((view) => (
          <button
            key={view.key}
            onClick={() => onViewChange(view.key)}
            className={clsx(
              'px-3 py-2 rounded border-2 font-bold text-[10px] tracking-wider transition-all',
              currentView === view.key
                ? 'border-cyan-400 bg-cyan-950 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                : 'border-cyan-800/40 bg-[#0a0f18] text-cyan-700 hover:border-cyan-600/60 hover:text-cyan-500'
            )}
            title={`${view.label} View`}
          >
            <span className="mr-1">{view.icon}</span>
            {view.label}
          </button>
        ))}
      </div>

      {/* City Selector - Only shown in environment view */}
      {currentView === 'environment' && onCityChange && (
        <div className="flex gap-1">
          <button
            onClick={() => onCityChange('test')}
            className={clsx(
              'px-3 py-1.5 rounded border font-bold text-[9px] tracking-wider transition-all',
              selectedCity === 'test'
                ? 'border-green-400 bg-green-950 text-green-300 shadow-[0_0_8px_rgba(74,222,128,0.2)]'
                : 'border-green-800/30 bg-[#0a0f18] text-green-800 hover:border-green-600/50'
            )}
          >
            TEST
          </button>
          <button
            onClick={() => onCityChange('prod')}
            className={clsx(
              'px-3 py-1.5 rounded border font-bold text-[9px] tracking-wider transition-all',
              selectedCity === 'prod'
                ? 'border-orange-400 bg-orange-950 text-orange-300 shadow-[0_0_8px_rgba(251,146,60,0.2)]'
                : 'border-orange-800/30 bg-[#0a0f18] text-orange-800 hover:border-orange-600/50'
            )}
          >
            PROD
          </button>
          <button
            onClick={() => onCityChange(null)}
            className={clsx(
              'px-3 py-1.5 rounded border font-bold text-[9px] tracking-wider transition-all',
              selectedCity === null
                ? 'border-cyan-400 bg-cyan-950 text-cyan-300'
                : 'border-cyan-800/30 bg-[#0a0f18] text-cyan-800 hover:border-cyan-600/50'
            )}
          >
            ALL
          </button>
        </div>
      )}
    </div>
  )
}
