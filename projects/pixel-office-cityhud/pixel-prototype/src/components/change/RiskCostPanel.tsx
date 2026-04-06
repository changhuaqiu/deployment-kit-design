import { AlertTriangle, Coins, ShieldCheck, Sparkles } from 'lucide-react'
import type { DeployChange } from '@/store/deployStore'
import Badge from '@/components/ui/Badge'
import { computeCostDelta, computeRiskScore } from '@/utils/risk'
import { formatUsd } from '@/utils/format'

export default function RiskCostPanel({ change }: { change: DeployChange }) {
  const { score, level } = computeRiskScore(change)
  const cost = computeCostDelta(change)
  const riskTone = level === 'high' ? 'bad' : level === 'medium' ? 'warn' : 'neutral'

  const checks = [
    { key: 'lock', label: '环境锁/并发控制', ok: true },
    { key: 'diff', label: '确认删除/权限扩大项', ok: score < 70 },
    { key: 'blast', label: '分批/灰度与回滚路径', ok: true },
    { key: 'runbook', label: 'Runbook 与告警已准备', ok: level !== 'high' },
  ]

  const topRisks = Array.from(
    new Set(change.resources.flatMap((r) => r.riskTags))
  ).slice(0, 6)

  return (
    <div className="px-panel h-full p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">风险 / 成本面板</div>
        <Badge tone={riskTone}>风险 {score}</Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border-2 border-[var(--px-border)] bg-[var(--px-panel-2)] p-3">
          <div className="flex items-center gap-2 text-xs text-[var(--px-muted)]">
            <Coins className="h-4 w-4" /> 预计成本（月）
          </div>
          <div className="mt-1 text-lg font-semibold">{formatUsd(cost)}</div>
          <div className="mt-1 text-xs text-[var(--px-muted)]">原型：按资源卡片里的估算值求和</div>
        </div>
        <div className="rounded-lg border-2 border-[var(--px-border)] bg-[var(--px-panel-2)] p-3">
          <div className="flex items-center gap-2 text-xs text-[var(--px-muted)]">
            <AlertTriangle className="h-4 w-4" /> 风险标签
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {topRisks.length === 0 ? <Badge tone="neutral">无</Badge> : null}
            {topRisks.map((t) => (
              <Badge key={t} tone={t === 'delete' ? 'bad' : t === 'iam' ? 'warn' : 'neutral'}>
                {t}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border-2 border-[var(--px-border)] bg-[var(--px-panel-2)] p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--px-muted)]">
          <ShieldCheck className="h-4 w-4" /> 执行前检查（轻量）
        </div>
        <div className="mt-2 space-y-2">
          {checks.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-2 rounded-md border border-[var(--px-border)] bg-[rgba(0,0,0,0.14)] px-3 py-2">
              <div className="text-sm">{c.label}</div>
              <Badge tone={c.ok ? 'good' : 'warn'}>{c.ok ? 'OK' : '待确认'}</Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-lg border-2 border-[var(--px-border)] bg-[var(--px-panel-2)] p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--px-muted)]">
          <Sparkles className="h-4 w-4" /> 建议动作
        </div>
        <div className="mt-2 space-y-2 text-sm text-[var(--px-text)]">
          <div className="rounded-md border border-[var(--px-border)] bg-[rgba(0,0,0,0.14)] px-3 py-2">把高风险资源拆成多个关卡，降低一次出征的爆炸半径。</div>
          <div className="rounded-md border border-[var(--px-border)] bg-[rgba(0,0,0,0.14)] px-3 py-2">为删除/权限变更增加“二次确认”与回滚验证步骤。</div>
        </div>
      </div>
    </div>
  )
}

