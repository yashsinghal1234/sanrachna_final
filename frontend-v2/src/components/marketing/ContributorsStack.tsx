import { cn } from '@/utils/cn'

export type ContributorAvatar = {
  name: string
  /** Tailwind gradient or bg class for the circle fill */
  accentClass?: string
}

const DEFAULT_TEAM: ContributorAvatar[] = [
  { name: 'Yash Singhal',  accentClass: 'bg-[linear-gradient(135deg,#2FBFAD,#1fa393)]' },
  { name: 'Sudiksha',      accentClass: 'bg-[linear-gradient(135deg,#8B5CF6,#6d28d9)]' },
  { name: 'Tanya',         accentClass: 'bg-[linear-gradient(135deg,#EC4899,#db2777)]' },
  { name: 'Sparsh Singhal',accentClass: 'bg-[linear-gradient(135deg,#3B82F6,#2563eb)]' },
  { name: 'Umang Saluja',  accentClass: 'bg-[linear-gradient(135deg,#F59E0B,#d97706)]' },
]

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0] + parts[1]![0]).toUpperCase()
  return name.slice(0, 2).toUpperCase() || '?'
}

type Props = {
  /** `light`: on dark / image hero (login). `dark`: on app background (landing). */
  variant?: 'light' | 'dark'
  title?: string
  subtitle?: string
  people?: ContributorAvatar[]
  className?: string
}

export function ContributorsStack({
  variant = 'dark',
  title = 'Core contributors',
  subtitle = 'Product, research, and field ops — hover a face to see who’s who.',
  people = DEFAULT_TEAM,
  className,
}: Props) {
  const isLight = variant === 'light'

  return (
    <div className={cn('select-none', className)}>
      <div className={cn('text-xs font-semibold uppercase tracking-wide', isLight ? 'text-white/70' : 'text-[color:var(--color-text_muted)]')}>
        {title}
      </div>
      <p className={cn('mt-1 max-w-sm text-sm', isLight ? 'text-white/80' : 'text-[color:var(--color-text_secondary)]')}>
        {subtitle}
      </p>

      <div className="mt-4 flex items-center pl-1">
        {people.map((person, i) => (
          <div
            key={person.name}
            className="group relative -ml-3 first:ml-0 transition duration-200 ease-out hover:z-30 hover:scale-110 focus-within:z-30"
            style={{ zIndex: i + 1 }}
          >
            <button
              type="button"
              className={cn(
                'flex size-[2.75rem] items-center justify-center rounded-full text-xs font-bold text-white shadow-md outline-none ring-2 transition',
                person.accentClass ?? 'bg-[color:var(--color-primary_dark)]',
                isLight ? 'ring-white/40 hover:ring-white/70' : 'ring-[color:var(--color-card)] hover:ring-[color:var(--color-primary_light)]/60',
              )}
              aria-label={person.name}
            >
              {initials(person.name)}
            </button>
            <div
              role="tooltip"
              className={cn(
                'pointer-events-none absolute left-1/2 top-[calc(100%+0.45rem)] z-40 w-max max-w-[12rem] -translate-x-1/2 rounded-lg px-2.5 py-1.5 text-center text-xs font-semibold opacity-0 shadow-lg ring-1 transition duration-150 group-hover:opacity-100 group-focus-within:opacity-100',
                isLight
                  ? 'bg-slate-950/92 text-white ring-white/15'
                  : 'bg-[color:var(--color-text)] text-[color:var(--color-card)] ring-black/10',
              )}
            >
              {person.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
