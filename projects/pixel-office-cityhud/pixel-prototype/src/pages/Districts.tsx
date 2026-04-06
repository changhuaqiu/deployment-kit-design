import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, Grid3x3 } from 'lucide-react'
import AppShell from '@/components/AppShell'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import BuildingDrawer from '@/components/city/BuildingDrawer'
import { useDeployStore, type DeployChange, type EnvName } from '@/store/deployStore'
import { districtForInventory, districtForResource, districtMeta, type DistrictKey } from '@/utils/city'
import { computeCostDelta, computeRiskScore } from '@/utils/risk'

type Row =
  | { kind: 'resource'; change: DeployChange; id: string; label: string; district: DistrictKey; cost: number; risk: number; payloadId: string }
  | { kind: 'inventory'; change: DeployChange; id: string; label: string; district: DistrictKey; cost: number; risk: number; payloadId: string }

export default function Districts() {
  const navigate = useNavigate()
  const params = useParams()
  const env = (params.env as EnvName | undefined) ?? 'prod'

  const all = useDeployStore((s) => s.changes)
  const cityChanges = useMemo(() => all.filter((c) => c.env === env), [all, env])

  const rows = useMemo(() => {
    const acc: Row[] = []
    for (const ch of cityChanges) {
      for (const r of ch.resources) {
        const d = districtForResource(r)
        const risk = computeRiskScore({ ...ch, resources: [r] }).score
        acc.push({
          kind: 'resource',
          change: ch,
          id: `res_${ch.id}_${r.id}`,
          label: `${r.type}.${r.name}`,
          district: d,
          cost: r.costDeltaMonthlyUsd,
          risk,
          payloadId: r.id,
        })
      }
      for (const i of ch.workshop.inventory) {
        const d = districtForInventory(i)
        acc.push({
          kind: 'inventory',
          change: ch,
          id: `inv_${ch.id}_${i.id}`,
          label: `${i.type}.${i.name}`,
          district: d,
          cost: 0,
          risk: i.drift === 'none' ? 10 : 45,
          payloadId: i.id,
        })
      }
    }
    return acc
  }, [cityChanges])

  const districtCounts = useMemo(() => {
    const base: Record<DistrictKey, number> = {
      business: 0,
      data: 0,
      network: 0,
      security: 0,
      ops: 0,
      config: 0,
    }
    for (const r of rows) base[r.district] += 1
    return base
  }, [rows])

  const [selectedDistrict, setSelectedDistrict] = useState<DistrictKey>('business')
  const filtered = useMemo(() => rows.filter((r) => r.district === selectedDistrict), [rows, selectedDistrict])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTarget, setDrawerTarget] = useState<Parameters<typeof BuildingDrawer>[0]['target']>(null)

  return (
    <AppShell
      title="街区视图（城市运营）"
      right={
        <div className="hidden items-center gap-2 md:flex">
          <Badge tone="info">城市：{env.toUpperCase()}</Badge>
          <Badge tone="neutral">
            <Grid3x3 className="h-3 w-3" /> 街区
          </Badge>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[0.85fr_1.35fr]">
        <div className="space-y-3">
          <div className="px-panel p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold">城市概览</div>
              <Button onClick={() => navigate('/map')}>
                <ArrowLeft className="h-4 w-4" /> 回施工地图
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg border-2 border-[var(--px-border)] bg-[var(--px-panel-2)] p-3">
                <div className="text-xs font-semibold text-[var(--px-muted)]">工程单</div>
                <div className="mt-2 text-sm font-semibold">{cityChanges.length}</div>
              </div>
              <div className="rounded-lg border-2 border-[var(--px-border)] bg-[var(--px-panel-2)] p-3">
                <div className="text-xs font-semibold text-[var(--px-muted)]">预算变化</div>
                <div className="mt-2 text-sm font-semibold">
                  {cityChanges.reduce((acc, c) => acc + computeCostDelta(c), 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div className="px-panel p-3">
            <div className="text-sm font-semibold">街区列表</div>
            <div className="mt-3 space-y-2">
              {(Object.keys(districtMeta) as DistrictKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setSelectedDistrict(k)}
                  className={
                    'flex w-full items-center justify-between gap-2 rounded-lg border-2 border-[var(--px-border)] bg-[var(--px-panel-2)] px-3 py-3 ' +
                    (selectedDistrict === k ? 'outline outline-2 outline-[var(--px-info)]' : '')
                  }
                >
                  <div className="flex items-center gap-2">
                    <Badge tone={districtMeta[k].tone}>{districtMeta[k].label}</Badge>
                  </div>
                  <div className="text-xs text-[var(--px-muted)]">{districtCounts[k]} 栋</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-panel p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">{districtMeta[selectedDistrict].label} · 建筑清单</div>
            <Badge tone="neutral">
              <Building2 className="h-3 w-3" /> {filtered.length}
            </Badge>
          </div>
          <div className="mt-3 space-y-2" style={{ maxHeight: 620, overflow: 'auto' }}>
            {filtered.map((r) => (
              <button
                key={r.id}
                className="w-full rounded-lg border-2 border-[var(--px-border)] bg-[var(--px-panel-2)] p-3 text-left shadow-[2px_2px_0_rgba(0,0,0,0.55)] hover:bg-[color-mix(in_oklab,var(--px-panel-2)_86%,white_6%)]"
                onClick={() => {
                  const change = r.change
                  if (r.kind === 'resource') {
                    const rc = change.resources.find((x) => x.id === r.payloadId)
                    if (!rc) return
                    setDrawerTarget({ kind: 'resource', value: rc, change })
                    setDrawerOpen(true)
                  } else {
                    const inv = change.workshop.inventory.find((x) => x.id === r.payloadId)
                    if (!inv) return
                    setDrawerTarget({ kind: 'inventory', value: inv, change })
                    setDrawerOpen(true)
                  }
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{r.label}</div>
                    <div className="mt-1 text-xs text-[var(--px-muted)]">工程单：{r.change.title}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone={r.risk >= 60 ? 'bad' : r.risk >= 35 ? 'warn' : 'neutral'}>风险 {Math.round(r.risk)}</Badge>
                    <Badge tone={r.cost > 0 ? 'warn' : 'neutral'}>预算 {r.cost.toFixed(2)}</Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <BuildingDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} target={drawerTarget} />
    </AppShell>
  )
}
