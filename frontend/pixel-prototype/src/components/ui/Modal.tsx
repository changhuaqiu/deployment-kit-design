import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'

export default function Modal({
  open,
  title,
  children,
  onClose,
  className,
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  className?: string
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={cn('relative w-full max-w-xl px-panel p-4', className)}>
        <div className="flex items-center justify-between gap-4">
          <div className="text-base font-semibold">{title}</div>
          <Button aria-label="关闭" onClick={onClose} className="h-9 w-9 px-0" variant="default">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  )
}

