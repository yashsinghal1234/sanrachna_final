import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'

import { cn } from '@/utils/cn'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-xl)] text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary_light)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-bg)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4',
  {
    variants: {
      variant: {
        primary:
          'bg-[color:var(--color-primary)] text-white shadow-sm hover:bg-[color:var(--color-primary_dark)] active:scale-[0.98]',
        secondary:
          'bg-[color:var(--color-card)] text-[color:var(--color-text)] shadow-[var(--shadow-soft)] ring-1 ring-[color:var(--color-border)] hover:bg-[color:var(--color-surface_hover)]',
        outline:
          'border border-[color:var(--color-border_strong)] bg-[color:var(--color-card)] text-[color:var(--color-text)] hover:bg-[color:var(--color-surface_hover)]',
        ghost: 'text-[color:var(--color-text_secondary)] hover:bg-[color:var(--color-surface_muted)]',
        danger: 'bg-[color:var(--color-error)] text-white hover:brightness-95 active:scale-[0.98]',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-10 px-4',
        lg: 'h-11 px-5 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
}
