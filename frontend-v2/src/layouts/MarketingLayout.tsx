import { Outlet } from 'react-router-dom'

import { ThemeToggle } from '@/components/ThemeToggle'

export function MarketingLayout() {
  return (
    <div className="relative min-h-screen bg-[color:var(--color-bg)]">
      <div className="pointer-events-none fixed right-4 top-4 z-30 sm:right-6 sm:top-5">
        <div className="pointer-events-auto">
          <ThemeToggle />
        </div>
      </div>
      <Outlet />
    </div>
  )
}

