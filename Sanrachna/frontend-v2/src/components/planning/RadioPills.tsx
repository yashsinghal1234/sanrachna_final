import { cn } from '@/utils/cn'

type RadioPillsProps<T extends string> = {
  value: T | ''
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  className?: string
}

export function RadioPills<T extends string>({ value, onChange, options, className }: RadioPillsProps<T>) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            className={cn(
              'rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors',
              active
                ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/12 text-[color:var(--color-primary_dark)] ring-1 ring-[color:var(--color-primary)]/25'
                : 'border-[color:var(--color-border)] bg-[color:var(--color-card)] text-[color:var(--color-text_secondary)] hover:border-[color:var(--color-border_strong)] hover:text-[color:var(--color-text)]',
            )}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
