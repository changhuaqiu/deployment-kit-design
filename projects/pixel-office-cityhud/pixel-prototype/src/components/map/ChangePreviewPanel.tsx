import { Link } from 'react-router-dom'
import { ChevronRight, Coins, Flag, Layers, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DeployChange } from '@/store/deployStore'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ScenarioBadge from '@/components/workshop/ScenarioBadge'
import { computeCostDelta, computeRiskScore } from '@/utils/risk'
import { formatUsd } from '@/utils/format'

export default function ChangePreviewPanel({
  change,
  onClose,
}: {
  change: DeployChange
  onClose: () => void
}) {
  const { score, level } = computeRiskScore(change)
  const cost = computeCostDelta(change)
  const riskTone = level === 'high' ? 'bad' : level === 'medium' ? 'warn' : 'neutral'
  const actions = change.resources.reduce(
    (acc, r) => {
      acc[r.action] += 1
      return acc
    },
    { create: 0, update: 0, delete: 0 }
  )

  return (
    <div className="px-panel h-[620px] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">任务预览</div>
          <div className="mt-1 truncate text-xs text-[var(--px-muted)]">{change.title}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ScenarioBadge scenario={change.scenario} />
            <Badge tone="info">{change.env.toUpperCase()}</Badge>
            <Badge tone="neutral">{change.status}</Badge>
          </div>
        </div>
        <Button className="h-9 w-9 px-0" onClick={onClose} aria-label="关闭预览">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border-2 border-[var(--px-border)] bg-[var(--px-panel-2)] p-3">
          <div className="flex items-center gap-2 text-xs text-[var(--px-muted)]">
            <Flag className="h-4 w-4" /> 风险
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="text-lg font-semibold">{score}</div>
            <Badge tone={riskTone}>{level.toUpperCase()}</Badge>
          </div>
        </div>
        <div className="rounded-lg border-2 border-[var(--px-border)] bg-[var(--px-panel-2)] p-3">
          <div className="flex items-center gap-2 text-xs text-[var(--px-muted)]">
            <Coins className="h-4 w-4" /> 成本（月）
          </div>
          <div className="mt-1 text-lg font-semibold">{formatUsd(cost)}</div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border-2 border-[var(--px-border)] bg-[var(--px-panel-2)] p-3">
        <div className="flex items-center gap-2 text-xs text-[var(--px-muted)]">
          <Layers className="h-4 w-4" /> 资源差异
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone="good">新增 {actions.create}</Badge>
          <Badge tone="info">修改 {actions.update}</Badge>
          <Badge tone="bad">删除 {actions.delete}</Badge>
        </div>

        <div className="mt-3 space-y-2">
          {change.resources.slice(0, 5).map((r) => (
            <div
              key={r.id}
              className={cn(
                'rounded-md border border-[var(--px-border)] px-2 py-2',
                'bg-[rgba(0,0,0,0.16)]'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 truncate text-xs font-semibold">{r.type}.{r.name}</div>
                <div className="text-[11px] text-[var(--px-muted)]">{r.action.toUpperCase()}</div>
              </div>
              <div className="mt-1 text-xs text-[var(--px-muted)]">{r.summary}</div>
            </div>
          ))}
          {change.resources.length > 5 ? (
            <div className="text-xs text-[var(--px-muted)]">更多差异请进入关卡查看。</div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {change.status === 'in_workshop' ? (
          <Link className="px-btn h-10 px-3 px-btn-primary" to={`/workshop/${change.id}`}>
            <ChevronRight className="h-4 w-4" /> 进入工坊
          </Link>
        ) : (
          <Link className="px-btn h-10 px-3 px-btn-primary" to={`/changes/${change.id}`}>
            <ChevronRight className="h-4 w-4" /> 进入审批
          </Link>
        )}
        <Link className="px-btn h-10 px-3" to={`/changes/${change.id}`}>
          <ChevronRight className="h-4 w-4" /> 审批/战报
        </Link>
      </div>
    </div>
  )
}

