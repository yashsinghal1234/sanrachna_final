import { NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { cn } from '@/utils/cn'

type SettingItem = { to: string; label: string }

const items: SettingItem[] = [
  { to: 'profile', label: 'Profile' },
  { to: 'team', label: 'Team Management' },
  { to: 'password', label: 'Security' },
  { to: 'notifications', label: 'Notifications' },
  { to: 'project', label: 'Project Settings' },
]

function roleBadge(role: string) {
  if (role === 'owner') return 'bg-[color:var(--color-warning)]/12 text-[color:var(--color-warning)]'
  if (role === 'engineer') return 'bg-[color:var(--color-info)]/12 text-[color:var(--color-info)]'
  return 'bg-[color:var(--color-success)]/12 text-[color:var(--color-success)]'
}

export function SettingsLayout() {
  const { role } = useAuth()
  const resolvedRole = role ?? 'engineer'

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-4">
        <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-5 shadow-[var(--shadow-card)]">
          <div className="text-xs font-semibold tracking-widest text-[color:var(--color-text_secondary)]">
            PROFILE & SETTINGS
          </div>
          <div className="mt-2 text-sm font-bold">
            Role:{' '}
            <span className={cn('rounded-full px-2 py-1 text-xs font-semibold', roleBadge(resolvedRole))}>
              {resolvedRole.toUpperCase()}
            </span>
          </div>
          <div className="mt-1 text-xs text-[color:var(--color-text_muted)]">
            Tier-based visibility and limited actions are enforced (demo).
          </div>
        </div>

        <nav className="space-y-1">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={false}
              className={({ isActive }) =>
                cn(
                  'block rounded-[var(--radius-xl)] px-3 py-2.5 text-sm font-semibold transition',
                  isActive
                    ? 'bg-[color:var(--color-card)] text-[color:var(--color-text)] shadow-[var(--shadow-soft)] ring-1 ring-[color:var(--color-border)]'
                    : 'text-[color:var(--color-text_secondary)] hover:bg-[color:var(--color-surface_hover)]/80 hover:text-[color:var(--color-text)]',
                )
              }
            >
              {it.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="space-y-6">
        <Outlet />
      </main>
    </div>
  )
}

