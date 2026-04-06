import { cn } from '@/lib/utils'
import type { InputHTMLAttributes } from 'react'

export default function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-md px-3 text-sm outline-none',
        'bg-[var(--px-panel-2)] text-[var(--px-text)]',
        'border-2 border-[var(--px-border)] focus:border-[var(--px-info)]',
        className
      )}
      {...props}
    />
  )
}

