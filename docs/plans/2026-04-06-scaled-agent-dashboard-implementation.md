# Scaled Agent Dashboard Implementation Plan

> **For execution:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the right side of the HUD into a fully scalable "Agent Dashboard", removing manual tools entirely. Implement dynamic sub-agent spawning to mimic real multi-agent orchestration (like gastown/OpenCode).

**Architecture:**
1. Update `deployStore.ts` to allow dynamic dispatch of multiple agents.
2. Completely rewrite `AgentOfficePanel.tsx` to occupy the full height of the right panel, splitting it into a fixed "Refinery/Deacon" zone and a scrollable "Polecat Worker Pool".
3. Update `CityHudMap.tsx` to remove the `TOOLS` palette completely and adjust layout bounds.

**Tech Stack:** React, Zustand, TailwindCSS

---

### Task 1: Update Store for Dynamic Agents

**Files:**
- Modify: `frontend/pixel-prototype/src/store/deployStore.ts`

- [ ] **Step 1: Update Store Interface**
Replace `triggerAgentTask` with `dispatchAgents` in `DeployState`:
```typescript
  dispatchAgents: (
    taskType: 'scan' | 'generate',
    subAgents: { id: string; name: string; task: string; duration: number }[],
    onAllComplete: () => void
  ) => void
```

- [ ] **Step 2: Update Initial State**
Remove the static scanner/generator agents from `initialState`. Keep only the `Deacon` (Reviewer).
```typescript
  agents: [
    { id: 'ag_rev', role: 'reviewer', name: '安检员', icon: '👮', status: 'idle', currentTask: 'Zzz...' },
  ],
```

- [ ] **Step 3: Implement `dispatchAgents`**
Replace the old `triggerAgentTask` implementation with:
```typescript
  dispatchAgents: (taskType, subAgents, onAllComplete) => {
    const s = get()
    
    // Spawn new agents
    const newWorkers: WorkerAgent[] = subAgents.map(sa => ({
      id: sa.id,
      role: taskType === 'scan' ? 'scanner' : 'generator',
      name: sa.name,
      icon: taskType === 'scan' ? '🕵️' : '👨‍🎨',
      status: 'working',
      currentTask: sa.task
    }))

    set((state) => ({
      agents: [...state.agents, ...newWorkers]
    }))

    // Log dispatch
    s.addLedgerEntry('ag_rev', `Dispatched ${subAgents.length} sub-agents for ${taskType}.`, 'info')

    let completedCount = 0

    // Simulate concurrent work
    subAgents.forEach(sa => {
      s.addLedgerEntry(sa.id, `Started: ${sa.task}`, 'info')
      
      setTimeout(() => {
        set((state) => ({
          agents: state.agents.map(a => a.id === sa.id ? { ...a, status: 'done', currentTask: '✅ 完成' } : a)
        }))
        get().addLedgerEntry(sa.id, `Completed: ${sa.task}`, 'success')
        
        completedCount++
        if (completedCount === subAgents.length) {
          // All done, send to Refinery
          const rev = get().agents.find(a => a.role === 'reviewer')
          set((state) => ({
            refineryQueue: state.refineryQueue + 1,
            agents: state.agents.map(a => a.id === rev?.id ? { ...a, status: 'thinking', currentTask: 'Checking compliance...' } : a)
          }))
          
          setTimeout(() => {
            set((state) => ({
              agents: state.agents.map(a => a.id === rev?.id ? { ...a, status: 'idle', currentTask: 'Awaiting Signature' } : a)
            }))
            get().addLedgerEntry('ag_rev', 'Batch inspection complete. Ready for approval.', 'warn')
            onAllComplete()
          }, 1200)
          
          // Cleanup old agents after a delay
          setTimeout(() => {
             set((state) => ({
               agents: state.agents.filter(a => a.role === 'reviewer' || a.status !== 'done')
             }))
          }, 4000)
        }
      }, sa.duration)
    })
  },
```

---

### Task 2: Build Scaled Agent Dashboard Panel

**Files:**
- Modify: `frontend/pixel-prototype/src/components/city/AgentOfficePanel.tsx`

- [ ] **Step 1: Rewrite Component for Full Height**
Replace the entire component content with a full-height, two-zone layout:
```tsx
import { useDeployStore } from '@/store/deployStore'

export default function AgentOfficePanel({ onOpenLedger }: { onOpenLedger: () => void }) {
  const agents = useDeployStore(s => s.agents)
  const queue = useDeployStore(s => s.refineryQueue)
  const approve = useDeployStore(s => s.approveRefinery)

  const workers = agents.filter(a => a.role !== 'reviewer')
  const reviewer = agents.find(a => a.role === 'reviewer')

  return (
    <div className="flex h-full w-full flex-col overflow-hidden px-panel p-2 shadow-lg">
      <div className="text-center text-[10px] font-bold text-[var(--px-warn)] mb-3 tracking-wider">
        🏢 建筑公司总控
      </div>
      
      {/* Supervisor & Refinery Zone (Fixed Top) */}
      <div className="border-b border-[var(--px-border)] pb-3 mb-2 shrink-0">
         <div className="flex items-center justify-between bg-[var(--px-panel-2)] p-2 rounded border border-[var(--px-border)] shadow-inner">
           <div className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform" onClick={onOpenLedger}>
             <span className="text-xl">{reviewer?.icon}</span>
             <span className="text-[10px] mt-1 text-[var(--px-muted)] font-bold">
               {reviewer?.status === 'thinking' ? '💭 审查中' : 'Zzz 待命'}
             </span>
           </div>
           <div className="flex-1 flex flex-col items-center justify-center">
             <div className="text-[11px] mb-2 font-bold text-[var(--px-text)]">📥 质检台 ({queue})</div>
             {queue > 0 ? (
               <button 
                 onClick={approve}
                 className="px-btn h-8 px-3 text-[10px] bg-yellow-600/20 border-yellow-500 text-yellow-500 animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.5)]"
               >
                 🟨 签字审批
               </button>
             ) : (
               <div className="h-8 flex items-center text-[9px] text-[var(--px-muted)] opacity-50">无待办</div>
             )}
           </div>
         </div>
      </div>

      <div className="text-center text-[9px] text-[var(--px-muted)] mb-2 shrink-0">--- 动态施工队 ---</div>

      {/* Dynamic Worker Pool (Scrollable Bottom) */}
      <div className="flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
        {workers.length === 0 && (
          <div className="text-center text-[10px] text-[var(--px-muted)] mt-4 opacity-50">
            队伍闲置中...<br/>等待包工头下发指令
          </div>
        )}
        {workers.map(ag => (
          <button 
            key={ag.id}
            onClick={onOpenLedger}
            className={`w-full text-left rounded border-2 p-2 transition-all ${
              ag.status === 'done' 
                ? 'border-green-500/50 bg-green-500/10 opacity-70' 
                : 'border-[var(--px-border)] bg-[var(--px-panel-2)] hover:border-[var(--px-info)] shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[var(--px-text)]">{ag.icon} {ag.name}</span>
              <span className="text-[11px]">
                {ag.status === 'working' ? '🔨' : ag.status === 'done' ? '✅' : '🚨'}
              </span>
            </div>
            <div className="mt-1.5 truncate text-[10px] text-[var(--px-info)] font-mono" title={ag.currentTask}>
              {ag.currentTask}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
```

---

### Task 3: Clean up HUD Map and Wire Dispatch

**Files:**
- Modify: `frontend/pixel-prototype/src/components/city/CityHudMap.tsx`

- [ ] **Step 1: Remove Tools and Resize Right Panel**
Remove the `tools` array and the `Tools Section` div entirely.
Change the wrapper div for the right panel from:
```tsx
<div className="absolute right-3 top-16 bottom-16 z-30 w-[120px] flex flex-col gap-3">
```
To:
```tsx
<div className="absolute right-3 top-16 bottom-16 z-30 w-[200px] flex flex-col">
```
Make sure the `<AgentOfficePanel />` takes up the full space.

- [ ] **Step 2: Remove Sandbox Placement Logic**
Delete the `sandboxBuildings` state, `selectedTool` state, and the `onMouseUp` logic that placed sandbox buildings (since we deleted the tools). Keep `onMouseDown`, `onMouseMove`, `onWheel` for panning/zooming. Keep the `hit` logic that selects existing buildings.

- [ ] **Step 3: Wire Buttons to Multi-Agent Dispatch**
Update the bottom action buttons to spawn multiple agents:
```tsx
        <button
          className="px-btn h-10 px-4"
          onClick={() => {
            if (selectedChange) {
              const subAgents = [
                { id: `scan_${Date.now()}_1`, name: '普查-业务街区', task: '> 扫描 API Gateway / ECS...', duration: 1800 },
                { id: `scan_${Date.now()}_2`, name: '普查-数据街区', task: '> 扫描 RDS / Redis...', duration: 2500 },
                { id: `scan_${Date.now()}_3`, name: '普查-网络街区', task: '> 扫描 VPC / SG...', duration: 2100 },
              ]
              dispatchAgents('scan', subAgents, () => {
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
               const subAgents = [
                { id: `gen_${Date.now()}_1`, name: '绘图-Diff分析', task: '> 对比现网与 State...', duration: 1500 },
                { id: `gen_${Date.now()}_2`, name: '绘图-代码生成', task: '> 编写 Terraform Patch...', duration: 3200 },
              ]
              dispatchAgents('generate', subAgents, () => {
                runWorkshopGenerate(selectedChange.id)
              })
            }
          }}
        >
          📝 代码
        </button>
```