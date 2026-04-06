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

  // Initialize all districts for test and prod
  useEffect(() => {
    const cities: Array<'test' | 'prod'> = ['test', 'prod']
    const districtTypes = [DistrictType.COMPUTE, DistrictType.DATA, DistrictType.NETWORK, DistrictType.CONFIG]

    cities.forEach(city => {
      districtTypes.forEach(type => {
        createDistrict(`${city}-${type}`, city, type)
      })
    })

    // Create agents in office (right side)
    createAgent('scanner-1', AgentRole.SCANNER, '🕵️', '普查员 #1')
    createAgent('planner-1', AgentRole.PLANNER, '👨‍🎨', '规划师 #1')
    createAgent('monitor-1', AgentRole.MONITOR, '👮', '审核员 #1')
  }, [])

  // Convert districts to buildings when districts change
  useEffect(() => {
    const districtArray = Object.values(districts)
    setBuildings(districtsToBuildings(districtArray))
  }, [districts])

  const agentList = Object.values(agents)

  // Define some example connections
  const connections = [
    { from: 'test-compute', to: 'test-data', type: 'dependency' as const },
    { from: 'test-compute', to: 'test-network', type: 'dataflow' as const }
  ]

  const handleBuildingClick = (buildingId: string) => {
    console.log('Building clicked:', buildingId)
    setSelection({ type: 'building', id: buildingId })
  }

  const handleAgentClick = (agentId: string) => {
    console.log('Agent clicked:', agentId)
    setSelection({ type: 'agent', id: agentId })
  }

  const handleHoverChange = (hoveredState: { type: 'building' | 'agent' | null; id: string | null }) => {
    setHovered(hoveredState)
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
        />

      {/* Tooltip */}
      {hovered.type && hovered.id && (
        <Tooltip
          type={hovered.type}
          target={hovered.type === 'building'
            ? buildings.find(b => b.id === hovered.id)
            : agents.find(a => a.id === hovered.id)
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
        <AgentOfficePanel onOpenLedger={() => console.log('Open ledger')} />
      </div>
    </div>
  )
}
