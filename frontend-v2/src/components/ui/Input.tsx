import { forwardRef, type InputHTMLAttributes } from 'react'

import { cn } from '@/utils/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = 'text', ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-10 w-full rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 py-2 text-sm text-[color:var(--color-text)] shadow-sm transition-colors',
        'placeholder:text-[color:var(--color-text_muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary_light)]',
        className,
      )}
      {...props}
    />
  )
})
