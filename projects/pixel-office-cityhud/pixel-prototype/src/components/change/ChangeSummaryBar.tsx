import { Coins, Flag, Layers, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DeployChange } from '@/store/deployStore'
import Badge from '@/components/ui/Badge'
import ScenarioBadge from '@/components/workshop/ScenarioBadge'
import { computeCostDelta, computeRiskScore } from '@/utils/risk'
import { formatUsd } from '@/utils/format'

function statusBadge(status: DeployChange['status']) {
  if (status === 'draft') return <Badge tone="neutral">草稿</Badge>
  if (status === 'in_workshop') return <Badge tone="info">规划中</Badge>
  if (status === 'in_review') return <Badge tone="warn">待审批</Badge>
  if (status === 'approved') return <Badge tone="good">已获许可</Badge>
  if (status === 'running') return <Badge tone="info">施工中</Badge>
  if (status === 'succeeded') return <Badge tone="good">已竣工</Badge>
  if (status === 'failed') return <Badge tone="bad">施工事故</Badge>
  return <Badge tone="neutral">已回撤</Badge>
}

export default function ChangeSummaryBar({ change }: { change: DeployChange }) {
  const { score, level } = computeRiskScore(change)
  const cost = computeCostDelta(change)
  const riskTone = level === 'high' ? 'bad' : level === 'medium' ? 'warn' : 'neutral'
  const costTone = cost > 0 ? 'warn' : 'neutral'

  return (
    <div className={cn('px-panel sticky top-[64px] z-30 p-3')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-sm font-semibold">{change.title}</div>
            {statusBadge(change.status)}
            <Badge tone="info">{change.env.toUpperCase()}</Badge>
            <ScenarioBadge scenario={change.scenario} />
          </div>
          <div className="mt-1 text-xs text-[var(--px-muted)]">提交者 {change.createdBy}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-lg border-2 border-[var(--px-border)] bg-[var(--px-panel-2)] px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-[var(--px-muted)]">
              <Layers className="h-4 w-4" /> 资源
            </div>
            <div className="mt-1 text-sm font-semibold">{change.resources.length}</div>
          </div>
          <div className="rounded-lg border-2 border-[var(--px-border)] bg-[var(--px-panel-2)] px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-[var(--px-muted)]">
              <Flag className="h-4 w-4" /> 风险
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="text-sm font-semibold">{score}</div>
              <Badge tone={riskTone}>{level.toUpperCase()}</Badge>
            </div>
          </div>
          <div className="rounded-lg border-2 border-[var(--px-border)] bg-[var(--px-panel-2)] px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-[var(--px-muted)]">
              <Coins className="h-4 w-4" /> 成本
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="text-sm font-semibold">{formatUsd(cost)}</div>
              <Badge tone={costTone}>{cost > 0 ? 'UP' : 'FLAT'}</Badge>
            </div>
          </div>
          <div className="rounded-lg border-2 border-[var(--px-border)] bg-[var(--px-panel-2)] px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-[var(--px-muted)]">
              <Timer className="h-4 w-4" /> 窗口
            </div>
            <div className="mt-1 text-sm font-semibold">10-15min</div>
          </div>
        </div>
      </div>
    </div>
  )
}

