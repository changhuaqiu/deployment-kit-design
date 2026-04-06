import { useState } from 'react'
import { ViewSwitcher } from './ViewSwitcher'
import { DistrictType, AgentRole } from '@/types/agents'
import { useAgentStore } from '@/store/agents'
import { useDistrictStore } from '@/store/districts'

/**
 * Step-by-step integration: Add ViewSwitcher first
 */
export function CityMapStep1() {
  const [currentView, setCurrentView] = useState('environment')
  const [selectedCity, setSelectedCity] = useState('test')

  const districts = useDistrictStore((state) => state.districts)
  const createDistrict = useDistrictStore((state) => state.createDistrict)

  // Initialize districts
  useState(() => {
    const districtTypes = [DistrictType.COMPUTE, DistrictType.DATA]
    districtTypes.forEach((type) => {
      createDistrict(`test-${type}`, 'test', type)
    })
  })

  const districtList = Object.values(districts)

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

      {/* ViewSwitcher - NEW! */}
      <ViewSwitcher
        currentView={currentView}
        onViewChange={setCurrentView}
        selectedCity={selectedCity}
        onCityChange={setSelectedCity}
      />

      {/* Districts Display */}
      <div style={{
        display: 'flex',
        gap: '20px',
        padding: '80px 20px 20px 20px',  // Top padding for ViewSwitcher
        marginTop: '60px'  // Space for ViewSwitcher
      }}>
        {districtList.map(district => (
          <div
            key={district.id}
            style={{
              width: '200px',
              height: '150px',
              backgroundColor: '#1e293b',
              border: `3px solid ${district.status === 'healthy' ? '#22c55e' : '#f59e0b'}`,
              borderRadius: '8px',
              padding: '12px',
              color: '#fff'
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
              {district.supervisor.name}
            </div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>
              {district.supervisor.role}
            </div>
            <div style={{ marginTop: '12px', fontSize: '11px' }}>
              {district.supervisor.statusMessage}
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
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
        <div style={{ color: '#94a3b8', marginTop: '4px' }}>
          Step 1: ViewSwitcher + Districts
        </div>
      </div>
    </div>
  )
}
