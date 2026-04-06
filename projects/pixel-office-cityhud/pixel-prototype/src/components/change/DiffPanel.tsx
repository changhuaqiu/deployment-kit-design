import { useMemo, useState } from 'react'
import { Building2, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DeployChange, ResourceAction } from '@/store/deployStore'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import BuildingDrawer from '@/components/city/BuildingDrawer'
import { districtForResource, districtMeta } from '@/utils/city'

function actionTone(action: ResourceAction) {
  if (action === 'create') return 'good'
  if (action === 'update') return 'info'
  return 'bad'
}

export default function DiffPanel({ change }: { change: DeployChange }) {
  const [tab, setTab] = useState<ResourceAction | 'all'>('all')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTargetId, setDrawerTargetId] = useState<string | null>(null)

  const list = useMemo(() => {
    const items = tab === 'all' ? change.resources : change.resources.filter((r) => r.action === tab)
    const sorted = [...items].sort((a, b) => {
      const aRisk = a.riskTags.includes('delete') ? 1 : 0
      const bRisk = b.riskTags.includes('delete') ? 1 : 0
      return bRisk - aRisk
    })
    return sorted
  }, [change.resources, tab])

  return (
    <div className="px-panel h-full p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold">建筑改造清单（Diff）</div>
        <div className="flex flex-wrap items-center gap-2">
          {([
            { key: 'all', label: '全部' },
            { key: 'create', label: '新增' },
            { key: 'update', label: '修改' },
            { key: 'delete', label: '删除' },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'rounded-md border-2 border-[var(--px-border)] bg-[var(--px-panel)] px-3 py-2 text-xs font-semibold',
                tab === t.key && 'outline outline-2 outline-[var(--px-info)]'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-2 overflow-auto pr-1" style={{ height: 520 }}>
        {list.map((r) => {
          const isOpen = expanded[r.id] ?? r.riskTags.includes('delete')
          const danger = r.action === 'delete' || r.riskTags.includes('delete')
          const districtKey = districtForResource(r)
          return (
            <div
              key={r.id}
              className={cn(
                'rounded-lg border-2 bg-[var(--px-panel-2)]',
                danger ? 'border-[var(--px-danger)]' : 'border-[var(--px-border)]'
              )}
            >
              <button
                className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left"
                onClick={() => setExpanded((s) => ({ ...s, [r.id]: !isOpen }))}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-semibold">{r.type}.{r.name}</div>
                    <Badge tone={districtMeta[districtKey].tone}>{districtMeta[districtKey].label}</Badge>
                    <Badge tone={actionTone(r.action)}>{r.action.toUpperCase()}</Badge>
                    {r.riskTags.includes('iam') ? <Badge tone="warn">IAM</Badge> : null}
                    {r.riskTags.includes('network') ? <Badge tone="info">NET</Badge> : null}
                    {r.riskTags.includes('data') ? <Badge tone="warn">DATA</Badge> : null}
                    {r.riskTags.includes('blast_radius') ? <Badge tone="bad">BLAST</Badge> : null}
                  </div>
                  <div className="mt-1 text-xs text-[var(--px-muted)]">{r.summary}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      className="h-9 px-3"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setDrawerTargetId(r.id)
                        setDrawerOpen(true)
                      }}
                    >
                      <Building2 className="h-4 w-4" /> 建筑详情
                    </Button>
                  </div>
                </div>
                <div className="mt-1 text-[var(--px-muted)]">{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</div>
              </button>

              {isOpen ? (
                <div className="border-t-2 border-[var(--px-border)] px-3 py-3">
                  <div className="text-xs font-semibold text-[var(--px-muted)]">变更预览（模拟）</div>
                  <div className="mt-2 rounded-md border border-[var(--px-border)] bg-[rgba(0,0,0,0.18)] p-3 font-mono text-xs text-[var(--px-text)]">
                    <div>{r.action === 'create' ? '+ ' : r.action === 'delete' ? '- ' : '~ '}resource "{r.type}" "{r.name}"</div>
                    <div className="mt-1 text-[var(--px-muted)]">{r.summary}</div>
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <BuildingDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        target={
          drawerOpen && drawerTargetId
            ? (() => {
                const rc = change.resources.find((x) => x.id === drawerTargetId)
                return rc ? { kind: 'resource', value: rc, change } : null
              })()
            : null
        }
      />
    </div>
  )
}

