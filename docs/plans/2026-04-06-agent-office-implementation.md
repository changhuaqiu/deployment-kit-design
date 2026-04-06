# Agent Office Integration Implementation Plan

> **For execution:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate a minimal 2D "Construction Company Office" into the right HUD panel to visualize worker agents (Polecats) and the review queue (Refinery), backed by a simulated agent state in Zustand.

**Architecture:** 
1. Expand `deployStore.ts` to manage `AgentState` (workers, tasks, logs).
2. Split the right HUD panel in `CityHudMap.tsx` into a smaller `Tools` section and a new `AgentOfficePanel.tsx`.
3. Create an `AgentLedgerDrawer.tsx` to show the detailed logs (Beads) when clicking an agent.
4. Wire the existing bottom action buttons (Scan, Generate) to trigger agent animations before completing the actual state changes.

**Tech Stack:** React, Zustand, TailwindCSS

---

### Task 1: Update Store with Agent State

**Files:**
- Modify: `frontend/pixel-prototype/src/store/deployStore.ts`

- [ ] **Step 1: Define Agent Types**
Add these types near the top of the file:
```typescript
export type AgentStatus = 'idle' | 'working' | 'thinking' | 'blocked' | 'done';
export type AgentRole = 'scanner' | 'generator' | 'reviewer';

export interface WorkerAgent {
  id: string;
  role: AgentRole;
  name: string;
  icon: string;
  status: AgentStatus;
  currentTask: string;
}

export interface LedgerEntry {
  id: string;
  timestamp: number;
  agentId: string;
  agentName: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error';
}
```

- [ ] **Step 2: Add Agent State to DeployState**
Update `DeployState` interface:
```typescript
  agents: WorkerAgent[]
  ledger: LedgerEntry[]
  refineryQueue: number
  triggerAgentTask: (role: AgentRole, taskName: string, durationMs: number, onComplete: () => void) => void
  addLedgerEntry: (agentId: string, message: string, type?: LedgerEntry['type']) => void
  approveRefinery: () => void
```

- [ ] **Step 3: Implement Initial Agent State**
Update the `useDeployStore` initialization:
```typescript
  agents: [
    { id: 'ag_scan', role: 'scanner', name: '普查员', icon: '🕵️', status: 'idle', currentTask: 'Zzz...' },
    { id: 'ag_gen', role: 'generator', name: '绘图员', icon: '👨‍🎨', status: 'idle', currentTask: 'Zzz...' },
    { id: 'ag_rev', role: 'reviewer', name: '监工', icon: '👮', status: 'idle', currentTask: 'Zzz...' }
  ],
  ledger: [],
  refineryQueue: 0,
```

- [ ] **Step 4: Implement Agent Actions**
Add the action implementations in `useDeployStore`:
```typescript
  addLedgerEntry: (agentId, message, type = 'info') => set((s) => {
    const agent = s.agents.find(a => a.id === agentId)
    const entry: LedgerEntry = {
      id: uid('log'),
      timestamp: Date.now(),
      agentId,
      agentName: agent?.name ?? 'System',
      message,
      type
    }
    return { ledger: [...s.ledger, entry] }
  }),

  triggerAgentTask: (role, taskName, durationMs, onComplete) => {
    const s = get()
    const agent = s.agents.find(a => a.role === role)
    if (!agent) return

    set((state) => ({
      agents: state.agents.map(a => a.id === agent.id ? { ...a, status: 'working', currentTask: taskName } : a)
    }))
    
    s.addLedgerEntry(agent.id, `Started task: ${taskName}`, 'info')

    setTimeout(() => {
      set((state) => ({
        agents: state.agents.map(a => a.id === agent.id ? { ...a, status: 'idle', currentTask: 'Zzz...' : a }),
        refineryQueue: role === 'generator' ? state.refineryQueue + 1 : state.refineryQueue
      }))
      get().addLedgerEntry(agent.id, `Completed task: ${taskName}`, 'success')
      
      if (role === 'generator') {
        const rev = get().agents.find(a => a.role === 'reviewer')
        if (rev) {
           set((state) => ({
             agents: state.agents.map(a => a.id === rev.id ? { ...a, status: 'thinking', currentTask: 'Checking compliance...' } : a)
           }))
           setTimeout(() => {
             set((state) => ({
               agents: state.agents.map(a => a.id === rev.id ? { ...a, status: 'idle', currentTask: 'Awaiting Signature' } : a)
             }))
             get().addLedgerEntry(rev.id, 'Inspection complete. Ready for approval.', 'warn')
           }, 1000)
        }
      }
      onComplete()
    }, durationMs)
  },

  approveRefinery: () => set((s) => {
    s.addLedgerEntry('ag_rev', 'Approved by Mayor.', 'success')
    return { refineryQueue: Math.max(0, s.refineryQueue - 1) }
  }),
```

---

### Task 2: Create Agent Office Panel Component

**Files:**
- Create: `frontend/pixel-prototype/src/components/city/AgentOfficePanel.tsx`

- [ ] **Step 1: Write AgentOfficePanel component**
```tsx
import { useDeployStore } from '@/store/deployStore'

export default function AgentOfficePanel({ onOpenLedger }: { onOpenLedger: () => void }) {
  const agents = useDeployStore(s => s.agents)
  const queue = useDeployStore(s => s.refineryQueue)
  const approve = useDeployStore(s => s.approveRefinery)

  const workers = agents.filter(a => a.role !== 'reviewer')
  const reviewer = agents.find(a => a.role === 'reviewer')

  return (
    <div className="flex h-full flex-col overflow-hidden px-panel p-2">
      <div className="text-center text-[10px] text-[var(--px-warn)] mb-2">👷 施工队</div>
      
      {/* Polecats Zone */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {workers.map(ag => (
          <button 
            key={ag.id}
            onClick={onOpenLedger}
            className="w-full text-left rounded border border-[var(--px-border)] bg-[var(--px-panel-2)] p-2 hover:border-[var(--px-info)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm">{ag.icon} {ag.name}</span>
              <span className="text-[10px]">
                {ag.status === 'working' ? '🔨' : ag.status === 'blocked' ? '🚨' : 'Zzz'}
              </span>
            </div>
            <div className="mt-1 truncate text-[9px] text-[var(--px-muted)]" title={ag.currentTask}>
              {ag.currentTask}
            </div>
          </button>
        ))}
      </div>

      {/* Refinery Zone */}
      <div className="mt-2 border-t border-[var(--px-border)] pt-2">
         <div className="flex items-center justify-between bg-[var(--px-panel-2)] p-2 rounded border border-[var(--px-border)]">
           <div className="flex flex-col items-center cursor-pointer" onClick={onOpenLedger}>
             <span className="text-sm">{reviewer?.icon}</span>
             <span className="text-[9px] mt-1">{reviewer?.status === 'thinking' ? '💭' : 'Zzz'}</span>
           </div>
           <div className="flex-1 text-center">
             <div className="text-[10px] mb-1">📥 质检台 ({queue})</div>
             {queue > 0 && (
               <button 
                 onClick={approve}
                 className="px-btn h-6 px-2 text-[9px] bg-yellow-600/20 border-yellow-500 text-yellow-500 animate-pulse"
               >
                 🟨 签字
               </button>
             )}
           </div>
         </div>
      </div>
    </div>
  )
}
```

---

### Task 3: Create Ledger Drawer Component

**Files:**
- Create: `frontend/pixel-prototype/src/components/city/AgentLedgerDrawer.tsx`

- [ ] **Step 1: Write AgentLedgerDrawer component**
```tsx
import Drawer from '@/components/ui/Drawer'
import { useDeployStore } from '@/store/deployStore'

export default function AgentLedgerDrawer({ open, onClose }: { open: boolean, onClose: () => void }) {
  const ledger = useDeployStore(s => s.ledger)

  return (
    <Drawer open={open} onClose={onClose} title="📜 工程台账 (Beads Ledger)">
      <div className="flex flex-col gap-3 p-4">
        {ledger.length === 0 ? (
          <div className="text-sm text-[var(--px-muted)]">暂无施工记录。</div>
        ) : (
          ledger.map(entry => (
            <div key={entry.id} className="text-xs font-mono border-b border-[var(--px-border)] pb-2">
              <span className="text-[var(--px-muted)]">
                [{new Date(entry.timestamp).toLocaleTimeString()}]
              </span>
              <span className="ml-2 font-bold">{entry.agentName}:</span>
              <span className={`ml-2 ${
                entry.type === 'error' ? 'text-red-400' :
                entry.type === 'warn' ? 'text-yellow-400' :
                entry.type === 'success' ? 'text-green-400' : 'text-[var(--px-text)]'
              }`}>
                {entry.message}
              </span>
            </div>
          ))
        )}
      </div>
    </Drawer>
  )
}
```

---

### Task 4: Integrate into HUD Map

**Files:**
- Modify: `frontend/pixel-prototype/src/components/city/CityHudMap.tsx`

- [ ] **Step 1: Add imports and state**
```tsx
import AgentOfficePanel from './AgentOfficePanel'
import AgentLedgerDrawer from './AgentLedgerDrawer'
// ... inside component ...
const [ledgerOpen, setLedgerOpen] = useState(false)
const triggerAgentTask = useDeployStore(s => s.triggerAgentTask)
```

- [ ] **Step 2: Adjust Right Panel Layout**
Find the right absolute div and split it.
Replace:
```tsx
      <div className="absolute right-3 top-1/2 z-30 -translate-y-1/2 px-panel px-font w-[108px] p-3">
        <div className="text-center text-[10px] text-[var(--px-warn)]">🏗 TOOLS</div>
        {/* ... tools map ... */}
      </div>
```
With:
```tsx
      <div className="absolute right-3 top-16 bottom-16 z-30 w-[120px] flex flex-col gap-3">
        {/* Tools Section */}
        <div className="px-panel px-font p-2 flex-1 overflow-y-auto">
          <div className="text-center text-[10px] text-[var(--px-warn)] mb-2">🏗 TOOLS</div>
          <div className="grid grid-cols-1 gap-2">
            {tools.map((t) => {
              const active = selectedTool === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setSelectedTool((v) => (v === t.key ? null : t.key))}
                  className={
                    'rounded-md border-2 px-2 py-2 text-[9px] shadow-[3px_3px_0_rgba(0,0,0,0.55)] transition ' +
                    (active
                      ? 'border-[var(--px-warn)] bg-[rgba(243,156,18,0.22)]'
                      : 'border-[var(--px-border)] bg-[var(--px-panel-2)] hover:translate-x-[-1px] hover:translate-y-[-1px]')
                  }
                >
                  <div className="text-[18px] leading-none">{iconForTool(t.key)}</div>
                  <div className="mt-1 text-center">{t.label}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Agent Office Section */}
        <div className="h-[200px]">
           <AgentOfficePanel onOpenLedger={() => setLedgerOpen(true)} />
        </div>
      </div>
```

- [ ] **Step 3: Wire Action Buttons to Agents**
Find the bottom action buttons. Replace the `onClick` handlers:
```tsx
        <button
          className="px-btn h-10 px-4"
          onClick={() => {
            if (selectedChange) {
              triggerAgentTask('scanner', 'Scanning resources...', 2000, () => {
                runWorkshopScan(selectedChange.id)
              })
            }
          }}
        >
          🔭 普查
        </button>
        {/* ... */}
        <button
          className="px-btn h-10 px-4"
          onClick={() => {
            if (selectedChange) {
              triggerAgentTask('generator', 'Generating IaC Patch...', 2500, () => {
                runWorkshopGenerate(selectedChange.id)
              })
            }
          }}
        >
          📝 代码
        </button>
```

- [ ] **Step 4: Add Ledger Drawer to rendering tree**
Add right before the closing `</div>` of the component:
```tsx
      <AgentLedgerDrawer open={ledgerOpen} onClose={() => setLedgerOpen(false)} />
```
