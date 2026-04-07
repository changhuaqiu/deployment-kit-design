import { useDeployStore } from '@/store/deployStore'

export default function AgentOfficePanel({ onOpenLedger }: { onOpenLedger: () => void }) {
  const agents = useDeployStore((s) => s.agents)
  const queue = useDeployStore((s) => s.refineryQueue)
  const approve = useDeployStore((s) => s.approveRefinery)

  const workers = agents.filter((a) => a.role !== 'reviewer')
  const reviewer = agents.find((a) => a.role === 'reviewer')

  const desks = 6
  const slots = Array.from({ length: desks }, (_, i) => workers[i] ?? null)

  const shortTask = (raw: string) => {
    const s = raw.replace(/^>\s*/, '').trim()
    if (s.length <= 20) return s
    return s.slice(0, 19) + '…'
  }

  return (
    <div className="h-full w-full bg-[#0b1020] relative overflow-hidden border-l-[4px] border-[#132a45]">
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-20"></div>

      <div className="h-12 px-4 flex items-center justify-between border-b-[4px] border-[#132a45] bg-[#0a0f18] shadow-[0_6px_0_rgba(0,0,0,0.35)] relative z-10">
        <div className="flex items-baseline gap-2">
          <div className="text-[11px] font-bold tracking-[0.18em] text-cyan-300">PIXEL CONSTRUCTION CO.</div>
          <div className="text-[9px] text-cyan-700">OFFICE</div>
        </div>
        <button
          onClick={onOpenLedger}
          className="text-[10px] px-3 py-1 rounded border border-cyan-800/60 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/40"
        >
          [ LEDGER ]
        </button>
      </div>

      <div className="h-[calc(100%-48px)] p-4 space-y-4 overflow-y-auto custom-scrollbar relative z-10">
        <div className="rounded border border-purple-500/30 bg-[#101425] shadow-[0_0_18px_rgba(168,85,247,0.08)] overflow-hidden">
          <div className="px-3 py-2 bg-[#19143a] border-b border-purple-500/30 flex items-center justify-between">
            <div className="text-[10px] font-bold tracking-widest text-purple-300">DEACON OFFICE</div>
            <div className="text-[9px] text-purple-300/80 flex items-center gap-1">
              {reviewer?.status === 'thinking' ? (
                <><span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span> REVIEWING</>
              ) : 'IDLE'}
            </div>
          </div>
          <div className="p-3 flex items-center gap-3">
            <button
              onClick={onOpenLedger}
              className="w-14 h-14 rounded border border-purple-500/40 bg-[#0a0f18] flex items-center justify-center text-3xl relative overflow-hidden transition-all hover:scale-105 active:scale-95"
              title="打开账本"
            >
              {reviewer?.status === 'thinking' && <div className="absolute inset-0 bg-purple-500/10 animate-pulse"></div>}
              <span className="relative z-10">{reviewer?.icon ?? '👮'}</span>
            </button>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-purple-200">待签收文件</div>
                <div className="text-[12px] font-bold text-purple-300">{queue}</div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-6 rounded border border-purple-500/20 bg-[#0a0f18] flex items-center px-2 overflow-hidden relative">
                  {queue > 0 && <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(168,85,247,0.05)_50%,transparent_100%)] animate-[slide_2s_linear_infinite]"></div>}
                  <div className="flex items-center gap-1 z-10">
                    {Array.from({ length: Math.min(6, queue) }, (_, i) => (
                      <div key={i} className="w-3 h-4 bg-yellow-400/20 border border-yellow-500/40 relative animate-[pulse_1.5s_ease-in-out_infinite]" style={{animationDelay: `${i * 0.1}s`}}>
                        <div className="absolute inset-0 flex items-center justify-center opacity-50 text-[6px]">📄</div>
                      </div>
                    ))}
                    {queue === 0 ? <div className="text-[9px] text-purple-400/40 font-mono">WAITING_FOR_DOCS...</div> : null}
                  </div>
                </div>
                <button
                  onClick={approve}
                  disabled={queue === 0}
                  className={
                    'h-7 px-3 text-[10px] font-bold rounded border relative overflow-hidden transition-all ' +
                    (queue > 0
                      ? 'border-yellow-500/60 bg-yellow-600/20 text-yellow-300 hover:bg-yellow-600/30 hover:scale-105 active:scale-95 shadow-[0_0_10px_rgba(234,179,8,0.3)]'
                      : 'border-purple-500/20 bg-purple-900/10 text-purple-500/40')
                  }
                >
                  {queue > 0 && <div className="absolute inset-0 bg-yellow-400/20 animate-pulse"></div>}
                  <span className="relative z-10 flex items-center gap-1">
                    {queue > 0 ? '📝 签收' : '签收'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded border border-cyan-800/40 bg-[#0a0f18] overflow-hidden">
          <div className="px-3 py-2 bg-[#0f172a] border-b border-cyan-800/40 flex items-center justify-between">
            <div className="text-[10px] font-bold tracking-widest text-cyan-300">WORKER DESKS</div>
            <div className="text-[9px] text-cyan-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-700"></span> {workers.length} ACTIVE
            </div>
          </div>

          <div className="p-3 grid grid-cols-3 gap-3">
            {slots.map((ag, idx) => {
              const working = ag?.status === 'working'
              const done = ag?.status === 'done'
              return (
                <button
                  key={ag?.id ?? `empty_${idx}`}
                  onClick={onOpenLedger}
                  className={
                    'relative rounded border p-2 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ' +
                    (ag
                      ? done
                        ? 'border-green-500/40 bg-green-900/10 shadow-[inset_0_0_10px_rgba(74,222,128,0.05)]'
                        : working
                          ? 'border-cyan-400/50 bg-cyan-950/20 shadow-[inset_0_0_15px_rgba(34,211,238,0.15)] ring-1 ring-cyan-400/30'
                          : 'border-cyan-800/40 bg-[#0b1020]'
                      : 'border-[#132a45] bg-[#070b14] opacity-60')
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="text-[18px] relative">
                      {ag?.icon ?? '🪑'}
                      {working && <div className="absolute -bottom-1 -right-1 text-[8px] animate-bounce">⚡</div>}
                    </div>
                    <div className="text-[9px] font-bold text-cyan-700">{ag ? (working ? 'WORK' : done ? 'DONE' : 'IDLE') : 'EMPTY'}</div>
                  </div>
                  <div className="mt-2 h-7 rounded border border-[#132a45] bg-[#020617] flex items-center px-2 overflow-hidden relative">
                    <div className="text-[9px] text-cyan-300 font-mono whitespace-nowrap overflow-hidden text-ellipsis flex-1">
                      {ag ? (working ? <span className="animate-pulse">{shortTask(ag.currentTask)}</span> : shortTask(ag.currentTask)) : '…'}
                    </div>
                    {working ? <div className="ml-2 w-1.5 h-3 bg-cyan-300 animate-pulse shadow-[0_0_8px_#67e8f9]"></div> : null}
                  </div>

                  {ag ? (
                    <div className="mt-2">
                      <div className="inline-flex items-center gap-1 rounded-full border border-cyan-800/50 bg-cyan-950/30 px-2 py-0.5">
                        <div className={working ? 'w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping' : done ? 'w-1.5 h-1.5 rounded-full bg-green-400' : 'w-1.5 h-1.5 rounded-full bg-cyan-700'}></div>
                        <div className="text-[9px] text-cyan-400">{ag.name}</div>
                      </div>
                    </div>
                  ) : null}

                  {done ? (
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded border border-green-500/40 bg-green-900/30 flex items-center justify-center text-[10px]">📄</div>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
