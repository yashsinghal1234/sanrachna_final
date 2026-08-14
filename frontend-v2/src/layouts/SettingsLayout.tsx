import { NavLink, Outlet } from 'react-router-dom'

import { cn } from '@/utils/cn'

type SettingItem = { to: string; label: string }

const items: SettingItem[] = [
  { to: 'profile', label: 'Profile' },
  { to: 'password', label: 'Security' },
  { to: 'notifications', label: 'Notifications' },
  { to: 'project', label: 'Project Settings' },
]

export function SettingsLayout() {
  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-end gap-1 overflow-x-auto border-b border-[color:var(--color-border)] px-4 pt-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={false}
            className={({ isActive }) =>
              cn(
                'whitespace-nowrap px-4 py-2.5 text-sm font-semibold transition-colors rounded-t-xl border border-b-0 relative top-[1px]',
                isActive
                  ? 'bg-[color:var(--color-bg)] border-[color:var(--color-border)] text-[color:var(--color-text)] z-10'
                  : 'bg-transparent border-transparent text-[color:var(--color-text_secondary)] hover:bg-[color:var(--color-surface_hover)] hover:text-[color:var(--color-text)]',
              )
            }
          >
            {it.label}
          </NavLink>
        ))}
      </nav>

      <main className="min-w-0">
        <Outlet />
      </main>
    </div>
  )
}

