# OpenCode Web Integration Landing Blueprint

**Date:** 2026-04-06
**Status:** Design Phase
**Purpose:** Define the complete event flow from OpenCode backend to Living City UI

---

## Overview

This blueprint maps the complete integration path:
```
OpenCode Backend → SSE/WebSocket → Runtime Adapter → Projectors → Stores → UI
```

**Key Decisions:**
- **不借鉴 Pixel Agents 的宿主实现方式** (no VS Code extension)
- **借鉴交互范式** (office/agents/sub-agents/approval pattern)
- **保留城市投影特色** (这是核心竞争力)
- **职责分离**: deployStore (业务态) vs runtimeStore (实时态)

---

## Part 1: OpenCode Backend Event Specification

### Event Transport Protocol

**Recommended:** Server-Sent Events (SSE)
- ✅ Unidirectional (backend → frontend) - perfect for event streaming
- ✅ Auto-reconnect built-in
- ✅ HTTP-based (no WebSocket handshake complexity)
- ✅ Simple to implement with `EventSource`

**Alternative:** WebSocket (if bidirectional communication needed later)

### Event Format

All events follow this structure:

```typescript
interface OpenCodeEvent {
  eventId: string        // Unique event ID (UUID)
  eventType: string      // Event type (see catalog below)
  timestamp: number      // Unix timestamp (ms)
  sessionId: string      // OpenCode session identifier
  payload: unknown       // Event-specific payload
}
```

### Event Catalog

#### 1. Session Events

**session.started**
```typescript
{
  sessionId: string
  userId: string
  environment: 'dev' | 'stage' | 'prod'
  startTime: number
}
```

#### 2. Agent Lifecycle Events

**agent.spawned**
```typescript
{
  agentId: string
  agentType: 'scanner' | 'generator' | 'reviewer' | 'refinery'
  parentAgentId?: string    // For sub-agents
  name: string              // "OpenCode-VPCScanner"
  icon?: string             // Suggested emoji: 🕵️ for scanner, 👨‍🎨 for generator
  initialTask: string
}
```

**agent.status_changed**
```typescript
{
  agentId: string
  oldStatus: AgentStatus
  newStatus: AgentStatus
  reason?: string
}

type AgentStatus =
  | 'idle'       // Waiting for tasks
  | 'thinking'   // Planning/analyzing
  | 'working'    // Executing tools
  | 'blocked'    // Waiting for approval
  | 'done'       // Task complete
```

**agent.terminated**
```typescript
{
  agentId: string
  reason: 'completed' | 'error' | 'cancelled'
  finalStatus: AgentStatus
}
```

#### 3. Tool Execution Events

**tool.started**
```typescript
{
  agentId: string
  toolCallId: string
  toolName: string      // 'read', 'write', 'search', 'apply_terraform', etc.
  target?: string       // Resource being touched
  description: string
}
```

**tool.progress**
```typescript
{
  agentId: string
  toolCallId: string
  progress: number      // 0-100
  currentStep: string
}
```

**tool.completed**
```typescript
{
  agentId: string
  toolCallId: string
  toolName: string
  result: 'success' | 'failure' | 'cancelled'
  output?: string       // Tool output (truncated if too long)
  error?: string
}
```

#### 4. Approval Events

**approval.required**
```typescript
{
  approvalId: string
  agentId: string
  requesterName: string
  reason: string        // "Security policy requires approval"
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  context: {
    resourceType: string
    resourceName: string
    action: 'create' | 'update' | 'delete'
    riskTags: string[]
  }
  timeoutSeconds?: number
}
```

**approval.granted** / **approval.denied**
```typescript
{
  approvalId: string
  grantedBy: string
  comment?: string
  timestamp: number
}
```

#### 5. Artifact Events

**artifact.created**
```typescript
{
  artifactId: string
  agentId: string
  artifactType: 'iac_patch' | 'iac_project' | 'scan_report' | 'diff_analysis'
  summary: string
  files: Array<{
    path: string
    changeType: 'add' | 'modify' | 'delete'
    preview?: string  // First few lines
  }>
  metadata: {
    resourceCount: number
    riskTags: string[]
    estimatedCostDelta?: number
  }
}
```

#### 6. Deployment Events

**deploy.step_changed**
```typescript
{
  runId: string
  changeId: string
  environment: 'dev' | 'stage' | 'prod'
  oldStep: DeployStep
  newStep: DeployStep
  progress: number      // 0-100
}

type DeployStep =
  | 'syntax'         // Terraform syntax validation
  | 'plan'           // Plan generation
  | 'test_deploy'    // Staging deployment
  | 'prod_canary'    // Production canary
  | 'verify'         // Post-deployment verification
  | 'complete'       // Done
```

**deploy.resource_changed**
```typescript
{
  runId: string
  resourceId: string
  action: 'creating' | 'updating' | 'deleting'
  status: 'in_progress' | 'success' | 'failed'
  error?: string
}
```

**deploy.log_line**
```typescript
{
  runId: string
  level: 'info' | 'warn' | 'error'
  message: string
  timestamp: number
}
```

#### 7. Error Events

**error.occurred**
```typescript
{
  errorId: string
  agentId?: string
  errorType: 'validation' | 'execution' | 'system' | 'timeout'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  details?: string
  recoverable: boolean
}
```

---

## Part 2: Frontend Store Architecture

### Store Split Strategy

**deployStore (业务态)** - Persistent business results
```typescript
interface DeployState {
  // Changes (business entities)
  changes: DeployChange[]
  selectedChangeId: string | null

  // Workshop (artifact generation)
  workshop: WorkshopState | null

  // Runs (execution history)
  runs: DeployRun[]

  // Ledger (audit trail)
  ledger: LedgerEntry[]

  // Business actions
  createTask: (...) => string
  approveChange: (...) => void
  startRun: (...) => string
  // ... other business logic
}
```

**runtimeStore (实时态)** - Live agent/system status
```typescript
interface RuntimeState {
  // Session management
  sessions: Session[]
  activeSessionId: string | null

  // Live agents
  agents: RuntimeAgent[]
  agentEvents: AgentEvent[]

  // Pending approvals
  pendingApprovals: PendingApproval[]

  // Live logs (streaming)
  liveLogs: LiveLogEntry[]

  // Connection status
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'

  // Runtime actions
  connect: (url: string) => void
  disconnect: () => void
  grantApproval: (approvalId: string) => void
  denyApproval: (approvalId: string, reason: string) => void
}

interface RuntimeAgent {
  id: string
  type: 'scanner' | 'generator' | 'reviewer' | 'refinery'
  name: string
  icon: string
  status: AgentStatus
  currentTask: string
  parentId?: string           // For sub-agents
  spawnedAt: number
  lastActivityAt: number
  tools: ToolExecution[]      // Recent tool calls
}

interface AgentEvent {
  eventId: string
  agentId: string
  eventType: 'spawned' | 'status_changed' | 'tool_started' | 'tool_completed'
  timestamp: number
  details: unknown
}
```

---

## Part 3: Projector Mapping

### Office Projector (办公室投影)

**Maps runtime events → office agent states**

```typescript
// src/runtime/projectors/officeProjector.ts

export function projectAgentEvent(event: OpenCodeEvent): AgentUpdate | null {
  switch (event.eventType) {
    case 'agent.spawned':
      return {
        type: 'add_agent',
        agent: {
          id: event.payload.agentId,
          role: mapAgentType(event.payload.agentType),
          name: event.payload.name,
          icon: event.payload.icon ?? getDefaultIcon(event.payload.agentType),
          status: 'idle',
          currentTask: event.payload.initialTask,
        }
      }

    case 'agent.status_changed':
      return {
        type: 'update_status',
        agentId: event.payload.agentId,
        newStatus: event.payload.newStatus,
        reason: event.payload.reason
      }

    case 'tool.started':
      return {
        type: 'update_task',
        agentId: event.payload.agentId,
        newTask: formatToolTask(event.payload.toolName, event.payload.target)
      }

    case 'approval.required':
      return {
        type: 'add_approval',
        approval: {
          id: event.payload.approvalId,
          agentId: event.payload.agentId,
          requester: event.payload.requesterName,
          reason: event.payload.reason,
          riskLevel: event.payload.riskLevel,
          context: event.payload.context
        }
      }

    default:
      return null
  }
}
```

### City Projector (城市投影)

**Maps runtime events → city animation events**

```typescript
// src/runtime/projectors/cityProjector.ts

export function projectCityEvent(event: OpenCodeEvent): CityAnimationEvent | null {
  switch (event.eventType) {
    case 'tool.started':
      const toolType = event.payload.toolName

      // Map tool actions to city animations
      if (toolType === 'read' || toolType === 'search') {
        return {
          type: 'scan_animation',
          buildingId: inferBuildingFromTarget(event.payload.target),
          animation: 'scanning',
          color: '#3b82f6',  // Blue for reading/searching
          duration: 3000
        }
      }

      if (toolType === 'write' || toolType === 'apply_terraform') {
        return {
          type: 'build_animation',
          buildingId: inferBuildingFromTarget(event.payload.target),
          animation: 'constructing',
          color: '#10b981',  // Green for building
          duration: 5000
        }
      }

      return null

    case 'deploy.resource_changed':
      return {
        type: 'resource_animation',
        buildingId: mapResourceToBuilding(event.payload.resourceId),
        action: event.payload.action,
        status: event.payload.status,
        progress: 0  // Will be updated by subsequent events
      }

    case 'artifact.created':
      return {
        type: 'artifact_ready',
        artifactType: event.payload.artifactType,
        buildingId: 'workshop',  // Artifacts appear in workshop
        metadata: event.payload.metadata
      }

    default:
      return null
  }
}
```

### Run Projector (Run页面投影)

**Maps deployment events → Run timeline updates**

```typescript
// src/runtime/projectors/runProjector.ts

export function projectRunEvent(event: OpenCodeEvent): RunUpdate | null {
  switch (event.eventType) {
    case 'deploy.step_changed':
      return {
        type: 'step_update',
        runId: event.payload.runId,
        currentStep: event.payload.newStep,
        progress: event.payload.progress,
        timestamp: event.timestamp
      }

    case 'deploy.log_line':
      return {
        type: 'log_entry',
        runId: event.payload.runId,
        log: {
          id: generateId(),
          at: event.payload.timestamp,
          level: event.payload.level,
          message: event.payload.message
        }
      }

    case 'deploy.resource_changed':
      return {
        type: 'resource_update',
        runId: event.payload.runId,
        resourceId: event.payload.resourceId,
        action: event.payload.action,
        status: event.payload.status,
        error: event.payload.error
      }

    default:
      return null
  }
}
```

---

## Part 4: UI Consumption

### AgentOfficePanel (办公室面板)

**Consumes from:** `runtimeStore`

```typescript
function AgentOfficePanel() {
  const agents = useRuntimeStore((state) => state.agents)
  const pendingApprovals = useRuntimeStore((state) => state.pendingApprovals)

  // Display live agents
  return (
    <div>
      {agents.map(agent => (
        <AgentCard
          key={agent.id}
          name={agent.name}
          icon={agent.icon}
          status={agent.status}
          currentTask={agent.currentTask}
        />
      ))}

      {/* Approval queue */}
      {pendingApprovals.map(approval => (
        <ApprovalCard
          key={approval.id}
          {...approval}
          onApprove={() => grantApproval(approval.id)}
          onDeny={(reason) => denyApproval(approval.id, reason)}
        />
      ))}
    </div>
  )
}
```

### CityHudMap (城市主视图)

**Consumes from:** `runtimeStore` + `deployStore`

```typescript
function CityHudMap() {
  // Real-time animations from runtime
  const cityAnimations = useRuntimeStore((state) => state.cityAnimations)

  // Business entities from deployStore
  const changes = useDeployStore((state) => state.changes)
  const resources = useDeployStore((state) => state.resources)

  // Render buildings with live overlays
  return (
    <MapCanvas
      buildings={convertToBuildings(changes, resources)}
      animations={cityAnimations}  // Live scan/build animations
    />
  )
}
```

### AgentLedgerDrawer (台账抽屉)

**Consumes from:** `runtimeStore.liveLogs` + `deployStore.ledger`

```typescript
function AgentLedgerDrawer() {
  // Live runtime logs
  const liveLogs = useRuntimeStore((state) => state.liveLogs)

  // Business audit trail
  const businessLedger = useDeployStore((state) => state.ledger)

  // Merge and display chronologically
  const allLogs = useMemo(
    () => [...liveLogs, ...businessLedger].sort(byTimestamp),
    [liveLogs, businessLedger]
  )

  return <LogTimeline logs={allLogs} />
}
```

### Run Page (运行页面)

**Consumes from:** `runtimeStore.runUpdates` + `deployStore.runs`

```typescript
function RunPage({ runId }: { runId: string }) {
  // Real-time updates
  const runUpdates = useRuntimeStore(
    (state) => state.runUpdates[runId]
  )

  // Business run record
  const run = useDeployStore(
    (state) => state.runs.find(r => r.id === runId)
  )

  return (
    <RunTimeline
      currentStep={runUpdates?.currentStep ?? run?.currentStep}
      progress={runUpdates?.progress ?? run?.progress}
      logs={runUpdates?.logs ?? run?.logs}
      resourceStatus={runUpdates?.resources}
    />
  )
}
```

---

## Part 5: Implementation Phases

### Phase 1: Runtime Layer Foundation (不阻塞UI)

**Create these files:**
1. `src/runtime/opencode/types.ts` - Event type definitions
2. `src/runtime/opencode/client.ts` - SSE client
3. `src/runtime/opencode/adapter.ts` - Event standardization
4. `src/store/runtimeStore.ts` - Runtime state store
5. `src/runtime/projectors/officeProjector.ts` - Office projection
6. `src/runtime/projectors/cityProjector.ts` - City projection
7. `src/runtime/projectors/runProjector.ts` - Run projection

**Deliverable:** Runtime layer can consume mock events, no UI integration yet.

### Phase 2: Store Migration (不阻塞UI)

**Modify:**
1. Remove `mockOpenCodeApi` from `deployStore.ts`
2. Update UI components to read from both stores:
   - `AgentOfficePanel` → `runtimeStore.agents`
   - `CityHudMap` → `runtimeStore.animations` + `deployStore.changes`
   - `AgentLedgerDrawer` → `runtimeStore.liveLogs` + `deployStore.ledger`

**Deliverable:** UI can consume real runtime events (if connected).

### Phase 3: OpenCode Backend Integration (最终接入)

**Backend work (out of scope for frontend):**
- Implement SSE endpoint
- Emit events per catalog
- Handle authentication

**Frontend work:**
- Replace mock event source with real SSE URL
- Add authentication headers
- Test with real OpenCode session

**Deliverable:** End-to-end OpenCode integration.

---

## Part 6: Event Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        OpenCode Backend                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Agent System │  │ Deploy Engine│  │  Approval    │  │ Artifact     │ │
│  │              │  │              │  │  System      │  │ Generator    │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                 │                 │         │
│         └─────────────────┴─────────────────┴─────────────────┘         │
│                           │                                            │
│                    Event Bus                                            │
│                           │                                            │
└───────────────────────────┼────────────────────────────────────────────┘
                            │
                            │ SSE (HTTP streaming)
                            │
┌───────────────────────────┼────────────────────────────────────────────┐
│                    Frontend Runtime Layer                              │
│                           │                                            │
│                    ┌──────▼──────┐                                     │
│                    │   client.ts  │  <- EventSource connection          │
│                    └──────┬──────┘                                     │
│                           │                                            │
│                    ┌──────▼──────┐                                     │
│                    │  adapter.ts │  <- Standardize events               │
│                    └──────┬──────┘                                     │
│                           │                                            │
│         ┌─────────────────┼─────────────────┐                          │
│         │                 │                 │                          │
│    ┌────▼─────┐     ┌────▼─────┐     ┌────▼─────┐                     │
│    │  office   │     │   city   │     │   run    │                     │
│    │ projector │     │ projector│     │ projector│                     │
│    └────┬─────┘     └────┬─────┘     └────┬─────┘                     │
│         │                 │                 │                          │
│         └─────────────────┼─────────────────┘                          │
│                           │                                            │
│                    ┌──────▼──────┐                                     │
│                    │runtimeStore │  <- Live state                       │
│                    └──────┬──────┘                                     │
└───────────────────────────┼────────────────────────────────────────────┘
                            │
┌───────────────────────────┼────────────────────────────────────────────┐
│                      UI Components                                      │
│                           │                                            │
│         ┌─────────────────┼─────────────────┐                          │
│         │                 │                 │                          │
│    ┌────▼─────┐     ┌────▼─────┐     ┌────▼─────┐                     │
│    │  Agent   │     │   City   │     │   Run    │                     │
│    │  Office  │     │    Map   │     │   Page   │                     │
│    │  Panel   │     │          │     │          │                     │
│    └────┬─────┘     └────┬─────┘     └────┬─────┘                     │
│         │                 │                 │                          │
│         └─────────────────┼─────────────────┘                          │
│                           │                                            │
│                    ┌──────▼──────┐                                     │
│                    │deployStore  │  <- Business state                  │
│                    │  (unchanged)│                                     │
│                    └─────────────┘                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Part 7: Key Architectural Decisions

### Decision 1: SSE vs WebSocket

**Chosen:** SSE (Server-Sent Events)

**Why:**
- OpenCode → Frontend is unidirectional (event streaming)
- SSE auto-reconnects out of the box
- Simpler authentication (HTTP headers)
- Built-in event ID support for reconnection

**Trade-off:** If we later need bidirectional (frontend → OpenCode), migrate to WebSocket.

### Decision 2: Store Split

**Chosen:** deployStore + runtimeStore (separate)

**Why:**
- deployStore is growing large (changes, runs, workshop, ledger, agents)
- Runtime events are high-frequency (tool calls, status changes)
- Different persistence needs (localStorage vs ephemeral)
- Easier to test runtime layer in isolation

**Alternative rejected:** Single store with everything (too complex).

### Decision 3: Projector Pattern

**Chosen:** Separate projector files (office/city/run)

**Why:**
- Clear mapping: "这个事件怎么映射到UI"
- Easy to test: Input event → Output UI state
- Independent evolution: City animations don't block office updates
- Matches existing projection.ts pattern

**Alternative rejected:** Inline event handling in components (hard to test).

### Decision 4: Mock-First Development

**Chosen:** Build runtime layer with mock events, integrate real OpenCode later

**Why:**
- UI tasks (Tasks 7-21) can proceed independently
- Runtime architecture can be validated with mock data
- OpenCode backend may not be ready yet
- Lower risk: Can test UI without full stack

**Migration path:** Replace `mockEventSource` with real `EventSource` when backend ready.

---

## Part 8: Testing Strategy

### Unit Tests

**client.ts:**
```typescript
describe('OpenCodeClient', () => {
  it('connects to SSE endpoint', async () => {
    const client = new OpenCodeClient('http://localhost:3000/events')
    await client.connect()
    expect(client.connected).toBe(true)
  })

  it('reconnects on disconnect', async () => {
    // Test auto-reconnect logic
  })
})
```

**adapter.ts:**
```typescript
describe('EventAdapter', () => {
  it('standardizes agent.spawned event', () => {
    const raw = { eventType: 'agent.spawned', payload: {...} }
    const standardized = adapter.adapt(raw)
    expect(standardized.type).toBe('agent_spawned')
  })
})
```

**officeProjector.ts:**
```typescript
describe('OfficeProjector', () => {
  it('maps tool.started to agent task update', () => {
    const event = createToolStartedEvent()
    const update = projectAgentEvent(event)
    expect(update.type).toBe('update_task')
  })
})
```

### Integration Tests

**Runtime flow:**
```typescript
describe('Runtime Integration', () => {
  it('processes event flow end-to-end', async () => {
    const store = createRuntimeStore()
    const client = new OpenCodeClient(mockUrl)

    await client.connect()
    await client.processEvent(agentSpawnedEvent)
    await client.processEvent(toolStartedEvent)

    expect(store.agents).toHaveLength(1)
    expect(store.agents[0].currentTask).toContain('read')
  })
})
```

### E2E Tests

**Full OpenCode flow:**
- Start mock OpenCode server
- Connect frontend client
- Trigger agent spawn
- Verify office panel shows agent
- Trigger tool execution
- Verify city shows animation
- Trigger approval request
- Verify approval card appears

---

## Part 9: Migration Checklist

When migrating from mock to real OpenCode:

**Backend:**
- [ ] Implement SSE endpoint at `/api/events`
- [ ] Emit events per catalog (17 event types)
- [ ] Add authentication (JWT/token)
- [ ] Test with curl/browser

**Frontend:**
- [ ] Replace `MOCK_EVENT_SOURCE` with real URL
- [ ] Add auth headers to EventSource
- [ ] Test connection
- [ ] Verify all projectors handle real events
- [ ] Remove `mockOpenCodeApi` from deployStore
- [ ] Update all UI components to use runtimeStore
- [ ] Add error handling (disconnect, timeout)
- [ ] Add connection status indicator

**Testing:**
- [ ] Unit tests for all projectors
- [ ] Integration tests for runtime flow
- [ ] E2E tests with mock backend
- [ ] Manual testing with real OpenCode session

---

## Part 10: Rollout Strategy

**Stage 1: Runtime Layer (当前可以并行)**
- Build runtime layer foundation
- Use mock event source
- No UI integration yet

**Stage 2: UI Integration (当前可以并行)**
- Continue remaining 15 UI tasks (Tasks 7-21)
- Build MapControls, Tooltips, Details, etc.
- Keep using mockOpenCodeApi temporarily

**Stage 3: Store Migration (UI完成后)**
- Migrate AgentOfficePanel to runtimeStore
- Migrate CityHudMap to hybrid (runtime + deployStore)
- Remove mockOpenCodeApi

**Stage 4: OpenCode Backend (最后接入)**
- Implement SSE backend
- Replace mock with real events
- Full E2E testing

---

## Success Criteria

✅ **All OpenCode events from catalog are emitted by backend**
✅ **Frontend consumes events via SSE without errors**
✅ **Office agents spawn/update in real-time**
✅ **City shows scan/build animations**
✅ **Run page updates timeline live**
✅ **Approvals flow through system**
✅ **Zero data loss during reconnection**
✅ **UI remains responsive under high event frequency**

---

## Open Questions

1. **Event throttling:** Should we throttle high-frequency events (tool.progress)?
   - *Recommendation:* Throttle client-side, emit normally from backend

2. **Event persistence:** Should we persist runtime events to localStorage?
   - *Recommendation:* No, runtime events are ephemeral. Only business results persist.

3. **Reconnection strategy:** How to handle missed events during disconnect?
   - *Recommendation:* On reconnect, emit `session.resync` with last known event ID

4. **Multi-user support:** Can multiple users watch same OpenCode session?
   - *Recommendation:* Yes, SSE fanout to multiple clients

---

## Appendix: Event Examples

### Example Flow: Agent Scanning Resources

```typescript
// 1. Agent spawns
{
  eventId: "evt_001",
  eventType: "agent.spawned",
  timestamp: 1680000000000,
  payload: {
    agentId: "ag_scan_1",
    agentType: "scanner",
    name: "OpenCode-VPCScanner",
    icon: "🕵️",
    initialTask: "Scanning VPC resources..."
  }
}

// 2. Agent starts reading
{
  eventId: "evt_002",
  eventType: "tool.started",
  timestamp: 1680000001000,
  payload: {
    agentId: "ag_scan_1",
    toolCallId: "tc_001",
    toolName: "read",
    target: "aws_vpc.main",
    description: "Reading VPC configuration"
  }
}

// 3. Tool completes
{
  eventId: "evt_003",
  eventType: "tool.completed",
  timestamp: 1680000003000,
  payload: {
    agentId: "ag_scan_1",
    toolCallId: "tc_001",
    toolName: "read",
    result: "success"
  }
}

// 4. Agent finishes
{
  eventId: "evt_004",
  eventType: "agent.terminated",
  timestamp: 1680000010000,
  payload: {
    agentId: "ag_scan_1",
    reason: "completed",
    finalStatus: "done"
  }
}
```

### Example Flow: Deployment with Approval

```typescript
// 1. Approval required
{
  eventId: "evt_101",
  eventType: "approval.required",
  timestamp: 1680000100000,
  payload: {
    approvalId: "apr_001",
    agentId: "ag_reviewer",
    requesterName: "OpenCode-SecurityChecker",
    reason: "IAM policy change requires approval",
    riskLevel: "high",
    context: {
      resourceType: "aws_iam_policy",
      resourceName: "s3_access_policy",
      action: "update",
      riskTags: ["iam", "data"]
    }
  }
}

// 2. Approval granted
{
  eventId: "evt_102",
  eventType: "approval.granted",
  timestamp: 1680000150000,
  payload: {
    approvalId: "apr_001",
    grantedBy: "user@example.com",
    comment: "Approved after review"
  }
}

// 3. Deployment continues
{
  eventId: "evt_103",
  eventType: "deploy.step_changed",
  timestamp: 1680000160000,
  payload: {
    runId: "run_001",
    changeId: "chg_001",
    newStep: "prod_canary",
    progress: 65
  }
}
```
