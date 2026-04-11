import { Navigate, useLocation } from 'react-router-dom'
import type { ReactElement } from 'react'

import { useAuth } from '@/auth/AuthContext'
import { canAccessAppRoute } from '@/auth/rbac'

export function RequireRouteAccess({ children }: { children: ReactElement }) {
  const { role } = useAuth()
  const { pathname } = useLocation()
  const r = role ?? 'engineer'
  if (!canAccessAppRoute(r, pathname)) {
    return <Navigate to="/app" replace state={{ forbidden: true }} />
  }
  return children
}
