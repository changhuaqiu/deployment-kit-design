import { useEffect, useState } from 'react'
import { useAgentStore } from '@/store/agents'
import { useDistrictStore } from '@/store/districts'
import { DistrictType, AgentRole } from '@/types/agents'

/**
 * Debug version of CityMap to identify issues
 */
export function CityMapDebug() {
  const [currentView, setCurrentView] = useState('environment')
  const [selectedCity, setSelectedCity] = useState('test')

  const agents = useAgentStore((state) => state.agents)
  const districts = useDistrictStore((state) => state.districts)
  const createDistrict = useDistrictStore((state) => state.createDistrict)
  const createAgent = useAgentStore((state) => state.createAgent)

  // Initialize on mount
  useEffect(() => {
    console.log('🏗️ CityMapDebug: Initializing...')

    try {
      // Create districts
      const districtTypes = [DistrictType.COMPUTE, DistrictType.DATA]
      districtTypes.forEach((type) => {
        const districtId = `test-${type}`
        console.log(`Creating district: ${districtId}`)
        createDistrict(districtId, 'test', type)
      })

      // Create agents
      const agentRoles = [AgentRole.SCANNER, AgentRole.PLANNER]
      agentRoles.forEach((role, index) => {
        const agentId = `agent-${index}`
        console.log(`Creating agent: ${agentId}`)
        createAgent(agentId, role, `Agent ${index}`)
      })

      console.log('✅ Initialization complete')
    } catch (error) {
      console.error('❌ Initialization error:', error)
    }
  }, [])

  const districtList = Object.values(districts)
  const agentList = Object.values(agents)

  console.log('📊 Current state:', {
    districts: districtList.length,
    agents: agentList.length,
    currentView,
    selectedCity
  })

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      backgroundColor: '#1a1a2e',
      color: '#fff',
      padding: '20px',
      fontFamily: 'monospace'
    }}>
      <h1>🏙️ Living City - Debug Mode</h1>

      <div style={{ marginBottom: '20px' }}>
        <h3>System Status:</h3>
        <p>Districts: {districtList.length}</p>
        <p>Agents: {agentList.length}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Districts:</h3>
        {districtList.length === 0 ? (
          <p style={{ color: 'red' }}>❌ No districts found</p>
        ) : (
          <ul>
            {districtList.map(d => (
              <li key={d.id}>
                {d.id} - {d.supervisor.name} - Status: {d.status}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Agents:</h3>
        {agentList.length === 0 ? (
          <p style={{ color: 'red' }}>❌ No agents found</p>
        ) : (
          <ul>
            {agentList.map(a => (
              <li key={a.id}>
                {a.name} - Role: {a.role} - State: {a.state}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#0a0f18', borderRadius: '8px' }}>
        <h3>Console Check:</h3>
        <p style={{ fontSize: '12px', color: '#888' }}>
          Open browser DevTools (F12) and check the console for detailed logs.
        </p>
      </div>
    </div>
  )
}
