import { useState, useEffect } from 'react'
import { MapCanvas } from './MapCanvas'
import AgentOfficePanel from '../city/AgentOfficePanel'
import { DistrictType, AgentRole } from '@/types/agents'
import { useAgentStore } from '@/store/agents'
import { useDistrictStore } from '@/store/districts'
import { useMapStore } from '@/store/mapStore'
import { districtsToBuildings } from '@/utils/mapRendering'

/**
 * Clean City Map - No supervisors, just district areas
 */
export function CityMapComplete() {
  const districts = useDistrictStore((state) => state.districts)
  const agents = useAgentStore((state) => state.agents)
  const createDistrict = useDistrictStore((state) => state.createDistrict)
  const createAgent = useAgentStore((state) => state.createAgent)

  const viewport = useMapStore((state) => state.viewport)
  const zoom = useMapStore((state) => state.zoom)
  const selection = useMapStore((state) => state.selection)
  const setViewport = useMapStore((state) => state.setViewport)
  const setZoom = useMapStore((state) => state.setZoom)
  const setSelection = useMapStore((state) => state.setSelection)

  const [buildings, setBuildings] = useState<ReturnType<typeof districtsToBuildings>>([])

  // Initialize all districts for test and prod
  useState(() => {
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
  })

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
          agents={agentList.map(a => ({
            id: a.id,
            position: a.position || { x: 150, y: 150 }
          }))}
          connections={connections}
          viewport={viewport}
          zoom={zoom}
          selection={selection}
          onBuildingClick={handleBuildingClick}
          onAgentClick={handleAgentClick}
          onViewportChange={setViewport}
          onZoomChange={setZoom}
        />
      </div>

      {/* RIGHT: Office Panel (25%) - Where agents work */}
      <div style={{
        flex: '0 0 25%',
        backgroundColor: '#0f172a',
        borderLeft: '3px solid #8b5cf6',
        overflowY: 'auto',
        color: '#fff'
      }}>
        <AgentOfficePanel />
      </div>
    </div>
  )
}
