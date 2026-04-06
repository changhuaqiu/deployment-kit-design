import { useState, useEffect } from 'react'
import { MapCanvas } from './MapCanvas'
import { MapControls } from './MapControls'
import { BuildingDetailPanel } from './BuildingDetailPanel'
import { Tooltip } from './Tooltip'
import AgentOfficePanel from '../city/AgentOfficePanel'
import { DistrictType, AgentRole } from '@/types/agents'
import { useAgentStore } from '@/store/agents'
import { useDistrictStore } from '@/store/districts'
import { useMapStore } from '@/store/mapStore'
import { useDeployStore } from '@/store/deployStore'
import { districtsToBuildings } from '@/utils/mapRendering'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import type { WorkerAgent } from '@/store/agents'

/**
 * Clean City Map - No supervisors, just district areas
 */
export function CityMapComplete() {
  const districts = useDistrictStore((state) => state.districts)
  const agents = useAgentStore((state) => state.agents)
  const createDistrict = useDistrictStore((state) => state.createDistrict)
  const createAgent = useAgentStore((state) => state.createAgent)
  const workerAgents = useDeployStore((state) => state.agents)

  const viewport = useMapStore((state) => state.viewport)
  const zoom = useMapStore((state) => state.zoom)
  const selection = useMapStore((state) => state.selection)
  const hovered = useMapStore((state) => state.hovered)
  const setViewport = useMapStore((state) => state.setViewport)
  const setZoom = useMapStore((state) => state.setZoom)
  const setSelection = useMapStore((state) => state.setSelection)
  const setHovered = useMapStore((state) => state.setHovered)

  const [buildings, setBuildings] = useState<ReturnType<typeof districtsToBuildings>>([])
const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  // Initialize keyboard shortcuts
  useKeyboardShortcuts(viewport, zoom, selection)

  // Initialize demo buildings and agents
  useEffect(() => {
    // Create demo buildings (not business districts)
    const demoBuildings = [
      { id: 'office', name: 'Agent Office', status: 'healthy' as const, position: { x: 850, y: 250, width: 120, height: 100 } },
      { id: 'data-center', name: 'Data Center', status: 'healthy' as const, position: { x: 100, y: 100, width: 150, height: 120 } },
      { id: 'compute-node', name: 'Compute Node', status: 'warning' as const, position: { x: 300, y: 150, width: 100, height: 100 } },
      { id: 'network-gateway', name: 'Network Gateway', status: 'healthy' as const, position: { x: 500, y: 200, width: 130, height: 90 } }
    ]
    setBuildings(demoBuildings)
    console.log('🏗️ Initialized buildings:', demoBuildings)

    // Create agents in office
    createAgent('scanner-1', AgentRole.SCANNER, '🕵️', '普查员 #1')
    createAgent('planner-1', AgentRole.PLANNER, '👨‍🎨', '规划师 #1')
    createAgent('monitor-1', AgentRole.MONITOR, '👮', '审核员 #1')
  }, [])

  const agentList = Object.values(agents)

  // Define some example connections using actual building IDs
  const connections = [
    { from: 'data-center', to: 'compute-node', type: 'dependency' as const },
    { from: 'compute-node', to: 'network-gateway', type: 'dataflow' as const }
  ]

  const handleBuildingClick = (buildingId: string) => {
    setSelection({ type: 'building', id: buildingId })
  }

  const handleAgentClick = (agentId: string) => {
    setSelection({ type: 'agent', id: agentId })
  }

  const handleHoverChange = (hoveredState: { type: 'building' | 'agent' | null; id: string | null }) => {
    setHovered(hoveredState)
  }

  const handleBuildingPositionChange = (buildingId: string, x: number, y: number) => {
    console.log('📦 Building position change:', buildingId, '→', x, y)
    setBuildings(prevBuildings =>
      prevBuildings.map(building =>
        building.id === buildingId
          ? { ...building, position: { ...building.position, x, y } }
          : building
      )
    )
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0f172a',
      display: 'flex'
    }}>
      {/* LEFT: Map Area (75%) */}
      <div style={{
        flex: '0 0 75%',
        position: 'relative',
        backgroundColor: '#1a1a2e',
        overflow: 'hidden'
      }}>
        <MapCanvas
          buildings={buildings}
          agents={agentList}
          workerAgents={workerAgents}
          connections={connections}
          viewport={viewport}
          zoom={zoom}
          selection={selection}
          hovered={hovered}
          onBuildingClick={handleBuildingClick}
          onAgentClick={handleAgentClick}
          onViewportChange={setViewport}
          onZoomChange={setZoom}
          onHoverChange={handleHoverChange}
          onMousePositionChange={setMousePosition}
          onBuildingPositionChange={handleBuildingPositionChange}
        />

      {/* Tooltip */}
      {hovered.type && hovered.id && (
        <Tooltip
          type={hovered.type}
          target={hovered.type === 'building'
            ? buildings.find(b => b.id === hovered.id)
            : agentList.find(a => a.id === hovered.id)
          }
          position={mousePosition}
        />
      )}

      {/* BuildingDetailPanel */}
      {selection.type === 'building' && selection.id && (
        <BuildingDetailPanel
          buildingId={selection.id}
          onClose={() => setSelection({ type: null, id: null })}
        />
      )}

      {/* NEW: MapControls overlay */}
      <MapControls buildings={buildings} />
      </div>

      {/* RIGHT: Office Panel (25%) - Where agents work */}
      <div style={{
        flex: '0 0 25%',
        backgroundColor: '#0f172a',
        borderLeft: '3px solid #8b5cf6',
        overflowY: 'auto',
        color: '#fff'
      }}>
        <AgentOfficePanel onOpenLedger={() => {}} />
      </div>
    </div>
  )
}
