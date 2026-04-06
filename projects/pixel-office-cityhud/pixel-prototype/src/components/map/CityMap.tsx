import { useEffect, useState } from 'react'
import { ViewSwitcher } from './ViewSwitcher'
import AgentRenderer from './AgentRenderer'
import { DistrictsContainer } from './DistrictsContainer'
import { useAgentStore } from '@/store/agents'
import { useDistrictStore } from '@/store/districts'
import { ViewDimension, DistrictType, AgentRole } from '@/types/agents'

/**
 * CityMap component - Main map view for Living City
 * Integrates AgentRenderer, DistrictRenderer, and ViewSwitcher
 * Filters districts based on selected view dimension
 */
export function CityMap() {
  const [currentView, setCurrentView] = useState<ViewDimension>('environment')
  const [selectedCity, setSelectedCity] = useState<'test' | 'prod' | null>('test')

  const agents = useAgentStore((state) => state.agents)
  const districts = useDistrictStore((state) => state.districts)
  const createDistrict = useDistrictStore((state) => state.createDistrict)
  const createAgent = useAgentStore((state) => state.createAgent)

  // Initialize default districts and agents on mount
  useEffect(() => {
    // Create default districts for test and prod cities
    const cities: Array<'test' | 'prod'> = ['test', 'prod']
    const districtTypes = [DistrictType.COMPUTE, DistrictType.DATA, DistrictType.NETWORK, DistrictType.CONFIG]

    cities.forEach((city) => {
      districtTypes.forEach((type) => {
        const districtId = `${city}-${type}`
        createDistrict(districtId, city, type)
      })
    })

    // Create default agents
    createAgent('scanner-1', AgentRole.SCANNER, '🕵️', 'Scanner 1')
    createAgent('planner-1', AgentRole.PLANNER, '👨‍🎨', 'Planner 1')
    createAgent('monitor-1', AgentRole.MONITOR, '👮', 'Monitor 1')
    createAgent('scanner-2', AgentRole.SCANNER, '🔍', 'Scanner 2')
    createAgent('planner-2', AgentRole.PLANNER, '🎨', 'Planner 2')
  }, [])

  // Filter districts based on selected view and city
  const filteredDistricts = Object.values(districts).filter((district) => {
    // Filter by city in environment view
    if (currentView === 'environment') {
      if (selectedCity === null) {
        return true // Show all cities
      }
      return district.city === selectedCity
    }

    // In resource and application views, filter by dimension
    if (currentView === 'resource') {
      // Only show resource-related districts (data, compute)
      return district.type === DistrictType.DATA || district.type === DistrictType.COMPUTE
    }

    if (currentView === 'application') {
      // Only show application-related districts (config, network)
      return district.type === DistrictType.CONFIG || district.type === DistrictType.NETWORK
    }

    return true
  })

  // Map dimensions
  const mapWidth = 800
  const mapHeight = 400

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ backgroundColor: '#1a1a2e' }}
    >
      {/* Background grid */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(to right, #3b82f6 1px, transparent 1px),
              linear-gradient(to bottom, #3b82f6 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      {/* View Switcher UI */}
      <ViewSwitcher
        currentView={currentView}
        onViewChange={setCurrentView}
        selectedCity={selectedCity}
        onCityChange={setSelectedCity}
      />

      {/* Main Map Canvas */}
      <svg
        width={mapWidth}
        height={mapHeight}
        className="absolute top-0 left-0"
        style={{ width: mapWidth, height: mapHeight }}
      >
        {/* Render Districts */}
        <DistrictsContainer
          districts={filteredDistricts}
          width={mapWidth}
          height={mapHeight}
          viewDimension={currentView}
        />
      </svg>

      {/* Render Agents (Canvas overlay) */}
      <div className="absolute top-0 left-0" style={{ width: mapWidth, height: mapHeight }}>
        <AgentRenderer width={mapWidth} height={mapHeight} />
      </div>

      {/* View Info Overlay */}
      <div className="absolute bottom-4 left-4 bg-[#0a0f18]/90 border border-cyan-800/40 rounded px-3 py-2">
        <div className="text-[10px] text-cyan-400">
          <div className="font-bold">VIEW: {currentView.toUpperCase()}</div>
          {currentView === 'environment' && (
            <div className="text-cyan-600">CITY: {selectedCity?.toUpperCase() || 'ALL'}</div>
          )}
          <div className="text-cyan-700">
            {filteredDistricts.length} DISTRICTS | {Object.keys(agents).length} AGENTS
          </div>
        </div>
      </div>
    </div>
  )
}
