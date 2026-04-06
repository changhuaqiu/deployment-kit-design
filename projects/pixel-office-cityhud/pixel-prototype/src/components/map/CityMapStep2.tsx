import { useState } from 'react'
import { ViewSwitcher } from './ViewSwitcher'
import AgentRenderer from './AgentRenderer'
import { DistrictType, AgentRole } from '@/types/agents'
import { useAgentStore } from '@/store/agents'
import { useDistrictStore } from '@/store/districts'

/**
 * Working version with AgentRenderer - NO animation hook dependency
 */
export function CityMapStep2() {
  const [currentView, setCurrentView] = useState('environment')
  const [selectedCity, setSelectedCity] = useState('test')

  const districts = useDistrictStore((state) => state.districts)
  const agents = useAgentStore((state) => state.agents)
  const createDistrict = useDistrictStore((state) => state.createDistrict)
  const createAgent = useAgentStore((state) => state.createAgent)

  // Initialize on mount
  useState(() => {
    // Create districts
    const districtTypes = [DistrictType.COMPUTE, DistrictType.DATA]
    districtTypes.forEach((type) => {
      createDistrict(`test-${type}`, 'test', type)
    })

    // Create agents
    createAgent('scanner-1', AgentRole.SCANNER, '🕵️', '普查员 #1')
    createAgent('planner-1', AgentRole.PLANNER, '👨‍🎨', '规划师 #1')
  })

  const districtList = Object.values(districts)
  const agentList = Object.values(agents)
  const mapWidth = 800
  const mapHeight = 400

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#1a1a2e',
      color: '#fff',
      fontFamily: 'monospace',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.1,
        backgroundImage: `
          linear-gradient(to right, #3b82f6 1px, transparent 1px),
          linear-gradient(to bottom, #3b82f6 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px'
      }} />

      {/* ViewSwitcher */}
      <ViewSwitcher
        currentView={currentView}
        onViewChange={setCurrentView}
        selectedCity={selectedCity}
        onCityChange={setSelectedCity}
      />

      {/* Main Map Area */}
      <div style={{
        position: 'absolute',
        top: '60px',
        left: '0',
        right: '0',
        bottom: '0',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {/* Map Container */}
        <div style={{
          position: 'relative',
          width: mapWidth,
          height: mapHeight
        }}>
          {/* Districts Layer */}
          {districtList.map(district => (
            <div
              key={district.id}
              style={{
                position: 'absolute',
                left: district.position?.x || 150,
                top: district.position?.y || 150,
                width: district.position?.width || 200,
                height: district.position?.height || 120,
                backgroundColor: '#1e293b',
                border: `3px solid ${district.status === 'healthy' ? '#22c55e' : '#f59e0b'}`,
                borderRadius: '8px',
                padding: '12px',
                color: '#fff',
                fontSize: '12px'
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {district.supervisor.name}
              </div>
              <div style={{ fontSize: '10px', opacity: 0.8 }}>
                {district.supervisor.role}
              </div>
              <div style={{ marginTop: '8px', fontSize: '10px' }}>
                {district.supervisor.statusMessage}
              </div>
            </div>
          ))}

          {/* Agents Layer (Canvas) */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: mapWidth,
            height: mapHeight,
            pointerEvents: 'none'
          }}>
            <AgentRenderer
              agents={agentList}
              width={mapWidth}
              height={mapHeight}
            />
          </div>
        </div>
      </div>

      {/* Info Panel */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        backgroundColor: '#0f172a',
        border: '2px solid #3b82f6',
        borderRadius: '8px',
        padding: '12px',
        fontSize: '12px'
      }}>
        <div style={{ color: '#60a5fa' }}>VIEW: {currentView}</div>
        <div style={{ color: '#4ade80' }}>DISTRICTS: {districtList.length}</div>
        <div style={{ color: '#fbbf24' }}>AGENTS: {agentList.length} 🤖</div>
        <div style={{ color: '#94a3b8', marginTop: '4px' }}>
          Step 2: Agents with Canvas rendering
        </div>
      </div>
    </div>
  )
}
