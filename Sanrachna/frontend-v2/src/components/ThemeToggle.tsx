import { Moon, Sun } from 'lucide-react'

import { useTheme } from '@/theme/ThemeContext'
import { cn } from '@/utils/cn'

type ThemeToggleProps = {
  className?: string
}

/** Minimal pill switch: thin border, soft track, icon on the sliding knob. */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? 'Use light mode' : 'Use dark mode'}
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex h-8 w-[3.25rem] shrink-0 items-center rounded-full',
        'border border-[color:var(--color-border)] bg-[color:var(--color-bg)]',
        'p-0.5 shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)]',
        'transition-[border-color,background-color] duration-200',
        'hover:border-[color:var(--color-border_strong)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-bg)]',
        className,
      )}
    >
      <span
        className={cn(
          'pointer-events-none flex size-7 items-center justify-center rounded-full',
          'bg-[color:var(--color-card)] shadow-sm ring-1 ring-[color:var(--color-border)]',
          'text-[color:var(--color-text_secondary)] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
          dark ? 'translate-x-[1.22rem]' : 'translate-x-0',
        )}
        aria-hidden
      >
        {dark ? (
          <Moon className="size-3.5 stroke-[1.75]" />
        ) : (
          <Sun className="size-3.5 stroke-[1.75] text-amber-600/85" />
        )}
      </span>
    </button>
  )
}
