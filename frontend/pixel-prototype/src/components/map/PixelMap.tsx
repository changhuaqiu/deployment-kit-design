import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Cpu, Database, Network, Shield, Swords, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DeployChange, EnvName } from '@/store/deployStore'

type Zone = {
  key: EnvName
  label: string
  rect: { x: number; y: number; w: number; h: number }
  accent: string
}

function iconForChange(change: DeployChange) {
  const hasDelete = change.resources.some((r) => r.action === 'delete')
  const hasData = change.resources.some((r) => r.riskTags.includes('data'))
  const hasNetwork = change.resources.some((r) => r.riskTags.includes('network'))
  const hasIam = change.resources.some((r) => r.riskTags.includes('iam'))

  if (hasDelete) return Trash2
  if (hasIam) return Shield
  if (hasNetwork) return Network
  if (hasData) return Database
  return Cpu
}

function statusTone(status: DeployChange['status']) {
  if (status === 'failed') return 'border-[var(--px-danger)] text-[var(--px-danger)]'
  if (status === 'succeeded') return 'border-[var(--px-accent)] text-[var(--px-accent)]'
  if (status === 'approved') return 'border-[var(--px-accent)] text-[var(--px-accent)]'
  if (status === 'running') return 'border-[var(--px-info)] text-[var(--px-info)]'
  if (status === 'in_workshop') return 'border-[var(--px-info)] text-[var(--px-info)]'
  if (status === 'in_review') return 'border-[var(--px-warn)] text-[var(--px-warn)]'
  return 'border-[var(--px-border)] text-[var(--px-muted)]'
}

export default function PixelMap({
  changes,
  onDrop,
  selectedId,
  onSelect,
}: {
  changes: DeployChange[]
  selectedId: string | null
  onSelect: (id: string) => void
  onDrop: (payload: { changeId: string; x: number; y: number; zone: EnvName }) => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const zones = useMemo<Zone[]>(
    () => [
      { key: 'prod', label: 'PROD 城堡', rect: { x: 520, y: 60, w: 420, h: 240 }, accent: 'var(--px-danger)' },
      { key: 'stage', label: 'STAGE 前线', rect: { x: 300, y: 300, w: 420, h: 240 }, accent: 'var(--px-warn)' },
      { key: 'dev', label: 'DEV 训练场', rect: { x: 40, y: 360, w: 360, h: 240 }, accent: 'var(--px-info)' },
    ],
    []
  )

  return (
    <div
      ref={ref}
      className={cn(
        'px-panel relative h-[620px] w-full overflow-hidden',
        'bg-[radial-gradient(circle_at_20%_0%,rgba(108,255,179,0.14),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(92,200,255,0.12),transparent_42%),linear-gradient(180deg,rgba(18,26,51,0.9),rgba(11,16,32,0.9))]'
      )}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const id = e.dataTransfer.getData('text/px-change-id')
        if (!id) return

        const host = ref.current
        if (!host) return
        const rect = host.getBoundingClientRect()
        const rawX = e.clientX - rect.left
        const rawY = e.clientY - rect.top

        const grid = 20
        const x = Math.max(10, Math.min(rect.width - 86, Math.round(rawX / grid) * grid))
        const y = Math.max(10, Math.min(rect.height - 64, Math.round(rawY / grid) * grid))

        const zone =
          zones.find(
            (z) =>
              rawX >= z.rect.x &&
              rawX <= z.rect.x + z.rect.w &&
              rawY >= z.rect.y &&
              rawY <= z.rect.y + z.rect.h
          )?.key ?? 'stage'

        onDrop({ changeId: id, x, y, zone })
      }}
    >
      <div
        className={cn(
          'absolute inset-0 opacity-[0.35]',
          'bg-[linear-gradient(rgba(92,200,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(92,200,255,0.08)_1px,transparent_1px)]',
          'bg-[length:20px_20px]'
        )}
      />

      <div className="absolute left-3 top-3 flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-md border-2 border-[var(--px-border)] bg-[var(--px-panel)]">
          <Swords className="h-4 w-4 text-[var(--px-accent)]" />
        </div>
        <div className="text-sm font-semibold">像素世界：把变更卡牌拖到你的环境关卡</div>
      </div>

      {zones.map((z) => (
        <div
          key={z.key}
          className="absolute"
          style={{ left: z.rect.x, top: z.rect.y, width: z.rect.w, height: z.rect.h }}
        >
          <div
            className="h-full rounded-lg border-2 bg-[rgba(0,0,0,0.12)]"
            style={{ borderColor: z.accent }}
          />
          <div
            className="absolute left-3 top-3 rounded-md border-2 px-2 py-1 text-xs font-semibold"
            style={{ borderColor: z.accent, color: z.accent, background: 'rgba(0,0,0,0.26)' }}
          >
            {z.label}
          </div>
        </div>
      ))}

      {changes
        .filter((c) => c.placement)
        .map((c) => {
          const Icon = iconForChange(c)
          const isSelected = selectedId === c.id
          const p = c.placement!
          return (
            <Link
              key={c.id}
              to={`/changes/${c.id}`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/px-change-id', c.id)
              }}
              onClick={(e) => {
                e.preventDefault()
                onSelect(c.id)
              }}
              className={cn(
                'absolute select-none',
                'rounded-lg border-2 bg-[rgba(0,0,0,0.28)] px-2 py-2',
                'shadow-[2px_2px_0_rgba(0,0,0,0.65)]',
                statusTone(c.status),
                isSelected && 'outline outline-2 outline-[var(--px-info)]'
              )}
              style={{ left: p.x, top: p.y, width: 168 }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-md border-2 border-current bg-[rgba(0,0,0,0.18)]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-[var(--px-text)]">{c.title}</div>
                    <div className="text-[11px] text-[var(--px-muted)]">{c.env.toUpperCase()} · {c.resources.length} 资源</div>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
    </div>
  )
}

