import {
  Bell,
  Bot,
  Check,
  ChevronDown,
  ClipboardList,
  Coins,
  PlusCircle,
  FileText,
  FolderOpen,
  AlertTriangle,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  ShieldAlert,
  Sparkles,
  Send,
  Settings,
  ShoppingCart,
  Timer,
  UserCog,
  Users,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '@/auth/AuthContext'
import { WorkspaceBootstrap } from '@/components/WorkspaceBootstrap'
import { EmergencyButton } from '@/components/EmergencyButton'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn } from '@/utils/cn'
import { fetchNotifications } from '@/api/resources'
import { useProjectsStore } from '@/store/useProjectsStore'
import type { NotificationAlert } from '@/types/notifications.types'
import { useEmergency } from '@/emergency/EmergencyContext'

type SidebarState = 'expanded' | 'collapsed'
type NavItem = { to: string; label: string; end?: boolean; icon: React.ComponentType<{ className?: string }> }

const SIDEBAR_KEY = 'sanrachna_sidebar_v1'

function safeReadSidebarState(): SidebarState | null {
  try {
    const raw = window.localStorage.getItem(SIDEBAR_KEY)
    if (raw === 'expanded' || raw === 'collapsed') return raw
  } catch {
    // ignore
  }
  return null
}

function safeWriteSidebarState(next: SidebarState) {
  try {
    window.localStorage.setItem(SIDEBAR_KEY, next)
  } catch {
    // ignore
  }
}

function defaultSidebarStateByViewport(): SidebarState {
  // Desktop (lg+): expanded by default
  // Tablet (md): collapsed by default
  if (typeof window === 'undefined') return 'expanded'
  return window.innerWidth >= 1024 ? 'expanded' : 'collapsed'
}

function SidebarNavItem({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  onNavigate?: () => void
}) {
  const Icon = item.icon
  return (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-[var(--radius-xl)] px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-[color:var(--color-nav_active_bg)] text-[color:var(--color-nav_active_text)] shadow-sm ring-1 ring-[color:var(--color-nav_active_ring)]'
            : 'text-[color:var(--color-text_secondary)] hover:bg-[color:var(--color-nav_hover_bg)] hover:text-[color:var(--color-nav_hover_text)]',
          collapsed && 'justify-center px-3',
        )
      }
    >
      <Icon className={cn('size-4 shrink-0', collapsed ? 'text-[color:var(--color-text_secondary)]' : '')} />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}

      {collapsed ? (
        <span
          className={cn(
            'pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 py-2 text-xs font-semibold text-[color:var(--color-text)] shadow-[var(--shadow-card)]',
            'group-hover:block',
          )}
          role="tooltip"
        >
          {item.label}
        </span>
      ) : null}
    </NavLink>
  )
}

function navForRole(role: 'owner' | 'engineer' | 'worker'): NavItem[] {
  if (role === 'worker') {
    return [
      { to: '/app', label: 'Dashboard', end: true, icon: LayoutDashboard },
      { to: '/app/chatbot', label: 'AI Copilot', icon: Bot },
      { to: '/app/my-tasks', label: 'My Tasks', icon: ClipboardList },
      { to: '/app/documents', label: 'Documents', icon: FolderOpen },
      { to: '/app/rfi', label: 'RFI Center', icon: Send },
      { to: '/app/logs/new', label: 'Submit Log', icon: FileText },
      { to: '/app/issues/new', label: 'Report Issue', icon: ShieldAlert },
      { to: '/app/contacts', label: 'Contacts', icon: Users },
      { to: '/app/emergency', label: 'Emergency', icon: AlertTriangle },
      { to: '/app/settings/profile', label: 'Profile & Settings', icon: MessageSquareText },
    ]
  }

  if (role === 'owner') {
    return [
      { to: '/app', label: 'Dashboard', end: true, icon: LayoutDashboard },
      { to: '/app/create-project', label: 'Create Project', icon: PlusCircle },
      { to: '/app/settings/team', label: 'Team Management', icon: UserCog },
      { to: '/app/insights', label: 'Project Intelligence', icon: Gauge },
      { to: '/app/estimation', label: 'AI Planning Studio', icon: ClipboardList },
      { to: '/app/timeline', label: 'Timeline', icon: Timer },
      { to: '/app/cost-resources', label: 'Cost & Resources', icon: Coins },
      { to: '/app/procurement', label: 'Procurement', icon: ShoppingCart },
      { to: '/app/logs', label: 'Daily Logs', icon: FileText },
      { to: '/app/chatbot', label: 'AI Copilot', icon: Sparkles },
      { to: '/app/rfi', label: 'RFI Center', icon: Send },
      { to: '/app/issues', label: 'Issue Tracker', icon: ShieldAlert },
      { to: '/app/documents', label: 'Documents', icon: FolderOpen },
      { to: '/app/contacts', label: 'Contacts', icon: Users },
      { to: '/app/emergency', label: 'Emergency', icon: AlertTriangle },
      { to: '/app/settings/profile', label: 'Profile & Settings', icon: MessageSquareText },
    ]
  }

  return [
    { to: '/app', label: 'Dashboard', end: true, icon: LayoutDashboard },
    { to: '/app/settings/team', label: 'Team Management', icon: UserCog },
    { to: '/app/insights', label: 'Project Intelligence', icon: Gauge },
    { to: '/app/estimation', label: 'AI Planning Studio', icon: ClipboardList },
    { to: '/app/timeline', label: 'Timeline / Scheduling', icon: Timer },
    { to: '/app/cost-resources', label: 'Cost & Resources', icon: Coins },
    { to: '/app/procurement', label: 'Procurement', icon: ShoppingCart },
    { to: '/app/chatbot', label: 'AI Copilot', icon: Sparkles },
    { to: '/app/logs', label: 'Daily Logs', icon: FileText },
    { to: '/app/rfi', label: 'RFI Center', icon: Send },
    { to: '/app/issues', label: 'Issue Tracker', icon: ShieldAlert },
    { to: '/app/documents', label: 'Documents', icon: FolderOpen },
    { to: '/app/emergency', label: 'Emergency', icon: AlertTriangle },
    { to: '/app/contacts', label: 'Contacts / Team', icon: Users },
    { to: '/app/settings/profile', label: 'Profile & Settings', icon: MessageSquareText },
  ]
}

type FeedFilter = 'all' | 'unread' | 'critical' | 'resolved'

function priorityPill(p: NotificationAlert['priority']) {
  const cls =
    p === 'critical'
      ? 'bg-[color:var(--color-error)]/12 text-[color:var(--color-error)]'
      : p === 'warning'
        ? 'bg-[color:var(--color-warning)]/12 text-[color:var(--color-warning)]'
        : 'bg-[color:var(--color-info)]/12 text-[color:var(--color-info)]'
  return <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', cls)}>{p}</span>
}

function typeLabel(t: NotificationAlert['type']) {
  const map: Record<NotificationAlert['type'], string> = {
    budget_overrun: 'Budget',
    delay: 'Delay',
    rfi: 'RFI',
    issue: 'Issues',
    daily_log: 'Daily log',
    material: 'Materials',
    inspection: 'Inspection',
    emergency: 'Emergency',
    compliance: 'Compliance',
    approval: 'Approval',
    summary: 'Summary',
  }
  return map[t]
}

export function AppLayout() {
  const { user, role, logout } = useAuth()
  const navigate = useNavigate()
  const { activeBanner, lastEvent, getIncident } = useEmergency()
  const projectsById = useProjectsStore((s) => s.projects)

  const resolvedRole = role ?? 'engineer'
  const navItems = navForRole(resolvedRole)
  const primaryNav = useMemo(() => navItems.slice(0, 6), [navItems])
  const secondaryNav = useMemo(() => navItems.slice(6), [navItems])
  const [notifOpen, setNotifOpen] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [sidebarState, setSidebarState] = useState<SidebarState>(() => safeReadSidebarState() ?? defaultSidebarStateByViewport())
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all')
  const [projectFilter, setProjectFilter] = useState<string | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<NotificationAlert['type'] | 'all'>('all')
  const [alerts, setAlerts] = useState<NotificationAlert[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const initials = (user?.name || 'SN')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const projectNames = useMemo(
    () => Object.values(projectsById).filter((p) => !p.archived).map((p) => p.name),
    [projectsById],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const next = await fetchNotifications()
        if (!cancelled) setAlerts(Array.isArray(next) ? next : [])
      } catch {
        if (!cancelled) setAlerts([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    safeWriteSidebarState(sidebarState)
  }, [sidebarState])

  useEffect(() => {
    const onResize = () => {
      // Close mobile drawer once we reach md+ to prevent stale overlay.
      if (window.innerWidth >= 768) setMobileSidebarOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(id)
  }, [toast])

  useEffect(() => {
    if (!lastEvent) return
    if (lastEvent.kind === 'broadcast_sent') {
      const inc = getIncident(lastEvent.incidentId)
      if (inc) {
        setToast(`Emergency broadcast: ${inc.location.zone}`)
      } else {
        setToast('Emergency broadcast sent.')
      }
    }
  }, [lastEvent, getIncident])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNotifOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const roleAlerts = useMemo(() => alerts.filter((a) => a.role === resolvedRole), [alerts, resolvedRole])

  const unreadCount = useMemo(() => roleAlerts.filter((a) => a.status === 'unread').length, [roleAlerts])

  const groupedAlerts = useMemo(() => {
    const filtered = roleAlerts.filter((a) => {
      if (projectFilter !== 'all' && a.project !== projectFilter) return false
      if (typeFilter !== 'all' && a.type !== typeFilter) return false
      if (feedFilter === 'unread' && a.status !== 'unread') return false
      if (feedFilter === 'resolved' && a.status !== 'resolved') return false
      if (feedFilter === 'critical' && a.priority !== 'critical') return false
      return true
    })

    // Smart grouping for repeated operational alerts
    const groups = new Map<string, NotificationAlert[]>()
    const singles: NotificationAlert[] = []
    for (const a of filtered) {
      if (a.groupKey) {
        const key = a.groupKey
        const arr = groups.get(key) ?? []
        arr.push(a)
        groups.set(key, arr)
      } else {
        singles.push(a)
      }
    }
    const grouped = [...groups.entries()].map(([key, arr]) => {
      const head = arr[0]
      return {
        key,
        kind: 'group' as const,
        title: `${arr.length} ${typeLabel(head.type)} alerts in ${head.project}`,
        priority: arr.some((x) => x.priority === 'critical') ? 'critical' : head.priority,
        items: arr,
      }
    })

    const singleItems = singles.map((a) => ({ kind: 'single' as const, alert: a }))
    return [...grouped, ...singleItems]
  }, [roleAlerts, projectFilter, typeFilter, feedFilter])

  const summary = useMemo(() => {
    const critical = roleAlerts.filter((a) => a.priority === 'critical' && a.status !== 'resolved').length
    const unread = roleAlerts.filter((a) => a.status === 'unread').length
    const escalations = roleAlerts.filter((a) => a.type === 'rfi' && a.priority !== 'info' && a.status !== 'resolved').length
    const emergencies = roleAlerts.filter((a) => a.type === 'emergency').length
    return { critical, unread, escalations, emergencies }
  }, [roleAlerts])

  const mutate = (id: string, patch: Partial<NotificationAlert>) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }

  const handleAction = (a: NotificationAlert, action: NotificationAlert['actions'][number]) => {
    if (action.kind === 'resolve') {
      mutate(a.id, { status: 'resolved' })
      setToast('Marked resolved.')
      return
    }
    if (action.kind === 'assign') {
      mutate(a.id, { status: a.status === 'unread' ? 'read' : a.status })
      setToast('Assigned (demo).')
      return
    }
    if (action.kind === 'forward') {
      mutate(a.id, { status: a.status === 'unread' ? 'read' : a.status })
      setToast('Forwarded (demo).')
      return
    }
    if (action.to) {
      mutate(a.id, { status: a.status === 'unread' ? 'read' : a.status })
      setNotifOpen(false)
      navigate(action.to)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)]">
      <WorkspaceBootstrap />
      {toast ? (
        <div
          role="status"
          className="fixed bottom-24 right-6 z-[60] max-w-sm rounded-[var(--radius-2xl)] bg-[color:var(--color-text)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-card)]"
          onClick={() => setToast(null)}
        >
          {toast}
        </div>
      ) : null}

      {notifOpen ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Notifications"
          onClick={() => setNotifOpen(false)}
        >
          <div
            className="h-full w-full max-w-xl overflow-y-auto border-l border-[color:var(--color-border)] bg-[color:var(--color-card)] shadow-[var(--shadow-card)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 border-b border-[color:var(--color-border)] bg-[color:var(--color-header_scrim)] backdrop-blur-md">
              <div className="flex items-start justify-between gap-3 p-5">
                <div>
                  <div className="text-xs font-semibold tracking-widest text-[color:var(--color-text_muted)]">
                    NOTIFICATIONS
                  </div>
                  <div className="mt-1 text-lg font-bold">
                    {resolvedRole === 'owner'
                      ? 'Owner alerts'
                      : resolvedRole === 'engineer'
                        ? 'Engineer alerts'
                        : 'Worker alerts'}
                  </div>
                  <div className="mt-1 text-sm text-[color:var(--color-text_secondary)]">
                    Prioritized feed with actions. No separate page.
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setNotifOpen(false)}>
                  <X className="size-4" />
                  Close
                </Button>
              </div>

              <div className="px-5 pb-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Card className="shadow-none ring-1 ring-[color:var(--color-border)]">
                    <CardContent className="pt-4">
                      <div className="text-xs text-[color:var(--color-text_secondary)]">Critical</div>
                      <div className="mt-1 text-xl font-bold">{summary.critical}</div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-none ring-1 ring-[color:var(--color-border)]">
                    <CardContent className="pt-4">
                      <div className="text-xs text-[color:var(--color-text_secondary)]">Unread</div>
                      <div className="mt-1 text-xl font-bold">{summary.unread}</div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-none ring-1 ring-[color:var(--color-border)]">
                    <CardContent className="pt-4">
                      <div className="text-xs text-[color:var(--color-text_secondary)]">Open escalations</div>
                      <div className="mt-1 text-xl font-bold">{summary.escalations}</div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-none ring-1 ring-[color:var(--color-border)]">
                    <CardContent className="pt-4">
                      <div className="text-xs text-[color:var(--color-text_secondary)]">Emergencies</div>
                      <div className="mt-1 text-xl font-bold">{summary.emergencies}</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div className="inline-flex rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-filter_segment_bg)] p-1 shadow-sm">
                    {(['all', 'unread', 'critical', 'resolved'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFeedFilter(f)}
                        className={cn(
                          'rounded-[var(--radius-xl)] px-3 py-2 text-sm font-semibold transition',
                          feedFilter === f
                            ? 'bg-[color:var(--color-primary)] text-white'
                            : 'text-[color:var(--color-text_secondary)] hover:bg-[color:var(--color-surface_hover)]',
                        )}
                      >
                        {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : f === 'critical' ? 'Critical' : 'Resolved'}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="relative">
                      <select
                        className="w-full appearance-none rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 py-2 pr-8 text-sm text-[color:var(--color-text)]"
                        value={projectFilter}
                        onChange={(e) => setProjectFilter(e.target.value === 'all' ? 'all' : e.target.value)}
                      >
                        <option value="all">All projects</option>
                        {projectNames.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-text_muted)]" />
                    </div>
                    <div className="relative">
                      <select
                        className="w-full appearance-none rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 py-2 pr-8 text-sm text-[color:var(--color-text)]"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as any)}
                      >
                        <option value="all">All types</option>
                        {(
                          [
                            'budget_overrun',
                            'delay',
                            'rfi',
                            'issue',
                            'daily_log',
                            'material',
                            'inspection',
                            'emergency',
                            'compliance',
                            'approval',
                            'summary',
                          ] as const
                        ).map((t) => (
                          <option key={t} value={t}>
                            {typeLabel(t)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-text_muted)]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-5">
              {groupedAlerts.length === 0 ? (
                <div className="rounded-[var(--radius-xl)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg)] py-14 text-center text-sm text-[color:var(--color-text_secondary)]">
                  No alerts for this filter.
                </div>
              ) : (
                groupedAlerts.map((item) => {
                  if (item.kind === 'group') {
                    const priority = item.priority as NotificationAlert['priority']
                    return (
                      <Card key={item.key} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <CardTitle className="text-base">{item.title}</CardTitle>
                              <CardDescription>Smart grouped — expand in production</CardDescription>
                            </div>
                            {priorityPill(priority)}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {item.items.slice(0, 3).map((a) => (
                            <div
                              key={a.id}
                              className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold">{a.title}</div>
                                  <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">
                                    {a.body}
                                  </div>
                                </div>
                                <div className="text-xs text-[color:var(--color-text_muted)]">{a.createdAtLabel}</div>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )
                  }

                  const a = item.alert
                  return (
                    <Card key={a.id} className={cn(a.status === 'unread' && 'ring-1 ring-[color:var(--color-primary)]/40')}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-base">{a.title}</CardTitle>
                            <CardDescription>
                              {typeLabel(a.type)} · {a.project} · {a.createdAtLabel}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            {priorityPill(a.priority)}
                            {a.status === 'unread' ? (
                              <span className="rounded-full bg-[color:var(--color-primary)]/12 px-2 py-0.5 text-[11px] font-semibold text-[color:var(--color-primary_dark)]">
                                Unread
                              </span>
                            ) : a.status === 'resolved' ? (
                              <span className="rounded-full bg-[color:var(--color-success)]/12 px-2 py-0.5 text-[11px] font-semibold text-[color:var(--color-success)]">
                                Resolved
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm text-[color:var(--color-text_secondary)]">{a.body}</div>

                        <div className="flex flex-wrap gap-2">
                          {a.actions.map((act) => (
                            <Button
                              key={act.label}
                              type="button"
                              variant={act.kind === 'resolve' ? 'secondary' : 'outline'}
                              size="sm"
                              onClick={() => handleAction(a, act)}
                            >
                              {act.kind === 'resolve' ? <Check className="size-4" /> : act.kind === 'forward' ? <Send className="size-4" /> : null}
                              {act.label}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-screen">
        {/* Desktop/tablet sidebar */}
        <aside
          className={cn(
            'hidden md:flex md:shrink-0 md:flex-col md:border-r md:border-[color:var(--color-sidebar_border)] md:bg-[color:var(--color-sidebar)] md:backdrop-blur',
            'md:sticky md:top-0 md:h-screen',
            'transition-[width] duration-200 ease-out',
            sidebarState === 'expanded' ? 'md:w-64' : 'md:w-20',
          )}
        >
          <div className={cn('px-5 py-5', sidebarState === 'collapsed' && 'px-3')}>
            <div className="flex items-center gap-2">
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-[color:var(--color-sidebar_logo_bg)] text-[color:var(--color-sidebar_logo_fg)] ring-1 ring-[color:var(--color-sidebar_logo_ring)]">
                <Sparkles className="size-4" />
              </span>
              {sidebarState === 'expanded' ? <span className="text-lg font-bold tracking-tight">Sanrachna</span> : null}
            </div>
            {sidebarState === 'expanded' ? (
              <>
                <p className="mt-2 text-xs text-[color:var(--color-text_secondary)]">
                  AI-powered planning, tracking, and risk forecasting
                </p>
              </>
            ) : null}
          </div>

          <nav className="flex-1 overflow-y-auto px-3 pb-4">
            {sidebarState === 'expanded' ? (
              <div className="px-3 pb-2 text-[11px] font-semibold tracking-widest text-[color:var(--color-text_muted)]">
                MAIN NAVIGATION
              </div>
            ) : null}
            <div className="space-y-1">
              {primaryNav.map((item) => (
                <SidebarNavItem key={item.to} item={item} collapsed={sidebarState === 'collapsed'} />
              ))}
            </div>
            {secondaryNav.length ? (
              <>
                {sidebarState === 'expanded' ? (
                  <div className="px-3 pb-2 pt-5 text-[11px] font-semibold tracking-widest text-[color:var(--color-text_muted)]">
                    GROWTH TOOLS
                  </div>
                ) : (
                  <div className="my-3 border-t border-[color:var(--color-border)]" />
                )}
                <div className="space-y-1">
                  {secondaryNav.map((item) => (
                    <SidebarNavItem key={item.to} item={item} collapsed={sidebarState === 'collapsed'} />
                  ))}
                </div>
              </>
            ) : null}
          </nav>

          <div className={cn('border-t border-[color:var(--color-sidebar_border)] p-3', sidebarState === 'collapsed' && 'px-2')}>
            <button
              type="button"
              className={cn(
                'w-full rounded-[var(--radius-xl)] border border-[color:var(--color-sidebar_border)] bg-[color:var(--color-settings_strip)] p-2 text-left',
                sidebarState === 'collapsed' && 'flex justify-center p-2',
              )}
              title={sidebarState === 'collapsed' ? 'Settings' : undefined}
            >
              <div className={cn('flex items-center gap-2', sidebarState === 'collapsed' && 'justify-center')}>
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-[color:var(--color-settings_icon_bg)] ring-1 ring-[color:var(--color-settings_icon_ring)]">
                  <Settings className="size-4 text-[color:var(--color-text_secondary)]" />
                </span>
                {sidebarState === 'expanded' ? (
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{user?.name || 'Demo User'}</div>
                    <div className="truncate text-[11px] text-[color:var(--color-text_secondary)]">{user?.emailOrPhone || resolvedRole.toUpperCase()}</div>
                  </div>
                ) : null}
              </div>
            </button>
          </div>
        </aside>

        {/* Mobile off-canvas */}
        {mobileSidebarOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Close sidebar backdrop"
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-[78vw] max-w-xs border-r border-[color:var(--color-sidebar_border)] bg-[color:var(--color-sidebar)] shadow-[var(--shadow-card)] transition-transform duration-200 ease-out">
              <div className="px-5 py-5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-[color:var(--color-sidebar_logo_bg)] text-[color:var(--color-sidebar_logo_fg)] ring-1 ring-[color:var(--color-sidebar_logo_ring)]">
                    <Sparkles className="size-4" />
                  </span>
                  <span className="text-lg font-bold tracking-tight">Sanrachna</span>
                </div>
                <p className="mt-2 text-xs text-[color:var(--color-text_secondary)]">
                  AI-powered planning, tracking, and risk forecasting
                </p>
              </div>
              <nav className="px-3 pb-4">
                <div className="px-3 pb-2 text-[11px] font-semibold tracking-widest text-[color:var(--color-text_muted)]">
                  MAIN NAVIGATION
                </div>
                <div className="space-y-1">
                  {primaryNav.map((item) => (
                    <SidebarNavItem
                      key={item.to}
                      item={item}
                      collapsed={false}
                      onNavigate={() => setMobileSidebarOpen(false)}
                    />
                  ))}
                </div>
                {secondaryNav.length ? (
                  <>
                    <div className="px-3 pb-2 pt-5 text-[11px] font-semibold tracking-widest text-[color:var(--color-text_muted)]">
                      GROWTH TOOLS
                    </div>
                    <div className="space-y-1">
                      {secondaryNav.map((item) => (
                        <SidebarNavItem
                          key={item.to}
                          item={item}
                          collapsed={false}
                          onNavigate={() => setMobileSidebarOpen(false)}
                        />
                      ))}
                    </div>
                  </>
                ) : null}
              </nav>
            </aside>
          </div>
        ) : null}

        {/* Content */}
        <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-30 border-b border-[color:var(--color-border)] bg-[color:var(--color-header_scrim)] backdrop-blur-md">
          {activeBanner ? (
            <div className="border-b border-[color:var(--color-border)] bg-[color:var(--color-error)]/10 px-4 py-2 sm:px-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-[color:var(--color-error)]">{activeBanner.label}</div>
                <Button type="button" size="sm" variant="danger" onClick={() => navigate('/app/emergency')}>
                  Open incident command
                </Button>
              </div>
            </div>
          ) : null}

          <header>
            <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-8">
              <div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 px-0 md:hidden"
                    onClick={() => setMobileSidebarOpen(true)}
                    aria-label="Open navigation"
                  >
                    <Menu className="size-5" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="hidden h-10 w-10 px-0 md:inline-flex"
                    onClick={() => setSidebarState((s) => (s === 'expanded' ? 'collapsed' : 'expanded'))}
                    aria-label={sidebarState === 'expanded' ? 'Collapse sidebar' : 'Expand sidebar'}
                    title={sidebarState === 'expanded' ? 'Collapse sidebar' : 'Expand sidebar'}
                  >
                    <Menu className="size-5" />
                  </Button>

                  <div>
                    <p className="text-xs font-medium tracking-wide text-[color:var(--color-text_muted)]">
                      Workspace
                    </p>
                    <p className="text-sm font-semibold">
                      {resolvedRole === 'owner'
                        ? 'Owner dashboard'
                        : resolvedRole === 'engineer'
                          ? 'Engineer dashboard'
                          : 'Worker dashboard'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                  type="button"
                  className="relative flex size-10 items-center justify-center rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-card)] text-[color:var(--color-text_secondary)] shadow-sm transition hover:bg-[color:var(--color-surface_hover)]"
                  aria-label="Notifications"
                  onClick={() => setNotifOpen(true)}
                >
                  <Bell className="size-5" />
                  {unreadCount > 0 ? (
                    <span className="absolute right-2 top-2 size-2 rounded-full bg-[color:var(--color-error)] ring-2 ring-[color:var(--color-card)]" />
                  ) : null}
                </button>
                <div className="flex items-center gap-2 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-2 py-1.5 pr-3 shadow-sm">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-[color:var(--color-primary)] text-xs font-bold text-white">
                    {initials}
                  </span>
                  <div className="hidden sm:block">
                    <div className="text-sm font-semibold leading-5">{user?.name || 'Demo User'}</div>
                    <div className="text-[11px] text-[color:var(--color-text_secondary)]">
                      {resolvedRole.toUpperCase()}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="hidden h-10 items-center justify-center rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 text-sm font-semibold text-[color:var(--color-text_secondary)] shadow-sm transition hover:bg-[color:var(--color-surface_hover)] sm:inline-flex"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 size-4" />
                  Log out
                </button>
              </div>
            </div>
          </header>
        </div>

        <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </main>
        </div>
      </div>

      <EmergencyButton />
    </div>
  )
}

