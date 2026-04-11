import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'

type AccordionSectionProps = {
  id?: string
  title: string
  required?: boolean
  defaultOpen?: boolean
  filledCount?: number
  hasError?: boolean
  children: React.ReactNode
}

export function AccordionSection({
  title,
  required,
  defaultOpen = false,
  filledCount,
  hasError,
  children,
}: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-[color:var(--color-card)] shadow-[var(--shadow-soft)]',
      )}
    >
      <button
        type="button"
        className={cn(
          'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
          'hover:bg-[color:var(--color-surface_hover)]',
        )}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {hasError ? (
          <span className="size-2 shrink-0 rounded-full bg-[color:var(--color-error)]" aria-hidden />
        ) : (
          <span className="size-2 shrink-0 rounded-full bg-transparent" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[color:var(--color-text)]">{title}</span>
            {required ? (
              <Badge variant="warning" className="text-[10px] uppercase tracking-wide">
                REQ
              </Badge>
            ) : (
              <Badge variant="success" className="text-[10px] uppercase tracking-wide">
                OPT
              </Badge>
            )}
            {!required && filledCount !== undefined && filledCount > 0 ? (
              <span className="text-[11px] text-[color:var(--color-text_muted)]">{filledCount} fields filled</span>
            ) : null}
          </div>
        </div>
        <ChevronDown
          className={cn('size-5 shrink-0 text-[color:var(--color-text_muted)] transition-transform duration-200', open && 'rotate-180')}
        />
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-[color:var(--color-border)] px-4 py-4">{children}</div>
        </div>
      </div>
    </div>
  )
}
