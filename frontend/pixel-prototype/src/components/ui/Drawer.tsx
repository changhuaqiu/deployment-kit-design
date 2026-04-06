import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 bg-[rgba(0,0,0,0.55)]" onClick={onClose} aria-label="关闭抽屉" />
      <div className="absolute right-0 top-0 h-full w-full max-w-lg border-l-2 border-[var(--px-border)] bg-[var(--px-bg)]">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 border-b-2 border-[var(--px-border)] bg-[rgba(11,16,32,0.88)] px-4 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{title}</div>
            </div>
            <Button className="h-9 w-9 px-0" onClick={onClose} aria-label="关闭">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-4">{children}</div>
        </div>
      </div>
    </div>
  )
}

