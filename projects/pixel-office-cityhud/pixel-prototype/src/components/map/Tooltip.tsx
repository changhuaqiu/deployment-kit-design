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
          left: position.x + 10,
          top: position.y + 10,
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid #8b5cf6',
          borderRadius: '4px',
          padding: '8px 12px',
          color: '#fff',
          fontSize: '14px',
          pointerEvents: 'none',
          zIndex: 1000,
          whiteSpace: 'nowrap'
        }}>
        <div style={{ fontWeight: 'bold' }}>{target.name}</div>
        <div style={{
          fontSize: '12px',
          color: target.status === 'healthy' ? '#10b981' :
                 target.status === 'warning' ? '#f59e0b' : '#ef4444'
        }}>
          {target.status} ({target.metrics?.resourceCount || 0} resources)
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
          left: position.x + 10,
          top: position.y + 10,
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid #8b5cf6',
          borderRadius: '4px',
          padding: '8px 12px',
          color: '#fff',
          fontSize: '14px',
          pointerEvents: 'none',
          zIndex: 1000,
          whiteSpace: 'nowrap'
        }}>
        <div style={{ fontWeight: 'bold' }}>{target.icon} {target.name}</div>
        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
          {target.status}: {target.currentTask}
        </div>
      </div>
    )
  }

  return null
}