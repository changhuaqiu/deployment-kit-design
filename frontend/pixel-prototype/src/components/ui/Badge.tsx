import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'info'

export default function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  const bg =
    tone === 'good'
      ? 'bg-[color-mix(in_oklab,var(--px-accent)_22%,var(--px-panel))] text-[var(--px-text)]'
      : tone === 'warn'
          ? 'bg-[color-mix(in_oklab,var(--px-warn)_22%,var(--px-panel))] text-[var(--px-text)]'
          : tone === 'bad'
              ? 'bg-[color-mix(in_oklab,var(--px-danger)_22%,var(--px-panel))] text-[var(--px-text)]'
              : tone === 'info'
                  ? 'bg-[color-mix(in_oklab,var(--px-info)_22%,var(--px-panel))] text-[var(--px-text)]'
                  : 'bg-[color-mix(in_oklab,var(--px-border)_22%,var(--px-panel))] text-[var(--px-text)]'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold',
        'border border-[var(--px-border)]',
        bg,
        className
      )}
    >
      {children}
    </span>
  )
}

