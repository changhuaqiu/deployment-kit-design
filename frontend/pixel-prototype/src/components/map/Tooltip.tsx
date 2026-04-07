interface TooltipProps {
  type: 'building' | 'agent'
  target: any
  position: { x: number; y: number }
}

export function Tooltip({ type, target, position }: TooltipProps) {
  if (type === 'building') {
    return (
      <div
        data-testid="building-tooltip"
        style={{
          position: 'fixed',
          left: position.x + 15,
          top: position.y + 15,
          backgroundColor: 'rgba(10, 15, 24, 0.95)',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          borderRadius: '6px',
          padding: '10px 14px',
          color: '#fff',
          fontSize: '12px',
          pointerEvents: 'none',
          zIndex: 1000,
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          transform: 'translateY(0)',
          animation: 'tooltipFadeIn 0.15s ease-out'
        }}>
        <style>
          {`
            @keyframes tooltipFadeIn {
              from { opacity: 0; transform: translateY(5px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}
        </style>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span style={{ fontSize: '14px' }}>🏢</span>
          <span style={{ fontWeight: 'bold', color: '#e2e8f0', letterSpacing: '0.02em' }}>{target.name}</span>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '11px',
          fontWeight: 'bold'
        }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            color: target.status === 'healthy' ? '#34d399' :
                   target.status === 'warning' ? '#fbbf24' : '#f87171'
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              backgroundColor: target.status === 'healthy' ? '#34d399' :
                               target.status === 'warning' ? '#fbbf24' : '#f87171',
              boxShadow: `0 0 6px ${target.status === 'healthy' ? '#34d399' :
                                   target.status === 'warning' ? '#fbbf24' : '#f87171'}`
            }}></span>
            {target.status.toUpperCase()}
          </span>
          <span style={{ color: '#475569' }}>|</span>
          <span style={{ color: '#94a3b8' }}>{target.metrics?.resourceCount || 0} UNITS</span>
        </div>
      </div>
    )
  }

  if (type === 'agent') {
    return (
      <div
        data-testid="agent-tooltip"
        style={{
          position: 'fixed',
          left: position.x + 15,
          top: position.y + 15,
          backgroundColor: 'rgba(10, 15, 24, 0.95)',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(167, 139, 250, 0.4)',
          borderRadius: '6px',
          padding: '10px 14px',
          color: '#fff',
          fontSize: '12px',
          pointerEvents: 'none',
          zIndex: 1000,
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          transform: 'translateY(0)',
          animation: 'tooltipFadeIn 0.15s ease-out'
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span style={{ fontSize: '14px' }}>{target.icon}</span>
          <span style={{ fontWeight: 'bold', color: '#e2e8f0', letterSpacing: '0.02em' }}>{target.name}</span>
        </div>
        <div style={{ 
          fontSize: '11px', 
          color: target.status === 'working' ? '#38bdf8' : '#94a3b8',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            backgroundColor: target.status === 'working' ? '#38bdf8' : '#94a3b8',
            boxShadow: target.status === 'working' ? '0 0 6px #38bdf8' : 'none'
          }}></span>
          {(target.status || 'unknown').toUpperCase()}: {target.currentTask || 'Idle'}
        </div>
      </div>
    )
  }

  return null
}