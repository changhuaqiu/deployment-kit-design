import { useMapStore } from '@/store/mapStore'
import { useDeployStore } from '@/store/deployStore'
import type { Building } from '@/types/map'

interface BuildingDetailPanelProps {
  buildingId: string | null
  onClose: () => void
}

export function BuildingDetailPanel({ buildingId, onClose }: BuildingDetailPanelProps) {
  const selection = useMapStore((s) => s.selection)
  const changes = useDeployStore((s) => s.changes)

  // Find building (simplified - will be connected to real buildings in Task 13)
  const building: Building | null = buildingId ? {
    id: buildingId,
    type: 'compute',
    name: buildingId,
    city: 'test',
    position: { x: 100, y: 100, width: 80, height: 60 },
    status: 'healthy',
    metrics: { resourceCount: 5 }
  } : null

  if (!building) return null

  // Find linked change (simplified logic)
  const linkedChange = changes.find(c => c.resources.length > 0)

  return (
    <aside
      className={`BuildingDetailPanel ${buildingId ? 'open' : ''}`}
      style={{
        position: 'fixed',
        right: buildingId ? '25%' : '-400px',
        top: 0,
        width: '400px',
        height: '100vh',
        backgroundColor: '#0f172a',
        borderLeft: '2px solid #8b5cf6',
        transition: 'right 0.3s ease-in-out',
        zIndex: 100,
        overflowY: 'auto',
        color: '#fff'
      }}
    >
      <header style={{
        padding: '16px',
        borderBottom: '1px solid #374151',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>
          🏢 {building.name}
        </h2>
        <button
          onClick={onClose}
          aria-label="Close panel"
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '4px 8px'
          }}
        >
          ✕
        </button>
      </header>

      <div style={{ padding: '16px' }}>
        {/* Basic Info */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ marginBottom: '8px' }}>
            <strong>Status:</strong>{' '}
            <span style={{
              color: building.status === 'healthy' ? '#10b981' :
                     building.status === 'warning' ? '#f59e0b' : '#ef4444'
            }}>
              ● {building.status}
            </span>
          </div>
          <div>
            <strong>Resources:</strong> {building.metrics.resourceCount}
          </div>
          {linkedChange && (
            <div style={{ marginTop: '8px' }}>
              <strong>Linked:</strong> {linkedChange.title}
            </div>
          )}
        </div>

        {/* Resources */}
        {linkedChange && linkedChange.resources.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>
              Resources ({linkedChange.resources.length})
            </h3>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #374151' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Action</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {linkedChange.resources.map(resource => (
                  <tr key={resource.id} style={{ borderBottom: '1px solid #1f2937' }}>
                    <td style={{ padding: '8px' }}>{resource.type}</td>
                    <td style={{ padding: '8px' }}>{resource.name}</td>
                    <td style={{ padding: '8px' }}>{resource.action}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      ${resource.costDeltaMonthlyUsd}/mo
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
          <button style={{
            padding: '10px 16px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            View Change Details
          </button>
          <button style={{
            padding: '10px 16px',
            backgroundColor: '#8b5cf6',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            View Logs
          </button>
        </div>
      </div>
    </aside>
  )
}