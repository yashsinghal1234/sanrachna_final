import type { Role } from '@/auth/AuthContext'

/** Path after `/app`, no leading slash (e.g. `cost-resources`, `logs/new`, `settings/profile`). */
export function normalizeAppSubpath(pathname: string): string {
  if (!pathname.startsWith('/app')) return pathname.replace(/^\/+/, '')
  let rest = pathname.slice('/app'.length) || ''
  if (rest.startsWith('/')) rest = rest.slice(1)
  return rest.replace(/\/$/, '')
}

const SEGMENT_ROLES: Record<string, Role[]> = {
  team: ['owner', 'engineer'],
  projects: ['owner'],
  'create-project': ['owner'],
  insights: ['owner', 'engineer'],
  timeline: ['owner', 'engineer'],
  procurement: ['owner', 'engineer'],
  documents: ['owner', 'engineer', 'worker'],
  estimation: ['owner', 'engineer'],
  chatbot: ['owner', 'engineer', 'worker'],
  logs: ['owner', 'engineer'],
  rfi: ['owner', 'engineer', 'worker'],
  issues: ['owner', 'engineer'],
  'cost-resources': ['owner', 'engineer'],
  'my-tasks': ['worker'],
  emergency: ['owner', 'engineer', 'worker'],
  contacts: ['owner', 'engineer', 'worker'],
  notifications: ['owner', 'engineer', 'worker'],
}

export function canAccessAppRoute(role: Role, pathname: string): boolean {
  const sub = normalizeAppSubpath(pathname)
  if (sub === '') return true

  if (sub === 'settings' || sub.startsWith('settings/')) return true

  if (sub === 'logs/new') return role === 'worker' || role === 'engineer'
  if (sub === 'issues/new') return role === 'worker' || role === 'engineer'

  const first = sub.split('/')[0]!
  const allowed = SEGMENT_ROLES[first]
  return allowed?.includes(role) ?? false
}

/** Floating emergency CTA: send-capable roles only (owner receives via page/nav). */
export function canSendEmergency(role: Role | null): boolean {
  const r = role ?? 'engineer'
  return r === 'engineer' || r === 'worker'
}
