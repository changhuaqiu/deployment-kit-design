import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Play, CheckCircle2, XCircle, Terminal } from 'lucide-react'
import AppShell from '@/components/AppShell'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { DEMO_USER, useDeployStore } from '@/store/deployStore'
import { formatUsd } from '@/utils/format'

export default function Change() {
  const navigate = useNavigate()
  const params = useParams()
  const id = params.id ?? ''

  const user = DEMO_USER
  const changes = useDeployStore((s) => s.changes)
  const approveChange = useDeployStore((s) => s.approveChange)
  const rejectChange = useDeployStore((s) => s.rejectChange)
  const startRun = useDeployStore((s) => s.startRun)
  const runs = useDeployStore((s) => s.runs)

  const change = useMemo(() => changes.find((c) => c.id === id) ?? null, [changes, id])
  const lastRun = useMemo(() => runs.find((r) => r.changeId === id) ?? null, [runs, id])

  if (!change) {
    return (
      <AppShell title="PIXEL CITY DELIVERY BUREAU">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="text-[var(--px-warn)] text-xl font-bold mb-4">MISSION NOT FOUND</div>
          <Button onClick={() => navigate('/map')}>
            <ArrowLeft className="h-4 w-4" /> ABORT
          </Button>
        </div>
      </AppShell>
    )
  }

  if (change.status === 'in_workshop') {
    return (
      <AppShell title="PIXEL CITY DELIVERY BUREAU">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="text-[var(--px-info)] text-xl font-bold mb-2">STILL IN WORKSHOP</div>
          <div className="text-[var(--px-muted)] text-sm mb-6">
            Awaiting blueprints. Return to workshop to finalize generation.
          </div>
          <div className="flex gap-4">
            <Button onClick={() => navigate('/map')}>
              <ArrowLeft className="h-4 w-4" /> ABORT
            </Button>
            <Button variant="primary" onClick={() => navigate(`/workshop/${change.id}`)}>
              <Play className="h-4 w-4" /> WORKSHOP
            </Button>
          </div>
        </div>
      </AppShell>
    )
  }

  const canApprove = change.status === 'in_review'
  const canApply = change.status === 'approved'

  // Calculate total cost
  const totalCost = change.resources.reduce((sum, r) => sum + r.costDeltaMonthlyUsd, 0)

  return (
    <AppShell title="PIXEL CITY DELIVERY BUREAU">
      <div className="max-w-4xl mx-auto h-full flex flex-col gap-6 pt-4">
        
        {/* Mission Header */}
        <div className="px-panel bg-[var(--px-panel)]/90 backdrop-blur border-l-4 border-[var(--px-info)] p-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[10px] text-[var(--px-info)] font-bold tracking-widest mb-1">MISSION BRIEF</div>
              <h1 className="text-2xl font-bold text-white mb-2">{change.title}</h1>
              <div className="flex gap-2 text-xs">
                <Badge tone="neutral">AUTHOR: {change.createdBy}</Badge>
                <Badge tone="info">ENV: {change.env.toUpperCase()}</Badge>
                {totalCost > 0 ? (
                  <Badge tone="warn">COST: {formatUsd(totalCost)}/mo</Badge>
                ) : (
                  <Badge tone="good">COST: FLAT</Badge>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-[10px] text-[var(--px-muted)] font-bold tracking-widest mb-1">STATUS</div>
              <div className="text-xl font-mono font-bold">
                {change.status === 'in_review' && <span className="text-[var(--px-warn)] animate-pulse">AWAITING_APPROVAL</span>}
                {change.status === 'approved' && <span className="text-[var(--px-good)]">CLEARED_FOR_BUILD</span>}
                {change.status === 'running' && <span className="text-[var(--px-info)]">BUILDING_IN_PROGRESS</span>}
                {change.status === 'succeeded' && <span className="text-[var(--px-good)]">MISSION_ACCOMPLISHED</span>}
                {change.status === 'failed' && <span className="text-[var(--px-danger)]">MISSION_FAILED</span>}
              </div>
              {lastRun && (
                <div className="text-[10px] text-[var(--px-muted)] mt-2">
                  LATEST RUN: {lastRun.status.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-6">
          
          {/* Left Column: Resource Manifest */}
          <div className="px-panel bg-[var(--px-panel-2)]/50 p-5 border border-[var(--px-border)] flex flex-col">
            <div className="text-xs text-[var(--px-muted)] font-bold tracking-widest mb-4 border-b border-[var(--px-border)] pb-2 flex justify-between">
              <span>MANIFEST</span>
              <span>{change.resources.length} UNITS</span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {change.resources.map(r => (
                <div key={r.id} className="flex justify-between items-center p-3 rounded bg-[var(--px-panel)] border border-[var(--px-border)]">
                  <div>
                    <div className="font-bold text-sm text-white">{r.name}</div>
                    <div className="text-[10px] text-[var(--px-muted)]">{r.type}</div>
                  </div>
                  <div className="text-right">
                    <Badge tone={r.action === 'create' ? 'good' : r.action === 'update' ? 'info' : 'bad'}>
                      {r.action.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Command Terminal */}
          <div className="px-panel bg-[#0a0f18] p-5 border border-purple-500/30 shadow-[inset_0_0_20px_rgba(168,85,247,0.05)] flex flex-col">
            <div className="text-xs text-purple-400 font-bold tracking-widest mb-4 flex items-center gap-2 border-b border-purple-500/30 pb-2">
              <Terminal className="w-4 h-4" /> COMMAND TERMINAL
            </div>
            
            <div className="flex-1 flex flex-col justify-center space-y-4">
              
              {canApprove && (
                <div className="space-y-3">
                  <div className="text-[11px] text-purple-300/70 text-center mb-4">
                    Director review required to proceed with infrastructure changes.
                  </div>
                  <button 
                    className="w-full py-4 bg-green-900/20 text-green-400 border border-green-500/50 rounded font-bold tracking-widest hover:bg-green-900/40 hover:shadow-[0_0_15px_rgba(74,222,128,0.2)] transition-all flex justify-center items-center gap-2"
                    onClick={() => approveChange(change.id)}
                  >
                    <CheckCircle2 className="w-5 h-5" /> APPROVE MISSION
                  </button>
                  <button 
                    className="w-full py-3 bg-red-900/20 text-red-400 border border-red-500/50 rounded font-bold tracking-widest hover:bg-red-900/40 hover:shadow-[0_0_15px_rgba(248,113,113,0.2)] transition-all flex justify-center items-center gap-2"
                    onClick={() => rejectChange(change.id)}
                  >
                    <XCircle className="w-5 h-5" /> ABORT & REJECT
                  </button>
                </div>
              )}

              {canApply && (
                <div className="space-y-3">
                  <div className="text-[11px] text-purple-300/70 text-center mb-4">
                    Mission approved. Ready for deployment.
                  </div>
                  <button 
                    className="w-full py-5 bg-blue-900/30 text-blue-400 border border-blue-500/60 rounded font-bold tracking-widest hover:bg-blue-900/50 hover:shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all flex justify-center items-center gap-2 text-lg"
                    onClick={() => {
                      const runId = startRun({ changeId: change.id, createdBy: user.email })
                      if (runId) navigate(`/runs/${runId}`)
                    }}
                  >
                    <Play className="w-6 h-6" /> COMMENCE BUILD
                  </button>
                </div>
              )}

              {!canApprove && !canApply && (
                <div className="text-center text-[var(--px-muted)] text-sm italic">
                  No pending actions available.
                </div>
              )}
            </div>

            <div className="mt-auto pt-6">
              <button 
                className="w-full py-2 bg-transparent text-[var(--px-muted)] border border-[var(--px-border)] rounded text-xs hover:text-white hover:border-white transition-all flex justify-center items-center gap-2"
                onClick={() => navigate('/map')}
              >
                <ArrowLeft className="w-4 h-4" /> RETURN TO CITY HUD
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

