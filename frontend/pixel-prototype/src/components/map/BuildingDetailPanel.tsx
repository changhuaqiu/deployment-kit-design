import { useMapStore } from '@/store/mapStore'
import { useDeployStore, mockOpenCodeApi } from '@/store/deployStore'
import type { Building } from '@/types/map'
import { useNavigate } from 'react-router-dom'

interface BuildingDetailPanelProps {
  buildingId: string | null
  onClose: () => void
}

export function BuildingDetailPanel({ buildingId, onClose }: BuildingDetailPanelProps) {
  const selection = useMapStore((s) => s.selection)
  const changes = useDeployStore((s) => s.changes)
  const dispatchAgents = useDeployStore((s) => s.dispatchAgents)
  const runWorkshopScan = useDeployStore((s) => s.runWorkshopScan)
  const runWorkshopGenerate = useDeployStore((s) => s.runWorkshopGenerate)
  const activeWorkflow = useDeployStore((s) => s.activeWorkflow)
  
  const navigate = useNavigate()

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
        backgroundColor: 'rgba(10, 15, 24, 0.95)',
        backdropFilter: 'blur(10px)',
        borderLeft: '2px solid rgba(56, 189, 248, 0.4)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.5), inset 2px 0 10px rgba(56,189,248,0.05)',
        transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        zIndex: 100,
        overflowY: 'auto',
        color: '#e2e8f0'
      }}
    >
      <header style={{
        padding: '24px 20px',
        borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
        background: 'linear-gradient(180deg, rgba(14, 165, 233, 0.1) 0%, transparent 100%)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        <div>
          <div style={{ color: '#38bdf8', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.1em', marginBottom: '4px' }}>
            INFRASTRUCTURE NODE
          </div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🏢</span> {building.name}
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close panel"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            color: '#94a3b8',
            fontSize: '14px',
            cursor: 'pointer',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseOver={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
          onMouseOut={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
        >
          ✕
        </button>
      </header>

      <div style={{ padding: '20px' }}>
        {/* Basic Info */}
        <div style={{ 
          marginBottom: '24px', 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '12px' 
        }}>
          <div style={{ 
            background: 'rgba(255,255,255,0.02)', 
            border: '1px solid rgba(255,255,255,0.05)', 
            padding: '12px', 
            borderRadius: '8px' 
          }}>
            <div style={{ color: '#64748b', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>STATUS</div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold',
              backgroundColor: building.status === 'healthy' ? 'rgba(16, 185, 129, 0.1)' :
                             building.status === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: building.status === 'healthy' ? '#34d399' :
                     building.status === 'warning' ? '#fbbf24' : '#f87171',
              border: `1px solid ${building.status === 'healthy' ? 'rgba(16, 185, 129, 0.3)' :
                                 building.status === 'warning' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                backgroundColor: building.status === 'healthy' ? '#34d399' :
                                 building.status === 'warning' ? '#fbbf24' : '#f87171',
                boxShadow: `0 0 8px ${building.status === 'healthy' ? '#34d399' :
                                     building.status === 'warning' ? '#fbbf24' : '#f87171'}`
              }}></div>
              {building.status.toUpperCase()}
            </div>
          </div>
          
          <div style={{ 
            background: 'rgba(255,255,255,0.02)', 
            border: '1px solid rgba(255,255,255,0.05)', 
            padding: '12px', 
            borderRadius: '8px' 
          }}>
            <div style={{ color: '#64748b', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>CAPACITY</div>
            <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold' }}>
              {building.metrics.resourceCount} <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 'normal' }}>units</span>
            </div>
          </div>

          {linkedChange && (
            <div style={{ 
              gridColumn: '1 / -1',
              background: 'rgba(139, 92, 246, 0.05)', 
              border: '1px solid rgba(139, 92, 246, 0.2)', 
              padding: '12px', 
              borderRadius: '8px' 
            }}>
              <div style={{ color: '#a78bfa', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>ACTIVE CHANGE REQUEST</div>
              <div style={{ color: '#e2e8f0', fontSize: '13px' }}>{linkedChange.title}</div>
            </div>
          )}
        </div>

        {/* Resources */}
        {linkedChange && linkedChange.resources.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ 
              fontSize: '11px', 
              color: '#94a3b8', 
              marginBottom: '12px',
              fontWeight: 'bold',
              letterSpacing: '0.05em'
            }}>
              AFFECTED RESOURCES
            </h3>
            <div style={{
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '12px'
              }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 'bold' }}>Type</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 'bold' }}>Name</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 'bold' }}>Action</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b', fontWeight: 'bold' }}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedChange.resources.map(resource => (
                    <tr key={resource.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{resource.type}</td>
                      <td style={{ padding: '10px 12px', color: '#e2e8f0' }}>{resource.name}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          color: resource.action === 'create' ? '#34d399' :
                                 resource.action === 'update' ? '#fbbf24' : '#f87171',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: resource.action === 'create' ? 'rgba(16, 185, 129, 0.1)' :
                                      resource.action === 'update' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                        }}>
                          {resource.action.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#34d399', fontFamily: 'monospace' }}>
                        ${resource.costDeltaMonthlyUsd}/mo
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', marginTop: '32px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              style={{
                flex: 1, padding: '10px 12px',
                backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.5)', borderRadius: '6px',
                cursor: 'pointer', fontWeight: 'bold', fontSize: '11px',
                transition: 'all 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px'
              }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.4)'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'}
              onClick={() => {
                if (linkedChange) {
                  mockOpenCodeApi.fetchAgentsForTask('scan').then((subAgents) => {
                    dispatchAgents('scan', subAgents, () => {
                      runWorkshopScan(linkedChange.id)
                    })
                  })
                }
              }}
            >
              <span>🔭</span> DISPATCH SCANNER
            </button>

            <button 
              style={{
                flex: 1, padding: '10px 12px',
                backgroundColor: 'rgba(167, 139, 250, 0.2)', color: '#c084fc',
                border: '1px solid rgba(167, 139, 250, 0.5)', borderRadius: '6px',
                cursor: 'pointer', fontWeight: 'bold', fontSize: '11px',
                transition: 'all 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px'
              }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(167, 139, 250, 0.4)'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(167, 139, 250, 0.2)'}
              onClick={() => {
                if (linkedChange) {
                  mockOpenCodeApi.fetchAgentsForTask('generate').then((subAgents) => {
                    dispatchAgents('generate', subAgents, () => {
                      runWorkshopGenerate(linkedChange.id)
                    })
                  })
                }
              }}
            >
              <span>📝</span> GENERATE PLAN
            </button>
          </div>

          <button 
            style={{
              width: '100%', padding: '12px 16px',
              backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.5)', borderRadius: '6px',
              cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.05em',
              transition: 'all 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
              boxShadow: '0 0 15px rgba(16, 185, 129, 0.1)'
            }}
            onMouseOver={e => {
              e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.4)'
              e.currentTarget.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.3)'
            }}
            onMouseOut={e => {
              e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.2)'
              e.currentTarget.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.1)'
            }}
            onClick={() => {
              if (linkedChange) navigate(`/changes/${linkedChange.id}`)
            }}
          >
            <span>🚀</span> SUBMIT FOR APPROVAL
          </button>
        </div>
      </div>
    </aside>
  )
}