import { Link } from 'react-router-dom'
import { ChevronRight, CopyPlus, Eye, Flag, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DeployChange } from '@/store/deployStore'
import Badge from '@/components/ui/Badge'
import ScenarioBadge from '@/components/workshop/ScenarioBadge'
import { computeCostDelta, computeRiskScore } from '@/utils/risk'
import { formatRelativeTime, formatUsd } from '@/utils/format'

function statusLabel(status: DeployChange['status']) {
  if (status === 'draft') return { text: '草稿', tone: 'neutral' as const }
  if (status === 'in_workshop') return { text: '规划中', tone: 'info' as const }
  if (status === 'in_review') return { text: '待审批', tone: 'warn' as const }
  if (status === 'approved') return { text: '已获许可', tone: 'good' as const }
  if (status === 'running') return { text: '施工中', tone: 'info' as const }
  if (status === 'succeeded') return { text: '已竣工', tone: 'good' as const }
  if (status === 'failed') return { text: '施工事故', tone: 'bad' as const }
  return { text: '已回撤', tone: 'neutral' as const }
}

export default function ChangeCardList({
  changes,
  selectedId,
  onSelect,
  onCreate,
}: {
  changes: DeployChange[]
  selectedId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
}) {
  return (
    <div className="px-panel h-[620px] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">工程单</div>
        <button className="px-btn h-9 px-3" onClick={onCreate}>
          <CopyPlus className="h-4 w-4" />
          新建工程单
        </button>
      </div>

      <div className="mt-2 text-xs text-[var(--px-muted)]">拖拽卡牌到左侧地图，会生成棋子；点击可预览。</div>

      <div className="mt-3 space-y-2 overflow-auto pr-1" style={{ height: 548 }}>
        {changes.map((c) => {
          const meta = statusLabel(c.status)
          const { score, level } = computeRiskScore(c)
          const cost = computeCostDelta(c)
          const isSelected = selectedId === c.id
          const riskTone = level === 'high' ? 'bad' : level === 'medium' ? 'warn' : 'neutral'

          return (
            <div
              key={c.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/px-change-id', c.id)
              }}
              className={cn(
                'rounded-lg border-2 border-[var(--px-border)] bg-[var(--px-panel-2)] p-3',
                'shadow-[2px_2px_0_rgba(0,0,0,0.55)]',
                isSelected && 'outline outline-2 outline-[var(--px-info)]'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-[var(--px-muted)]" />
                    <div className="truncate text-sm font-semibold">{c.title}</div>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge tone={meta.tone}>{meta.text}</Badge>
                    <ScenarioBadge scenario={c.scenario} />
                    <Badge tone="info">{c.env.toUpperCase()}</Badge>
                    <Badge tone={riskTone}>
                      <Flag className="h-3 w-3" /> 风险 {score}
                    </Badge>
                    <Badge tone={cost > 0 ? 'warn' : 'neutral'}>成本 {formatUsd(cost)}</Badge>
                  </div>
                  <div className="mt-2 text-xs text-[var(--px-muted)]">{formatRelativeTime(c.createdAt)} · {c.resources.length} 资源</div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    className="px-btn h-9 px-3"
                    onClick={() => onSelect(c.id)}
                    title="预览"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <Link
                    className="px-btn h-9 px-3"
                    to={c.status === 'in_workshop' ? `/workshop/${c.id}` : `/changes/${c.id}`}
                    title={c.status === 'in_workshop' ? '进入工坊' : '进入关卡'}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="mt-3 text-xs text-[var(--px-muted)]">
                {c.status === 'in_workshop'
                  ? '下一步：进入 IaC 工坊完成扫描/生成/同步。'
                  : c.placement
                    ? '已在地图布阵，可拖动棋子调整位置。'
                    : '未布阵：拖到地图任意区域开始。'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

