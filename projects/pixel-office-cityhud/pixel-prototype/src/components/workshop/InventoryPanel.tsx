import { useMemo, useState } from 'react'
import { Building2, Eye, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import BuildingDrawer from '@/components/city/BuildingDrawer'
import type { DeployChange, InventoryItem, InventoryMark } from '@/store/deployStore'
import { districtForInventory, districtMeta } from '@/utils/city'

function markTone(mark: InventoryMark) {
  if (mark === 'managed') return 'good' as const
  if (mark === 'ignored') return 'neutral' as const
  return 'info' as const
}

function driftTone(drift: InventoryItem['drift']) {
  if (drift === 'changed') return 'warn' as const
  if (drift === 'extra') return 'bad' as const
  if (drift === 'missing') return 'bad' as const
  return 'neutral' as const
}

function nextMark(mark: InventoryMark): InventoryMark {
  if (mark === 'managed') return 'readonly'
  if (mark === 'readonly') return 'ignored'
  return 'managed'
}

export default function InventoryPanel({
  change,
  onChangeInventory,
}: {
  change: DeployChange
  onChangeInventory: (inventory: InventoryItem[]) => void
}) {
  const inventory = change.workshop.inventory
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTargetId, setDrawerTargetId] = useState<string | null>(null)
  const summary = useMemo(() => {
    const managed = inventory.filter((i) => i.mark === 'managed').length
    const ignored = inventory.filter((i) => i.mark === 'ignored').length
    const drift = inventory.filter((i) => i.drift !== 'none').length
    return { managed, ignored, drift }
  }, [inventory])

  return (
    <div className="px-panel p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">现网资源清单（Inventory）</div>
        <div className="flex items-center gap-2">
          <Badge tone="good">托管 {summary.managed}</Badge>
          <Badge tone="neutral">忽略 {summary.ignored}</Badge>
          <Badge tone={summary.drift ? 'warn' : 'neutral'}>漂移 {summary.drift}</Badge>
        </div>
      </div>

      <div className="mt-2 text-xs text-[var(--px-muted)]">
        点击建筑行可循环切换标记：托管 → 只读 → 忽略；漂移主要用于“现网 + IaC → 同步”场景。
      </div>

      {inventory.length === 0 ? (
        <div className="mt-3 rounded-lg border-2 border-dashed border-[var(--px-border)] bg-[rgba(0,0,0,0.12)] p-4 text-sm text-[var(--px-muted)]">
          还没有资源清单。先点击左侧“扫描现网”。
        </div>
      ) : (
        <div className="mt-3 space-y-2" style={{ maxHeight: 340, overflow: 'auto' }}>
          {inventory.map((it) => (
            <button
              key={it.id}
              className={cn(
                'w-full rounded-lg border-2 border-[var(--px-border)] bg-[var(--px-panel-2)] p-3 text-left',
                'shadow-[2px_2px_0_rgba(0,0,0,0.55)] hover:bg-[color-mix(in_oklab,var(--px-panel-2)_86%,white_6%)]'
              )}
              onClick={() => {
                const next = inventory.map((x) => (x.id === it.id ? { ...x, mark: nextMark(x.mark) } : x))
                onChangeInventory(next)
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{it.type}.{it.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge tone={markTone(it.mark)}>
                      <Tag className="h-3 w-3" /> {it.mark}
                    </Badge>
                    <Badge tone={districtMeta[districtForInventory(it)].tone}>{districtMeta[districtForInventory(it)].label}</Badge>
                    <Badge tone={driftTone(it.drift)}>
                      <Eye className="h-3 w-3" /> drift:{it.drift}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    className="h-9 px-3"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setDrawerTargetId(it.id)
                      setDrawerOpen(true)
                    }}
                  >
                    <Building2 className="h-4 w-4" /> 详情
                  </Button>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <BuildingDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        target={
          drawerOpen && drawerTargetId
            ? (() => {
                const inv = change.workshop.inventory.find((x) => x.id === drawerTargetId)
                return inv ? { kind: 'inventory', value: inv, change } : null
              })()
            : null
        }
      />
    </div>
  )
}
