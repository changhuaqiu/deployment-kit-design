import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'default' | 'primary' | 'danger'

export default function Button({
  className,
  variant = 'default',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        'px-btn',
        variant === 'primary' && 'px-btn-primary',
        variant === 'danger' && 'px-btn-danger',
        className
      )}
      {...props}
    />
  )
}

