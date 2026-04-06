import { CheckCircle2, Circle, LoaderCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DeployRun, RunStep } from '@/store/deployStore'

const steps: { key: RunStep; label: string }[] = [
  { key: 'syntax', label: '图纸审查' },
  { key: 'plan', label: '施工评估' },
  { key: 'test_deploy', label: '沙盘施工' },
  { key: 'prod_canary', label: '试通车' },
  { key: 'verify', label: '竣工验收' },
  { key: 'complete', label: '完成' },
]

function stepIndex(step: RunStep) {
  return steps.findIndex((s) => s.key === step)
}

export default function RunTimeline({ run }: { run: DeployRun }) {
  const idx = stepIndex(run.currentStep)

  return (
    <div className="px-panel p-3">
      <div className="text-sm font-semibold">战报时间轴</div>
      <div className="mt-3 space-y-2">
        {steps.map((s, i) => {
          const done = i < idx || (run.status !== 'running' && i <= idx)
          const active = i === idx && run.status === 'running'

          const Icon = done ? CheckCircle2 : active ? LoaderCircle : Circle
          const iconClass = done
            ? 'text-[var(--px-accent)]'
            : active
                ? 'text-[var(--px-info)] animate-spin'
                : 'text-[var(--px-muted)]'

          return (
            <div
              key={s.key}
              className={cn(
                'flex items-center justify-between gap-3 rounded-lg border-2 bg-[var(--px-panel-2)] px-3 py-3',
                active ? 'border-[var(--px-info)]' : 'border-[var(--px-border)]'
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn('h-4 w-4', iconClass)} />
                <div className="text-sm font-semibold">{s.label}</div>
              </div>
              <div className="text-xs text-[var(--px-muted)]">{done ? '完成' : active ? '进行中' : '待开始'}</div>
            </div>
          )
        })}
      </div>

      {run.status === 'failed' ? (
        <div className="mt-3 rounded-lg border-2 border-[var(--px-danger)] bg-[rgba(255,92,122,0.08)] p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--px-danger)]">
            <XCircle className="h-4 w-4" /> 失败（模拟）
          </div>
          <div className="mt-1 text-xs text-[var(--px-muted)]">建议：检查权限、依赖顺序、变量与锁。</div>
        </div>
      ) : null}
    </div>
  )
}

