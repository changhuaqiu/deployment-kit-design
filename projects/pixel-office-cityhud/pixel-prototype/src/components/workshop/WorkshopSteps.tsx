import { CheckCircle2, Circle, LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkshopStep } from '@/store/deployStore'

const steps: { key: WorkshopStep; label: string }[] = [
  { key: 'select', label: '选择地块' },
  { key: 'scan', label: '城市普查' },
  { key: 'generate', label: '生成蓝图/整改' },
  { key: 'preview', label: '预览图纸' },
  { key: 'complete', label: '提交审批' },
]

function stepIndex(step: WorkshopStep) {
  return steps.findIndex((s) => s.key === step)
}

export default function WorkshopSteps({ step }: { step: WorkshopStep }) {
  const idx = stepIndex(step)
  return (
    <div className="px-panel p-3">
      <div className="text-sm font-semibold">工坊步骤</div>
      <div className="mt-3 space-y-2">
        {steps.map((s, i) => {
          const done = i < idx
          const active = i === idx
          const Icon = done ? CheckCircle2 : active ? LoaderCircle : Circle
          return (
            <div
              key={s.key}
              className={cn(
                'flex items-center justify-between gap-3 rounded-lg border-2 bg-[var(--px-panel-2)] px-3 py-3',
                active ? 'border-[var(--px-info)]' : 'border-[var(--px-border)]'
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn('h-4 w-4', done ? 'text-[var(--px-accent)]' : active ? 'text-[var(--px-info)] animate-spin' : 'text-[var(--px-muted)]')} />
                <div className="text-sm font-semibold">{s.label}</div>
              </div>
              <div className="text-xs text-[var(--px-muted)]">{done ? '完成' : active ? '进行中' : '待开始'}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
