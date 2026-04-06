import { useMemo } from 'react'
import { Coins, Flag, Hammer, Landmark, MapPin } from 'lucide-react'
import Drawer from '@/components/ui/Drawer'
import Badge from '@/components/ui/Badge'
import type { DeployChange, InventoryItem, ResourceChange } from '@/store/deployStore'
import { buildingLabel, districtForInventory, districtForResource, districtMeta } from '@/utils/city'
import { formatUsd } from '@/utils/format'
import { computeRiskScore } from '@/utils/risk'

type BuildingTarget =
  | { kind: 'resource'; value: ResourceChange; change: DeployChange }
  | { kind: 'inventory'; value: InventoryItem; change: DeployChange }

export default function BuildingDrawer({
  open,
  onClose,
  target,
}: {
  open: boolean
  onClose: () => void
  target: BuildingTarget | null
}) {
  const title = target
    ? target.kind === 'resource'
      ? `${target.value.type}.${target.value.name}`
      : `${target.value.type}.${target.value.name}`
    : '建筑详情'

  const district = useMemo(() => {
    if (!target) return null
    const key = target.kind === 'resource' ? districtForResource(target.value) : districtForInventory(target.value)
    return { key, meta: districtMeta[key] }
  }, [target])

  const risk = useMemo(() => {
    if (!target) return null
    if (target.kind !== 'resource') return null
    const { score, level } = computeRiskScore({ ...target.change, resources: [target.value] })
    return { score, level }
  }, [target])

  return (
    <Drawer open={open} title={title} onClose={onClose}>
      {!target ? null : (
        <div className="space-y-3">
          <div className="px-panel p-3">
            <div className="flex flex-wrap items-center gap-2">
              {district ? <Badge tone={district.meta.tone}>{district.meta.label}</Badge> : null}
              <Badge tone="info">
                <MapPin className="h-3 w-3" /> {target.change.env.toUpperCase()}
              </Badge>
              <Badge tone="neutral">
                <Landmark className="h-3 w-3" /> {buildingLabel(target.value.type)}
              </Badge>
              {target.kind === 'resource' ? (
                <Badge tone={target.value.action === 'delete' ? 'bad' : target.value.action === 'create' ? 'good' : 'info'}>
                  <Hammer className="h-3 w-3" /> {target.value.action.toUpperCase()}
                </Badge>
              ) : (
                <Badge tone={target.value.mark === 'managed' ? 'good' : target.value.mark === 'readonly' ? 'info' : 'neutral'}>
                  托管标记：{target.value.mark}
                </Badge>
              )}
            </div>

            <div className="mt-2 text-xs text-[var(--px-muted)]">工程单：{target.change.title}</div>
          </div>

          <div className="px-panel p-3">
            <div className="text-sm font-semibold">施工影响（速览）</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg border-2 border-[var(--px-border)] bg-[var(--px-panel-2)] p-3">
                <div className="text-xs font-semibold text-[var(--px-muted)]">预算变化</div>
                <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
                  <Coins className="h-4 w-4 text-[var(--px-warn)]" />
                  {target.kind === 'resource' ? formatUsd(target.value.costDeltaMonthlyUsd) : formatUsd(0)}
                </div>
              </div>
              <div className="rounded-lg border-2 border-[var(--px-border)] bg-[var(--px-panel-2)] p-3">
                <div className="text-xs font-semibold text-[var(--px-muted)]">风险等级</div>
                <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
                  <Flag className="h-4 w-4 text-[var(--px-danger)]" />
                  {risk ? `${risk.level} (${risk.score})` : 'n/a'}
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs text-[var(--px-muted)]">
              这里用城市语言解释 IaC 变更：预算=月维护费变化；风险=施工事故概率（模拟）。
            </div>
          </div>

          <div className="px-panel p-3">
            <div className="text-sm font-semibold">法规与配套（建议）</div>
            <div className="mt-2 text-sm text-[var(--px-text)]">
              {target.kind === 'resource' && target.value.riskTags.includes('iam')
                ? '建议启用“最小授权条例”：权限变更需双人审批 + 自动生成回滚策略。'
                : target.kind === 'resource' && target.value.riskTags.includes('data')
                  ? '建议启用“数据金库条例”：备份/加密/恢复演练必须通过闸门。'
                  : '建议启用“施工许可条例”：变更窗口、灰度与验收清单。'}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  )
}

