import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export default function Empty({
  title = '暂无内容',
  description,
  action,
}: {
  title?: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className={cn('px-panel grid place-items-center p-6')}
    >
      <div className="max-w-md text-center">
        <div className="text-sm font-semibold">{title}</div>
        {description ? <div className="mt-2 text-xs text-[var(--px-muted)]">{description}</div> : null}
        {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
      </div>
    </div>
  )
}
