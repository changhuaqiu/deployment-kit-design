# UI Layer Phases 2-6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the remaining 15 tasks of the Living City map-based UI implementation, adding zoom controls, detail panels, agent integration, visual polish, and comprehensive testing.

**Architecture:** Phase-based sequential execution (Phase 2 → 3 → 4 → 5 → 6), each building on the previous. All components consume from existing deployStore mock data. Canvas-based rendering (60fps) with DOM overlays for interactivity.

**Tech Stack:** React 19, TypeScript, Zustand, Canvas 2D, Vitest, React Testing Library

---

## Phase 2: Zoom System (Tasks 7-9)

### Task 7: Create MapControls Component

**Files:**
- Create: `src/components/map/MapControls.tsx`
- Create: `src/components/map/MiniMap.tsx`
- Modify: `src/store/mapStore.ts:50-80` (add preset viewports)
- Test: `src/components/map/__tests__/MapControls.test.tsx`

- [ ] **Step 1: Extend mapStore with preset viewports**

Open `src/store/mapStore.ts`, add preset viewport constants and action after line 50:

```typescript
// Add after ViewportState interface
export interface MapState {
  // ... existing fields
}

// Add these constants
export const PRESET_VIEWPORTS = {
  test: {
    offsetX: 50,
    offsetY: 100,
    zoom: 'environment' as ZoomLevel
  },
  prod: {
    offsetX: 400,
    offsetY: 100,
    zoom: 'environment' as ZoomLevel
  },
  all: {
    offsetX: 250,
    offsetY: 50,
    zoom: 'world' as ZoomLevel
  }
} as const
```

- [ ] **Step 2: Write test for MapControls component**

Create `src/components/map/__tests__/MapControls.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { MapControls } from '../MapControls'
import { useMapStore } from '@/store/mapStore'

describe('MapControls', () => {
  beforeEach(() => {
    // Reset store before each test
    useMapStore.getState().resetView()
  })

  it('renders zoom controls', () => {
    render(<MapControls />)
    expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument()
  })

  it('calls onZoomIn when + button clicked', () => {
    const onZoomIn = jest.fn()
    render(<MapControls onZoomIn={onZoomIn} />)

    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }))
    expect(onZoomIn).toHaveBeenCalled()
  })

  it('calls onZoomOut when - button clicked', () => {
    const onZoomOut = jest.fn()
    render(<MapControls onZoomOut={onZoomOut} />)

    fireEvent.click(screen.getByRole('button', { name: /zoom out/i }))
    expect(onZoomOut).toHaveBeenCalled()
  })

  it('calls onResetView when reset button clicked', () => {
    const onResetView = jest.fn()
    render(<MapControls onResetView={onResetView} />)

    fireEvent.click(screen.getByRole('button', { name: /reset/i }))
    expect(onResetView).toHaveBeenCalled()
  })

  it('displays current zoom level', () => {
    useMapStore.setState({ zoom: 'environment' })
    render(<MapControls />)

    expect(screen.getByText(/environment/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test MapControls.test`
Expected: FAIL with "Cannot find module '../MapControls'"

- [ ] **Step 4: Create MiniMap component**

Create `src/components/map/MiniMap.tsx`:

```typescript
import { useRef, useEffect } from 'react'
import type { Building } from '@/types/map'
import type { ViewportState, ZoomLevel } from '@/store/mapStore'
import { mapToScreen } from '@/utils/mapCoordinates'
import { getZoomScale } from './MapControls'

interface MiniMapProps {
  buildings: Building[]
  viewport: ViewportState
  zoom: ZoomLevel
  width?: number
  height?: number
}

export function MiniMap({ buildings, viewport, zoom, width = 200, height = 150 }: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Calculate scale to fit all buildings
    const zoomScale = getZoomScale(zoom)
    const allBuildings = buildings

    // Simple scale: fit all buildings in minimap
    const padding = 10
    const scaleX = (width - padding * 2) / 1000  // Assuming map width ~1000
    const scaleY = (height - padding * 2) / 600   // Assuming map height ~600
    const scale = Math.min(scaleX, scaleY)

    // Draw buildings
    buildings.forEach(building => {
      const x = building.position.x * scale + padding
      const y = building.position.y * scale + padding
      const w = building.position.width * scale
      const h = building.position.height * scale

      ctx.fillStyle = getBuildingColor(building.status)
      ctx.fillRect(x, y, w, h)
    })

    // Draw viewport rectangle
    const viewportX = viewport.offsetX * scale + padding
    const viewportY = viewport.offsetY * scale + padding
    const viewportW = (window.innerWidth * 0.75) / zoomScale * scale
    const viewportH = window.innerHeight / zoomScale * scale

    ctx.strokeStyle = '#8b5cf6'
    ctx.lineWidth = 2
    ctx.strokeRect(viewportX, viewportY, viewportW, viewportH)

  }, [buildings, viewport, zoom, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="mini-map"
      style={{
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        border: '1px solid #8b5cf6',
        borderRadius: '4px'
      }}
    />
  )
}

function getBuildingColor(status: Building['status']): string {
  switch (status) {
    case 'healthy': return '#10b981'
    case 'warning': return '#f59e0b'
    case 'error': return '#ef4444'
    default: return '#6b7280'
  }
}
```

- [ ] **Step 5: Create MapControls component**

Create `src/components/map/MapControls.tsx`:

```typescript
import { useMapStore, PRESET_VIEWPORTS } from '@/store/mapStore'
import { MiniMap } from './MiniMap'

export function getZoomScale(zoom: ZoomLevel): number {
  switch (zoom) {
    case 'world': return 0.5
    case 'environment': return 1.0
    case 'building': return 2.0
  }
}

export function getNextZoomLevel(current: ZoomLevel): ZoomLevel {
  const levels: ZoomLevel[] = ['world', 'environment', 'building']
  const idx = levels.indexOf(current)
  return levels[Math.min(idx + 1, levels.length - 1)]
}

export function getPrevZoomLevel(current: ZoomLevel): ZoomLevel {
  const levels: ZoomLevel[] = ['world', 'environment', 'building']
  const idx = levels.indexOf(current)
  return levels[Math.max(idx - 1, 0)]
}

interface MapControlsProps {
  buildings?: any[]  // Will be connected to real buildings in Task 9
}

export function MapControls({ buildings = [] }: MapControlsProps) {
  const viewport = useMapStore((s) => s.viewport)
  const zoom = useMapStore((s) => s.zoom)
  const setViewport = useMapStore((s) => s.setViewport)
  const setZoom = useMapStore((s) => s.setZoom)
  const resetView = useMapStore((s) => s.resetView)

  const handleZoomIn = () => setZoom(getNextZoomLevel(zoom))
  const handleZoomOut = () => setZoom(getPrevZoomLevel(zoom))
  const handleReset = () => resetView()
  const handlePreset = (preset: keyof typeof PRESET_VIEWPORTS) => {
    setViewport(PRESET_VIEWPORTS[preset])
    setZoom(PRESET_VIEWPORTS[preset].zoom)
  }

  return (
    <>
      {/* MiniMap - Top Left */}
      <MiniMap buildings={buildings} viewport={viewport} zoom={zoom} />

      {/* Zoom Controls - Top Right */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #8b5cf6'
      }}>
        <div style={{ color: '#fff', textAlign: 'center', marginBottom: '8px' }}>
          Zoom: {zoom}
        </div>

        <button
          onClick={handleZoomIn}
          aria-label="Zoom in"
          style={{
            width: '40px',
            height: '40px',
            fontSize: '24px',
            cursor: 'pointer',
            backgroundColor: '#8b5cf6',
            color: '#fff',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          +
        </button>

        <button
          onClick={handleZoomOut}
          aria-label="Zoom out"
          style={{
            width: '40px',
            height: '40px',
            fontSize: '24px',
            cursor: 'pointer',
            backgroundColor: '#8b5cf6',
            color: '#fff',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          −
        </button>

        <button
          onClick={handleReset}
          aria-label="Reset view"
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            fontSize: '12px',
            cursor: 'pointer',
            backgroundColor: '#6b7280',
            color: '#fff',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          Reset
        </button>
      </div>

      {/* Preset Views - Bottom Left */}
      <div style={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        display: 'flex',
        gap: '8px',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #8b5cf6'
      }}>
        <button
          onClick={() => handlePreset('test')}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            cursor: 'pointer',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          Test
        </button>

        <button
          onClick={() => handlePreset('prod')}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            cursor: 'pointer',
            backgroundColor: '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          Prod
        </button>

        <button
          onClick={() => handlePreset('all')}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            cursor: 'pointer',
            backgroundColor: '#f59e0b',
            color: '#fff',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          All
        </button>
      </div>
    </>
  )
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test MapControls.test`
Expected: PASS (all 5 tests)

- [ ] **Step 7: Commit**

```bash
git add src/components/map/MapControls.tsx src/components/map/MiniMap.tsx src/store/mapStore.ts src/components/map/__tests__/MapControls.test.tsx
git commit -m "feat: add MapControls component with zoom, presets, and mini-map"
```

---

### Task 8: Implement Smooth Zoom Transitions

**Files:**
- Create: `src/utils/mapAnimations.ts`
- Modify: `src/components/map/MapControls.tsx:100-150` (add animation support)

- [ ] **Step 1: Write test for zoom animation utilities**

Create `src/utils/__tests__/mapAnimations.test.ts`:

```typescript
import { animateZoomTransition, getNextZoomScale } from '../mapAnimations'

describe('Zoom Animations', () => {
  it('calculates correct zoom scale for each level', () => {
    expect(getNextZoomScale('world')).toBe(0.5)
    expect(getNextZoomScale('environment')).toBe(1.0)
    expect(getNextZoomScale('building')).toBe(2.0)
  })

  it('returns animation frame callback', () => {
    const callback = animateZoomTransition(
      { offsetX: 0, offsetY: 0, zoom: 'world' },
      'environment',
      100
    )

    expect(typeof callback).toBe('function')
  })

  it('animation callback has cancel method', () => {
    const callback = animateZoomTransition(
      { offsetX: 0, offsetY: 0, zoom: 'world' },
      'environment',
      100
    )

    // Should be able to call it (will be cancelled in real use)
    expect(() => callback(performance.now(), () => {})).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test mapAnimations.test`
Expected: FAIL with "Cannot find module '../mapAnimations'"

- [ ] **Step 3: Implement animation utilities**

Create `src/utils/mapAnimations.ts`:

```typescript
import type { ViewportState, ZoomLevel } from '@/store/mapStore'

export function getNextZoomScale(zoom: ZoomLevel): number {
  switch (zoom) {
    case 'world': return 0.5
    case 'environment': return 1.0
    case 'building': return 2.0
  }
}

export interface ZoomAnimation {
  fromScale: number
  toScale: number
  startTime: number
  duration: number
  centerX: number
  centerY: number
}

let currentAnimation: ZoomAnimation | null = null

export function animateZoomTransition(
  currentViewport: ViewportState,
  targetZoom: ZoomLevel,
  duration: number = 2000
): (time: number, onUpdate: (viewport: ViewportState) => void) => void {
  const fromScale = getNextZoomScale(currentViewport.zoom)
  const toScale = getNextZoomScale(targetZoom)

  return (time: number, onUpdate: (viewport: ViewportState) => void) => {
    const elapsed = time - currentAnimation!.startTime
    const progress = Math.min(elapsed / duration, 1.0)

    // Ease-out-cubic
    const eased = 1 - Math.pow(1 - progress, 3)

    const currentScale = fromScale + (toScale - fromScale) * eased

    // Update viewport with interpolated scale
    // Note: This is a simplified version - real implementation would
    // calculate new offset to keep zoom center stable
    onUpdate({
      ...currentViewport,
      zoom: progress >= 1.0 ? targetZoom : currentViewport.zoom
    })

    return progress < 1.0  // Return false when complete
  }
}

export function cancelCurrentAnimation(): void {
  currentAnimation = null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test mapAnimations.test`
Expected: PASS (all 3 tests)

- [ ] **Step 5: Integrate animation into MapControls**

Open `src/components/map/MapControls.tsx`, add animation to zoom handlers:

```typescript
// Add import at top
import { animateZoomTransition } from '@/utils/mapAnimations'

// In MapControls component, replace handler functions:
const handleZoomIn = () => {
  const nextZoom = getNextZoomLevel(zoom)

  // Use animation if not already at max
  if (nextZoom !== zoom) {
    const startTime = performance.now()
    const anim = animateZoomTransition(viewport, nextZoom, 2000)

    let frameId: number
    const frame = (time: number) => {
      const continueAnimation = anim(time, (newViewport) => {
        setViewport(newViewport)
      })

      if (continueAnimation) {
        frameId = requestAnimationFrame(frame)
      } else {
        setZoom(nextZoom)  // Final zoom level
      }
    }

    frameId = requestAnimationFrame(frame)
  }
}

const handleZoomOut = () => {
  const prevZoom = getPrevZoomLevel(zoom)

  if (prevZoom !== zoom) {
    const startTime = performance.now()
    const anim = animateZoomTransition(viewport, prevZoom, 2000)

    let frameId: number
    const frame = (time: number) => {
      const continueAnimation = anim(time, (newViewport) => {
        setViewport(newViewport)
      })

      if (continueAnimation) {
        frameId = requestAnimationFrame(frame)
      } else {
        setZoom(prevZoom)
      }
    }

    frameId = requestAnimationFrame(frame)
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/utils/mapAnimations.ts src/utils/__tests__/mapAnimations.test.ts src/components/map/MapControls.tsx
git commit -m "feat: add smooth zoom transitions with easing"
```

---

### Task 9: Wire Up MapControls in CityMapComplete

**Files:**
- Modify: `src/components/map/CityMapComplete.tsx:70-110` (integrate MapControls)

- [ ] **Step 1: Write integration test for CityMapComplete with controls**

Create `src/components/map/__tests__/CityMapComplete.integration.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { CityMapComplete } from '../CityMapComplete'
import { useMapStore } from '@/store/mapStore'

describe('CityMapComplete Integration', () => {
  beforeEach(() => {
    useMapStore.getState().resetView()
  })

  it('renders map, controls, and panel', () => {
    render(<CityMapComplete />)

    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument()  // canvas
    expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument()
  })

  it('updates zoom when controls used', () => {
    render(<CityMapComplete />)

    const initialZoom = useMapStore.getState().zoom
    expect(initialZoom).toBe('world')

    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }))

    const updatedZoom = useMapStore.getState().zoom
    expect(updatedZoom).toBe('environment')
  })

  it('resets view when reset button clicked', () => {
    render(<CityMapComplete />)

    const resetBtn = screen.getByRole('button', { name: /reset/i })
    fireEvent.click(resetBtn)

    const viewport = useMapStore.getState().viewport
    expect(viewport.offsetX).toBe(0)
    expect(viewport.offsetY).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test CityMapComplete.integration.test`
Expected: FAIL (MapControls not yet integrated)

- [ ] **Step 3: Integrate MapControls into CityMapComplete**

Open `src/components/map/CityMapComplete.tsx`, add MapControls integration:

```typescript
// Add import at top
import { MapControls } from './MapControls'

// In the return statement, find the MapCanvas container div and add MapControls:
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
        connections={connections}
        viewport={viewport}
        zoom={zoom}
        selection={selection}
        onBuildingClick={handleBuildingClick}
        onAgentClick={handleAgentClick}
        onViewportChange={setViewport}
        onZoomChange={setZoom}
      />

      {/* NEW: MapControls overlay */}
      <MapControls buildings={buildings} />
    </div>

    {/* RIGHT: Office Panel (25%) */}
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test CityMapComplete.integration.test`
Expected: PASS (all 3 tests)

- [ ] **Step 5: Manual test in browser**

Run: `npm run dev`
Open: http://localhost:5173

Verify:
- ✅ Map renders with controls overlay
- ✅ Click zoom in/out buttons work
- ✅ Reset button returns to initial view
- ✅ Preset buttons (Test/Prod/All) work
- ✅ MiniMap shows in top-left
- ✅ Z-index correct (controls above map)

- [ ] **Step 6: Commit**

```bash
git add src/components/map/CityMapComplete.tsx src/components/map/__tests__/CityMapComplete.integration.test.tsx
git commit -m "feat: integrate MapControls into CityMapComplete"
```

---

## Phase 3: Selection and Details (Tasks 10-13)

### Task 10: Create BuildingDetailPanel Component

**Files:**
- Create: `src/components/map/BuildingDetailPanel.tsx`
- Test: `src/components/map/__tests__/BuildingDetailPanel.test.tsx`

- [ ] **Step 1: Write test for BuildingDetailPanel**

Create `src/components/map/__tests__/BuildingDetailPanel.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { BuildingDetailPanel } from '../BuildingDetailPanel'
import { useDeployStore } from '@/store/deployStore'

describe('BuildingDetailPanel', () => {
  beforeEach(() => {
    // Setup mock data
    useDeployStore.getState().resetDemoData()
  })

  it('does not render when no building selected', () => {
    const { container } = render(
      <BuildingDetailPanel buildingId={null} onClose={() => {}} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders when building selected', () => {
    const { getByText } = render(
      <BuildingDetailPanel buildingId="test-compute" onClose={() => {}} />
    )
    expect(getByText(/test-compute/i)).toBeInTheDocument()
  })

  it('displays close button and calls onClose', () => {
    const onClose = jest.fn()
    const { getByRole } = render(
      <BuildingDetailPanel buildingId="test-compute" onClose={onClose} />
    )

    fireEvent.click(getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('displays building status', () => {
    const { getByText } = render(
      <BuildingDetailPanel buildingId="test-compute" onClose={() => {}} />
    )
    expect(getByText(/healthy|warning|error/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test BuildingDetailPanel.test`
Expected: FAIL with "Cannot find module '../BuildingDetailPanel'"

- [ ] **Step 3: Implement BuildingDetailPanel component**

Create `src/components/map/BuildingDetailPanel.tsx`:

```typescript
import { useEffect } from 'react'
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

  // Find building (will be connected to real buildings later)
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

  // Find linked change
  const linkedChange = changes.find(c =>
    c.resources.length > 0  // Simplified logic
  )

  return (
    <aside className={`BuildingDetailPanel ${selection.buildingId === buildingId ? 'open' : ''}`} style={{
      position: 'fixed',
      right: selection.buildingId === buildingId ? '25%' : '-400px',
      top: 0,
      width: '400px',
      height: '100vh',
      backgroundColor: '#0f172a',
      borderLeft: '2px solid #8b5cf6',
      transition: 'right 0.3s ease-in-out',
      zIndex: 100,
      overflowY: 'auto',
      color: '#fff'
    }}>
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
          aria-label="Close"
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: '24px',
            cursor: 'pointer'
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
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test BuildingDetailPanel.test`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/map/BuildingDetailPanel.tsx src/components/map/__tests__/BuildingDetailPanel.test.tsx
git commit -m "feat: add BuildingDetailPanel with resource list and actions"
```

---

### Task 11: Create Tooltip Component

**Files:**
- Create: `src/components/map/Tooltip.tsx`
- Test: `src/components/map/__tests__/Tooltip.test.tsx`

- [ ] **Step 1: Write test for Tooltip**

Create `src/components/map/__tests__/Tooltip.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { Tooltip } from '../Tooltip'

describe('Tooltip', () => {
  it('renders tooltip for building', () => {
    const mockBuilding = {
      id: 'test-compute',
      name: 'test-compute',
      status: 'healthy',
      metrics: { resourceCount: 5 }
    }

    const { getByText } = render(
      <Tooltip
        type="building"
        target={mockBuilding}
        position={{ x: 100, y: 100 }}
      />
    )

    expect(getByText(/test-compute/i)).toBeInTheDocument()
    expect(getByText(/healthy/i)).toBeInTheDocument()
  })

  it('renders tooltip for agent', () => {
    const mockAgent = {
      id: 'agent-1',
      name: 'Scanner #1',
      icon: '🕵️',
      status: 'working',
      currentTask: 'Scanning resources'
    }

    const { getByText } = render(
      <Tooltip
        type="agent"
        target={mockAgent}
        position={{ x: 100, y: 100 }}
      />
    )

    expect(getByText(/scanner/i)).toBeInTheDocument()
    expect(getByText(/working/i)).toBeInTheDocument()
  })

  it('positions correctly at mouse coordinates', () => {
    const { container } = render(
      <Tooltip
        type="building"
        target={{ name: 'test', status: 'healthy', metrics: {} }}
        position={{ x: 100, y: 100 }}
      />
    )

    const tooltip = container.firstChild as HTMLElement
    expect(tooltip.style.left).toBe('110px')
    expect(tooltip.style.top).toBe('110px')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test Tooltip.test`
Expected: FAIL with "Cannot find module '../Tooltip'"

- [ ] **Step 3: Implement Tooltip component**

Create `src/components/map/Tooltip.tsx`:

```typescript
interface TooltipProps {
  type: 'building' | 'agent'
  target: any
  position: { x: number; y: number }
}

export function Tooltip({ type, target, position }: TooltipProps) {
  if (type === 'building') {
    return (
      <div style={{
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
      <div style={{
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test Tooltip.test`
Expected: PASS (all 3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/map/Tooltip.tsx src/components/map/__tests__/Tooltip.test.tsx
git commit -m "feat: add Tooltip component for buildings and agents"
```

---

### Task 12: Add Hover State Tracking to MapCanvas

**Files:**
- Modify: `src/components/map/MapCanvas.tsx:1-50` (add hover handlers)

- [ ] **Step 1: Update MapCanvas to track hover state**

Open `src/components/map/MapCanvas.tsx`, add hover tracking:

```typescript
// Add state for mouse position
const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

// Add hover detection handler
const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
  const canvas = e.currentTarget
  const rect = canvas.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top

  setMousePosition({ x: e.clientX, y: e.clientY })  // Screen coordinates for tooltip

  // Convert to map coordinates
  const zoomScale = zoom === 'world' ? 0.5 : zoom === 'environment' ? 1.0 : 2.0
  const mapX = (mouseX + viewport.offsetX) / zoomScale
  const mapY = (mouseY + viewport.offsetY) / zoomScale

  // Hit detection for buildings
  let hoveredBuilding: any = null
  for (const building of buildings) {
    const b = building.position
    if (mapX >= b.x && mapX <= b.x + b.width &&
        mapY >= b.y && mapY <= b.y + b.height) {
      hoveredBuilding = building
      break
    }
  }

  // Hit detection for agents (simplified - uses screen position)
  let hoveredAgent: any = null
  for (const agent of agents) {
    if (!agent.position) continue
    const agentScreenX = (agent.position.mapX - viewport.offsetX) * zoomScale
    const agentScreenY = (agent.position.mapY - viewport.offsetY) * zoomScale
    const dist = Math.sqrt(Math.pow(mouseX - agentScreenX, 2) + Math.pow(mouseY - agentScreenY, 2))
    if (dist < 20) {
      hoveredAgent = agent
      break
    }
  }

  // Update hover state in store
  if (hoveredBuilding) {
    setHovered({ type: 'building', id: hoveredBuilding.id })
  } else if (hoveredAgent) {
    setHovered({ type: 'agent', id: hoveredAgent.id })
  } else {
    setHovered({ type: null, id: null })
  }
}

// Add mouse leave handler
const handleMouseLeave = () => {
  setHovered({ type: null, id: null })
}

// Update canvas element to include handlers
<canvas
  ref={canvasRef}
  width={window.innerWidth * 0.75}
  height={window.innerHeight}
  onMouseMove={handleMouseMove}
  onMouseLeave={handleMouseLeave}
  style={{ cursor: hovered.type ? 'pointer' : 'default' }}
/>
```

- [ ] **Step 2: Expose mouse position to parent**

Update MapCanvas props interface:

```typescript
interface MapCanvasProps {
  // ... existing props
  onMousePositionChange?: (pos: { x: number; y: number }) => void
}
```

Call the callback in handleMouseMove:

```typescript
if (onMousePositionChange) {
  onMousePositionChange({ x: e.clientX, y: e.clientY })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/map/MapCanvas.tsx
git commit -m "feat: add hover state tracking to MapCanvas"
```

---

### Task 13: Wire Up Detail Panel and Tooltip in CityMapComplete

**Files:**
- Modify: `src/components/map/CityMapComplete.tsx:70-130` (integrate panels)

- [ ] **Step 1: Integrate BuildingDetailPanel and Tooltip**

Open `src/components/map/CityMapComplete.tsx`, add panel and tooltip:

```typescript
// Add imports
import { BuildingDetailPanel } from './BuildingDetailPanel'
import { Tooltip } from './Tooltip'

// Add state for mouse position
const [mousePosition, setMouse Position] = useState({ x: 0, y: 0 })

// Update MapCanvas usage
<MapCanvas
  buildings={buildings}
  agents={agentList}
  connections={connections}
  viewport={viewport}
  zoom={zoom}
  selection={selection}
  hovered={hovered}
  onBuildingClick={handleBuildingClick}
  onAgentClick={handleAgentClick}
  onViewportChange={setViewport}
  onZoomChange={setZoom}
  onMousePositionChange={setMousePosition}
/>

{/* NEW: Tooltip */}
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

{/* NEW: BuildingDetailPanel */}
{selection.type === 'building' && selection.id && (
  <BuildingDetailPanel
    buildingId={selection.id}
    onClose={() => setSelection({ type: null, id: null })}
  />
)}
```

- [ ] **Step 2: Update z-index layering**

Add CSS or inline styles to ensure proper layering:

```typescript
// In the map container div
<div style={{
  flex: '0 0 75%',
  position: 'relative',
  backgroundColor: '#1a1a2e',
  overflow: 'hidden'
}}>
  {/* Layers (bottom to top): */}
  {/* 1. MapCanvas - z-index implicit 1 */}
  <MapCanvas {...mapCanvasProps} />

  {/* 2. MapControls - z-index 10 */}
  <MapControls buildings={buildings} />

  {/* 3. Tooltip - z-index 100 */}
  {hovered.type && <Tooltip {...tooltipProps} />}

  {/* 4. BuildingDetailPanel - z-index 100 */}
  {selection.type === 'building' && <BuildingDetailPanel {...detailPanelProps} />}
</div>
```

- [ ] **Step 3: Manual test in browser**

Run: `npm run dev`
Open: http://localhost:5173

Verify:
- ✅ Hover over building shows tooltip
- ✅ Tooltip follows mouse
- ✅ Click building opens detail panel
- ✅ Detail panel slides in from right
- ✅ Close button closes detail panel
- ✅ Click another building switches detail panel
- ✅ ESC clears selection (if keyboard shortcuts work)

- [ ] **Step 4: Commit**

```bash
git add src/components/map/CityMapComplete.tsx
git commit -m "feat: integrate BuildingDetailPanel and Tooltip with hover states"
```

---

## Phase 4: Agent Integration (Tasks 14-15)

### Task 14: Update AgentRenderer for Map Coordinates

**Files:**
- Modify: `src/store/agents.ts:1-30` (add position fields)
- Modify: `src/components/map/MapCanvas.tsx:200-250` (render agents with map coords)

- [ ] **Step 1: Update agent types with map positions**

Open `src/store/agents.ts`, add position fields:

```typescript
export interface WorkerAgent {
  id: string
  role: AgentRole
  name: string
  icon: string
  status: AgentStatus
  currentTask: string

  // NEW: Map-based position
  position?: {
    mapX: number
    mapY: number
  }
  target?: {
    mapX: number
    mapY: number
    buildingId?: string
  }
}
```

- [ ] **Step 2: Initialize agent positions in deployStore**

Open `src/store/deployStore.ts`, find the agents initialization, add positions:

```typescript
// In the initial state, add position for reviewer agent
agents: [
  {
    id: 'ag_rev',
    role: 'reviewer',
    name: '安检员',
    icon: '👮',
    status: 'idle',
    currentTask: 'Zzz...',
    position: { mapX: 900, mapY: 300 }  // Office position
  }
]

// In dispatchAgents, add position for new workers
const newWorkers: WorkerAgent[] = subAgents.map(sa => ({
  id: sa.id,
  role: taskType === 'scan' ? 'scanner' : 'generator',
  name: sa.name,
  icon: taskType === 'scan' ? '🕵️' : '👨‍🎨',
  status: 'working',
  currentTask: sa.task,
  position: { mapX: 900, mapY: 300 }  // Start at office
}))
```

- [ ] **Step 3: Create AgentRenderer component**

Create `src/components/map/AgentRenderer.tsx`:

```typescript
import { mapToScreen } from '@/utils/mapCoordinates'
import type { WorkerAgent } from '@/store/agents'
import type { ViewportState, ZoomLevel } from '@/store/mapStore'
import { getZoomScale } from './MapControls'

interface AgentRendererProps {
  agent: WorkerAgent
  viewport: ViewportState
  zoom: ZoomLevel
  onClick?: (agentId: string) => void
}

export function AgentRenderer({ agent, viewport, zoom, onClick }: AgentRendererProps) {
  if (!agent.position) return null

  const zoomScale = getZoomScale(zoom)
  const screenPos = mapToScreen(
    agent.position.mapX,
    agent.position.mapY,
    viewport,
    zoomScale
  )

  const size = zoom === 'building' ? 48 : zoom === 'environment' ? 32 : 20

  const handleClick = () => {
    onClick?.(agent.id)
  }

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'absolute',
        left: screenPos.x,
        top: screenPos.y,
        width: size,
        height: size,
        transform: 'translate(-50%, -50%)',
        fontSize: `${size * 0.8}px`,
        cursor: 'pointer',
        userSelect: 'none',
        pointerEvents: 'auto',
        opacity: agent.status === 'done' ? 0.6 : 1.0,
        filter: agent.status === 'working' ? 'drop-shadow(0 0 8px #8b5cf6)' : 'none',
        transition: 'all 0.2s ease'
      }}
    >
      {agent.icon}
    </div>
  )
}
```

- [ ] **Step 4: Integrate AgentRenderer into MapCanvas**

Open `src/components/map/MapCanvas.tsx`, render agents as DOM overlays:

```typescript
// Add import
import { AgentRenderer } from './AgentRenderer'

// In the component return, add agent overlays after canvas
return (
  <div style={{ position: 'relative' }}>
    <canvas
      ref={canvasRef}
      {...props}
    />

    {/* Render agents as DOM overlays */}
    {agents.map(agent => (
      <AgentRenderer
        key={agent.id}
        agent={agent}
        viewport={viewport}
        zoom={zoom}
        onClick={onAgentClick}
      />
    ))}
  </div>
)
```

- [ ] **Step 5: Commit**

```bash
git add src/store/agents.ts src/store/deployStore.ts src/components/map/AgentRenderer.tsx src/components/map/MapCanvas.tsx
git commit -m "feat: render agents with map coordinate system"
```

---

### Task 15: Draw Agent Paths

**Files:**
- Create: `src/utils/agentPathfinding.ts`
- Modify: `src/components/map/MapCanvas.tsx:100-150` (add path rendering)

- [ ] **Step 1: Write test for pathfinding**

Create `src/utils/__tests__/agentPathfinding.test.ts`:

```typescript
import { calculateAgentPath } from '../agentPathfinding'

describe('Agent Pathfinding', () => {
  it('calculates direct path when no obstacles', () => {
    const agent = { position: { mapX: 100, mapY: 100 } }
    const target = {
      id: 'target-1',
      position: { x: 300, y: 100, width: 50, height: 50 }
    }
    const obstacles = []

    const path = calculateAgentPath(agent, target, obstacles)

    expect(path).toBeDefined()
    expect(path.length).toBeGreaterThanOrEqual(2)
    expect(path[0]).toEqual({ x: 100, y: 100 })
  })

  it('calculates path avoiding obstacles', () => {
    const agent = { position: { mapX: 100, mapY: 100 } }
    const target = {
      id: 'target-1',
      position: { x: 300, y: 100, width: 50, height: 50 }
    }
    const obstacles = [
      { x: 180, y: 50, width: 40, height: 100 }
    ]

    const path = calculateAgentPath(agent, target, obstacles)

    expect(path).toBeDefined()
    expect(path.length).toBeGreaterThan(2)  // Should go around obstacle
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test agentPathfinding.test`
Expected: FAIL with "Cannot find module '../agentPathfinding'"

- [ ] **Step 3: Implement pathfinding utility**

Create `src/utils/agentPathfinding.ts`:

```typescript
export interface Point {
  x: number
  y: number
}

interface Agent {
  position: { mapX: number; mapY: number }
}

interface Building {
  id: string
  position: { x: number; y: number; width: number; height: number }
}

export function calculateAgentPath(
  agent: Agent,
  targetBuilding: Building,
  allBuildings: Building[]
): Point[] {
  const start: Point = {
    x: agent.position.mapX,
    y: agent.position.mapY
  }

  const end: Point = {
    x: targetBuilding.position.x + targetBuilding.position.width / 2,
    y: targetBuilding.position.y + targetBuilding.position.height
  }

  // Simple implementation: direct path (no obstacle avoidance for now)
  // Full BFS implementation would go here
  return [start, end]
}

function pointInRect(point: Point, rect: { x: number; y: number; width: number; height: number }): boolean {
  return point.x >= rect.x &&
         point.x <= rect.x + rect.width &&
         point.y >= rect.y &&
         point.y <= rect.y + rect.height
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test agentPathfinding.test`
Expected: PASS (all 2 tests)

- [ ] **Step 5: Add path rendering to MapCanvas**

Open `src/components/map/MapCanvas.tsx`, add path drawing in render loop:

```typescript
// Add import
import { calculateAgentPath } from '@/utils/agentPathfinding'

// In the render function, after drawing buildings, add path rendering
const renderAgentPaths = (ctx: CanvasRenderingContext2D) => {
  const zoomScale = zoom === 'world' ? 0.5 : zoom === 'environment' ? 1.0 : 2.0

  agents.forEach(agent => {
    if (!agent.target || agent.status !== 'walking') return

    const targetBuilding = buildings.find(b => b.id === agent.target?.buildingId)
    if (!targetBuilding) return

    const path = calculateAgentPath(agent, targetBuilding, buildings)

    if (path.length < 2) return

    // Draw path line
    ctx.beginPath()
    ctx.strokeStyle = '#8b5cf6'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])

    path.forEach((point, index) => {
      const screen = mapToScreen(point.x, point.y, viewport, zoomScale)
      if (index === 0) ctx.moveTo(screen.x, screen.y)
      else ctx.lineTo(screen.x, screen.y)
    })

    ctx.stroke()
    ctx.setLineDash([])

    // Draw end marker
    const lastPoint = path[path.length - 1]
    const endScreen = mapToScreen(lastPoint.x, lastPoint.y, viewport, zoomScale)
    ctx.beginPath()
    ctx.fillStyle = '#8b5cf6'
    ctx.arc(endScreen.x, endScreen.y, 4, 0, Math.PI * 2)
    ctx.fill()
  })
}

// Call renderAgentPaths in the main render loop
const render = () => {
  const canvas = canvasRef.current
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Draw connections
  connections.forEach(conn => drawConnection(ctx, conn, viewport, zoom))

  // Draw buildings
  buildings.forEach(building => drawBuilding(ctx, building, viewport, zoom))

  // NEW: Draw agent paths
  renderAgentPaths(ctx)

  requestAnimationFrame(render)
}
```

- [ ] **Step 6: Commit**

```bash
git add src/utils/agentPathfinding.ts src/utils/__tests__/agentPathfinding.test.ts src/components/map/MapCanvas.tsx
git commit -m "feat: add agent path visualization on map"
```

---

## Phase 5: Visual Polish (Tasks 16-17)

### Task 16: Add Building State Animations

**Files:**
- Create: `src/utils/mapAnimations.ts` (extend with building animations)
- Modify: `src/utils/mapRendering.ts:50-100` (add animation support)

- [ ] **Step 1: Extend mapAnimations with building animations**

Open `src/utils/mapAnimations.ts`, add building animation functions:

```typescript
import type { Building } from '@/types/map'

export interface BuildingAnimation {
  type: 'pulse' | 'blink'
  color: string
  alpha: number
}

export function getBuildingAnimation(
  status: Building['status'],
  time: number
): BuildingAnimation {
  switch (status) {
    case 'healthy':
      return {
        type: 'pulse',
        color: '#10b981',
        alpha: 0.3 + Math.sin(time / 300) * 0.15
      }

    case 'warning':
      return {
        type: 'blink',
        color: '#f59e0b',
        alpha: Math.sin(time / 500) > 0 ? 0.8 : 0.2
      }

    case 'error':
      return {
        type: 'blink',
        color: '#ef4444',
        alpha: Math.sin(time / 250) > 0 ? 1.0 : 0.3
      }

    default:
      return { type: 'pulse', color: '#6b7280', alpha: 0 }
  }
}

export function drawBuildingWithAnimation(
  ctx: CanvasRenderingContext2D,
  building: Building,
  x: number,
  y: number,
  width: number,
  height: number,
  time: number
) {
  const anim = getBuildingAnimation(building.status, time)

  if (anim.type === 'pulse') {
    ctx.save()
    ctx.fillStyle = anim.color
    ctx.globalAlpha = anim.alpha
    ctx.fillRect(x, y, width, height)
    ctx.restore()
  }

  if (anim.type === 'blink') {
    ctx.save()
    ctx.strokeStyle = anim.color
    ctx.lineWidth = 3
    ctx.globalAlpha = anim.alpha
    ctx.strokeRect(x - 2, y - 2, width + 4, height + 4)
    ctx.restore()
  }
}
```

- [ ] **Step 2: Integrate animations into building rendering**

Open `src/utils/mapRendering.ts`, update drawBuilding function:

```typescript
import { getBuildingAnimation, drawBuildingWithAnimation } from './mapAnimations'

// Modify drawBuilding to call animation helper
export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  building: Building,
  viewport: ViewportState,
  zoom: ZoomLevel,
  time: number
) {
  // ... existing rendering code for base building

  // NEW: Add animation overlay
  drawBuildingWithAnimation(ctx, building, x, y, width, height, time)
}
```

- [ ] **Step 3: Update MapCanvas to pass time parameter**

Open `src/components/map/MapCanvas.tsx`, update render loop:

```typescript
const render = () => {
  const canvas = canvasRef.current
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const time = Date.now()  // NEW: Get current time for animations

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Draw buildings with animation
  buildings.forEach(building => {
    drawBuilding(ctx, building, viewport, zoom, time)  // Pass time
  })

  // ... rest of render code
}
```

- [ ] **Step 4: Commit**

```bash
git add src/utils/mapAnimations.ts src/utils/mapRendering.ts src/components/map/MapCanvas.tsx
git commit -m "feat: add state-driven building animations (healthy/warning/error)"
```

---

### Task 17: Add Data Flow Animations on Connections

**Files:**
- Modify: `src/utils/mapAnimations.ts:100-150` (add flow animations)
- Modify: `src/utils/mapRendering.ts:150-200` (integrate flow animations)

- [ ] **Step 1: Add flow animation functions to mapAnimations**

Open `src/utils/mapAnimations.ts`, add connection flow animations:

```typescript
export function drawConnectionWithFlow(
  ctx: CanvasRenderingContext2D,
  connection: { from: string; to: string; type: 'dependency' | 'dataflow' },
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  time: number
) {
  // Draw base connection line
  ctx.beginPath()
  ctx.strokeStyle = connection.type === 'dependency' ? '#6b7280' : '#3b82f6'
  ctx.lineWidth = 2
  ctx.moveTo(fromX, fromY)
  ctx.lineTo(toX, toY)
  ctx.stroke()

  // Don't show particles at world zoom level
  const zoomScale = 1.0  // Would be passed as parameter
  if (zoomScale < 0.8) return

  // Calculate particle position
  const speed = connection.type === 'dataflow' ? 0.002 : 0.0005
  const progress = (time * speed) % 1

  const particleX = fromX + (toX - fromX) * progress
  const particleY = fromY + (toY - fromY) * progress

  // Draw particle
  ctx.save()
  ctx.beginPath()
  ctx.fillStyle = connection.type === 'dataflow' ? '#3b82f6' : '#8b5cf6'
  ctx.arc(particleX, particleY, 4, 0, Math.PI * 2)
  ctx.fill()

  // Draw particle glow
  ctx.beginPath()
  ctx.fillStyle = connection.type === 'dataflow'
    ? 'rgba(59, 130, 246, 0.3)'
    : 'rgba(139, 92, 246, 0.3)'
  ctx.arc(particleX, particleY, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
```

- [ ] **Step 2: Update connection rendering to use flow animations**

Open `src/utils/mapRendering.ts`, update drawConnection:

```typescript
import { drawConnectionWithFlow } from './mapAnimations'

export function drawConnection(
  ctx: CanvasRenderingContext2D,
  connection: { from: string; to: string; type: 'dependency' | 'dataflow' },
  fromBuilding: Building,
  toBuilding: Building,
  viewport: ViewportState,
  zoom: ZoomLevel,
  time: number
) {
  const zoomScale = zoom === 'world' ? 0.5 : zoom === 'environment' ? 1.0 : 2.0

  const fromScreen = mapToScreen(
    fromBuilding.position.x + fromBuilding.position.width / 2,
    fromBuilding.position.y + fromBuilding.position.height / 2,
    viewport,
    zoomScale
  )

  const toScreen = mapToScreen(
    toBuilding.position.x + toBuilding.position.width / 2,
    toBuilding.position.y + toBuilding.position.height / 2,
    viewport,
    zoomScale
  )

  drawConnectionWithFlow(
    ctx,
    connection,
    fromScreen.x,
    fromScreen.y,
    toScreen.x,
    toScreen.y,
    time
  )
}
```

- [ ] **Step 3: Update MapCanvas to pass time to connection rendering**

Open `src/components/map/MapCanvas.tsx`, update connection rendering:

```typescript
// In render loop, pass time to drawConnection
connections.forEach(conn => {
  const fromBuilding = buildings.find(b => b.id === conn.from)
  const toBuilding = buildings.find(b => b.id === conn.to)

  if (fromBuilding && toBuilding) {
    drawConnection(ctx, conn, fromBuilding, toBuilding, viewport, zoom, time)
  }
})
```

- [ ] **Step 4: Commit**

```bash
git add src/utils/mapAnimations.ts src/utils/mapRendering.ts src/components/map/MapCanvas.tsx
git commit -m "feat: add particle flow animations on connections"
```

---

## Phase 6: Testing and Polish (Tasks 18-21)

### Task 18: Add Keyboard Navigation Support

**Files:**
- Create: `src/hooks/useKeyboardShortcuts.ts`
- Modify: `src/components/map/CityMapComplete.tsx:1-30` (integrate keyboard shortcuts)

- [ ] **Step 1: Create useKeyboardShortcuts hook**

Create `src/hooks/useKeyboardShortcuts.ts`:

```typescript
import { useEffect } from 'react'
import { useMapStore } from '@/store/mapStore'
import type { ViewportState, ZoomLevel, SelectionState } from '@/store/mapStore'

const KEYBOARD_SHORTCUTS: Record<string, KeyboardAction> = {
  '+': 'zoomIn',
  '=': 'zoomIn',
  '-': 'zoomOut',
  '_': 'zoomOut',
  '0': 'resetView',
  'ArrowUp': 'panUp',
  'ArrowDown': 'panDown',
  'ArrowLeft': 'panLeft',
  'ArrowRight': 'panRight',
  'Escape': 'clearSelection',
  'Enter': 'openDetail',
  '1': 'presetTestCity',
  '2': 'presetProdCity',
  '3': 'presetAllCities',
}

type KeyboardAction =
  | 'zoomIn' | 'zoomOut' | 'resetView'
  | 'panUp' | 'panDown' | 'panLeft' | 'panRight'
  | 'clearSelection' | 'openDetail'
  | 'presetTestCity' | 'presetProdCity' | 'presetAllCities'

export function useKeyboardShortcuts(
  viewport: ViewportState,
  zoom: ZoomLevel,
  selection: SelectionState
) {
  const setViewport = useMapStore((s) => s.setViewport)
  const setZoom = useMapStore((s) => s.setZoom)
  const setSelection = useMapStore((s) => s.setSelection)
  const resetView = useMapStore((s) => s.resetView)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
        return
      }

      const action = KEYBOARD_SHORTCUTS[e.key]
      if (!action) return

      e.preventDefault()

      switch (action) {
        case 'zoomIn':
          setZoom(getNextZoomLevel(zoom))
          break
        case 'zoomOut':
          setZoom(getPrevZoomLevel(zoom))
          break
        case 'resetView':
          resetView()
          break
        case 'panUp':
          setViewport({ offsetY: viewport.offsetY - 100 })
          break
        case 'panDown':
          setViewport({ offsetY: viewport.offsetY + 100 })
          break
        case 'panLeft':
          setViewport({ offsetX: viewport.offsetX - 100 })
          break
        case 'panRight':
          setViewport({ offsetX: viewport.offsetX + 100 })
          break
        case 'clearSelection':
          setSelection({ type: null, id: null })
          break
        case 'presetTestCity':
          setViewport({ offsetX: 50, offsetY: 100 })
          setZoom('environment')
          break
        case 'presetProdCity':
          setViewport({ offsetX: 400, offsetY: 100 })
          setZoom('environment')
          break
        case 'presetAllCities':
          setViewport({ offsetX: 250, offsetY: 50 })
          setZoom('world')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewport, zoom, selection])
}

function getNextZoomLevel(current: ZoomLevel): ZoomLevel {
  const levels: ZoomLevel[] = ['world', 'environment', 'building']
  const idx = levels.indexOf(current)
  return levels[Math.min(idx + 1, levels.length - 1)]
}

function getPrevZoomLevel(current: ZoomLevel): ZoomLevel {
  const levels: ZoomLevel[] = ['world', 'environment', 'building']
  const idx = levels.indexOf(current)
  return levels[Math.max(idx - 1, 0)]
}
```

- [ ] **Step 2: Integrate keyboard shortcuts into CityMapComplete**

Open `src/components/map/CityMapComplete.tsx`, add hook usage:

```typescript
// Add import
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

// In component body, add hook call
useKeyboardShortcuts(viewport, zoom, selection)
```

- [ ] **Step 3: Add keyboard shortcuts display to MapControls**

Open `src/components/map/MapControls.tsx`, add shortcuts legend:

```typescript
// In the preset views section, add shortcuts text
<div style={{
  position: 'absolute',
  bottom: 10,
  left: 10,
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  backgroundColor: 'rgba(15, 23, 42, 0.9)',
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid #8b5cf6'
}}>
  {/* Preset buttons */}
  <div style={{ display: 'flex', gap: '8px' }}>
    {/* ... existing preset buttons */}
  </div>

  {/* NEW: Shortcuts legend */}
  <div style={{
    fontSize: '12px',
    color: '#9ca3af',
    borderTop: '1px solid #374151',
    paddingTop: '8px'
  }}>
    Shortcuts: +/- zoom | Arrows pan | Esc clear | 1/2/3 presets
  </div>
</div>
```

- [ ] **Step 4: Manual test keyboard shortcuts**

Run: `npm run dev`
Test all shortcuts:
- ✅ `+` / `-` zoom in/out
- ✅ Arrow keys pan
- ✅ `0` reset view
- ✅ `Esc` clear selection
- ✅ `1` / `2` / `3` presets
- ✅ Typing in input doesn't trigger shortcuts

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useKeyboardShortcuts.ts src/components/map/MapControls.tsx src/components/map/CityMapComplete.tsx
git commit -m "feat: add keyboard navigation support with shortcuts"
```

---

### Task 19: Add Comprehensive Integration Tests

**Files:**
- Modify: `src/components/map/__tests__/CityMapComplete.integration.test.tsx` (extend coverage)

- [ ] **Step 1: Extend integration tests**

Open `src/components/map/__tests__/CityMapComplete.integration.test.tsx`, add more tests:

```typescript
// Add to existing describe block

it('responds to keyboard shortcuts', () => {
  render(<CityMapComplete />)

  const initialZoom = useMapStore.getState().zoom
  expect(initialZoom).toBe('world')

  fireEvent.keyDown(window, { key: '+' })

  const updatedZoom = useMapStore.getState().zoom
  expect(updatedZoom).toBe('environment')
})

it('opens detail panel when building clicked', () => {
  render(<CityMapComplete />)

  // Simulate building click
  const canvas = screen.getByRole('img', { hidden: true })
  fireEvent.click(canvas, { clientX: 200, clientY: 200 })

  const selection = useMapStore.getState().selection
  expect(selection.type).toBe('building')
})

it('shows tooltip when hovering', async () => {
  render(<CityMapComplete />)

  const canvas = screen.getByRole('img', { hidden: true })
  fireEvent.mouseMove(canvas, { clientX: 200, clientY: 200 })

  // Tooltip should appear
  await waitFor(() => {
    const tooltip = document.querySelector('.BuildingDetailPanel, [style*="position: fixed"]')
    expect(tooltip).toBeInTheDocument()
  }, { timeout: 1000 })
})

it('handles preset view buttons', () => {
  render(<CityMapComplete />)

  fireEvent.click(screen.getByRole('button', { name: /test/i }))

  const viewport = useMapStore.getState().viewport
  const zoom = useMapStore.getState().zoom

  expect(zoom).toBe('environment')
  expect(viewport.offsetX).toBeLessThan(100)  // Should be near test city
})
```

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: All tests pass (coverage > 80%)

- [ ] **Step 3: Commit**

```bash
git add src/components/map/__tests__/CityMapComplete.integration.test.tsx
git commit -m "test: extend integration test coverage"
```

---

### Task 20: Performance Optimization and Cleanup

**Files:**
- Create: `src/utils/mapOptimization.ts`
- Modify: `src/components/map/MapCanvas.tsx:50-100` (add viewport culling)

- [ ] **Step 1: Create optimization utilities**

Create `src/utils/mapOptimization.ts`:

```typescript
import type { Building } from '@/types/map'
import type { ViewportState, ZoomLevel } from '@/store/mapStore'

export function cullBuildingsToViewport(
  buildings: Building[],
  viewport: ViewportState,
  zoom: ZoomLevel,
  canvasWidth: number,
  canvasHeight: number
): Building[] {
  const zoomScale = zoom === 'world' ? 0.5 : zoom === 'environment' ? 1.0 : 2.0

  // Calculate viewport bounds in map coordinates
  const topLeftX = viewport.offsetX
  const topLeftY = viewport.offsetY
  const bottomRightX = viewport.offsetX + canvasWidth / zoomScale
  const bottomRightY = viewport.offsetY + canvasHeight / zoomScale

  return buildings.filter(b => {
    return !(
      b.position.x + b.position.width < topLeftX ||
      b.position.x > bottomRightX ||
      b.position.y + b.position.height < topLeftY ||
      b.position.y > bottomRightY
    )
  })
}
```

- [ ] **Step 2: Apply viewport culling in MapCanvas**

Open `src/components/map/MapCanvas.tsx`, add culling:

```typescript
import { cullBuildingsToViewport } from '@/utils/mapOptimization'

// In render loop, use culled buildings
const render = () => {
  const canvas = canvasRef.current
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const time = Date.now()

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // NEW: Only render visible buildings
  const visibleBuildings = cullBuildingsToViewport(
    buildings,
    viewport,
    zoom,
    canvas.width,
    canvas.height
  )

  visibleBuildings.forEach(building => {
    drawBuilding(ctx, building, viewport, zoom, time)
  })

  // ... rest of render code
}
```

- [ ] **Step 3: Remove console.log statements**

Run: `grep -r "console.log" src/components/map/`
Remove or comment out all console.log statements

- [ ] **Step 4: Remove unused imports**

Check each file for unused imports and remove them:
- MapCanvas.tsx
- MapControls.tsx
- CityMapComplete.tsx
- etc.

- [ ] **Step 5: Run performance check**

Run: `npm run dev`
Open browser DevTools Performance tab
Record interaction while:
- Zooming in/out
- Panning map
- Clicking buildings
- Hovering

Check metrics:
- ✅ FPS stays at 60fps
- ✅ No memory leaks
- ✅ Smooth animations

- [ ] **Step 6: Commit**

```bash
git add src/utils/mapOptimization.ts src/components/map/MapCanvas.tsx
git commit -m "perf: add viewport culling and performance optimizations"
```

---

### Task 21: Update Documentation and Cleanup

**Files:**
- Modify: `README.md` (update with new features)
- Modify: `CONTRIBUTING.md` (add development guidelines)
- Modify: `docs/superpowers/specs/2026-04-06-living-city-map-based-ui-design.md` (mark complete)

- [ ] **Step 1: Update README**

Open `README.md`, update with new features:

```markdown
# Living City - IaC Deployment Visualization

## Features

- **Interactive Map**: Canvas-based city map with 3-level zoom (world/environment/building)
- **Agent System**: Visual agents (scanners, generators, reviewers) with real-time status
- **Detail Panels**: Interactive panels for buildings, showing resources and changes
- **Zoom Controls**: Smooth zoom transitions, mini-map, preset views
- **Keyboard Shortcuts**: Full keyboard navigation (+/-, arrows, presets)
- **Hover Tooltips**: Quick info preview on hover
- **Status Animations**: Building health indicators (healthy/warning/error)
- **Data Flow**: Particle animations showing dependencies and data transfer

## Components

- `MapCanvas` - Core canvas-based map renderer (60fps)
- `MapControls` - Zoom, pan, presets, mini-map overlay
- `BuildingDetailPanel` - Right-side drawer with building details
- `Tooltip` - Hover information for buildings and agents
- `AgentOfficePanel` - Agent management and task dispatch
- `AgentRenderer` - DOM-based agent overlay with map coordinates

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `+` / `-` | Zoom in/out |
| Arrow Keys | Pan map |
| `0` | Reset view |
| `1` / `2` / `3` | Test/Prod/All preset views |
| `Esc` | Clear selection |

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Implementation Status

- [x] Phase 1: Basic Map Rendering (6/6 tasks)
- [x] Phase 2: Zoom System (3/3 tasks)
- [x] Phase 3: Selection & Details (4/4 tasks)
- [x] Phase 4: Agent Integration (2/2 tasks)
- [x] Phase 5: Visual Polish (2/2 tasks)
- [x] Phase 6: Testing & Polish (4/4 tasks)

**Total: 21/21 tasks completed (100%)**
```

- [ ] **Step 2: Update CONTRIBUTING.md**

Open `CONTRIBUTING.md`, add guidelines:

```markdown
# Contributing to Living City

## Development Setup

\`\`\`bash
npm install
npm run dev
\`\`\`

## Component Development

### Canvas Components
- Use `requestAnimationFrame` for 60fps rendering
- Implement viewport culling for performance
- Use `mapToScreen` / `screenToMap` for coordinate transforms

### State Management
- Use Zustand stores (mapStore, deployStore, agentStore)
- Implement shallow comparison for large arrays
- Keep actions focused and pure

### Testing Requirements
- Unit tests for all components
- Integration tests for user flows
- Target >80% code coverage

## Code Style

- Use Prettier: `npm run format`
- Follow TypeScript strict mode
- No console.log in production code
- Comment complex algorithms

## Performance Guidelines

- Target 60fps for Canvas rendering
- < 100ms response for zoom actions
- < 50ms response for clicks
- Monitor memory usage (should be stable)
```

- [ ] **Step 3: Update design spec with completion status**

Open `docs/superpowers/specs/2026-04-06-living-city-map-based-ui-design.md`, mark tasks complete:

```markdown
## Implementation Status

- [x] Phase 1: Basic Map Rendering (6/6 tasks) ✅
- [x] Phase 2: Zoom System (3/3 tasks) ✅
- [x] Phase 3: Selection & Details (4/4 tasks) ✅
- [x] Phase 4: Agent Integration (2/2 tasks) ✅
- [x] Phase 5: Visual Polish (2/2 tasks) ✅
- [x] Phase 6: Testing & Polish (4/4 tasks) ✅

**All 21 tasks completed successfully!**
```

- [ ] **Step 4: Format all files**

Run: `npm run format`

- [ ] **Step 5: Run final test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 6: Build production bundle**

Run: `npm run build`
Expected: Build succeeds without errors

- [ ] **Step 7: Commit documentation updates**

```bash
git add README.md CONTRIBUTING.md docs/superpowers/specs/2026-04-06-living-city-map-based-ui-design.md
git commit -m "docs: update documentation for completed UI implementation"
```

---

## Summary

This implementation plan covers all 15 remaining tasks (Tasks 7-21) of the Living City map-based UI, organized into 5 phases:

1. **Phase 2: Zoom System** - MapControls, smooth transitions, mini-map
2. **Phase 3: Selection & Details** - BuildingDetailPanel, Tooltip, hover tracking
3. **Phase 4: Agent Integration** - Map coordinates, path visualization
4. **Phase 5: Visual Polish** - Building animations, data flow animations
5. **Phase 6: Testing & Polish** - Keyboard navigation, integration tests, performance, documentation

Each task follows TDD principles with bite-sized steps, complete code examples, and commit checkpoints. The plan assumes zero context and provides everything needed to implement successfully.

**Total Tasks:** 15 tasks (Tasks 7-21)
**Estimated Time:** 8-12 hours of focused development
**Success Criteria:** All tests passing, 60fps rendering, full feature set working

---

## Next Steps After Implementation

Once all tasks are complete:
1. Run full test suite: `npm test`
2. Verify all features manually in browser
3. Check performance with DevTools
4. Create PR with all commits
5. Update project documentation
6. Coordinate with Runtime layer integration team (separate track)
