import { cn } from '@/lib/utils'
import type { TextareaHTMLAttributes } from 'react'

export default function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-24 w-full resize-none rounded-md px-3 py-2 text-sm outline-none',
        'bg-[var(--px-panel-2)] text-[var(--px-text)]',
        'border-2 border-[var(--px-border)] focus:border-[var(--px-info)]',
        className
      )}
      {...props}
    />
  )
}

