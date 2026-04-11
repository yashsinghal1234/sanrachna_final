import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'

import { cn } from '@/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-slate-100 text-slate-800',
        success: 'border-transparent bg-emerald-50 text-emerald-800',
        warning: 'border-transparent bg-amber-50 text-amber-900',
        danger: 'border-transparent bg-red-50 text-red-800',
        info: 'border-transparent bg-sky-50 text-sky-900',
        muted: 'border-[color:var(--color-border)] bg-[color:var(--color-card)] text-[color:var(--color-text_secondary)]',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
