# Living City - Map-Based UI Design

**Date:** 2026-04-06
**Status:** Approved
**Related Issues:** N/A

## Overview

Transform the current card-based Living City interface into a fully map-based, interactive visualization system. The new design treats Infrastructure as Code (IaC) as a deployment architecture map that users can explore, providing a more engaging and immersive experience.

**Core Philosophy:** IaC is fundamentally a description of deployment architecture - visualize it as an explorable world map.

**Success Criteria:**
- Users can navigate deployment environments as geographical maps
- Interactive exploration (click, hover, drag, zoom) provides clear feedback
- Agent movements and tasks are visible on the map
- Strong sense of immersion and participation ("好玩、体验性强、代入感强")

## Architecture

### Current State

The current implementation uses a card-based layout:
- **Left (75%)**: Map area with district cards arranged in grids
- **Right (25%)**: AgentOfficePanel with agent cards and task dispatch
- **ViewSwitcher**: Top bar for switching dimensions (environment/resource/application)
- **AgentRenderer**: Canvas-based pixel sprite renderer overlay

**Files:**
- `src/components/map/CityMapComplete.tsx` - Main map component
- `src/components/map/DistrictRenderer.tsx` - Individual district card
- `src/components/map/AgentRenderer.tsx` - Canvas pixel sprite renderer
- `src/store/agents.ts` - Agent state management
- `src/store/districts.ts` - District state management

### Proposed Architecture

The new map-based system consists of these layers:

```
┌─────────────────────────────────────────────────────────────┐
│ UI Layer (React Components)                                 │
│ ├── MapCanvas (Canvas-based map renderer)                   │
│ ├── OverlayLayer (HTML overlays for tooltips, panels)       │
│ └── OfficePanel (Existing right-side panel)                 │
├─────────────────────────────────────────────────────────────┤
│ State Layer (Zustand Stores)                                │
│ ├── useMapStore (NEW: Map viewport, zoom level, selection)  │
│ ├── useAgentStore (EXISTING: Agent state)                   │
│ └── useDistrictStore (EXISTING: District state)             │
├─────────────────────────────────────────────────────────────┤
│ Rendering Layer (Canvas)                                     │
│ ├── MapRenderer (Draws buildings, connections, terrain)     │
│ ├── AgentRenderer (EXISTING: Pixel sprite animation)        │
│ └── EffectRenderer (Pulse, glow, data flow animations)      │
├─────────────────────────────────────────────────────────────┤
│ Interaction Layer                                            │
│ ├── PanController (Mouse/touch drag to pan)                 │
│ ├── ZoomController (Scroll wheel to zoom)                   │
│ ├── SelectionController (Click to select)                   │
│ └── PathController (Agent pathfinding and movement)         │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Canvas-based rendering for performance**
   - Map layers (buildings, connections) rendered on Canvas at 60fps
   - HTML overlays only for interactive elements (tooltips, panels)
   - Rationale: Smooth animations for agent movement, zoom, and pan

2. **Three-level zoom system**
   - Level 0 (World): Test Island + Prod Continent overview
   - Level 1 (Environment): Single environment with all buildings
   - Level 2 (Building): Individual building with internal instances
   - Rationale: Progressive disclosure of detail

3. **Preserve existing store structure**
   - No changes to `useAgentStore` and `useDistrictStore`
   - New `useMapStore` for map-specific state (viewport, zoom, selection)
   - Rationale: Minimal refactoring, clear separation of concerns

4. **Maintain right-side office panel**
   - Keep `AgentOfficePanel` unchanged
   - Panel is "home base" where agents rest and receive tasks
   - Rationale: User is satisfied with current office design

## Components

### New Components

#### MapCanvas (Canvas-based map renderer)

**Responsibility:** Render the interactive map with buildings, connections, and agents.

**Props:**
```typescript
interface MapCanvasProps {
  buildings: Building[]
  agents: Agent[]
  connections: Connection[]
  viewport: ViewportState
  zoom: ZoomLevel
  selection: SelectionState
  onBuildingClick: (buildingId: string) => void
  onAgentClick: (agentId: string) => void
  onViewportChange: (viewport: ViewportState) => void
  onZoomChange: (zoom: ZoomLevel) => void
}
```

**Implementation:**
- Single `<canvas>` element filling available space
- `requestAnimationFrame` loop for 60fps rendering
- Coordinate system: Map coordinates → Screen coordinates (viewport transform)
- Click detection: Reverse transform screen coordinates to map coordinates

**File:** `src/components/map/MapCanvas.tsx`

---

#### MapControls (Zoom and pan controls)

**Responsibility:** UI controls for map navigation.

**Props:**
```typescript
interface MapControlsProps {
  zoom: ZoomLevel
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  currentLocation: string
}
```

**Implementation:**
- Fixed position top-left overlay
- Buttons: [-] [+] [Reset]
- Breadcrumb display: "Test / Compute-A"

**File:** `src/components/map/MapControls.tsx`

---

#### BuildingDetailPanel (Slide-out panel for building details)

**Responsibility:** Display detailed information when a building is clicked.

**Props:**
```typescript
interface BuildingDetailPanelProps {
  building: Building
  onClose: () => void
  visible: boolean
}
```

**Implementation:**
- Slide-in animation from right (over office panel on mobile)
- Shows: Status, metrics, deployed services, recent events
- Action buttons: [View Logs] [Config] [Restart]

**File:** `src/components/map/BuildingDetailPanel.tsx`

---

#### Tooltip (Quick info on hover)

**Responsibility:** Show brief building/agent information on hover.

**Props:**
```typescript
interface TooltipProps {
  content: string
  position: { x: number; y: number }
  visible: boolean
}
```

**Implementation:**
- Follows mouse cursor
- Shows: "Compute-A: 15 instances" or "Scanner #1: Moving"

**File:** `src/components/map/Tooltip.tsx`

---

### Modified Components

#### CityMapComplete (Main container)

**Changes:**
- Replace district cards grid with `MapCanvas`
- Add `MapControls` overlay
- Add `BuildingDetailPanel` conditionally
- Keep `AgentOfficePanel` on right

**File:** `src/components/map/CityMapComplete.tsx` (modify existing)

---

### New Stores

#### useMapStore (Map viewport and selection state)

**State:**
```typescript
interface MapState {
  viewport: {
    x: number
    y: number
    width: number
    height: number
  }
  zoom: 'world' | 'environment' | 'building'
  selection: {
    type: 'building' | 'agent' | null
    id: string | null
  }
  hovered: {
    type: 'building' | 'agent' | null
    id: string | null
  }
}
```

**Actions:**
```typescript
interface MapActions {
  setViewport: (viewport: Partial<MapState['viewport']>) => void
  setZoom: (zoom: MapState['zoom']) => void
  setSelection: (selection: MapState['selection']) => void
  setHovered: (hovered: MapState['hovered']) => void
  resetView: () => void
  zoomToBuilding: (buildingId: string) => void
}
```

**File:** `src/store/mapStore.ts`

---

## Data Flow

### Initialization Flow

```
1. CityMapComplete mounts
   ↓
2. Initialize mapStore with default viewport
   ↓
3. Fetch districts from districtStore → Convert to buildings[]
   ↓
4. Fetch agents from agentStore
   ↓
5. Render MapCanvas with initial state
```

### User Interaction Flows

#### Click Building Flow

```
User clicks building on canvas
   ↓
MapCanvas onClick handler
   ↓
Reverse transform: screen(x,y) → map(x,y)
   ↓
Hit test: Check if any building at map(x,y)
   ↓
mapStore.setSelection({ type: 'building', id: 'compute-a' })
   ↓
CityMapComplete detects selection change
   ↓
BuildingDetailPanel slides in from right
   ↓
Fetch building details from districtStore
   ↓
Render details in panel
```

#### Zoom Flow

```
User scrolls mouse wheel OR clicks [+] button
   ↓
mapStore.setZoom('environment') (or next level)
   ↓
MapCanvas detects zoom change
   ↓
Update transform: scale *= 2
   ↓
Animate transition: Interpolate scale over 300ms
   ↓
Update viewport to center on target
   ↓
Render new zoom level
```

#### Agent Movement Flow

```
User assigns task in AgentOfficePanel
   ↓
agentStore.assignTask(agentId, taskId, targetBuildingId)
   ↓
Pathfinding: Calculate path from office → target
   ↓
agentStore.setAgentPath(agentId, path)
   ↓
AgentRenderer (EXISTING) updates agent position per frame
   ↓
MapCanvas draws agent at new position
   ↓
Agent reaches target → agentStore.updateAgentState(agentId, 'working')
   ↓
Agent displays working animation at building location
   ↓
Task complete → agentStore.completeTask(agentId, taskId)
   ↓
Agent returns to office
```

## Visual Design

### Color Scheme

```css
/* Backgrounds */
--bg-map: #1a1a2e;          /* Map background */
--bg-panel: #0f172a;        /* Panel background */
--bg-building: #1e293b;      /* Building background */

/* Environment colors */
--color-test: #3b82f6;       /* Test Island */
--color-prod: #f97316;       /* Prod Continent */

/* Status colors */
--status-healthy: #22c55e;   /* Healthy */
--status-warning: #f59e0b;   /* Warning */
--status-error: #ef4444;     /* Error */

/* Accent colors */
--accent-primary: #8b5cf6;   /* Primary selection */
--accent-secondary: #06b6d4; /* Secondary accent */
```

### Building Visual States

| State | Border Color | Animation | Shadow |
|------|--------------|-----------|--------|
| Normal | 2px solid transparent | None | None |
| Hovered | 3px solid var(--color-test) | Glow pulse (2s) | 0 0 20px rgba(59,130,246,0.5) |
| Selected | 3px solid var(--accent-primary) | Stronger glow | 0 0 30px rgba(139,92,246,0.8) |
| Healthy | 2px solid var(--status-healthy) | Breathe (2s) | 0 0 10px rgba(34,197,94,0.5) |
| Warning | 2px solid var(--status-warning) | Flash (0.5s) | 0 0 15px rgba(245,158,11,0.6) |
| Error | 2px solid var(--status-error) | Pulse (1s) | 0 0 20px rgba(239,68,68,0.8) |

### Layout Dimensions

**World View (zoom='world'):**
- Test Island: 400×300px, positioned at (100, 100)
- Prod Continent: 500×400px, positioned at (600, 100)
- Buildings: 60×60px cards

**Environment View (zoom='environment'):**
- Single environment centered
- Buildings: 120×100px cards with metrics
- Connections: Visible as lines between buildings

**Building View (zoom='building'):**
- Single building centered at 400×300px
- Internal layout: Grid of service instances (web-server × 5)

### Typography

```css
--font-family: 'Inter', system-ui, sans-serif;
--font-mono: 'Fira Code', 'Courier New', monospace;

--text-xs: 11px;   /* Building tags */
--text-sm: 12px;   /* Metrics */
--text-base: 14px; /* Building names */
--text-lg: 16px;   /* Section headers */
--text-xl: 20px;   /* Panel titles */
```

## Animation System

### Animation Types

1. **State Animations** (Building health status)
   - Breathe: `box-shadow` opacity 0.5 ↔ 0.8 over 2s
   - Flash: `border-color` toggle over 0.5s
   - Pulse: `box-shadow` size 20px ↔ 40px over 1s

2. **Transition Animations** (Zoom, pan)
   - Zoom: `scale` interpolation over 300ms (ease-out)
   - Pan: `translate` interpolation over 200ms (ease-out)

3. **Agent Animations** (EXISTING in AgentRenderer)
   - Walking: Sprite frame cycle (4 frames)
   - Working: Sprite frame cycle (2 frames)

4. **Data Flow Animations**
   - Connection particles: White dots moving along lines
   - Speed: 100px/s, evenly spaced

### Implementation

```typescript
// Animation loop in MapCanvas
function animate() {
  ctx.clearRect(0, 0, width, height)

  // Update animations
  updateStateAnimations(time)
  updateParticlePositions(deltaTime)

  // Render layers
  drawMapGrid(ctx)
  drawConnections(ctx)
  drawBuildings(ctx)
  drawAgents(ctx)
  drawEffects(ctx)

  requestAnimationFrame(animate)
}
```

## Error Handling

### Canvas Rendering Errors

**Scenario:** Browser doesn't support Canvas or WebGL context creation fails.

**Handling:**
- Try/catch around canvas initialization
- Fallback to static HTML-based map if Canvas unavailable
- Show error message: "Map rendering unavailable. Using basic view."

**File:** `src/components/map/MapCanvas.tsx`

---

### Hit Test Failures

**Scenario:** Click detection fails due to coordinate transform error.

**Handling:**
- Log error with coordinates and transform state
- Fallback: Select nearest building within threshold distance
- User feedback: None (silent fallback)

**File:** `src/components/map/MapCanvas.tsx`

---

### Zoom/Pan Bounds

**Scenario:** User pans map outside valid bounds.

**Handling:**
- Clamp viewport to map boundaries
- Show visual feedback: Map edge glows when at boundary
- Smooth bounce-back animation if dragged beyond limit

**File:** `src/components/map/MapCanvas.tsx`

---

## Testing Strategy

### Unit Tests

**MapCanvas Component:**
- Test viewport transform (map coords → screen coords)
- Test reverse transform (screen coords → map coords)
- Test hit detection (click on building)
- Test hit detection (click on empty space)

**MapStore:**
- Test viewport updates
- Test zoom level transitions
- Test selection state changes
- Test reset view

**Coordinate Transform:**
- Test transform at each zoom level
- Test transform with various viewport offsets
- Test edge cases (negative coordinates, large values)

### Integration Tests

**Click to Select Building:**
1. Render MapCanvas with test buildings
2. Simulate click at building coordinates
3. Assert mapStore selection is updated
4. Assert BuildingDetailPanel receives building prop

**Zoom Transition:**
1. Start at world view
2. Trigger zoom to environment
3. Assert smooth scale transition
4. Assert final viewport is correct

**Agent Movement:**
1. Assign task to agent
2. Assert path is calculated
3. Advance animation frames
4. Assert agent position updates along path

### Visual Regression Tests

- Capture screenshots at each zoom level
- Compare building renders across states (healthy/warning/error)
- Compare panel renders (tooltip, detail panel)

**Tools:** Playwright, Percy (optional)

### Performance Tests

- Render 100+ buildings at 60fps
- Pan/zoom with 20+ agents animating
- Memory leak detection (no growing Canvas buffers)

**File:** `src/components/map/MapCanvas.test.tsx`

## Accessibility

### Keyboard Navigation

- **Tab**: Focus selectable buildings (in order)
- **Enter/Space**: Select focused building
- **Escape**: Close detail panel / Deselect
- **Arrow keys**: Pan map (when map has focus)
- **+/-**: Zoom in/out

### Screen Reader Support

- Buildings have `role="button"` and `aria-label`
- Selection state announced: "Compute-A building selected"
- Status announced: "Compute-A, 15 instances, healthy"
- Zoom level announced: "Zoomed to environment view"

### Visual Accessibility

- Status colors have text labels ("Healthy", "Warning")
- Minimum contrast ratio: 4.5:1 for text
- Focus indicators: 2px solid outline
- Respect `prefers-reduced-motion` (disable animations)

**File:** `src/components/map/MapCanvas.tsx` (add ARIA attributes)

## Internationalization

### Text Strings

All user-facing text should be externalized:

```typescript
// src/i18n/locales/en.json
{
  "map.zoom.world": "World View",
  "map.zoom.environment": "Environment View",
  "map.zoom.building": "Building View",
  "map.building.healthy": "Healthy",
  "map.building.warning": "Warning",
  "map.building.error": "Error"
}

// src/i18n/locales/zh.json
{
  "map.zoom.world": "世界视图",
  "map.zoom.environment": "环境视图",
  "map.zoom.building": "建筑视图",
  "map.building.healthy": "健康",
  "map.building.warning": "警告",
  "map.building.error": "错误"
}
```

### Date/Number Formatting

- Use `Intl.NumberFormat` for instance counts, CPU percentages
- Use `Intl.DateTimeFormat` for event timestamps
- Respect user's locale settings

## Implementation Phases

### Phase 1: Basic Map Rendering (Foundation)

**Goals:**
- Canvas-based map renderer working
- Buildings render as colored rectangles
- Basic pan/drag interaction

**Tasks:**
1. Create `MapCanvas` component with `<canvas>` element
2. Implement coordinate transform system
3. Render buildings as simple rectangles
4. Implement mouse drag to pan
5. Add `useMapStore` with viewport state

**Success Criteria:**
- Map renders without errors
- User can drag to pan around
- Buildings are visible at correct positions

---

### Phase 2: Zoom System

**Goals:**
- Three-level zoom system working
- Smooth zoom transitions
- Zoom controls UI

**Tasks:**
1. Implement zoom levels in mapStore
2. Add zoom-to-mouse logic (scroll wheel)
3. Implement zoom transition animations
4. Create `MapControls` component with [+]/[-] buttons
5. Add breadcrumb display

**Success Criteria:**
- Scroll wheel zooms in/out smoothly
- [+]/[-] buttons work
- Transitions are smooth (300ms)
- Breadcrumb shows current location

---

### Phase 3: Selection and Details

**Goals:**
- Click to select buildings
- Slide-out detail panel
- Hover tooltips

**Tasks:**
1. Implement hit detection for clicks
2. Update selection state in mapStore
3. Create `BuildingDetailPanel` component
4. Create `Tooltip` component
5. Add hover state tracking

**Success Criteria:**
- Clicking building opens detail panel
- Panel shows correct building data
- Hovering shows tooltip
- ESC key closes panel

---

### Phase 4: Agent Integration

**Goals:**
- Agents visible on map
- Agent movement paths visible
- Click agent to see status

**Tasks:**
1. Integrate existing `AgentRenderer` with `MapCanvas`
2. Draw agent movement paths as dotted lines
3. Add agent click detection
4. Create agent status tooltip

**Success Criteria:**
- Agents visible at correct positions
- Paths visible when agent is moving
- Clicking agent shows status

---

### Phase 5: Visual Polish

**Goals:**
- Status animations (breathe, flash, pulse)
- Data flow animations on connections
- Building visual improvements (icons, shadows)

**Tasks:**
1. Implement state animation system
2. Add particle system for data flow
3. Draw building icons (emoji or SVG)
4. Add glow effects for hover/selection
5. Polish colors and shadows

**Success Criteria:**
- Building status is visually clear (animations)
- Data flow is visible
- Visuals match UX design

---

### Phase 6: Testing and Refinement

**Goals:**
- All tests passing
- Performance acceptable (60fps)
- Accessibility features working

**Tasks:**
1. Write unit tests for MapCanvas
2. Write integration tests for interactions
3. Add keyboard navigation
4. Add screen reader support
5. Performance profiling and optimization

**Success Criteria:**
- 100% of new code has tests
- 60fps maintained with 20+ agents
- Keyboard navigation works
- Screen reader announcements work

---

## Non-Goals (Explicitly Out of Scope)

These features are **NOT** part of this design:

- ❌ Terrain features (mountains, rivers, forests)
- ❌ Weather system (rain, snow, day/night)
- ❌ Fog of war (unexplored areas hidden)
- ❌ 3D rendering (isometric or perspective)
- ❌ Multi-user collaboration (real-time shared map)
- ❌ Map editor (create/edit infrastructure)
- ❌ Historical timeline (view past states)

**Rationale:** Focus on core interactive map experience. These can be future enhancements if needed.

## OpenCode Integration

### Overview

The Living City map interface integrates with **OpenCode** ([opencode.ai](https://opencode.ai)) as the primary data source for agents and deployment tasks. OpenCode is an AI-powered development platform that provides intelligent agents for infrastructure operations.

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ OpenCode Platform (opencode.ai)                             │
│ ├── Agent Registry (Scanner, Generator, Reviewer agents)    │
│ ├── Task Queue (Pending and running tasks)                  │
│ └── Deployment State (Changes, Runs, Resources)             │
└─────────────────────────────────────────────────────────────┘
                         ↓ API Calls
┌─────────────────────────────────────────────────────────────┐
│ Frontend: Living City Map                                   │
│ ├── MapCanvas (Visualizes agents on map)                    │
│ ├── AgentOfficePanel (Shows agent status from OpenCode)     │
│ └── Task Dispatch (Sends tasks to OpenCode agents)          │
└─────────────────────────────────────────────────────────────┘
```

### Current Integration (Mock)

**File:** `src/store/deployStore.ts`

The current implementation includes a mock OpenCode API:

```typescript
export const mockOpenCodeApi = {
  fetchAgentsForTask: async (taskType: 'scan' | 'generate') => {
    // Simulates fetching agents from OpenCode
    // Returns array of agents with id, name, task, duration
  }
}
```

**Agent Data Structure:**
```typescript
interface WorkerAgent {
  id: string          // OpenCode agent ID
  role: AgentRole     // 'scanner' | 'generator' | 'reviewer'
  name: string        // OpenCode agent name (e.g., "OpenCode-VPCScanner")
  icon: string        // Emoji icon for display
  status: AgentStatus // 'idle' | 'working' | 'thinking' | 'blocked' | 'done'
  currentTask: string // Current task description
}
```

### Integration Points

#### 1. Agent Office Panel Data

**Current:** Agent cards use mock data from `deployStore`

**Target:** All agent data comes from OpenCode API

**Implementation:**
- `AgentOfficePanel` reads from `useDeployStore` agents array
- `useDeployStore` fetches from `mockOpenCodeApi` (currently)
- Future: Replace mock with real OpenCode API calls

**Data Mapping:**
| OpenCode Response | Map Display |
|-------------------|-------------|
| `OpenCode-VPCScanner` | 🕵️ VPC Scanner |
| `OpenCode-DBScanner` | 🕵️ DB Scanner |
| `OpenCode-TerraformWriter` | 👨‍🎨 Terraform Writer |
| `OpenCode-SecurityChecker` | 👮 Security Checker |

#### 2. Task Dispatch

**Current:** `dispatchAgents()` in `useDeployStore` spawns mock agents

**Target:** Send tasks to OpenCode agents, receive status updates

**Flow:**
```
User clicks "Dispatch" in AgentOfficePanel
  ↓
useDeployStore.dispatchAgents()
  ↓
mockOpenCodeApi.fetchAgentsForTask(taskType)
  ↓
Spawn agents with OpenCode IDs
  ↓
Show agents moving on map (AgentRenderer)
  ↓
Agent completes task → Update OpenCode state
```

#### 3. Deployment State

**Current:** Changes, runs, and resources stored in `localStorage`

**Target:** Sync with OpenCode deployment state

**Data Types:**
- `DeployChange`: Deployment changes (from OpenCode)
- `DeployRun`: Deployment runs (from OpenCode)
- `ResourceChange`: Resource changes (from OpenCode)
- `InventoryItem`: Scanned resources (from OpenCode)

### API Integration Strategy

#### Phase 1: Mock API (Current)

**Status:** ✅ Implemented

**Description:** Use `mockOpenCodeApi` to simulate OpenCode responses

**Advantages:**
- No external dependencies
- Fast development
- Deterministic for testing

#### Phase 2: Real OpenCode API (Future)

**Implementation:**

1. **Create OpenCode Client**

```typescript
// src/lib/opencodeClient.ts
export class OpenCodeClient {
  private baseUrl: string
  private apiKey: string

  constructor(config: { baseUrl: string; apiKey: string }) {
    this.baseUrl = config.baseUrl
    this.apiKey = config.apiKey
  }

  async fetchAgents(taskType: 'scan' | 'generate'): Promise<WorkerAgent[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/agents`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
      body: JSON.stringify({ taskType })
    })
    return response.json()
  }

  async dispatchTask(agentId: string, task: Task): Promise<void> {
    await fetch(`${this.baseUrl}/api/v1/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ agentId, task })
    })
  }

  async getDeploymentState(): Promise<DeploymentState> {
    const response = await fetch(`${this.baseUrl}/api/v1/deployments`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    })
    return response.json()
  }
}
```

2. **Update Store to Use Real API**

```typescript
// src/store/deployStore.ts
const opencodeClient = new OpenCodeClient({
  baseUrl: import.meta.env.VITE_OPENCODE_BASE_URL,
  apiKey: import.meta.env.VITE_OPENCODE_API_KEY
})

// Replace mockOpenCodeApi.fetchAgentsForTask with
// opencodeClient.fetchAgents()
```

3. **Environment Configuration**

```bash
# .env.development
VITE_OPENCODE_BASE_URL=http://localhost:3000
VITE_OPENCODE_API_KEY=dev-key

# .env.production
VITE_OPENCODE_BASE_URL=https://api.opencode.ai
VITE_OPENCODE_API_KEY=${OPENCODE_API_KEY}
```

### Error Handling

**API Failure Fallback:**

```typescript
async function fetchAgentsWithFallback(taskType: 'scan' | 'generate') {
  try {
    // Try real OpenCode API
    return await opencodeClient.fetchAgents(taskType)
  } catch (error) {
    console.warn('OpenCode API unavailable, using mock agents')
    // Fallback to mock data
    return await mockOpenCodeApi.fetchAgentsForTask(taskType)
  }
}
```

**User Feedback:**
- Show toast notification when using fallback mode
- Display connection status indicator in UI
- Allow manual refresh to retry API connection

### Security Considerations

1. **API Key Storage**
   - Never commit API keys to git
   - Use environment variables
   - Rotate keys regularly

2. **CORS Configuration**
   - OpenCode API must allow CORS from frontend domain
   - Configure in OpenCode settings

3. **Rate Limiting**
   - Respect OpenCode API rate limits
   - Implement exponential backoff for retries
   - Cache agent lists where appropriate

### Testing Strategy

**Unit Tests:**
- Mock OpenCode API responses
- Test store actions with mock data
- Test error handling (API failures)

**Integration Tests:**
- Test full flow with mock OpenCode server
- Verify agent dispatch → movement → completion

**E2E Tests:**
- Test with real OpenCode sandbox environment
- Verify data sync between frontend and OpenCode

### Non-Goals (Out of Scope)

- ❌ Real-time WebSocket updates (use polling instead)
- ❌ OpenCode authentication flow (assume pre-configured API key)
- ❌ Custom OpenCode agent registration (use existing agents)

---

## Open Questions

### Q1: Should we animate agent transitions between zoom levels?

**Context:** When user zooms from world → environment, agent positions scale. Should agents animate to new positions or snap?

**Options:**
- A) Animate agent position during zoom transition (smoother, more complex)
- B) Keep agents at map coordinates, let zoom handle it (simpler)

**Recommendation:** Option B. Let the viewport zoom transform handle agent positions naturally. Agents are part of the map, not overlay UI.

---

### Q2: How should we handle very large maps (100+ buildings)?

**Context:** Performance could degrade with many buildings + agents + animations.

**Options:**
- A) Implement virtualization (only render visible viewport)
- B) Optimize rendering (batch draw calls, reduce effects)
- C) Set reasonable limit (e.g., max 50 buildings per environment)

**Recommendation:** Option B first. Implement canvas rendering optimizations (batch similar draw calls, use object pooling). If still insufficient, consider Option A.

---

### Q3: Should connection lines be visible at world view?

**Context:** At world view (test + prod both visible), should we show cross-environment connections (rare but possible)?

**Options:**
- A) Show all connections at all zoom levels (complete but cluttered)
- B) Only show connections within current environment (cleaner)
- C) Fade out connections at world view (compromise)

**Recommendation:** Option C. Show connections at all levels but reduce opacity at world view (20% vs 80% at environment view).

---

## Success Metrics

### User Engagement

- **Map exploration:** Users click on multiple buildings per session (target: 5+ clicks)
- **Zoom usage:** Users use zoom feature (target: 3+ zoom actions per session)
- **Agent visibility:** Users observe agent movements (target: agents clicked 2+ times)

### Performance

- **Frame rate:** Maintain 60fps with 20+ agents (measure: Chrome DevTools Performance)
- **Load time:** Initial render < 1s (measure: Lighthouse Performance score)
- **Memory:** No memory leaks after 10 minutes (measure: Chrome DevTools Memory profiler)

### Accessibility

- **Keyboard navigation:** All features accessible without mouse (test: keyboard-only user)
- **Screen reader:** All interactions announced (test: NVDA/JAWS)
- **Color contrast:** WCAG AA compliant (test: axe DevTools)

## References

- **Existing Implementation:** `src/components/map/CityMapComplete.tsx`
- **Agent Animation:** `src/components/map/AgentRenderer.tsx`
- **State Stores:** `src/store/agents.ts`, `src/store/districts.ts`
- **Pathfinding:** `src/utils/pathfinding.ts`
- **Sprite Data:** `src/utils/spriteData.ts`
- **UX Design:** Internal UX document (2026-04-06)

## Sign-Off

**Design Approved By:** User (2026-04-06)
**Ready for Implementation Planning:** Yes
**Next Step:** Invoke `superpowers:writing-plans` skill to create detailed implementation plan
