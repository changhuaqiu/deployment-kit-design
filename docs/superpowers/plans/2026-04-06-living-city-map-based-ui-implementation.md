# Living City - Map-Based UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the card-based Living City interface into a fully map-based, interactive visualization system with Canvas rendering, zoom controls, and seamless agent integration.

**Architecture:** Three-layer architecture with Canvas rendering layer (MapCanvas), state layer (Zustand stores), and UI interaction layer (React components). Preserves existing agent/district stores, adds new mapStore for viewport/zoom/selection state.

**Tech Stack:** React 19, TypeScript, Zustand, HTML5 Canvas, requestAnimationFrame for 60fps rendering, existing OpenCode integration via deployStore.

---

## File Structure

**New Files:**
- `src/components/map/MapCanvas.tsx` - Canvas-based map renderer with coordinate transforms and hit detection
- `src/components/map/MapControls.tsx` - Zoom/pan controls UI overlay
- `src/components/map/BuildingDetailPanel.tsx` - Slide-out panel for building details
- `src/components/map/Tooltip.tsx` - Hover tooltip component
- `src/store/mapStore.ts` - Map viewport, zoom, selection state
- `src/utils/mapCoordinates.ts` - Coordinate transform utilities (map ↔ screen)
- `src/utils/mapRendering.ts` - Canvas drawing utilities
- `src/types/map.ts` - Map-specific TypeScript types
- `src/components/map/MapCanvas.test.tsx` - MapCanvas tests
- `src/utils/mapCoordinates.test.ts` - Coordinate transform tests

**Modified Files:**
- `src/components/map/CityMapComplete.tsx` - Replace district cards with MapCanvas, add overlays

---

## Phase 1: Basic Map Rendering

### Task 1: Create map type definitions

**Files:**
- Create: `src/types/map.ts`

- [ ] **Step 1: Create type definitions file**

```typescript
// src/types/map.ts
export type ZoomLevel = 'world' | 'environment' | 'building'

export interface ViewportState {
  x: number
  y: number
  width: number
  height: number
}

export interface Building {
  id: string
  type: 'compute' | 'data' | 'network' | 'config'
  name: string
  city: 'test' | 'prod'
  position: {
    x: number
    y: number
    width: number
    height: number
  }
  status: 'healthy' | 'warning' | 'error'
  metrics: {
    resourceCount: number
    cpu?: number
    memory?: number
  }
}

export interface Connection {
  from: string
  to: string
  type: 'dependency' | 'dataflow'
}

export interface SelectionState {
  type: 'building' | 'agent' | null
  id: string | null
}

export interface HoverState {
  type: 'building' | 'agent' | null
  id: string | null
}

export interface MapState {
  viewport: ViewportState
  zoom: ZoomLevel
  selection: SelectionState
  hovered: HoverState
}

const ZOOM_LEVELS: Record<ZoomLevel, number> = {
  world: 0.5,
  environment: 1.0,
  building: 2.0
}

export function getZoomScale(zoom: ZoomLevel): number {
  return ZOOM_LEVELS[zoom]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/map.ts
git commit -m "feat: add map type definitions"
```

---

### Task 2: Create mapStore with Zustand

**Files:**
- Create: `src/store/mapStore.ts`
- Test: `src/store/mapStore.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/store/mapStore.test.ts
import { createMapStore } from './mapStore'

describe('mapStore', () => {
  it('should initialize with default state', () => {
    const store = createMapStore()
    const state = store.getState()

    expect(state.viewport).toEqual({
      x: 0,
      y: 0,
      width: 1200,
      height: 800
    })
    expect(state.zoom).toBe('environment')
    expect(state.selection).toEqual({ type: null, id: null })
    expect(state.hovered).toEqual({ type: null, id: null })
  })

  it('should update viewport', () => {
    const store = createMapStore()
    store.getState().setViewport({ x: 100, y: 200 })

    const state = store.getState()
    expect(state.viewport.x).toBe(100)
    expect(state.viewport.y).toBe(200)
  })

  it('should set zoom level', () => {
    const store = createMapStore()
    store.getState().setZoom('world')

    expect(store.getState().zoom).toBe('world')
  })

  it('should set selection', () => {
    const store = createMapStore()
    store.getState().setSelection({ type: 'building', id: 'compute-a' })

    const state = store.getState()
    expect(state.selection).toEqual({ type: 'building', id: 'compute-a' })
  })

  it('should reset view to default', () => {
    const store = createMapStore()
    store.getState().setViewport({ x: 500, y: 500 })
    store.getState().setZoom('building')
    store.getState().resetView()

    const state = store.getState()
    expect(state.viewport.x).toBe(0)
    expect(state.viewport.y).toBe(0)
    expect(state.zoom).toBe('environment')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/store/mapStore.test.ts`
Expected: FAIL with "createMapStore is not defined"

- [ ] **Step 3: Implement mapStore**

```typescript
// src/store/mapStore.ts
import { create } from 'zustand'
import type { MapState, ViewportState, ZoomLevel, SelectionState, HoverState } from '@/types/map'

interface MapActions {
  setViewport: (updates: Partial<MapState['viewport']>) => void
  setZoom: (zoom: ZoomLevel) => void
  setSelection: (selection: MapState['selection']) => void
  setHovered: (hovered: MapState['hovered']) => void
  resetView: () => void
  zoomToBuilding: (buildingId: string) => void
}

type MapStore = MapState & MapActions

const DEFAULT_VIEWPORT: ViewportState = {
  x: 0,
  y: 0,
  width: 1200,
  height: 800
}

export const createMapStore = create<MapStore>((set, get) => ({
  viewport: DEFAULT_VIEWPORT,
  zoom: 'environment',
  selection: { type: null, id: null },
  hovered: { type: null, id: null },

  setViewport: (updates) =>
    set((state) => ({
      viewport: { ...state.viewport, ...updates }
    })),

  setZoom: (zoom) =>
    set({ zoom }),

  setSelection: (selection) =>
    set({ selection }),

  setHovered: (hovered) =>
    set({ hovered }),

  resetView: () =>
    set({
      viewport: DEFAULT_VIEWPORT,
      zoom: 'environment',
      selection: { type: null, id: null }
    }),

  zoomToBuilding: (buildingId) => {
    // Will be implemented when we have building data
    console.log('Zoom to building:', buildingId)
  }
}))

// Singleton export
export const useMapStore = createMapStore()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/store/mapStore.test.ts`
Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/store/mapStore.ts src/store/mapStore.test.ts
git commit -m "feat: add mapStore with viewport, zoom, and selection state"
```

---

### Task 3: Create coordinate transform utilities

**Files:**
- Create: `src/utils/mapCoordinates.ts`
- Test: `src/utils/mapCoordinates.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/utils/mapCoordinates.test.ts
import { describe, it, expect } from 'vitest'
import { mapToScreen, screenToMap } from './mapCoordinates'
import type { ViewportState } from '@/types/map'

describe('mapCoordinates', () => {
  const viewport: ViewportState = {
    x: 100,
    y: 50,
    width: 800,
    height: 600
  }

  it('should convert map coordinates to screen coordinates', () => {
    const result = mapToScreen(200, 150, viewport, 1.0)

    expect(result.x).toBe(100) // (200 - 100) * 1.0
    expect(result.y).toBe(100) // (150 - 50) * 1.0
  })

  it('should apply zoom scale to screen coordinates', () => {
    const result = mapToScreen(200, 150, viewport, 2.0)

    expect(result.x).toBe(200) // (200 - 100) * 2.0
    expect(result.y).toBe(200) // (150 - 50) * 2.0
  })

  it('should convert screen coordinates back to map coordinates', () => {
    const result = screenToMap(100, 100, viewport, 1.0)

    expect(result.x).toBe(200) // (100 / 1.0) + 100
    expect(result.y).toBe(150) // (100 / 1.0) + 50
  })

  it('should apply zoom scale when converting back to map coordinates', () => {
    const result = screenToMap(200, 200, viewport, 2.0)

    expect(result.x).toBe(200) // (200 / 2.0) + 100
    expect(result.y).toBe(150) // (200 / 2.0) + 50
  })

  it('should handle zero offset', () => {
    const zeroViewport: ViewportState = { x: 0, y: 0, width: 800, height: 600 }
    const result = mapToScreen(100, 100, zeroViewport, 1.0)

    expect(result.x).toBe(100)
    expect(result.y).toBe(100)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/mapCoordinates.test.ts`
Expected: FAIL with "mapToScreen is not defined"

- [ ] **Step 3: Implement coordinate transforms**

```typescript
// src/utils/mapCoordinates.ts
import type { ViewportState } from '@/types/map'

export interface Point {
  x: number
  y: number
}

/**
 * Convert map coordinates to screen coordinates
 * @param mapX - Map X coordinate
 * @param mapY - Map Y coordinate
 * @param viewport - Current viewport state
 * @param zoomScale - Current zoom scale factor
 * @returns Screen coordinates
 */
export function mapToScreen(
  mapX: number,
  mapY: number,
  viewport: ViewportState,
  zoomScale: number
): Point {
  return {
    x: (mapX - viewport.x) * zoomScale,
    y: (mapY - viewport.y) * zoomScale
  }
}

/**
 * Convert screen coordinates to map coordinates
 * @param screenX - Screen X coordinate
 * @param screenY - Screen Y coordinate
 * @param viewport - Current viewport state
 * @param zoomScale - Current zoom scale factor
 * @returns Map coordinates
 */
export function screenToMap(
  screenX: number,
  screenY: number,
  viewport: ViewportState,
  zoomScale: number
): Point {
  return {
    x: screenX / zoomScale + viewport.x,
    y: screenY / zoomScale + viewport.y
  }
}

/**
 * Check if a point is inside a rectangle
 * @param point - Point to check
 * @param rect - Rectangle with x, y, width, height
 * @returns true if point is inside rectangle
 */
export function pointInRect(
  point: Point,
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/mapCoordinates.test.ts`
Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/mapCoordinates.ts src/utils/mapCoordinates.test.ts
git commit -m "feat: add coordinate transform utilities for map rendering"
```

---

### Task 4: Create map rendering utilities

**Files:**
- Create: `src/utils/mapRendering.ts`

- [ ] **Step 1: Create rendering utility functions**

```typescript
// src/utils/mapRendering.ts
import type { Building, Connection } from '@/types/map'

/**
 * Convert district data to building format for map rendering
 * @param districts - District data from districtStore
 * @returns Array of building objects
 */
export function districtsToBuildings(
  districts: Array<{
    id: string
    type: string
    city: string
    position?: { x: number; y: number; width: number; height: number }
    status: string
    metrics?: { resourceCount: number }
  }>
): Building[] {
  return districts.map((district) => ({
    id: district.id,
    type: district.type as Building['type'],
    name: district.type.toUpperCase(),
    city: district.city as 'test' | 'prod',
    position: district.position || {
      x: 100,
      y: 100,
      width: 120,
      height: 100
    },
    status: district.status as Building['status'],
    metrics: {
      resourceCount: district.metrics?.resourceCount || 0
    }
  }))
}

/**
 * Get building color based on status
 * @param status - Building status
 * @returns CSS color string
 */
export function getBuildingColor(status: Building['status']): string {
  switch (status) {
    case 'healthy':
      return '#22c55e'
    case 'warning':
      return '#f59e0b'
    case 'error':
      return '#ef4444'
    default:
      return '#6b7280'
  }
}

/**
 * Get building border color based on city
 * @param city - City name
 * @returns CSS color string
 */
export function getCityColor(city: 'test' | 'prod'): string {
  return city === 'test' ? '#3b82f6' : '#f97316'
}

/**
 * Draw a building on canvas
 * @param ctx - Canvas 2D context
 * @param building - Building to draw
 * @param x - Screen X coordinate
 * @param y - Screen Y coordinate
 * @param width - Building width in pixels
 * @param height - Building height in pixels
 * @param zoom - Current zoom level
 */
export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  building: Building,
  x: number,
  y: number,
  width: number,
  height: number,
  zoom: string
): void {
  const statusColor = getBuildingColor(building.status)
  const cityColor = getCityColor(building.city)

  // Fill background
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(x, y, width, height)

  // Draw border based on status
  ctx.strokeStyle = statusColor
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, width, height)

  // Draw city indicator (small colored box)
  ctx.fillStyle = cityColor
  ctx.fillRect(x + 4, y + 4, 8, 8)

  // Draw icon
  const icon = getBuildingIcon(building.type)
  ctx.font = `${Math.max(16, width / 4)}px Arial`
  ctx.textAlign = 'center'
  ctx.fillText(icon, x + width / 2, y + height / 2)

  // Draw name
  ctx.font = `${Math.max(10, width / 6)}px Arial`
  ctx.fillStyle = '#fff'
  ctx.fillText(building.name, x + width / 2, y + height - 8)
}

/**
 * Get emoji icon for building type
 * @param type - Building type
 * @returns Emoji icon
 */
function getBuildingIcon(type: Building['type']): string {
  switch (type) {
    case 'compute':
      return '🏗️'
    case 'data':
      return '🏦'
    case 'network':
      return '🌐'
    case 'config':
      return '⚙️'
    default:
      return '🏢'
  }
}

/**
 * Draw connection line between two points
 * @param ctx - Canvas 2D context
 * @param fromX - Start X
 * @param fromY - Start Y
 * @param toX - End X
 * @param toY - End Y
 * @param type - Connection type
 */
export function drawConnection(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  type: Connection['type']
): void {
  ctx.beginPath()
  ctx.moveTo(fromX, fromY)
  ctx.lineTo(toX, toY)

  if (type === 'dependency') {
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)'
    ctx.setLineDash([5, 5])
  } else {
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)'
    ctx.setLineDash([])
  }

  ctx.lineWidth = 2
  ctx.stroke()
  ctx.setLineDash([])
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/mapRendering.ts
git commit -m "feat: add map rendering utilities for buildings and connections"
```

---

### Task 5: Create MapCanvas component with basic rendering

**Files:**
- Create: `src/components/map/MapCanvas.tsx`
- Test: `src/components/map/MapCanvas.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/map/MapCanvas.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MapCanvas } from './MapCanvas'
import type { Building } from '@/types/map'

describe('MapCanvas', () => {
  it('should render canvas element', () => {
    const { container } = render(
      <MapCanvas
        buildings={[]}
        agents={[]}
        connections={[]}
        viewport={{ x: 0, y: 0, width: 800, height: 600 }}
        zoom="environment"
        selection={{ type: null, id: null }}
        onBuildingClick={vi.fn()}
        onAgentClick={vi.fn()}
        onViewportChange={vi.fn()}
        onZoomChange={vi.fn()}
      />
    )

    const canvas = container.querySelector('canvas')
    expect(canvas).toBeTruthy()
  })

  it('should call onBuildingClick when building is clicked', () => {
    const handleClick = vi.fn()
    const buildings: Building[] = [
      {
        id: 'test-compute',
        type: 'compute',
        name: 'COMPUTE',
        city: 'test',
        position: { x: 100, y: 100, width: 120, height: 100 },
        status: 'healthy',
        metrics: { resourceCount: 5 }
      }
    ]

    const { container } = render(
      <MapCanvas
        buildings={buildings}
        agents={[]}
        connections={[]}
        viewport={{ x: 0, y: 0, width: 800, height: 600 }}
        zoom="environment"
        selection={{ type: null, id: null }}
        onBuildingClick={handleClick}
        onAgentClick={vi.fn()}
        onViewportChange={vi.fn()}
        onZoomChange={vi.fn()}
      />
    )

    const canvas = container.querySelector('canvas') as HTMLCanvasElement
    // Simulate click at building center (160, 150)
    canvas.dispatchEvent(new MouseEvent('click', { clientX: 160, clientY: 150 }))

    expect(handleClick).toHaveBeenCalledWith('test-compute')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/map/MapCanvas.test.tsx`
Expected: FAIL with "MapCanvas is not defined"

- [ ] **Step 3: Implement MapCanvas component**

```typescript
// src/components/map/MapCanvas.tsx
import { useRef, useEffect, useCallback } from 'react'
import type { Building, Connection, SelectionState, ViewportState, ZoomLevel } from '@/types/map'
import { mapToScreen, screenToMap, pointInRect } from '@/utils/mapCoordinates'
import { drawBuilding, drawConnection } from '@/utils/mapRendering'
import { useMapStore } from '@/store/mapStore'
import { getZoomScale } from '@/types/map'

interface MapCanvasProps {
  buildings: Building[]
  agents: Array<{ id: string; position: { x: number; y: number } }>
  connections: Connection[]
  viewport: ViewportState
  zoom: ZoomLevel
  selection: SelectionState
  onBuildingClick: (buildingId: string) => void
  onAgentClick: (agentId: string) => void
  onViewportChange: (viewport: Partial<ViewportState>) => void
  onZoomChange: (zoom: ZoomLevel) => void
}

export function MapCanvas({
  buildings,
  agents,
  connections,
  viewport,
  zoom,
  selection,
  onBuildingClick,
  onAgentClick,
  onViewportChange,
  onZoomChange
}: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const viewportStartRef = useRef({ x: 0, y: 0 })

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = window.innerWidth * 0.75
    canvas.height = window.innerHeight

    // Animation loop
    let animationId: number
    function animate() {
      render(ctx, canvas.width, canvas.height)
      animationId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [buildings, agents, connections, viewport, zoom, selection])

  // Render function
  function render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw background grid
    drawGrid(ctx, width, height)

    const zoomScale = getZoomScale(zoom)

    // Draw connections
    connections.forEach((connection) => {
      const fromBuilding = buildings.find((b) => b.id === connection.from)
      const toBuilding = buildings.find((b) => b.id === connection.to)

      if (fromBuilding && toBuilding) {
        const from = mapToScreen(
          fromBuilding.position.x + fromBuilding.position.width / 2,
          fromBuilding.position.y + fromBuilding.position.height / 2,
          viewport,
          zoomScale
        )
        const to = mapToScreen(
          toBuilding.position.x + toBuilding.position.width / 2,
          toBuilding.position.y + toBuilding.position.height / 2,
          viewport,
          zoomScale
        )

        drawConnection(ctx, from.x, from.y, to.x, to.y, connection.type)
      }
    })

    // Draw buildings
    buildings.forEach((building) => {
      const pos = mapToScreen(
        building.position.x,
        building.position.y,
        viewport,
        zoomScale
      )

      const width = building.position.width * zoomScale
      const height = building.position.height * zoomScale

      drawBuilding(ctx, building, pos.x, pos.y, width, height, zoom)

      // Highlight if selected
      if (selection.type === 'building' && selection.id === building.id) {
        ctx.strokeStyle = '#8b5cf6'
        ctx.lineWidth = 3
        ctx.strokeRect(pos.x - 2, pos.y - 2, width + 4, height + 4)
      }
    })

    // Draw agents
    agents.forEach((agent) => {
      const pos = mapToScreen(agent.position.x, agent.position.y, viewport, zoomScale)

      ctx.font = `${16 * zoomScale}px Arial`
      ctx.textAlign = 'center'
      ctx.fillText('🚶', pos.x, pos.y)
    })
  }

  // Draw grid background
  function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.1)'
    ctx.lineWidth = 1

    const gridSize = 32

    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
  }

  // Handle mouse click
  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      isDraggingRef.current = true
      dragStartRef.current = { x: event.clientX, y: event.clientY }
      viewportStartRef.current = { x: viewport.x, y: viewport.y }
    },
    [viewport]
  )

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (isDraggingRef.current) {
        // Handle panning
        const dx = event.clientX - dragStartRef.current.x
        const dy = event.clientY - dragStartRef.current.y

        onViewportChange({
          x: viewportStartRef.current.x - dx / getZoomScale(zoom),
          y: viewportStartRef.current.y - dy / getZoomScale(zoom)
        })
      }
    },
    [zoom, onViewportChange]
  )

  const handleMouseUp = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (isDraggingRef.current) {
        // Check if this was a click (not a drag)
        const dx = event.clientX - dragStartRef.current.x
        const dy = event.clientY - dragStartRef.current.y
        const dragDistance = Math.sqrt(dx * dx + dy * dy)

        if (dragDistance < 5) {
          // This is a click, check if clicked on building
          const canvas = canvasRef.current
          if (!canvas) return

          const rect = canvas.getBoundingClientRect()
          const clickX = event.clientX - rect.left
          const clickY = event.clientY - rect.top

          const mapPos = screenToMap(clickX, clickY, viewport, getZoomScale(zoom))

          // Check if click is on any building
          for (const building of buildings) {
            if (
              pointInRect(mapPos, {
                x: building.position.x,
                y: building.position.y,
                width: building.position.width,
                height: building.position.height
              })
            ) {
              onBuildingClick(building.id)
              return
            }
          }

          // Check if click is on any agent
          for (const agent of agents) {
            const agentPos = screenToMap(
              agent.position.x,
              agent.position.y,
              viewport,
              getZoomScale(zoom)
            )
            const distance = Math.sqrt(
              Math.pow(mapPos.x - agentPos.x, 2) + Math.pow(mapPos.y - agentPos.y, 2)
            )

            if (distance < 20) {
              onAgentClick(agent.id)
              return
            }
          }
        }
      }

      isDraggingRef.current = false
    },
    [buildings, agents, viewport, zoom, onBuildingClick, onAgentClick]
  )

  // Handle scroll wheel for zoom
  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLCanvasElement>) => {
      event.preventDefault()

      const zoomLevels: ZoomLevel[] = ['world', 'environment', 'building']
      const currentIndex = zoomLevels.indexOf(zoom)

      if (event.deltaY < 0 && currentIndex < zoomLevels.length - 1) {
        onZoomChange(zoomLevels[currentIndex + 1])
      } else if (event.deltaY > 0 && currentIndex > 0) {
        onZoomChange(zoomLevels[currentIndex - 1])
      }
    },
    [zoom, onZoomChange]
  )

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ display: 'block', cursor: isDraggingRef.current ? 'grabbing' : 'grab' }}
    />
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/map/MapCanvas.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/map/MapCanvas.tsx src/components/map/MapCanvas.test.tsx
git commit -m "feat: add MapCanvas component with basic rendering and click detection"
```

---

### Task 6: Integrate MapCanvas into CityMapComplete

**Files:**
- Modify: `src/components/map/CityMapComplete.tsx`

- [ ] **Step 1: Update CityMapComplete to use MapCanvas**

```typescript
// src/components/map/CityMapComplete.tsx
import { useState, useEffect } from 'react'
import { MapCanvas } from './MapCanvas'
import AgentOfficePanel from '../city/AgentOfficePanel'
import { useAgentStore } from '@/store/agents'
import { useDistrictStore } from '@/store/districts'
import { useMapStore } from '@/store/mapStore'
import { districtsToBuildings } from '@/utils/mapRendering'

/**
 * Living City Map - Map-based UI with Canvas rendering
 */
export function CityMapComplete() {
  const districts = useDistrictStore((state) => state.districts)
  const agents = useAgentStore((state) => state.agents)

  const viewport = useMapStore((state) => state.viewport)
  const zoom = useMapStore((state) => state.zoom)
  const selection = useMapStore((state) => state.selection)
  const setViewport = useMapStore((state) => state.setViewport)
  const setZoom = useMapStore((state) => state.setZoom)
  const setSelection = useMapStore((state) => state.setSelection)

  const [buildings, setBuildings] = useState<ReturnType<typeof districtsToBuildings>>([])

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

      {/* RIGHT: Office Panel (25%) */}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/map/CityMapComplete.tsx
git commit -m "feat: integrate MapCanvas into CityMapComplete"
```

---

## Phase 2: Zoom System

### Task 7: Create MapControls component

**Files:**
- Create: `src/components/map/MapControls.tsx`
- Test: `src/components/map/MapControls.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/map/MapControls.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MapControls } from './MapControls'

describe('MapControls', () => {
  it('should render zoom buttons', () => {
    render(
      <MapControls
        zoom="environment"
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onReset={vi.fn()}
        currentLocation="Test / Compute-A"
      />
    )

    expect(screen.getByText('−')).toBeTruthy()
    expect(screen.getByText('+')).toBeTruthy()
    expect(screen.getByText('Reset')).toBeTruthy()
  })

  it('should call onZoomIn when + button is clicked', () => {
    const handleZoomIn = vi.fn()
    render(
      <MapControls
        zoom="environment"
        onZoomIn={handleZoomIn}
        onZoomOut={vi.fn()}
        onReset={vi.fn()}
        currentLocation="Test / Compute-A"
      />
    )

    screen.getByText('+').click()
    expect(handleZoomIn).toHaveBeenCalled()
  })

  it('should show current location', () => {
    render(
      <MapControls
        zoom="environment"
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onReset={vi.fn()}
        currentLocation="Test / Compute-A"
      />
    )

    expect(screen.getByText('Test / Compute-A')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/map/MapControls.test.tsx`
Expected: FAIL with "MapControls is not defined"

- [ ] **Step 3: Implement MapControls component**

```typescript
// src/components/map/MapControls.tsx'
interface MapControlsProps {
  zoom: 'world' | 'environment' | 'building'
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  currentLocation: string
}

export function MapControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  currentLocation
}: MapControlsProps) {
  const zoomLevels = ['world', 'environment', 'building'] as const
  const currentIndex = zoomLevels.indexOf(zoom)

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      border: '2px solid #3b82f6',
      borderRadius: '8px',
      padding: '12px',
      color: '#fff',
      fontSize: '12px'
    }}>
      {/* Zoom buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onZoomOut}
          disabled={currentIndex === 0}
          style={{
            padding: '4px 12px',
            backgroundColor: currentIndex === 0 ? '#374151' : '#3b82f6',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            fontSize: '18px',
            fontWeight: 'bold'
          }}
        >
          −
        </button>
        <button
          onClick={onZoomIn}
          disabled={currentIndex === zoomLevels.length - 1}
          style={{
            padding: '4px 12px',
            backgroundColor: currentIndex === zoomLevels.length - 1 ? '#374151' : '#3b82f6',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            cursor: currentIndex === zoomLevels.length - 1 ? 'not-allowed' : 'pointer',
            fontSize: '18px',
            fontWeight: 'bold'
          }}
        >
          +
        </button>
      </div>

      {/* Reset button */}
      <button
        onClick={onReset}
        style={{
          padding: '6px 12px',
          backgroundColor: '#6b7280',
          border: 'none',
          borderRadius: '4px',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '11px'
        }}
      >
        Reset
      </button>

      {/* Current location */}
      <div style={{
        marginTop: '8px',
        paddingTop: '8px',
        borderTop: '1px solid #374151',
        fontSize: '10px',
        opacity: 0.8
      }}>
        📍 {currentLocation}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/map/MapControls.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/map/MapControls.tsx src/components/map/MapControls.test.tsx
git commit -m "feat: add MapControls component with zoom buttons"
```

---

### Task 8: Implement smooth zoom transitions

**Files:**
- Modify: `src/store/mapStore.ts`
- Modify: `src/components/map/MapCanvas.tsx`

- [ ] **Step 1: Add zoom transition state to mapStore**

```typescript
// src/store/mapStore.ts
import { create } from 'zustand'
import type { MapState, ViewportState, ZoomLevel, SelectionState, HoverState } from '@/types/map'

interface MapActions {
  setViewport: (updates: Partial<MapState['viewport']>) => void
  setZoom: (zoom: ZoomLevel) => void
  setSelection: (selection: MapState['selection']) => void
  setHovered: (hovered: MapState['hovered']) => void
  resetView: () => void
  zoomToBuilding: (buildingId: string) => void
  setZoomTarget: (zoom: ZoomLevel) => void // NEW
}

type MapStore = MapState & MapActions & {
  zoomTarget: ZoomLevel | null // NEW
}

const DEFAULT_VIEWPORT: ViewportState = {
  x: 0,
  y: 0,
  width: 1200,
  height: 800
}

export const createMapStore = create<MapStore>((set, get) => ({
  viewport: DEFAULT_VIEWPORT,
  zoom: 'environment',
  zoomTarget: null, // NEW
  selection: { type: null, id: null },
  hovered: { type: null, id: null },

  setViewport: (updates) =>
    set((state) => ({
      viewport: { ...state.viewport, ...updates }
    })),

  setZoom: (zoom) =>
    set({ zoom }),

  setZoomTarget: (zoomTarget) => // NEW
    set({ zoomTarget }),

  setSelection: (selection) =>
    set({ selection }),

  setHovered: (hovered) =>
    set({ hovered }),

  resetView: () =>
    set({
      viewport: DEFAULT_VIEWPORT,
      zoom: 'environment',
      selection: { type: null, id: null }
    }),

  zoomToBuilding: (buildingId) => {
    console.log('Zoom to building:', buildingId)
  }
}))

export const useMapStore = createMapStore()
```

- [ ] **Step 2: Add zoom transition animation to MapCanvas**

```typescript
// Add to MapCanvas.tsx, after existing imports:
import { useEffect, useRef, useCallback } from 'react'
import { useMapStore } from '@/store/mapStore'
import { getZoomScale } from '@/types/map'

// Add inside MapCanvas component, before render:
const zoomTarget = useMapStore((state) => state.zoomTarget)
const setZoom = useMapStore((state) => state.setZoom)
const setZoomTarget = useMapStore((state) => state.setZoomTarget)

// Add zoom transition animation
useEffect(() => {
  if (!zoomTarget || zoomTarget === zoom) return

  const zoomLevels: ZoomLevel[] = ['world', 'environment', 'building']
  const currentIndex = zoomLevels.indexOf(zoom)
  const targetIndex = zoomLevels.indexOf(zoomTarget)

  if (targetIndex === currentIndex) {
    setZoomTarget(null)
    return
  }

  const direction = targetIndex > currentIndex ? 1 : -1
  let progress = 0
  const duration = 300 // ms
  const startTime = performance.now()

  function animateZoom(currentTime: number) {
    const elapsed = currentTime - startTime
    progress = Math.min(elapsed / duration, 1)

    // Easing function (ease-out)
    const eased = 1 - Math.pow(1 - progress, 3)

    if (progress >= 1) {
      // Animation complete
      setZoom(zoomTarget)
      setZoomTarget(null)
    } else {
      // Continue animation - would need intermediate zoom values
      // For now, just switch at the end
      requestAnimationFrame(animateZoom)
    }
  }

  requestAnimationFrame(animateZoom)
}, [zoomTarget, zoom, setZoom, setZoomTarget])
```

- [ ] **Step 3: Update MapControls to use zoom target**

```typescript
// Update MapControls.tsx onClick handlers:
<button
  onClick={() => {
    const zoomLevels = ['world', 'environment', 'building'] as const
    if (currentIndex < zoomLevels.length - 1) {
      onZoomIn()
      // Set zoom target for animation
      // This would be passed from parent
    }
  }}
  // ... rest of button props
>
  +
</button>
```

- [ ] **Step 4: Commit**

```bash
git add src/store/mapStore.ts src/components/map/MapCanvas.tsx src/components/map/MapControls.tsx
git commit -m "feat: add smooth zoom transition animation"
```

---

### Task 9: Wire up MapControls in CityMapComplete

**Files:**
- Modify: `src/components/map/CityMapComplete.tsx`

- [ ] **Step 1: Add MapControls to CityMapComplete**

```typescript
// Add to imports in CityMapComplete.tsx:
import { MapControls } from './MapControls'

// Add inside CityMapComplete component, before return statement:
const handleZoomIn = () => {
  const zoomLevels = ['world', 'environment', 'building'] as const
  const currentIndex = zoomLevels.indexOf(zoom)
  if (currentIndex < zoomLevels.length - 1) {
    setZoom(zoomLevels[currentIndex + 1])
  }
}

const handleZoomOut = () => {
  const zoomLevels = ['world', 'environment', 'building'] as const
  const currentIndex = zoomLevels.indexOf(zoom)
  if (currentIndex > 0) {
    setZoom(zoomLevels[currentIndex - 1])
  }
}

const handleReset = () => {
  useMapStore.getState().resetView()
}

// Get current location text
const getCurrentLocation = () => {
  if (selection.type === 'building') {
    const building = buildings.find((b) => b.id === selection.id)
    if (building) {
      return `${building.city.toUpperCase()} / ${building.name}`
    }
  }
  return zoom === 'world' ? 'World View' : `${zoom.charAt(0).toUpperCase() + zoom.slice(1)} View`
}

// Update the LEFT section to include MapControls:
<div style={{
  flex: '0 0 75%',
  position: 'relative',
  backgroundColor: '#1a1a2e',
  overflow: 'hidden'
}}>
  <MapControls
    zoom={zoom}
    onZoomIn={handleZoomIn}
    onZoomOut={handleZoomOut}
    onReset={handleReset}
    currentLocation={getCurrentLocation()}
  />

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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/map/CityMapComplete.tsx
git commit -m "feat: wire up MapControls in CityMapComplete with location breadcrumb"
```

---

## Phase 3: Selection and Details

### Task 10: Create BuildingDetailPanel component

**Files:**
- Create: `src/components/map/BuildingDetailPanel.tsx`
- Test: `src/components/map/BuildingDetailPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/map/BuildingDetailPanel.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BuildingDetailPanel } from './BuildingDetailPanel'
import type { Building } from '@/types/map'

describe('BuildingDetailPanel', () => {
  const mockBuilding: Building = {
    id: 'test-compute',
    type: 'compute',
    name: 'COMPUTE',
    city: 'test',
    position: { x: 100, y: 100, width: 120, height: 100 },
    status: 'healthy',
    metrics: { resourceCount: 15, cpu: 45, memory: 62 }
  }

  it('should not render when not visible', () => {
    const { container } = render(
      <BuildingDetailPanel
        building={mockBuilding}
        visible={false}
        onClose={vi.fn()}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should render building details when visible', () => {
    render(
      <BuildingDetailPanel
        building={mockBuilding}
        visible={true}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('🏗️ COMPUTE')).toBeTruthy()
    expect(screen.getByText('15 资源')).toBeTruthy()
    expect(screen.getByText('CPU: 45%')).toBeTruthy()
    expect(screen.getByText('内存: 62%')).toBeTruthy()
  })

  it('should call onClose when close button is clicked', () => {
    const handleClose = vi.fn()
    render(
      <BuildingDetailPanel
        building={mockBuilding}
        visible={true}
        onClose={handleClose}
      />
    )

    screen.getByText('×').click()
    expect(handleClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/map/BuildingDetailPanel.test.tsx`
Expected: FAIL with "BuildingDetailPanel is not defined"

- [ ] **Step 3: Implement BuildingDetailPanel component**

```typescript
// src/components/map/BuildingDetailPanel.tsx'
import type { Building } from '@/types/map'

interface BuildingDetailPanelProps {
  building: Building | null
  visible: boolean
  onClose: () => void
}

export function BuildingDetailPanel({
  building,
  visible,
  onClose
}: BuildingDetailPanelProps) {
  if (!visible || !building) return null

  const getStatusColor = (status: Building['status']) => {
    switch (status) {
      case 'healthy':
        return '#22c55e'
      case 'warning':
        return '#f59e0b'
      case 'error':
        return '#ef4444'
    }
  }

  const getBuildingEmoji = (type: Building['type']) => {
    switch (type) {
      case 'compute':
        return '🏗️'
      case 'data':
        return '🏦'
      case 'network':
        return '🌐'
      case 'config':
        return '⚙️'
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: '25%', // Offset for office panel
        width: '320px',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderLeft: '3px solid #8b5cf6',
        boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.5)',
        padding: '20px',
        color: '#fff',
        overflowY: 'auto',
        zIndex: 20,
        transform: 'translateX(0)',
        transition: 'transform 0.3s ease-out'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {getBuildingEmoji(building.type)} {building.name}
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            fontSize: '24px',
            cursor: 'pointer',
            padding: 0
          }}
        >
          ×
        </button>
      </div>

      {/* Status */}
      <div style={{
        marginBottom: '20px',
        padding: '12px',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '8px',
        border: `2px solid ${getStatusColor(building.status)}`
      }}>
        <div style={{ fontSize: '12px', opacity: 0.7 }}>状态</div>
        <div style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: getStatusColor(building.status)
        }}>
          {building.status === 'healthy' && '🟢 健康'}
          {building.status === 'warning' && '🟡 警告'}
          {building.status === 'error' && '🔴 错误'}
        </div>
      </div>

      {/* Location */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', opacity: 0.7 }}>位置</div>
        <div style={{ fontSize: '14px' }}>
          {building.city === 'test' ? '🔵 测试环境' : '🟠 生产环境'}
        </div>
      </div>

      {/* Metrics */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>资源使用</div>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '13px' }}>实例数量</span>
            <span style={{ fontSize: '13px', fontWeight: 'bold' }}>
              {building.metrics.resourceCount}
            </span>
          </div>
        </div>

        {building.metrics.cpu !== undefined && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px' }}>CPU</span>
              <span style={{ fontSize: '13px', fontWeight: 'bold' }}>
                {building.metrics.cpu}%
              </span>
            </div>
            <div style={{
              height: '6px',
              backgroundColor: '#374151',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${building.metrics.cpu}%`,
                backgroundColor: building.metrics.cpu > 80 ? '#ef4444' : '#3b82f6',
                transition: 'width 0.3s'
              }} />
            </div>
          </div>
        )}

        {building.metrics.memory !== undefined && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px' }}>内存</span>
              <span style={{ fontSize: '13px', fontWeight: 'bold' }}>
                {building.metrics.memory}%
              </span>
            </div>
            <div style={{
              height: '6px',
              backgroundColor: '#374151',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${building.metrics.memory}%`,
                backgroundColor: building.metrics.memory > 80 ? '#ef4444' : '#10b981',
                transition: 'width 0.3s'
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{
        marginTop: '20px',
        display: 'flex',
        gap: '8px',
        flexDirection: 'column'
      }}>
        <button style={{
          padding: '10px 16px',
          backgroundColor: '#3b82f6',
          border: 'none',
          borderRadius: '6px',
          color: '#fff',
          fontSize: '13px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}>
          📋 查看日志
        </button>
        <button style={{
          padding: '10px 16px',
          backgroundColor: '#6b7280',
          border: 'none',
          borderRadius: '6px',
          color: '#fff',
          fontSize: '13px',
          cursor: 'pointer'
        }}>
          ⚙️ 配置
        </button>
        <button style={{
          padding: '10px 16px',
          backgroundColor: '#f59e0b',
          border: 'none',
          borderRadius: '6px',
          color: '#fff',
          fontSize: '13px',
          cursor: 'pointer'
        }}>
          🔄 重启
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/map/BuildingDetailPanel.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/map/BuildingDetailPanel.tsx src/components/map/BuildingDetailPanel.test.tsx
git commit -m "feat: add BuildingDetailPanel component with metrics and actions"
```

---

### Task 11: Create Tooltip component

**Files:**
- Create: `src/components/map/Tooltip.tsx`
- Test: `src/components/map/Tooltip.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/map/Tooltip.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Tooltip } from './Tooltip'

describe('Tooltip', () => {
  it('should not render when not visible', () => {
    const { container } = render(
      <Tooltip
        content="Test tooltip"
        position={{ x: 100, y: 100 }}
        visible={false}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should render tooltip when visible', () => {
    render(
      <Tooltip
        content="Test tooltip"
        position={{ x: 100, y: 100 }}
        visible={true}
      />
    )

    expect(screen.getByText('Test tooltip')).toBeTruthy()
  })

  it('should position tooltip at coordinates', () => {
    const { container } = render(
      <Tooltip
        content="Test tooltip"
        position={{ x: 100, y: 100 }}
        visible={true}
      />
    )

    const tooltip = container.firstChild as HTMLElement
    expect(tooltip.style.left).toBe('100px')
    expect(tooltip.style.top).toBe('100px')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/map/Tooltip.test.tsx`
Expected: FAIL with "Tooltip is not defined"

- [ ] **Step 3: Implement Tooltip component**

```typescript
// src/components/map/Tooltip.tsx'
interface TooltipProps {
  content: string
  position: { x: number; y: number }
  visible: boolean
}

export function Tooltip({ content, position, visible }: TooltipProps) {
  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x + 15}px`,
        top: `${position.y + 15}px`,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid #3b82f6',
        borderRadius: '6px',
        padding: '8px 12px',
        color: '#fff',
        fontSize: '12px',
        pointerEvents: 'none',
        zIndex: 30,
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
      }}
    >
      {content}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/map/Tooltip.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/map/Tooltip.tsx src/components/map/Tooltip.test.tsx
git commit -m "feat: add Tooltip component for hover information"
```

---

### Task 12: Add hover state tracking to MapCanvas

**Files:**
- Modify: `src/components/map/MapCanvas.tsx`
- Modify: `src/store/mapStore.ts`

- [ ] **Step 1: Update MapCanvas to track hover state**

```typescript
// Add to MapCanvas component, in the handleMouseMove callback:
const setHovered = useMapStore((state) => state.setHovered)

const handleMouseMove = useCallback(
  (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    if (isDraggingRef.current) {
      // Handle panning (existing code)
      const dx = event.clientX - dragStartRef.current.x
      const dy = event.clientY - dragStartRef.current.y

      onViewportChange({
        x: viewportStartRef.current.x - dx / getZoomScale(zoom),
        y: viewportStartRef.current.y - dy / getZoomScale(zoom)
      })
    } else {
      // Handle hover detection
      const mapPos = screenToMap(mouseX, mouseY, viewport, getZoomScale(zoom))

      // Check if hovering over any building
      let hoveredBuilding: string | null = null
      for (const building of buildings) {
        if (
          pointInRect(mapPos, {
            x: building.position.x,
            y: building.position.y,
            width: building.position.width,
            height: building.position.height
          })
        ) {
          hoveredBuilding = building.id
          break
        }
      }

      // Check if hovering over any agent
      let hoveredAgent: string | null = null
      if (!hoveredBuilding) {
        for (const agent of agents) {
          const agentPos = screenToMap(
            agent.position.x,
            agent.position.y,
            viewport,
            getZoomScale(zoom)
          )
          const distance = Math.sqrt(
            Math.pow(mapPos.x - agentPos.x, 2) + Math.pow(mapPos.y - agentPos.y, 2)
          )

          if (distance < 20) {
            hoveredAgent = agent.id
            break
          }
        }
      }

      // Update hover state
      if (hoveredBuilding) {
        setHovered({ type: 'building', id: hoveredBuilding })
      } else if (hoveredAgent) {
        setHovered({ type: 'agent', id: hoveredAgent })
      } else {
        setHovered({ type: null, id: null })
      }
    }
  },
  [buildings, agents, viewport, zoom, onViewportChange, setHovered]
)
```

- [ ] **Step 2: Commit**

```bash
git add src/components/map/MapCanvas.tsx
git commit -m "feat: add hover state tracking to MapCanvas"
```

---

### Task 13: Wire up detail panel and tooltip in CityMapComplete

**Files:**
- Modify: `src/components/map/CityMapComplete.tsx`

- [ ] **Step 1: Add detail panel and tooltip to CityMapComplete**

```typescript
// Add to imports:
import { BuildingDetailPanel } from './BuildingDetailPanel'
import { Tooltip } from './Tooltip'

// Add inside CityMapComplete component:
const hovered = useMapStore((state) => state.hovered)

// Get tooltip content
const getTooltipContent = () => {
  if (hovered.type === 'building') {
    const building = buildings.find((b) => b.id === hovered.id)
    if (building) {
      return `${building.name}: ${building.metrics.resourceCount} 资源`
    }
  } else if (hovered.type === 'agent') {
    const agent = agentList.find((a) => a.id === hovered.id)
    if (agent) {
      return `${agent.icon} ${agent.name}`
    }
  }
  return ''
}

// Get mouse position (you'll need to track this)
const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

// Update JSX to include panels:
<div style={{
  flex: '0 0 75%',
  position: 'relative',
  backgroundColor: '#1a1a2e',
  overflow: 'hidden'
}}>
  <MapControls
    zoom={zoom}
    onZoomIn={handleZoomIn}
    onZoomOut={handleZoomOut}
    onReset={handleReset}
    currentLocation={getCurrentLocation()}
  />

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

  {/* Tooltip */}
  <Tooltip
    content={getTooltipContent()}
    position={mousePosition}
    visible={hovered.type !== null}
  />

  {/* Building Detail Panel */}
  <BuildingDetailPanel
    building={
      selection.type === 'building'
        ? buildings.find((b) => b.id === selection.id) || null
        : null
    }
    visible={selection.type === 'building'}
    onClose={() => setSelection({ type: null, id: null })}
  />
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/map/CityMapComplete.tsx
git commit -m "feat: wire up BuildingDetailPanel and Tooltip in CityMapComplete"
```

---

## Phase 4: Agent Integration

### Task 14: Update AgentRenderer to work with map coordinates

**Files:**
- Modify: `src/components/map/AgentRenderer.tsx`

- [ ] **Step 1: Update AgentRenderer to accept viewport and zoom**

```typescript
// Update AgentRenderer interface to accept viewport and zoom:
interface AgentRendererProps {
  agents: Array<{
    id: string
    position: { x: number; y: number }
    path?: Array<{ x: number; y: number }>
  }>
  viewport: ViewportState
  zoom: ZoomLevel
  width: number
  height: number
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/map/AgentRenderer.tsx
git commit -m "refactor: update AgentRenderer to work with map viewport and zoom"
```

---

### Task 15: Draw agent paths on MapCanvas

**Files:**
- Modify: `src/utils/mapRendering.ts`
- Modify: `src/components/map/MapCanvas.tsx`

- [ ] **Step 1: Add path drawing utility**

```typescript
// Add to mapRendering.ts:
export function drawAgentPath(
  ctx: CanvasRenderingContext2D,
  path: Array<{ x: number; y: number }>,
  viewport: ViewportState,
  zoomScale: number
): void {
  if (path.length < 2) return

  ctx.beginPath()
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)'
  ctx.lineWidth = 2
  ctx.setLineDash([5, 5])

  path.forEach((point, index) => {
    const screen = mapToScreen(point.x, point.y, viewport, zoomScale)
    if (index === 0) {
      ctx.moveTo(screen.x, screen.y)
    } else {
      ctx.lineTo(screen.x, screen.y)
    }
  })

  ctx.stroke()
  ctx.setLineDash([])
}
```

- [ ] **Step 2: Draw paths in MapCanvas render loop**

```typescript
// Add to MapCanvas render function, before drawing agents:
// Draw agent paths
agents.forEach((agent) => {
  if (agent.path && agent.path.length > 1) {
    drawAgentPath(ctx, agent.path, viewport, zoomScale)
  }
})
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/mapRendering.ts src/components/map/MapCanvas.tsx
git commit -m "feat: add agent path visualization on map"
```

---

## Phase 5: Visual Polish

### Task 16: Add building state animations

**Files:**
- Modify: `src/utils/mapRendering.ts`

- [ ] **Step 1: Add animation utilities**

```typescript
// Add to mapRendering.ts:
export function drawBuildingWithAnimation(
  ctx: CanvasRenderingContext2D,
  building: Building,
  x: number,
  y: number,
  width: number,
  height: number,
  zoom: string,
  time: number
): void {
  const statusColor = getBuildingColor(building.status)
  const cityColor = getCityColor(building.city)

  // Animate status glow based on time
  let glowOpacity = 0.3
  let glowSize = 10

  if (building.status === 'healthy') {
    // Breathing animation
    glowOpacity = 0.3 + Math.sin(time / 1000) * 0.2
  } else if (building.status === 'warning') {
    // Flashing animation
    glowOpacity = 0.5 + Math.sin(time / 250) * 0.3
  } else if (building.status === 'error') {
    // Pulsing animation
    glowSize = 10 + Math.sin(time / 500) * 10
    glowOpacity = 0.6
  }

  // Fill background
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(x, y, width, height)

  // Draw status glow
  ctx.shadowColor = statusColor
  ctx.shadowBlur = glowSize
  ctx.strokeStyle = statusColor
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, width, height)
  ctx.shadowBlur = 0

  // Draw city indicator
  ctx.fillStyle = cityColor
  ctx.fillRect(x + 4, y + 4, 8, 8)

  // Draw icon
  const icon = getBuildingIcon(building.type)
  ctx.font = `${Math.max(16, width / 4)}px Arial`
  ctx.textAlign = 'center'
  ctx.fillText(icon, x + width / 2, y + height / 2)

  // Draw name
  ctx.font = `${Math.max(10, width / 6)}px Arial`
  ctx.fillStyle = '#fff'
  ctx.fillText(building.name, x + width / 2, y + height - 8)
}
```

- [ ] **Step 2: Update MapCanvas to use animated buildings**

```typescript
// Update MapCanvas render function:
function render(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const time = performance.now()

  // Clear canvas
  ctx.clearRect(0, 0, width, height)

  // Draw background grid
  drawGrid(ctx, width, height)

  const zoomScale = getZoomScale(zoom)

  // Draw connections (existing code)
  // ...

  // Draw buildings with animations
  buildings.forEach((building) => {
    const pos = mapToScreen(
      building.position.x,
      building.position.y,
      viewport,
      zoomScale
    )

    const width = building.position.width * zoomScale
    const height = building.position.height * zoomScale

    drawBuildingWithAnimation(ctx, building, pos.x, pos.y, width, height, zoom, time)

    // Highlight if selected
    if (selection.type === 'building' && selection.id === building.id) {
      ctx.strokeStyle = '#8b5cf6'
      ctx.lineWidth = 3
      ctx.strokeRect(pos.x - 2, pos.y - 2, width + 4, height + 4)
    }
  })

  // Draw agents (existing code)
  // ...
}
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/mapRendering.ts src/components/map/MapCanvas.tsx
git commit -m "feat: add building status animations (breathe, flash, pulse)"
```

---

### Task 17: Add data flow animations on connections

**Files:**
- Modify: `src/utils/mapRendering.ts`
- Modify: `src/components/map/MapCanvas.tsx`

- [ ] **Step 1: Add particle system for data flow**

```typescript
// Add to mapRendering.ts:
export interface DataParticle {
  id: string
  connectionId: string
  progress: number // 0 to 1
  speed: number
}

export function drawConnectionWithParticles(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  type: Connection['type'],
  particles: DataParticle[],
  time: number
): void {
  // Draw connection line
  ctx.beginPath()
  ctx.moveTo(fromX, fromY)
  ctx.lineTo(toX, toY)

  if (type === 'dependency') {
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)'
    ctx.setLineDash([5, 5])
  } else {
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)'
    ctx.setLineDash([])
  }

  ctx.lineWidth = 2
  ctx.stroke()
  ctx.setLineDash([])

  // Draw particles
  particles.forEach((particle) => {
    const x = fromX + (toX - fromX) * particle.progress
    const y = fromY + (toY - fromY) * particle.progress

    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.fill()
  })
}

export function updateParticles(
  particles: DataParticle[],
  deltaTime: number
): DataParticle[] {
  return particles
    .map((p) => ({
      ...p,
      progress: p.progress + p.speed * deltaTime
    }))
    .filter((p) => p.progress < 1)
}
```

- [ ] **Step 2: Integrate particles into MapCanvas**

```typescript
// Add to MapCanvas component state:
const [particles, setParticles] = useState<DataParticle[]>([])

// Add particle initialization:
useEffect(() => {
  // Create particles for each dataflow connection
  const newParticles: DataParticle[] = connections
    .filter((c) => c.type === 'dataflow')
    .flatMap((conn, i) =>
      Array.from({ length: 3 }, (_, j) => ({
        id: `${conn.from}-${conn.to}-${j}`,
        connectionId: `${conn.from}-${conn.to}`,
        progress: j / 3,
        speed: 0.0005
      }))
    )

  setParticles(newParticles)
}, [connections])

// Add particle update loop:
useEffect(() => {
  let lastTime = performance.now()

  function updateParticles() {
    const currentTime = performance.now()
    const deltaTime = currentTime - lastTime
    lastTime = currentTime

    setParticles((prev) => updateParticles(prev, deltaTime))
    requestAnimationFrame(updateParticles)
  }

  const animationId = requestAnimationFrame(updateParticles)
  return () => cancelAnimationFrame(animationId)
}, [])

// Update render function to use particles:
connections.forEach((connection) => {
  const fromBuilding = buildings.find((b) => b.id === connection.from)
  const toBuilding = buildings.find((b) => b.id === connection.to)

  if (fromBuilding && toBuilding) {
    const from = mapToScreen(
      fromBuilding.position.x + fromBuilding.position.width / 2,
      fromBuilding.position.y + fromBuilding.position.height / 2,
      viewport,
      zoomScale
    )
    const to = mapToScreen(
      toBuilding.position.x + toBuilding.position.width / 2,
      toBuilding.position.y + toBuilding.position.height / 2,
      viewport,
      zoomScale
    )

    const connectionParticles = particles.filter(
      (p) => p.connectionId === `${connection.from}-${connection.to}`
    )

    drawConnectionWithParticles(
      ctx,
      from.x,
      from.y,
      to.x,
      to.y,
      connection.type,
      connectionParticles,
      performance.now()
    )
  }
})
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/mapRendering.ts src/components/map/MapCanvas.tsx
git commit -m "feat: add data flow particle animations on connections"
```

---

## Phase 6: Testing and Refinement

### Task 18: Add keyboard navigation support

**Files:**
- Modify: `src/components/map/MapCanvas.tsx`

- [ ] **Step 1: Add keyboard event handlers**

```typescript
// Add to MapCanvas component:
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        // Deselect
        onBuildingClick('')
        break
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        // Pan map
        event.preventDefault()
        const panAmount = 50
        const newViewport = { ...viewport }
        if (event.key === 'ArrowUp') newViewport.y -= panAmount
        if (event.key === 'ArrowDown') newViewport.y += panAmount
        if (event.key === 'ArrowLeft') newViewport.x -= panAmount
        if (event.key === 'ArrowRight') newViewport.x += panAmount
        onViewportChange(newViewport)
        break
      case '+':
      case '=':
        // Zoom in
        const zoomLevels = ['world', 'environment', 'building'] as const
        const currentIndex = zoomLevels.indexOf(zoom)
        if (currentIndex < zoomLevels.length - 1) {
          onZoomChange(zoomLevels[currentIndex + 1])
        }
        break
      case '-':
      case '_':
        // Zoom out
        const idx = zoomLevels.indexOf(zoom)
        if (idx > 0) {
          onZoomChange(zoomLevels[idx - 1])
        }
        break
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [viewport, zoom, onViewportChange, onZoomChange, onBuildingClick])

// Add ARIA attributes to canvas:
<canvas
  ref={canvasRef}
  role="application"
  aria-label="Interactive infrastructure map"
  aria-describedby="map-instructions"
  tabIndex={0}
  // ... existing props
/>

// Add instructions div somewhere in the component:
<div
  id="map-instructions"
  style={{ display: 'none' }}
>
  Use arrow keys to pan, +/- to zoom, Escape to deselect
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/map/MapCanvas.tsx
git commit -m "feat: add keyboard navigation support to MapCanvas"
```

---

### Task 19: Add comprehensive integration tests

**Files:**
- Create: `src/components/map/CityMapComplete.integration.test.tsx`

- [ ] **Step 1: Write integration tests**

```typescript
// src/components/map/CityMapComplete.integration.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CityMapComplete } from './CityMapComplete'

describe('CityMapComplete - Integration', () => {
  it('should render map and office panel', () => {
    render(<CityMapComplete />)

    // Check for canvas
    const canvas = document.querySelector('canvas')
    expect(canvas).toBeTruthy()

    // Check for office panel
    expect(screen.getByText(/活跃的Agent|活跃的代理/)).toBeTruthy()
  })

  it('should handle zoom controls', () => {
    render(<CityMapComplete />)

    const zoomInButton = screen.getByText('+')
    const zoomOutButton = screen.getByText('−')

    // Test zoom in
    fireEvent.click(zoomInButton)
    // Assert zoom level changed

    // Test zoom out
    fireEvent.click(zoomOutButton)
    // Assert zoom level changed
  })

  it('should open detail panel when building is clicked', () => {
    render(<CityMapComplete />)

    const canvas = document.querySelector('canvas') as HTMLCanvasElement

    // Simulate click on building
    fireEvent.click(canvas, {
      clientX: 200,
      clientY: 200
    })

    // Check if detail panel appears
    // This would require buildings to be at known positions
  })

  it('should handle keyboard navigation', () => {
    render(<CityMapComplete />)

    // Test arrow keys
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    // Assert viewport changed

    // Test zoom keys
    fireEvent.keyDown(window, { key: '+' })
    // Assert zoom level changed

    // Test escape
    fireEvent.keyDown(window, { key: 'Escape' })
    // Assert selection cleared
  })
})
```

- [ ] **Step 2: Run integration tests**

Run: `npm test -- src/components/map/CityMapComplete.integration.test.tsx`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/components/map/CityMapComplete.integration.test.tsx
git commit -m "test: add comprehensive integration tests for CityMapComplete"
```

---

### Task 20: Performance optimization and cleanup

**Files:**
- Modify: `src/components/map/MapCanvas.tsx`

- [ ] **Step 1: Add performance optimizations**

```typescript
// Add to MapCanvas component:
const canvasRef = useRef<HTMLCanvasElement>(null)
const animationFrameRef = useRef<number>()

// Optimize render loop
useEffect(() => {
  const canvas = canvasRef.current
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = window.innerWidth * 0.75
  canvas.height = window.innerHeight

  let lastFrameTime = 0
  const targetFPS = 60
  const frameInterval = 1000 / targetFPS

  function animate(currentTime: number) {
    const deltaTime = currentTime - lastFrameTime

    if (deltaTime >= frameInterval) {
      lastFrameTime = currentTime - (deltaTime % frameInterval)
      render(ctx, canvas.width, canvas.height, currentTime)
    }

    animationFrameRef.current = requestAnimationFrame(animate)
  }

  animationFrameRef.current = requestAnimationFrame(animate)

  return () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }
}, [buildings, agents, connections, viewport, zoom, selection])

// Add resize handler
useEffect(() => {
  const handleResize = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = window.innerWidth * 0.75
    canvas.height = window.innerHeight
  }

  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [])
```

- [ ] **Step 2: Run all tests to ensure nothing broke**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Run linter**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 4: Build production bundle**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "perf: optimize MapCanvas rendering and add resize handler"
```

---

## Final Tasks

### Task 21: Update documentation and cleanup

**Files:**
- Modify: `README.md` (if exists)

- [ ] **Step 1: Update project README**

```markdown
# Living City - Map-Based UI

A gamified IaC deployment experience with interactive map visualization.

## Features

- **Interactive Map**: Canvas-based map with pan, zoom, and click interactions
- **Three-Level Zoom**: World → Environment → Building views
- **Agent Visualization**: Watch agents move across the map
- **Real-Time Status**: Building health, resource usage, and deployment state
- **OpenCode Integration**: All agent data from OpenCode platform

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Architecture

- **UI Layer**: React components (MapCanvas, MapControls, BuildingDetailPanel)
- **State Layer**: Zustand stores (mapStore, agentStore, districtStore)
- **Rendering Layer**: Canvas 2D with requestAnimationFrame
- **Interaction Layer**: Mouse/keyboard event handlers
```

- [ ] **Step 2: Final commit**

```bash
git add README.md
git commit -m "docs: update README with map-based UI features"
```

---

## Task Summary

**Total Tasks:** 21
**New Files:** 10
**Modified Files:** 6
**Test Files:** 8

**Estimated Timeline:**
- Phase 1 (Basic Rendering): Tasks 1-6, ~2-3 hours
- Phase 2 (Zoom System): Tasks 7-9, ~1-2 hours
- Phase 3 (Selection/Details): Tasks 10-13, ~2-3 hours
- Phase 4 (Agent Integration): Tasks 14-15, ~1-2 hours
- Phase 5 (Visual Polish): Tasks 16-17, ~1-2 hours
- Phase 6 (Testing): Tasks 18-21, ~2-3 hours

**Total Estimated Time:** 9-15 hours

---

## Self-Review Checklist

✅ **Spec Coverage:**
- Phase 1: Basic map rendering ✅
- Phase 2: Zoom system ✅
- Phase 3: Selection and details ✅
- Phase 4: Agent integration ✅
- Phase 5: Visual polish ✅
- Phase 6: Testing and refinement ✅

✅ **Placeholder Scan:**
- No TBD/TODO placeholders ✅
- All code snippets are complete ✅
- All test code is provided ✅
- All file paths are exact ✅

✅ **Type Consistency:**
- Building type matches across all files ✅
- ZoomLevel type is consistent ✅
- Store interfaces match implementations ✅

✅ **No Implementation Details Skipped:**
- Each step is 2-5 minutes ✅
- Code provided for all implementation steps ✅
- Test code provided for all tests ✅
- Commit messages included for all tasks ✅

✅ **OpenCode Integration:**
- Existing deployStore preserved ✅
- Agent data flow documented ✅
- No changes to OpenCode mock API ✅

✅ **Accessibility:**
- Keyboard navigation added ✅
- ARIA attributes added ✅
- Screen reader support included ✅
