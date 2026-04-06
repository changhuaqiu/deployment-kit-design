import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, RotateCcw, ScrollText } from 'lucide-react'
import AppShell from '@/components/AppShell'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import RunTimeline from '@/components/run/RunTimeline'
import { DEMO_USER, useDeployStore } from '@/store/deployStore'
import { formatRelativeTime } from '@/utils/format'

export default function Run() {
  const navigate = useNavigate()
  const params = useParams()
  const id = params.id ?? ''

  const user = DEMO_USER
  const runs = useDeployStore((s) => s.runs)
  const changes = useDeployStore((s) => s.changes)
  const tickRun = useDeployStore((s) => s.tickRun)
  const triggerRollback = useDeployStore((s) => s.triggerRollback)
  const completeRollback = useDeployStore((s) => s.completeRollback)

  const run = useMemo(() => runs.find((r) => r.id === id) ?? null, [runs, id])
  const change = useMemo(() => (run ? changes.find((c) => c.id === run.changeId) ?? null : null), [changes, run])

  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    if (!run) return
    if (run.status !== 'running') return
    const t = window.setInterval(() => tickRun(run.id), 650)
    return () => window.clearInterval(t)
  }, [run, tickRun])

  useEffect(() => {
    if (!run) return
    if (run.status !== 'rollback_running') return
    const t = window.setTimeout(() => completeRollback(run.id), 1200)
    return () => window.clearTimeout(t)
  }, [completeRollback, run])

  useEffect(() => {
    if (!autoScroll) return
    const el = document.getElementById('px-log')
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [autoScroll, run?.logs.length])

  if (!run || !change) {
    return (
      <AppShell title="部署战报">
        <div className="px-panel p-4">
          <div className="text-sm text-[var(--px-muted)]">未找到该战报。</div>
          <div className="mt-3">
            <Button onClick={() => navigate('/map')}>
              <ArrowLeft className="h-4 w-4" /> 返回地图
            </Button>
          </div>
        </div>
      </AppShell>
    )
  }

  const headlineTone = run.status === 'failed' ? 'bad' : run.status === 'succeeded' ? 'good' : run.status === 'rolled_back' ? 'neutral' : 'info'

  const canRollback =
    run.rollbackAvailable &&
    (run.status === 'failed' || run.status === 'succeeded')

  return (
      <AppShell
      title="施工指挥中心（战报 / 回放）"
      right={
        <Badge tone={headlineTone}>
          {run.status.toUpperCase()} · {change.env.toUpperCase()}
        </Badge>
      }
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[0.95fr_1.35fr]">
        <RunTimeline run={run} />

        <div className="px-panel p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{change.title}</div>
              <div className="mt-1 text-xs text-[var(--px-muted)]">
                发起人 {user.email} · {formatRelativeTime(run.createdAt)}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => navigate(`/changes/${change.id}`)}>
                <ScrollText className="h-4 w-4" /> 回到关卡
              </Button>
              <Button
                variant="danger"
                disabled={!canRollback}
                onClick={() => triggerRollback(run.id)}
              >
                <RotateCcw className="h-4 w-4" /> 回滚
              </Button>
              <Button onClick={() => navigate('/map')}>
                <ArrowLeft className="h-4 w-4" /> 回地图
              </Button>
            </div>
          </div>

          <div className="mt-3">
            <div className="h-3 w-full rounded-full border-2 border-[var(--px-border)] bg-[rgba(0,0,0,0.16)]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--px-info),var(--px-accent))]"
                style={{ width: `${run.progress}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-[var(--px-muted)]">进度 {run.progress}%</div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">关键日志（施工记录）</div>
            <button
              className="px-btn h-9 px-3"
              onClick={() => setAutoScroll((v) => !v)}
            >
              {autoScroll ? '自动滚动：开' : '自动滚动：关'}
            </button>
          </div>

          <div
            id="px-log"
            className="mt-2 h-[420px] overflow-auto rounded-lg border-2 border-[var(--px-border)] bg-[rgba(0,0,0,0.22)] p-3 font-mono text-xs"
          >
            {run.logs.map((l) => (
              <div
                key={l.id}
                className={
                  'mb-2 ' +
                  (l.level === 'error'
                    ? 'text-[var(--px-danger)]'
                    : l.level === 'warn'
                        ? 'text-[var(--px-warn)]'
                        : 'text-[var(--px-text)]')
                }
              >
                <span className="text-[var(--px-muted)]">[{new Date(l.at).toLocaleTimeString()}]</span> {l.message}
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-lg border-2 border-[var(--px-border)] bg-[var(--px-panel-2)] p-3">
            <div className="text-xs font-semibold text-[var(--px-muted)]">复盘（MVP）</div>
            <div className="mt-2 text-sm text-[var(--px-text)]">
              本原型把 IaC 交付拆成：施工地图 → 规划局（蓝图工坊）→ 审批大厅 → 施工指挥中心。后续可接入真实 plan、策略引擎与 CI 执行。
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

