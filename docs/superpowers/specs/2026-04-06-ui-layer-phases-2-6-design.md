# UI Layer Phases 2-6 Design Specification

**Date:** 2026-04-06
**Status:** Approved
**Related Specs:**
- [Living City Map-Based UI Design](./2026-04-06-living-city-map-based-ui-design.md)
- [Living City Map-Based UI Implementation Plan](../plans/2026-04-06-living-city-map-based-ui-implementation.md)
- [OpenCode Integration Blueprint](./2026-04-06-opencode-integration-blueprint.md)

---

## Overview

This document details the design for the remaining 15 tasks of the Living City map-based UI implementation (Phases 2-6). Phase 1 (6 tasks) has been completed.

**Core Principles:**
- Execute phases in strict order: Phase 2 → 3 → 4 → 5 → 6
- Use existing deployStore mock data (no runtime layer yet)
- Design for future Runtime layer integration (without implementing it)
- Each phase is independently testable

**Data Source:**
- All components consume from `deployStore` (changes, runs, resources, workshop, ledger)
- `mapStore` manages viewport/zoom/selection/hover state
- No runtime layer integration in these phases (delegated to separate agent)

---

## Phase 2: Zoom System (Tasks 7-9)

### Goal

Create a comprehensive zoom and viewport control system with rich interaction capabilities.

### Task 7: MapControls Component

**File:** `src/components/map/MapControls.tsx`

**Component Structure:**

```
MapControls (Container)
├── ZoomButtons (+/- buttons)
├── ZoomLevelIndicator (Current zoom: World/Environment/Building)
├── ZoomSlider (Range input)
├── ResetButton (Reset to initial view)
├── MiniMap (Small overview map)
├── KeyboardShortcuts (Shortcut reference)
└── PresetViews (Test/Prod/All buttons)
```

**UI Layout:**

```
┌─────────────────────────────────┐
│  Map Canvas (Main map)           │
│                                 │
│  ┌──────┐                       │
│  │ Mini│  ┌───┐ ┌─┐ ┌───┐      │
│  │ Map │  │ + │ │●│ │ - │      │
│  │     │  └───┘ └─┘ └───┘      │
│  └──────┘  [Reset View]         │
│                                 │
│  Presets: [Test] [Prod] [All]   │
│                                 │
│  Shortcuts: +/- zoom, Drag pan  │
└─────────────────────────────────┘
```

**Positioning:**
- Fixed position overlay on map
- Top-left corner (MiniMap)
- Top-right corner (Zoom controls)
- Bottom-left corner (Presets & Shortcuts)

**Data Flow:**

```typescript
interface MapControlsProps {
  // From mapStore
  viewport: ViewportState
  zoom: ZoomLevel
  selection: SelectionState

  // Actions
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomToLevel: (level: ZoomLevel) => void
  onResetView: () => void
  onPresetView: (preset: 'test' | 'prod' | 'all') => void
}
```

**MiniMap Implementation:**

```typescript
interface MiniMapProps {
  buildings: Building[]
  viewport: ViewportState
  zoom: ZoomLevel
  onViewportChange: (newViewport: Partial<ViewportState>) => void
}

// MiniMap features:
// - Separate Canvas (200x150px)
// - Scaled down version of all buildings
// - Rectangle showing current viewport bounds
// - Click to jump to that location
// - Update on pan/zoom
```

**ZoomSlider:**

```typescript
// Maps zoom levels to slider values:
const ZOOM_SLIDER_MAP = {
  'world': 0,      // value: 0
  'environment': 50, // value: 50
  'building': 100    // value: 100
}

// Continuous zoom not supported - discrete levels only
// Slider snaps to these values
```

**PresetViews:**

```typescript
const PRESET_VIEWPORTS = {
  'test': {
    centerX: 250,  // Test city center
    centerY: 400,
    zoom: 'environment'
  },
  'prod': {
    centerX: 650,  // Prod city center
    centerY: 400,
    zoom: 'environment'
  },
  'all': {
    centerX: 450,  // Midpoint
    centerY: 300,
    zoom: 'world'
  }
}
```

### Task 8: Smooth Zoom Transitions

**File:** `src/utils/mapAnimations.ts`

**Animation State Machine:**

```typescript
type AnimationState = 'IDLE' | 'ZOOMING'

interface ZoomAnimation {
  fromScale: number
  toScale: number
  startTime: number
  duration: number  // milliseconds
  centerX: number   // Zoom point (screen coords)
  centerY: number
}
```

**Implementation:**

```typescript
export function animateZoomTransition(
  currentViewport: ViewportState,
  targetZoom: ZoomLevel,
  duration: number = 2000  // 2 seconds
): AnimationFrameCallback {
  const startScale = getZoomScale(currentViewport.zoom)
  const targetScale = getZoomScale(targetZoom)
  const startTime = performance.now()

  return function frame(time: number) {
    const elapsed = time - startTime
    const progress = Math.min(elapsed / duration, 1.0)

    // Easing function (ease-out-cubic)
    const eased = 1 - Math.pow(1 - progress, 3)

    const currentScale = startScale + (targetScale - startScale) * eased

    // Update viewport with interpolated scale
    // ... calculate new viewport offset to keep zoom center stable

    if (progress < 1.0) {
      requestAnimationFrame(frame)
    } else {
      // Animation complete
      setZoom(targetZoom)
    }
  }
}
```

**Cancellation:**

```typescript
// If user interrupts (scrolls/clicks), cancel animation
let currentAnimation: AnimationFrameCallback | null = null

function cancelCurrentAnimation() {
  if (currentAnimation) {
    cancelAnimationFrame(currentAnimation)
    currentAnimation = null
  }
}
```

**UI Feedback:**

- Zoom level indicator updates during animation
- MapCanvas renders at interpolated scale each frame
- User interaction (scroll/drag) cancels animation

### Task 9: Wire Up MapControls

**File:** `src/components/map/CityMapComplete.tsx`

**Integration:**

```typescript
export function CityMapComplete() {
  // ... existing code

  const viewport = useMapStore((s) => s.viewport)
  const zoom = useMapStore((s) => s.zoom)
  const setViewport = useMapStore((s) => s.setViewport)
  const setZoom = useMapStore((s) => s.setZoom)
  const resetView = useMapStore((s) => s.resetView)

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      {/* LEFT: Map Area (75%) */}
      <div style={{ flex: '0 0 75%', position: 'relative' }}>
        <MapCanvas
          buildings={buildings}
          agents={agentList}
          connections={connections}
          viewport={viewport}
          zoom={zoom}
          selection={selection}
          onViewportChange={setViewport}
          onZoomChange={setZoom}
        />

        {/* NEW: MapControls overlay */}
        <MapControls
          viewport={viewport}
          zoom={zoom}
          selection={selection}
          onZoomIn={() => setZoom(getNextZoomLevel(zoom))}
          onZoomOut={() => setZoom(getPrevZoomLevel(zoom))}
          onZoomToLevel={setZoom}
          onResetView={resetView}
          onPresetView={(preset) => {
            const presetViewport = PRESET_VIEWPORTS[preset]
            setViewport(presetViewport)
            setZoom(presetViewport.zoom)
          }}
        />
      </div>

      {/* RIGHT: Office Panel (25%) */}
      <AgentOfficePanel onOpenLedger={() => console.log('Open ledger')} />
    </div>
  )
}
```

**Z-Index Management:**

```css
/* MapControls overlay on top of MapCanvas */
.MapControls {
  position: absolute;
  z-index: 10;
  pointer-events: auto;  /* Allow clicks */
}

.MapCanvas {
  z-index: 1;
}
```

---

## Phase 3: Selection and Details (Tasks 10-13)

### Goal

Implement interactive selection system with detail panels and tooltips for exploring map entities.

### Task 10: BuildingDetailPanel Component

**File:** `src/components/map/BuildingDetailPanel.tsx`

**Component Structure:**

```
BuildingDetailPanel (Side drawer, hidden by default)
├── Header (Building name + type icon + status badge + close button)
├── BasicInfo Card
│   ├── Status indicator (healthy/warning/error)
│   ├── Resource count
│   └── Linked change title
├── ResourceList Table
│   ├── Resource type
│   ├── Resource name
│   ├── Action (create/update/delete)
│   ├── Risk tags (delete/iam/network/data/blast_radius)
│   └── Cost delta (USD/month)
├── WorkshopStatus (if change is in workshop)
│   ├── Drift status (changed/missing/extra)
│   ├── Step progress (select/scan/generate/preview/complete)
│   └── Artifact summary
└── Action Buttons
    ├── ViewChangeDetails
    ├── OpenWorkshop
    └── ViewLogs
```

**UI Layout:**

```
┌─────────────────────────────────────────────┐
│ ☰  Building Details                    [×] │
├─────────────────────────────────────────────┤
│ 🏢 test-compute (Compute)                    │
│ Status: ● Healthy | Resources: 5             │
│ Linked: "Prod: 开启WAF与限流策略"            │
├─────────────────────────────────────────────┤
│ Resources (5)                                │
│ ┌─────────────────────────────────────────┐ │
│ │ Type    │ Name     │ Action │ Risk │ $  │ │
│ │ WAF     │ edge_waf │ Create │ 🔴   │ 52 │ │
│ │ CloudFr │ cdn_main │ Update │ 🟡   │ 8  │ │
│ │ SSM     │ rate_lmt │ Update │      │ 0  │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ Workshop: Scan (完成)                        │
│ Drift: 2 changed, 1 extra                    │
│ Artifact: Patch (3 files)                    │
├─────────────────────────────────────────────┤
│ [View Change] [Open Workshop] [View Logs]    │
└─────────────────────────────────────────────┘
```

**Positioning:**

```css
/* Right-side drawer */
.BuildingDetailPanel {
  position: fixed;
  right: -400px;  /* Hidden by default */
  top: 0;
  width: 400px;
  height: 100vh;
  background: #0f172a;
  border-left: 2px solid #8b5cf6;
  transition: right 0.3s ease-in-out;
  z-index: 100;
  overflow-y: auto;
}

.BuildingDetailPanel.open {
  right: 25%;  /* Slide in, stop at office panel */
}
```

**Data Flow:**

```typescript
interface BuildingDetailPanelProps {
  buildingId: string | null
  onClose: () => void
}

// Consumes from:
// - mapStore: selection.buildingId
// - deployStore: changes, workshop, resources, inventory
```

**Implementation:**

```typescript
export function BuildingDetailPanel({ buildingId, onClose }: Props) {
  const selection = useMapStore((s) => s.selection)
  const changes = useDeployStore((s) => s.changes)

  // Find building and associated data
  const building = buildings.find(b => b.id === buildingId)
  const linkedChange = changes.find(c =>
    c.resources.some(r => isResourceInBuilding(r, building))
  )

  if (!building) return null

  return (
    <aside className={`BuildingDetailPanel ${selection.buildingId === buildingId ? 'open' : ''}`}>
      <header>
        <button onClick={onClose}>✕</button>
        <h2>{building.icon} {building.name}</h2>
        <span className={`status status-${building.status}`}>
          {building.status}
        </span>
      </header>

      <BasicInfo building={building} linkedChange={linkedChange} />
      <ResourceList resources={linkedChange?.resources || []} />
      {linkedChange?.workshop && <WorkshopStatus workshop={linkedChange.workshop} />}
      <ActionButtons change={linkedChange} />
    </aside>
  )
}
```

### Task 11: Tooltip Component

**File:** `src/components/map/Tooltip.tsx`

**UI Layout:**

```
Building Tooltip:          Agent Tooltip:
┌──────────────────┐      ┌──────────────────┐
│ 🏢 test-compute   │      │ 🕵️ Scanner #1    │
│ ● Healthy (5)    │      │ Working: Scanning│
└──────────────────┘      └──────────────────┘
```

**Positioning:**

```typescript
// Follow mouse with offset
function Tooltip({ x, y, content }) {
  return (
    <div style={{
      position: 'fixed',
      left: x + 10,  // 10px offset from cursor
      top: y + 10,
      pointerEvents: 'none',  // Don't block mouse events
      zIndex: 1000
    }}>
      {content}
    </div>
  )
}
```

**Behavior:**

```typescript
interface TooltipProps {
  type: 'building' | 'agent'
  target: Building | Agent
  position: { x: number; y: number }  // Mouse position
}

// Display logic:
// - Show on hover (after 100ms delay to avoid flicker)
// - Hide after 200ms of not hovering
// - Immediate hide on click (opens DetailPanel instead)
// - Update position on mouse move
```

**Content:**

```typescript
function TooltipContent({ type, target }) {
  if (type === 'building') {
    return (
      <div>
        <div>{target.icon} {target.name}</div>
        <div className={target.status}>
          {target.status} ({target.metrics.resourceCount} resources)
        </div>
      </div>
    )
  }

  if (type === 'agent') {
    return (
      <div>
        <div>{target.icon} {target.name}</div>
        <div>{target.status}: {target.currentTask}</div>
      </div>
    )
  }
}
```

### Task 12: Add Hover State Tracking to MapCanvas

**File:** `src/components/map/MapCanvas.tsx`

**Enhancement:**

```typescript
export function MapCanvas({ buildings, agents, ...props }: Props) {
  const [hovered, setHovered] = useState<HoverState>({ type: null, id: null })

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Convert to map coordinates
    const mapPos = screenToMap(mouseX, mouseY, viewport, zoomScale)

    // Hit detection
    const hoveredBuilding = detectBuildingHit(mapPos, buildings)
    const hoveredAgent = detectAgentHit(mapPos, agents)

    setHovered({
      type: hoveredBuilding ? 'building' : hoveredAgent ? 'agent' : null,
      id: hoveredBuilding?.id || hoveredAgent?.id || null
    })

    // Update mapStore
    setHovered({
      type: hoveredBuilding ? 'building' : hoveredAgent ? 'agent' : null,
      id: hoveredBuilding?.id || hoveredAgent?.id || null
    })
  }

  const handleMouseLeave = () => {
    setHovered({ type: null, id: null })
  }

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      // ... other props
    />
  )
}
```

**Hit Detection:**

```typescript
function detectBuildingHit(
  point: Point,
  buildings: Building[]
): Building | null {
  for (const building of buildings.reverse()) {  // Top to bottom
    if (pointInRect(point, building.position)) {
      return building
    }
  }
  return null
}

function detectAgentHit(
  point: Point,
  agents: Agent[]
): Agent | null {
  for (const agent of agents) {
    const agentPos = agent.position  // { mapX, mapY }
    const dist = Math.sqrt(
      Math.pow(point.x - agentPos.mapX, 2) +
      Math.pow(point.y - agentPos.mapY, 2)
    )
    if (dist < 20) {  // 20px hit radius
      return agent
    }
  }
  return null
}
```

### Task 13: Wire Up Detail Panel and Tooltip

**File:** `src/components/map/CityMapComplete.tsx`

**Integration:**

```typescript
export function CityMapComplete() {
  const selection = useMapStore((s) => s.selection)
  const hovered = useMapStore((s) => s.hovered)
  const setSelection = useMapStore((s) => s.setSelection)

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      {/* LEFT: Map Area (75%) */}
      <div style={{ flex: '0 0 75%', position: 'relative' }}>
        <MapCanvas
          buildings={buildings}
          agents={agentList}
          connections={connections}
          viewport={viewport}
          zoom={zoom}
          selection={selection}
          onBuildingClick={(buildingId) => {
            setSelection({ type: 'building', id: buildingId })
          }}
          onAgentClick={(agentId) => {
            setSelection({ type: 'agent', id: agentId })
          }}
        />

        <MapControls {...mapControlProps} />

        {/* NEW: Tooltip */}
        {hovered.type && hovered.id && (
          <Tooltip
            type={hovered.type}
            target={hovered.type === 'building'
              ? buildings.find(b => b.id === hovered.id)
              : agents.find(a => a.id === hovered.id)
            }
            position={mousePosition}  // Track from MapCanvas
          />
        )}

        {/* NEW: BuildingDetailPanel */}
        {selection.type === 'building' && selection.id && (
          <BuildingDetailPanel
            buildingId={selection.id}
            onClose={() => setSelection({ type: null, id: null })}
          />
        )}
      </div>

      {/* RIGHT: Office Panel (25%) */}
      <AgentOfficePanel onOpenLedger={() => console.log('Open ledger')} />
    </div>
  )
}
```

**Z-Index Management:**

```css
/* Layering (bottom to top): */
.MapCanvas          { z-index: 1; }
.MapControls        { z-index: 10; }
.Tooltip            { z-index: 100; }
.BuildingDetailPanel { z-index: 100; }
.AgentOfficePanel   { z-index: 50; }
```

---

## Phase 4: Agent Integration (Tasks 14-15)

### Goal

Integrate agents into the map coordinate system and visualize their movement paths.

### Task 14: Update AgentRenderer for Map Coordinates

**File:** `src/components/map/AgentRenderer.tsx` (or inline in MapCanvas)

**Current State:**

```typescript
// Current: Agent position relative to office (assumed)
interface Agent {
  id: string
  position: { x: number; y: number }  // Unknown coordinate system
}
```

**Enhanced Agent Data:**

```typescript
// New: Map-based coordinate system
interface Agent {
  id: string
  role: AgentRole
  name: string
  icon: string
  status: AgentStatus
  currentTask: string

  // NEW: Map position fields
  position: {
    mapX: number  // World coordinate (not screen coordinate)
    mapY: number
  }
  target?: {      // Movement target
    mapX: number
    mapY: number
    buildingId?: string
  }
  path?: Point[]  // Calculated path (from Task 15)
}
```

**AgentRenderer Component:**

```typescript
interface AgentRendererProps {
  agent: Agent
  viewport: ViewportState
  zoom: ZoomLevel
  onClick?: (agentId: string) => void
}

export function AgentRenderer({ agent, viewport, zoom, onClick }: Props) {
  // Convert map coordinates to screen coordinates
  const zoomScale = getZoomScale(zoom)
  const screenPos = mapToScreen(
    agent.position.mapX,
    agent.position.mapY,
    viewport,
    zoomScale
  )

  // Get size based on zoom level
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
        transform: 'translate(-50%, -50%)',  // Center on position
        fontSize: size * 0.8,
        cursor: 'pointer',
        userSelect: 'none',
        pointerEvents: 'auto',
        // Status-based styling
        opacity: agent.status === 'done' ? 0.6 : 1.0,
        filter: agent.status === 'working' ? 'drop-shadow(0 0 8px #8b5cf6)' : 'none'
      }}
    >
      {agent.icon}
    </div>
  )
}
```

**Integration with MapCanvas:**

```typescript
// In MapCanvas component
export function MapCanvas({ buildings, agents, ...props }: Props) {
  // ... canvas rendering code

  return (
    <div style={{ position: 'relative' }}>
      <canvas ref={canvasRef} {...props} />

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
}
```

**Why DOM Overlay for Agents:**

- Easier to handle clicks/hover (no manual hit detection)
- Can use CSS animations/effects
- Simplifies tooltip integration
- Better accessibility

**deployStore Integration:**

```typescript
// In deployStore.ts
function initializeAgentPositions() {
  // Office location (known position)
  const OFFICE_MAP_X = 900
  const OFFICE_MAP_Y = 300

  // Set initial position for all agents
  set((state) => ({
    agents: state.agents.map(a => ({
      ...a,
      position: {
        mapX: OFFICE_MAP_X,
        mapY: OFFICE_MAP_Y
      }
    }))
  }))
}
```

### Task 15: Draw Agent Paths

**File:** `src/utils/agentPathfinding.ts`

**Path Calculation:**

```typescript
export interface Point {
  x: number
  y: number
}

export function calculateAgentPath(
  agent: Agent,
  targetBuilding: Building,
  allBuildings: Building[]
): Point[] {
  // 1. Start point (agent's current position)
  const start: Point = {
    x: agent.position.mapX,
    y: agent.position.mapY
  }

  // 2. End point (building entrance)
  const end: Point = {
    x: targetBuilding.position.x + targetBuilding.position.width / 2,
    y: targetBuilding.position.y + targetBuilding.position.height
  }

  // 3. Build obstacle map (other buildings)
  const obstacles = allBuildings
    .filter(b => b.id !== targetBuilding.id)
    .map(b => b.position)

  // 4. BFS pathfinding
  return bfsPathfinding(start, end, obstacles)
}

function bfsPathfinding(
  start: Point,
  end: Point,
  obstacles: Rect[]
): Point[] {
  const GRID_SIZE = 20  // 20px grid cells

  // Convert to grid coordinates
  const startGrid = { x: Math.floor(start.x / GRID_SIZE), y: Math.floor(start.y / GRID_SIZE) }
  const endGrid = { x: Math.floor(end.x / GRID_SIZE), y: Math.floor(end.y / GRID_SIZE) }

  // BFS
  const queue: Array<{ point: Point; path: Point[] }> = [
    { point: start, path: [start] }
  ]
  const visited = new Set<string>()
  visited.add(`${startGrid.x},${startGrid.y}`)

  while (queue.length > 0) {
    const { point, path } = queue.shift()!

    // Check if reached end (within threshold)
    const dist = Math.sqrt(Math.pow(point.x - end.x, 2) + Math.pow(point.y - end.y, 2))
    if (dist < GRID_SIZE) {
      return [...path, end]  // Found path
    }

    // Explore neighbors (4-directional)
    const neighbors = [
      { x: point.x + GRID_SIZE, y: point.y },
      { x: point.x - GRID_SIZE, y: point.y },
      { x: point.x, y: point.y + GRID_SIZE },
      { x: point.x, y: point.y - GRID_SIZE }
    ]

    for (const neighbor of neighbors) {
      const gridKey = `${Math.floor(neighbor.x / GRID_SIZE)},${Math.floor(neighbor.y / GRID_SIZE)}`

      if (visited.has(gridKey)) continue
      if (isPointInObstacle(neighbor, obstacles)) continue

      visited.add(gridKey)
      queue.push({
        point: neighbor,
        path: [...path, neighbor]
      })
    }
  }

  // No path found, go direct (collision with obstacles ignored)
  return [start, end]
}

function isPointInObstacle(point: Point, obstacles: Rect[]): boolean {
  return obstacles.some(obs => pointInRect(point, obs))
}
```

**Path Rendering (in MapCanvas):**

```typescript
function renderAgentPaths(
  ctx: CanvasRenderingContext2D,
  agents: Agent[],
  buildings: Building[],
  viewport: ViewportState,
  zoom: ZoomLevel
) {
  const zoomScale = getZoomScale(zoom)

  agents.forEach(agent => {
    // Only show path for moving agents
    if (!agent.target || agent.status !== 'walking') return

    // Find target building
    const targetBuilding = buildings.find(b => b.id === agent.target?.buildingId)
    if (!targetBuilding) return

    // Calculate path
    const path = calculateAgentPath(agent, targetBuilding, buildings)

    // Convert path to screen coordinates
    const screenPath = path.map(p => mapToScreen(p.x, p.y, viewport, zoomScale))

    // Draw path line
    ctx.beginPath()
    ctx.strokeStyle = '#8b5cf6'  // Purple
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])  // Dashed line

    screenPath.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y)
      else ctx.lineTo(point.x, point.y)
    })

    ctx.stroke()
    ctx.setLineDash([])  // Reset

    // Draw end marker
    const endPoint = screenPath[screenPath.length - 1]
    ctx.beginPath()
    ctx.fillStyle = '#8b5cf6'
    ctx.arc(endPoint.x, endPoint.y, 4, 0, Math.PI * 2)
    ctx.fill()
  })
}
```

**Real-Time Updates:**

```typescript
// In MapCanvas render loop
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Render buildings
  buildings.forEach(b => drawBuilding(ctx, b, ...))

  // Render connections
  connections.forEach(c => drawConnection(ctx, c, ...))

  // Render agent paths (NEW)
  renderAgentPaths(ctx, agents, buildings, viewport, zoom)

  // Request next frame
  requestAnimationFrame(render)
}
```

**Agent Movement Simulation (for demo):**

```typescript
// In deployStore, simulate agent movement
function moveAgents() {
  set((state) => {
    const agents = state.agents.map(agent => {
      if (!agent.target || agent.status !== 'walking') return agent

      // Move towards target (simple linear interpolation)
      const dx = agent.target.mapX - agent.position.mapX
      const dy = agent.target.mapY - agent.position.mapY
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 5) {
        // Arrived
        return {
          ...agent,
          position: { mapX: agent.target.mapX, mapY: agent.target.mapY },
          target: undefined,
          status: 'working'
        }
      }

      // Move 5px towards target
      const speed = 5
      return {
        ...agent,
        position: {
          mapX: agent.position.mapX + (dx / dist) * speed,
          mapY: agent.position.mapY + (dy / dist) * speed
        }
      }
    })

    return { agents }
  })
}

// Update agent positions every 50ms
setInterval(moveAgents, 50)
```

---

## Phase 5: Visual Polish (Tasks 16-17)

### Goal

Add state-driven animations to enhance visual feedback and immersion.

### Task 16: Building State Animations

**File:** `src/utils/mapAnimations.ts`

**Animation Rules:**

```typescript
interface BuildingAnimation {
  type: 'pulse' | 'blink'
  color: string
  alpha: number  // Opacity (0-1)
}

export function getBuildingAnimation(
  status: Building['status'],
  time: number
): BuildingAnimation {
  switch (status) {
    case 'healthy':
      return {
        type: 'pulse',
        color: '#10b981',  // Green
        alpha: 0.3 + Math.sin(time / 300) * 0.15  // 0.15-0.45 breathing
      }

    case 'warning':
      return {
        type: 'blink',
        color: '#f59e0b',  // Yellow/Orange
        alpha: Math.sin(time / 500) > 0 ? 0.8 : 0.2  // 1s blink cycle
      }

    case 'error':
      return {
        type: 'blink',
        color: '#ef4444',  // Red
        alpha: Math.sin(time / 250) > 0 ? 1.0 : 0.3  // 0.5s fast blink
      }

    default:
      return { type: 'pulse', color: '#6b7280', alpha: 0 }
  }
}
```

**Rendering:**

```typescript
export function drawBuildingWithAnimation(
  ctx: CanvasRenderingContext2D,
  building: Building,
  x: number,
  y: number,
  width: number,
  height: number,
  zoom: ZoomLevel,
  time: number
) {
  // 1. Draw base building
  drawBuilding(ctx, building, x, y, width, height, zoom)

  // 2. Get animation state
  const anim = getBuildingAnimation(building.status, time)

  // 3. Apply animation overlay
  if (anim.type === 'pulse') {
    // Pulsing glow
    ctx.save()
    ctx.fillStyle = anim.color
    ctx.globalAlpha = anim.alpha
    ctx.fillRect(x, y, width, height)
    ctx.restore()
  }

  if (anim.type === 'blink') {
    // Blinking border
    ctx.save()
    ctx.strokeStyle = anim.color
    ctx.lineWidth = 3
    ctx.globalAlpha = anim.alpha
    ctx.strokeRect(x - 2, y - 2, width + 4, height + 4)
    ctx.restore()
  }
}
```

**Integration:**

```typescript
// In MapCanvas render loop
const time = Date.now()

buildings.forEach(building => {
  const screen = mapToScreen(...)
  drawBuildingWithAnimation(
    ctx,
    building,
    screen.x,
    screen.y,
    screen.width,
    screen.height,
    zoom,
    time  // Pass time for animation sync
  )
})
```

**Performance Optimization:**

```typescript
// Only animate buildings in viewport
const visibleBuildings = buildings.filter(b => isInViewport(b, viewport, zoom))

visibleBuildings.forEach(building => {
  drawBuildingWithAnimation(ctx, building, ..., time)
})
```

### Task 17: Data Flow Animations on Connections

**File:** `src/utils/mapAnimations.ts`

**Animation Effect:**

- Particles flowing along connection lines
- Direction: from `from` building to `to` building
- Speed depends on connection type:
  - `dependency`: Slow (0.5px/ms) - represents structural dependency
  - `dataflow`: Fast (2px/ms) - represents active data transfer

**Implementation:**

```typescript
export function drawConnectionWithFlow(
  ctx: CanvasRenderingContext2D,
  connection: Connection,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  time: number
) {
  // 1. Draw base connection line
  ctx.beginPath()
  ctx.strokeStyle = connection.type === 'dependency' ? '#6b7280' : '#3b82f6'
  ctx.lineWidth = 2
  ctx.moveTo(fromX, fromY)
  ctx.lineTo(toX, toY)
  ctx.stroke()

  // 2. Calculate particle position
  const speed = connection.type === 'dataflow' ? 0.002 : 0.0005  // px/ms
  const progress = (time * speed) % 1  // 0-1 looping

  const particleX = fromX + (toX - fromX) * progress
  const particleY = fromY + (toY - fromY) * progress

  // 3. Draw particle
  ctx.save()
  ctx.beginPath()
  ctx.fillStyle = connection.type === 'dataflow' ? '#3b82f6' : '#8b5cf6'
  ctx.arc(particleX, particleY, 4, 0, Math.PI * 2)
  ctx.fill()

  // 4. Draw particle glow
  ctx.beginPath()
  ctx.fillStyle = connection.type === 'dataflow'
    ? 'rgba(59, 130, 246, 0.3)'
    : 'rgba(139, 92, 246, 0.3)'
  ctx.arc(particleX, particleY, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
```

**Multiple Particles (Enhanced Version):**

```typescript
export function drawConnectionWithMultiFlow(
  ctx: CanvasRenderingContext2D,
  connection: Connection,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  time: number
) {
  // Draw base line
  // ... (same as above)

  // Draw 3 particles with offsets
  const particleCount = 3
  const offset = 1 / particleCount  // 0.33

  for (let i = 0; i < particleCount; i++) {
    const progress = ((time * speed) + offset * i) % 1

    const particleX = fromX + (toX - fromX) * progress
    const particleY = fromY + (toY - fromY) * progress

    // Draw particle
    ctx.save()
    ctx.beginPath()
    ctx.fillStyle = connection.type === 'dataflow' ? '#3b82f6' : '#8b5cf6'
    ctx.arc(particleX, particleY, 3, 0, Math.PI * 2)  // Smaller particles
    ctx.fill()
    ctx.restore()
  }
}
```

**Zoom-Level Awareness:**

```typescript
// Only show flow animations at environment/building levels
if (zoom === 'world') {
  // Draw static connections only (no particles)
  drawConnection(ctx, connection, fromX, fromY, toX, toY)
} else {
  // Draw with flow animation
  drawConnectionWithFlow(ctx, connection, fromX, fromY, toX, toY, time)
}
```

**Integration:**

```typescript
// In MapCanvas render loop
const time = Date.now()

connections.forEach(conn => {
  const fromBuilding = buildings.find(b => b.id === conn.from)
  const toBuilding = buildings.find(b => b.id === conn.to)

  if (!fromBuilding || !toBuilding) return

  const fromScreen = mapToScreen(...)
  const toScreen = mapToScreen(...)

  drawConnectionWithFlow(
    ctx,
    conn,
    fromScreen.x,
    fromScreen.y,
    toScreen.x,
    toScreen.y,
    time
  )
})
```

---

## Phase 6: Testing and Polish (Tasks 18-21)

### Goal

Add keyboard navigation, comprehensive tests, optimize performance, and update documentation.

### Task 18: Keyboard Navigation Support

**File:** `src/hooks/useKeyboardShortcuts.ts`

**Shortcut Mapping:**

```typescript
const KEYBOARD_SHORTCUTS: Record<string, KeyboardAction> = {
  // Zoom
  '+': 'zoomIn',
  '=': 'zoomIn',     // Same key (unshifted)
  '-': 'zoomOut',
  '_': 'zoomOut',    // Same key (unshifted)
  '0': 'resetView',

  // Pan
  'ArrowUp': 'panUp',
  'ArrowDown': 'panDown',
  'ArrowLeft': 'panLeft',
  'ArrowRight': 'panRight',

  // Selection
  'Escape': 'clearSelection',
  'Enter': 'openDetail',

  // Presets
  '1': 'presetTestCity',
  '2': 'presetProdCity',
  '3': 'presetAllCities',
}

type KeyboardAction =
  | 'zoomIn' | 'zoomOut' | 'resetView'
  | 'panUp' | 'panDown' | 'panLeft' | 'panRight'
  | 'clearSelection' | 'openDetail'
  | 'presetTestCity' | 'presetProdCity' | 'presetAllCities'
```

**Hook Implementation:**

```typescript
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
      // Ignore if typing in input/textarea
      const activeTag = document.activeElement?.tagName
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
        return
      }

      const action = KEYBOARD_SHORTCUTS[e.key]
      if (!action) return

      e.preventDefault()  // Block default behavior

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

        case 'openDetail':
          // Detail already open via selection, do nothing
          // Could trigger modal/dialog in future
          break

        case 'presetTestCity':
          setViewport(PRESET_VIEWPORTS.test)
          setZoom(PRESET_VIEWPORTS.test.zoom)
          break

        case 'presetProdCity':
          setViewport(PRESET_VIEWPORTS.prod)
          setZoom(PRESET_VIEWPORTS.prod.zoom)
          break

        case 'presetAllCities':
          setViewport(PRESET_VIEWPORTS.all)
          setZoom(PRESET_VIEWPORTS.all.zoom)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewport, zoom, selection])
}
```

**Helper Functions:**

```typescript
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

**Integration:**

```typescript
// In CityMapComplete
export function CityMapComplete() {
  const viewport = useMapStore((s) => s.viewport)
  const zoom = useMapStore((s) => s.zoom)
  const selection = useMapStore((s) => s.selection)

  // NEW: Enable keyboard shortcuts
  useKeyboardShortcuts(viewport, zoom, selection)

  return (...)
}
```

**UI Feedback:**

```typescript
// Display in MapControls.KeyboardShortcuts
const shortcutText = [
  '+/-: Zoom',
  'Arrows: Pan',
  'Esc: Clear',
  '1/2/3: Presets'
].join(' | ')

return <div className="shortcuts">{shortcutText}</div>
```

### Task 19: Comprehensive Integration Tests

**File:** `src/components/map/__tests__/MapControls.test.tsx`

**Test Coverage:**

```typescript
describe('MapControls', () => {
  it('renders all control components', () => {
    const { getByRole } = render(<MapControls {...props} />)
    expect(getByRole('button', { name: /zoom in/i })).toBeInTheDocument()
    expect(getByRole('button', { name: /zoom out/i })).toBeInTheDocument()
  })

  it('zooms in when + button clicked', () => {
    const onZoomIn = jest.fn()
    const { getByRole } = render(<MapControls {...props} onZoomIn={onZoomIn} />)

    fireEvent.click(getByRole('button', { name: /zoom in/i }))
    expect(onZoomIn).toHaveBeenCalled()
  })

  it('zooms out when - button clicked', () => {
    const onZoomOut = jest.fn()
    const { getByRole } = render(<MapControls {...props} onZoomOut={onZoomOut} />)

    fireEvent.click(getByRole('button', { name: /zoom out/i }))
    expect(onZoomOut).toHaveBeenCalled()
  })

  it('resets view when reset button clicked', () => {
    const onResetView = jest.fn()
    const { getByRole } = render(<MapControls {...props} onResetView={onResetView} />)

    fireEvent.click(getByRole('button', { name: /reset/i }))
    expect(onResetView).toHaveBeenCalled()
  })

  it('shows correct zoom level indicator', () => {
    const { getByText } = render(<MapControls {...props} zoom="environment" />)
    expect(getByText(/environment/i)).toBeInTheDocument()
  })

  it('navigates to preset when clicking preset buttons', () => {
    const onPresetView = jest.fn()
    const { getByRole } = render(
      <MapControls {...props} onPresetView={onPresetView} />
    )

    fireEvent.click(getByRole('button', { name: /test/i }))
    expect(onPresetView).toHaveBeenCalledWith('test')
  })

  it('renders mini-map with buildings', () => {
    const { container } = render(
      <MapControls {...props} buildings={mockBuildings} />
    )

    const miniMapCanvas = container.querySelector('canvas.mini-map')
    expect(miniMapCanvas).toBeInTheDocument()
  })
})
```

**File:** `src/components/map/__tests__/BuildingDetailPanel.test.tsx`

```typescript
describe('BuildingDetailPanel', () => {
  const mockBuilding = {
    id: 'test-compute',
    name: 'test-compute',
    type: 'compute',
    status: 'healthy',
    metrics: { resourceCount: 5 }
  }

  const mockChange = {
    id: 'chg_001',
    title: 'Test Change',
    resources: [
      { id: 'rc_001', type: 'aws_waf', name: 'edge_waf', action: 'create', ... }
    ]
  }

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

  it('displays building info from deployStore', () => {
    const { getByText } = render(
      <BuildingDetailPanel buildingId="test-compute" onClose={() => {}} />
    )
    expect(getByText(/healthy/i)).toBeInTheDocument()
    expect(getByText(/\(5 resources\)/i)).toBeInTheDocument()
  })

  it('shows resource list', () => {
    const { getByText } = render(
      <BuildingDetailPanel buildingId="test-compute" onClose={() => {}} />
    )
    expect(getByText(/edge_waf/i)).toBeInTheDocument()
  })

  it('calls action handlers when buttons clicked', () => {
    const onViewChange = jest.fn()
    const { getByRole } = render(
      <BuildingDetailPanel
        buildingId="test-compute"
        onClose={() => {}}
        onViewChange={onViewChange}
      />
    )

    fireEvent.click(getByRole('button', { name: /view change/i }))
    expect(onViewChange).toHaveBeenCalledWith('chg_001')
  })

  it('closes when X button clicked', () => {
    const onClose = jest.fn()
    const { getByRole } = render(
      <BuildingDetailPanel buildingId="test-compute" onClose={onClose} />
    )

    fireEvent.click(getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
```

**File:** `src/components/map/__tests__/Tooltip.test.tsx`

```typescript
describe('Tooltip', () => {
  it('shows tooltip for building', () => {
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

  it('shows tooltip for agent', () => {
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
        target={mockBuilding}
        position={{ x: 100, y: 100 }}
      />
    )

    const tooltip = container.firstChild as HTMLElement
    expect(tooltip.style.left).toBe('110px')  // x + 10 offset
    expect(tooltip.style.top).toBe('110px')   // y + 10 offset
  })
})
```

**File:** `src/components/map/__tests__/CityMapComplete.integration.test.tsx`

```typescript
describe('CityMapComplete Integration', () => {
  it('renders map, controls, and panel', () => {
    const { container } = render(<CityMapComplete />)

    expect(container.querySelector('canvas')).toBeInTheDocument()
    expect(container.querySelector('.MapControls')).toBeInTheDocument()
    expect(container.querySelector('.AgentOfficePanel')).toBeInTheDocument()
  })

  it('updates zoom when controls used', () => {
    render(<CityMapComplete />)

    const zoomInBtn = screen.getByRole('button', { name: /zoom in/i })
    fireEvent.click(zoomInBtn)

    const zoom = useMapStore.getState().zoom
    expect(zoom).toBe('environment')  // From 'world'
  })

  it('opens detail panel when building clicked', () => {
    render(<CityMapComplete />)

    // Simulate building click (through MapCanvas)
    const building = mockBuildings[0]
    fireEvent.click(screen.getByTestId(`building-${building.id}`))

    const selection = useMapStore.getState().selection
    expect(selection.type).toBe('building')
    expect(selection.id).toBe(building.id)
  })

  it('shows tooltip when hovering', async () => {
    render(<CityMapComplete />)

    const canvas = screen.getByRole('img', { hidden: true })  // canvas has role="img"
    fireEvent.mouseMove(canvas, { clientX: 200, clientY: 200 })

    await waitFor(() => {
      expect(screen.queryByTestId('tooltip')).toBeInTheDocument()
    })
  })

  it('responds to keyboard shortcuts', () => {
    render(<CityMapComplete />)

    fireEvent.keyDown(window, { key: '+' })
    const zoom = useMapStore.getState().zoom
    expect(zoom).toBe('environment')
  })
})
```

**File:** `src/utils/__tests__/agentPathfinding.test.ts`

```typescript
describe('Agent Pathfinding', () => {
  it('calculates shortest path avoiding obstacles', () => {
    const agent = {
      position: { mapX: 100, mapY: 100 }
    }
    const target = {
      position: { x: 300, y: 100, width: 50, height: 50 }
    }
    const obstacles = [
      { x: 180, y: 50, width: 40, height: 100 }  // Blocks direct path
    ]

    const path = calculateAgentPath(agent, target, obstacles)

    expect(path).toBeDefined()
    expect(path.length).toBeGreaterThan(1)
    expect(path[0]).toEqual({ x: 100, y: 100 })  // Start
    expect(path[path.length - 1]).toEqual({ x: 325, y: 150 })  // End (building entrance)
  })

  it('updates path in real-time during movement', () => {
    const agent = {
      position: { mapX: 100, mapY: 100 },
      target: { mapX: 300, mapY: 100 }
    }

    const path1 = calculateAgentPath(agent, targetBuilding, obstacles)

    // Move agent
    agent.position.mapX = 150
    const path2 = calculateAgentPath(agent, targetBuilding, obstacles)

    expect(path2).not.toEqual(path1)  // Path should update
  })

  it('renders path correctly on canvas', () => {
    const ctx = mockCanvasContext()
    const path = [{ x: 100, y: 100 }, { x: 200, y: 100 }]

    renderAgentPath(ctx, path, viewport, zoom)

    expect(ctx.beginPath).toHaveBeenCalled()
    expect(ctx.moveTo).toHaveBeenCalledWith(100, 100)
    expect(ctx.lineTo).toHaveBeenCalledWith(200, 100)
    expect(ctx.stroke).toHaveBeenCalled()
  })
})
```

### Task 20: Performance Optimization

**File:** `src/utils/mapOptimization.ts`

**Optimization 1: Viewport Culling**

```typescript
export function cullBuildingsToViewport(
  buildings: Building[],
  viewport: ViewportState,
  zoom: ZoomLevel,
  canvasWidth: number,
  canvasHeight: number
): Building[] {
  // Calculate viewport bounds in map coordinates
  const topLeft = screenToMap(0, 0, viewport, getZoomScale(zoom))
  const bottomRight = screenToMap(
    canvasWidth,
    canvasHeight,
    viewport,
    getZoomScale(zoom)
  )

  // Filter buildings in viewport
  return buildings.filter(b => {
    return !(
      b.position.x + b.position.width < topLeft.x ||
      b.position.x > bottomRight.x ||
      b.position.y + b.position.height < topLeft.y ||
      b.position.y > bottomRight.y
    )
  })
}
```

**Optimization 2: RequestAnimationFrame Management**

```typescript
export function useRenderLoop(
  renderFn: () => void,
  dependencies: any[]
) {
  const rafRef = useRef<number>()

  useEffect(() => {
    const loop = () => {
      renderFn()
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, dependencies)
}
```

**Optimization 3: OffscreenCanvas for Static Content**

```typescript
export class BuildingCache {
  private cache = new Map<string, HTMLCanvasElement>()

  getBuildingCanvas(
    building: Building,
    zoom: ZoomLevel
  ): HTMLCanvasElement {
    const key = `${building.id}-${zoom}`

    if (this.cache.has(key)) {
      return this.cache.get(key)!
    }

    // Render building to offscreen canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    const size = getBuildingSize(zoom)
    canvas.width = size.width
    canvas.height = size.height

    drawBuilding(ctx, building, 0, 0, size.width, size.height, zoom)

    this.cache.set(key, canvas)
    return canvas
  }

  clear() {
    this.cache.clear()
  }
}
```

**Optimization 4: Zustand Selector Optimization**

```typescript
// Instead of:
const agents = useAgentStore((s) => s.agents)  // Re-renders on any agent change

// Use:
const agents = useAgentStore((s) => s.agents, shallow)  // Shallow comparison

// Or select specific fields:
const agentCount = useAgentStore((s) => s.agents.length)
const workingAgents = useAgentStore((s) => s.agents.filter(a => a.status === 'working'))
```

**Optimization 5: Event Debouncing/Throttling**

```typescript
export function useDeouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<number>()

  const debounced = ((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = window.setTimeout(() => {
      callback(...args)
    }, delay)
  }) as T

  return debounced
}

// Usage:
const handleHover = useDebouncedCallback((buildingId) => {
  setHovered(buildingId)
}, 100)  // 100ms debounce
```

**Performance Metrics (Target):**

```typescript
interface PerformanceMetrics {
  fps: number              // Target: 60fps stable
  zoomResponseMs: number   // Target: < 100ms
  clickResponseMs: number  // Target: < 50ms
  memoryMB: number         // Target: Stable, no growth
}

export function measurePerformance(): PerformanceMetrics {
  const fps = measureFPS()
  const zoomResponse = measureZoomLatency()
  const clickResponse = measureClickLatency()
  const memory = (performance as any).memory?.usedJSHeapSize / 1024 / 1024

  return { fps, zoomResponseMs: zoomResponse, clickResponseMs: clickResponse, memoryMB: memory }
}
```

### Task 21: Documentation and Cleanup

**File:** `README.md`

**Updates:**

```markdown
# Living City - IaC Deployment Visualization

## Overview

Interactive map-based visualization for Infrastructure as Code deployment, featuring agent-based workflows and real-time status tracking.

## Features

- **Map-Based UI**: Interactive city map representing deployment environments
- **Agent System**: Visual agents (scanners, generators, reviewers) for deployment tasks
- **Real-Time Status**: Building health, resource changes, and deployment progress
- **Zoom & Pan**: Three-level zoom (world/environment/building) with smooth animations
- **Detail Panels**: Interactive panels for buildings, agents, and resources
- **Keyboard Shortcuts**: Full keyboard navigation support

## Components

### Map Components
- `MapCanvas` - Core canvas-based map renderer
- `MapControls` - Zoom, pan, presets, mini-map
- `BuildingDetailPanel` - Building information and actions
- `Tooltip` - Hover information for buildings/agents
- `AgentOfficePanel` - Agent management and task assignment

### Stores
- `mapStore` - Viewport, zoom, selection, hover state
- `deployStore` - Changes, runs, workshop, ledger (business logic)
- `agentStore` - Agent states and animations
- `districtStore` - District/building data

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `+` / `-` | Zoom in/out |
| `Arrow Keys` | Pan map |
| `0` | Reset view |
| `1` / `2` / `3` | Test/Prod/All preset views |
| `Esc` | Clear selection |
| `Enter` | Open detail panel |

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
\`\`\`

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                     UI Layer                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │   Map      │  │  Controls  │  │   Office   │   │
│  │  Canvas    │  │            │  │   Panel    │   │
│  └────────────┘  └────────────┘  └────────────┘   │
└─────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────┐
│                   State Layer                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │ mapStore   │  │deployStore │  │agentStore  │   │
│  └────────────┘  └────────────┘  └────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Development

### Component Development

1. Follow existing component patterns
2. Use TypeScript for type safety
3. Write tests for all components
4. Use Canvas 2D for rendering (60fps target)
5. Optimize for viewport culling

### Testing

\`\`\`bash
# Unit tests
npm test src/components/map/__tests__

# Integration tests
npm test src/components/map/__tests__/CityMapComplete.integration.test.tsx

# Coverage
npm test -- --coverage
\`\`\`

## Roadmap

- [x] Phase 1: Basic Map Rendering (6/6 tasks)
- [ ] Phase 2: Zoom System (0/3 tasks)
- [ ] Phase 3: Selection & Details (0/4 tasks)
- [ ] Phase 4: Agent Integration (0/2 tasks)
- [ ] Phase 5: Visual Polish (0/2 tasks)
- [ ] Phase 6: Testing & Polish (0/4 tasks)
- [ ] Runtime Layer: OpenCode integration (separate track)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## License

MIT
```

**File:** `CONTRIBUTING.md`

**Updates:**

```markdown
# Contributing to Living City

## Development Setup

\`\`\`bash
# Fork and clone
git clone https://github.com/yourusername/living-city.git
cd living-city

# Install dependencies
npm install

# Start dev server
npm run dev
\`\`\`

## Component Development Guidelines

### Canvas Components

- Use `requestAnimationFrame` for 60fps rendering
- Implement viewport culling for performance
- Use `mapToScreen` / `screenToMap` for coordinate transforms
- Cache static content in OffscreenCanvas

### Store Development

- Use Zustand for state management
- Implement shallow comparison for large arrays
- Provide clear action names
- Document state shape in JSDoc

### Testing Requirements

- Unit tests for all components
- Integration tests for user flows
- Performance tests for Canvas rendering
- Aim for >80% code coverage

## Code Style

- Use Prettier for formatting
- Follow TypeScript strict mode
- No console.log in production code
- Comment complex algorithms

## Commit Messages

Follow conventional commits:

\`\`\`
feat: add MapControls component with zoom presets
fix: resolve TypeScript errors in CityMapComplete
test: add integration tests for keyboard shortcuts
docs: update README with keyboard shortcuts
\`\`\`

## Pull Request Process

1. Create feature branch from `master`
2. Implement with tests
3. Run `npm test` and `npm run lint`
4. Update documentation
5. Submit PR with description

## Performance Guidelines

- Target 60fps for Canvas rendering
- < 100ms response for zoom actions
- < 50ms response for clicks
- Monitor memory usage (should be stable)

## Questions?

Open an issue or contact the maintainers.
```

**Code Cleanup:**

```bash
# Remove unused imports
npm run lint -- --fix

# Format code
npm run format

# Remove TODO comments
git grep -l "TODO" | xargs sed -i '/TODO/d'

# Remove console.log
git grep -l "console.log" | xargs sed -i '/console.log/d'
```

**Update Design Docs:**

```markdown
# In docs/superpowers/specs/2026-04-06-living-city-map-based-ui-design.md

## Implementation Status

- [x] Phase 1: Basic Map Rendering (6/6 tasks completed)
- [x] Phase 2: Zoom System (3/3 tasks completed)
- [x] Phase 3: Selection & Details (4/4 tasks completed)
- [x] Phase 4: Agent Integration (2/2 tasks completed)
- [x] Phase 5: Visual Polish (2/2 tasks completed)
- [x] Phase 6: Testing & Polish (4/4 tasks completed)

**Total Progress: 21/21 tasks (100%)**
```

---

## Summary

This design specification covers the remaining 15 tasks (Phases 2-6) of the Living City map-based UI implementation. Each phase is independently testable and follows strict sequential execution.

**Key Design Decisions:**

1. **Data Source**: All components use existing deployStore mock data (no runtime layer yet)
2. **Execution Order**: Strict sequential phases (2 → 3 → 4 → 5 → 6)
3. **Component Architecture**: Clear separation between Canvas rendering (MapCanvas) and DOM overlays (MapControls, DetailPanel, Tooltip, Agents)
4. **Performance**: Viewport culling, requestAnimationFrame, OffscreenCanvas caching
5. **Testing**: Comprehensive unit, integration, and E2E tests
6. **Documentation**: Full README, CONTRIBUTING, and inline code comments

**Success Criteria:**

- All 21 UI tasks completed
- 60fps stable rendering
- Responsive zoom/pan/click (< 100ms)
- Full keyboard navigation
- Test coverage > 80%
- Memory usage stable
- Documentation complete

**Next Steps:**

1. Review and approve this specification
2. Proceed to implementation planning (writing-plans skill)
3. Execute tasks 7-21 using subagent-driven development
4. Runtime layer integration handled separately
