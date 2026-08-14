import { Outlet } from 'react-router-dom'

export function MarketingLayout() {
  return (
    <div className="relative min-h-screen bg-[color:var(--color-bg)]">
      <Outlet />
    </div>
  )
}

