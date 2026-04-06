import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Play, RotateCcw } from 'lucide-react'
import AppShell from '@/components/AppShell'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import ChangeSummaryBar from '@/components/change/ChangeSummaryBar'
import DiffPanel from '@/components/change/DiffPanel'
import ReviewPanel from '@/components/change/ReviewPanel'
import RiskCostPanel from '@/components/change/RiskCostPanel'
import { DEMO_USER, useDeployStore } from '@/store/deployStore'

export default function Change() {
  const navigate = useNavigate()
  const params = useParams()
  const id = params.id ?? ''

  const user = DEMO_USER
  const changes = useDeployStore((s) => s.changes)
  const addComment = useDeployStore((s) => s.addComment)
  const approveChange = useDeployStore((s) => s.approveChange)
  const rejectChange = useDeployStore((s) => s.rejectChange)
  const startRun = useDeployStore((s) => s.startRun)
  const runs = useDeployStore((s) => s.runs)

  const change = useMemo(() => changes.find((c) => c.id === id) ?? null, [changes, id])
  const lastRun = useMemo(() => runs.find((r) => r.changeId === id) ?? null, [runs, id])

  if (!change) {
    return (
      <AppShell title="变更关卡">
        <div className="px-panel p-4">
          <div className="text-sm text-[var(--px-muted)]">未找到该变更。</div>
          <div className="mt-3">
            <Button onClick={() => navigate('/map')}>
              <ArrowLeft className="h-4 w-4" /> 返回地图
            </Button>
          </div>
        </div>
      </AppShell>
    )
  }

  if (change.status === 'in_workshop') {
    return (
      <AppShell title="审批大厅">
        <div className="px-panel p-4">
          <div className="text-sm font-semibold">还未进入审批</div>
          <div className="mt-2 text-xs text-[var(--px-muted)]">
            该工程单仍处于规划局阶段。先完成“普查/生成/预览”，再进入审批大厅。
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button onClick={() => navigate('/map')}>
              <ArrowLeft className="h-4 w-4" /> 返回地图
            </Button>
            <Button variant="primary" onClick={() => navigate(`/workshop/${change.id}`)}>
              <Play className="h-4 w-4" /> 进入规划局
            </Button>
          </div>
        </div>
      </AppShell>
    )
  }

  const canApply = change.status === 'approved'
  const canRollback = !!lastRun && (lastRun.status === 'failed' || lastRun.status === 'succeeded')

  return (
      <AppShell
      title="审批大厅（评审 / 施工许可）"
      right={lastRun ? <Badge tone="info">最近战报：{lastRun.status}</Badge> : null}
    >
      <ChangeSummaryBar change={change} />

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1.25fr_0.9fr_0.75fr]">
        <DiffPanel change={change} />

        <ReviewPanel
          change={change}
          currentUser={user.email}
          onAddComment={(body) => addComment(change.id, { author: user.email, body })}
          onApprove={() => approveChange(change.id)}
          onReject={() => rejectChange(change.id)}
        />

        <RiskCostPanel change={change} />
      </div>

      <div className="mt-3 px-panel p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold">施工操作</div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => navigate('/map')}>
              <ArrowLeft className="h-4 w-4" /> 返回地图
            </Button>
            <Button
              variant="primary"
              disabled={!canApply}
              onClick={() => {
                const runId = startRun({ changeId: change.id, createdBy: user.email })
                if (runId) navigate(`/runs/${runId}`)
              }}
            >
              <Play className="h-4 w-4" /> 开始施工（Apply）
            </Button>
            <Button
              variant="danger"
              disabled={!canRollback}
              onClick={() => {
                if (lastRun) navigate(`/runs/${lastRun.id}`)
              }}
            >
              <RotateCcw className="h-4 w-4" /> 回撤/查看战报
            </Button>
          </div>
        </div>
        <div className="mt-2 text-xs text-[var(--px-muted)]">
          施工按钮仅在“已批”状态可用；你可以在评审区点击“通过”获取施工许可。
        </div>
      </div>
    </AppShell>
  )
}

