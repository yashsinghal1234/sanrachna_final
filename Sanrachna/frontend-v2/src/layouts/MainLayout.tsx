import { Bell } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

import { EmergencyAlertButton } from '@/components/EmergencyAlertButton'
import { cn } from '@/utils/cn'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/projects/new', label: 'New Project' },
  { to: '/estimation', label: 'Estimation' },
  { to: '/chatbot', label: 'Chatbot' },
  { to: '/logs', label: 'Daily Logs' },
  { to: '/rfi', label: 'RFI' },
  { to: '/issues', label: 'Issues' },
  { to: '/contacts', label: 'Contacts' },
] as const

interface MainLayoutProps {
  projectName: string
}

export function MainLayout({ projectName }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-surface">
      <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="border-b border-slate-100 px-5 py-5">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Sanrachna
          </div>
          <div className="mt-1 text-lg font-bold tracking-tight text-slate-900">
            Construction OS
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            RAG-grounded planning for Indian SME firms
          </p>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) =>
                cn(
                  'block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-4 text-xs text-muted">
          Demo workspace · CPWD / RSMeans benchmarks
        </div>
      </aside>

      <div className="pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between px-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Project</p>
              <p className="text-sm font-semibold text-slate-900">{projectName}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="relative flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                aria-label="Notifications (demo)"
              >
                <Bell className="size-5" />
                <span className="absolute right-2 top-2 size-2 rounded-full bg-red-500 ring-2 ring-white" />
              </button>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 pr-3 shadow-sm transition hover:border-slate-300"
                aria-label="User menu (demo)"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-600 text-xs font-bold text-white">
                  PM
                </span>
                <span className="hidden text-left text-sm font-medium text-slate-800 sm:block">
                  Kavita Iyer
                </span>
              </button>
            </div>
          </div>
        </header>

        <main className="px-8 py-8">
          <Outlet />
        </main>
      </div>

      <EmergencyAlertButton />
    </div>
  )
}
