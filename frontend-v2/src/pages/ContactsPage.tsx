import { Download, Mail, Phone, Plus, Search, Upload, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { createProjectContact, listProjectContacts } from '@/api/projectContactsApi'
import { messageFromApiError } from '@/api/projectTeamApi'
import { fetchWorkspaceContacts } from '@/api/resources'
import { isBackendConfigured } from '@/api/http'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useActiveProject } from '@/hooks/useActiveProject'
import { mongoRowToContact } from '@/lib/mongoContactNormalize'
import { useTeamProjectStore } from '@/store/useTeamProjectStore'
import type {
  Authority,
  Availability,
  Contact,
  ContactDirectoryType,
  ContactRole,
  ContactsStats,
  DirectoryTab,
  ProjectPhase,
  Supplier,
} from '@/types/contacts.types'
import { cn } from '@/utils/cn'

function deriveContactsStats(contacts: Contact[], suppliers: Supplier[]): ContactsStats {
  return {
    totalContacts: contacts.length,
    activeOnSite: contacts.filter((c) => c.availability === 'On Site').length,
    suppliers: suppliers.length,
    emergencyContacts: contacts.filter((c) => c.isEmergency).length,
  }
}

type RoleFilter = 'all' | ContactRole
type PhaseFilter = 'all' | ProjectPhase
type AvailabilityFilter = 'all' | Availability
type DirectoryFilter = 'all' | ContactDirectoryType

function pillTone(kind: 'good' | 'warn' | 'danger' | 'muted') {
  if (kind === 'danger') return 'bg-[color:var(--color-error)]/12 text-[color:var(--color-error)]'
  if (kind === 'warn') return 'bg-[color:var(--color-warning)]/12 text-[color:var(--color-warning)]'
  if (kind === 'good') return 'bg-[color:var(--color-success)]/12 text-[color:var(--color-success)]'
  return 'bg-slate-100 text-[color:var(--color-text_secondary)]'
}

function directoryTypeBadge(dt?: ContactDirectoryType) {
  if (!dt) return null
  const base =
    'inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-[color:var(--color-border)]'
  if (dt === 'Internal Team') return <span className={cn(base, 'bg-emerald-500/10 text-emerald-800')}>{dt}</span>
  if (dt === 'Supplier') return <span className={cn(base, 'bg-sky-500/10 text-sky-900')}>{dt}</span>
  if (dt === 'External Authority') return <span className={cn(base, 'bg-violet-500/10 text-violet-900')}>{dt}</span>
  return <span className={cn(base, 'bg-[color:var(--color-error)]/10 text-[color:var(--color-error)]')}>{dt}</span>
}

function availabilityPill(a: Availability) {
  const tone = a === 'On Site' ? 'good' : a === 'Off-site' ? 'muted' : 'warn'
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', pillTone(tone))}>
      {a}
    </span>
  )
}

function directoryTabsForRole(role: 'owner' | 'engineer' | 'worker'): DirectoryTab[] {
  if (role === 'worker') return ['internal']
  if (role === 'engineer') return ['internal', 'suppliers']
  return ['internal', 'suppliers', 'authorities']
}

function visibleContactForRole(c: Contact, role: 'owner' | 'engineer' | 'worker') {
  if (role === 'worker') {
    // Worker: relevant supervisors + crew + emergency only
    const supervisorLike =
      c.title.toLowerCase().includes('supervisor') || c.responsibility.toLowerCase().includes('safety')
    return c.isEmergency || c.role === 'Worker' || supervisorLike
  }
  if (role === 'engineer') {
    // Engineer: team + suppliers + contractors, but no owner-only notes (handled in drawer)
    return true
  }
  return true
}

function visibleSupplierForRole(_s: Supplier, role: 'owner' | 'engineer' | 'worker') {
  return role !== 'worker'
}

function visibleAuthorityForRole(_a: Authority, role: 'owner' | 'engineer' | 'worker') {
  return role === 'owner'
}

function headerCountPill(label: string, value: number) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-bg)] px-3 py-1 text-xs font-semibold text-[color:var(--color-text_secondary)] ring-1 ring-[color:var(--color-border)]">
      {label} <span className="font-bold text-[color:var(--color-text)]">{value}</span>
    </span>
  )
}

function segmentedTabButton(active: boolean) {
  return cn(
    'rounded-[var(--radius-xl)] px-3 py-2 text-sm font-semibold transition',
    active ? 'bg-[color:var(--color-primary)] text-white' : 'text-[color:var(--color-text_secondary)] hover:bg-slate-50',
  )
}

export function ContactsPage() {
  const { role, token } = useAuth()
  const resolvedRole = role ?? 'engineer'
  const isOwner = resolvedRole === 'owner'
  const { projectId } = useActiveProject()

  const backendContacts = isBackendConfigured() && Boolean(token)
  const teamProjects = useTeamProjectStore((s) => s.projects)
  const loadTeamProjects = useTeamProjectStore((s) => s.loadProjects)
  const [mongoProjectId, setMongoProjectId] = useState<string | null>(null)

  const [contacts, setContacts] = useState<Contact[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [authorities, setAuthorities] = useState<Authority[]>([])
  const [statsFromApi, setStatsFromApi] = useState<ContactsStats | undefined>(undefined)
  const [contactsLoading, setContactsLoading] = useState(false)
  const [contactsError, setContactsError] = useState<string | null>(null)

  useEffect(() => {
    if (!backendContacts) return
    void loadTeamProjects()
  }, [backendContacts, loadTeamProjects])

  useEffect(() => {
    if (!backendContacts) {
      setMongoProjectId(null)
      return
    }
    if (!teamProjects.length) {
      setMongoProjectId(null)
      return
    }
    const wsInTeam = projectId && teamProjects.some((p) => p.id === projectId)
    if (wsInTeam) {
      setMongoProjectId(projectId)
      return
    }
    setMongoProjectId((cur) => (cur && teamProjects.some((p) => p.id === cur) ? cur : teamProjects[0]!.id))
  }, [backendContacts, teamProjects, projectId])

  useEffect(() => {
    if (!projectId) {
      setContacts([])
      setSuppliers([])
      setAuthorities([])
      setStatsFromApi(undefined)
      setContactsError(null)
      setContactsLoading(false)
      return
    }
    let cancelled = false
    setContactsLoading(true)
    setContactsError(null)

    async function run() {
      try {
        if (backendContacts && mongoProjectId) {
          const pc = await listProjectContacts(mongoProjectId)
          if (cancelled) return
          setContacts((pc.contacts || []).map((row) => mongoRowToContact(row)))
          try {
            const d = await fetchWorkspaceContacts(projectId)
            if (cancelled) return
            setSuppliers(d.suppliers)
            setAuthorities(d.authorities)
            setStatsFromApi(d.stats)
          } catch {
            if (!cancelled) {
              setSuppliers([])
              setAuthorities([])
            }
          }
        } else {
          const d = await fetchWorkspaceContacts(projectId)
          if (cancelled) return
          setContacts(d.contacts)
          setSuppliers(d.suppliers)
          setAuthorities(d.authorities)
          setStatsFromApi(d.stats)
        }
        if (!cancelled) setContactsError(null)
      } catch (e) {
        if (cancelled) return
        setContactsError(e instanceof Error ? e.message : 'Could not load contacts')
        setContacts([])
        setSuppliers([])
        setAuthorities([])
        setStatsFromApi(undefined)
      } finally {
        if (!cancelled) setContactsLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [projectId, backendContacts, mongoProjectId])

  const contactsStats = useMemo(
    () => statsFromApi ?? deriveContactsStats(contacts, suppliers),
    [statsFromApi, contacts, suppliers],
  )

  const tabs = directoryTabsForRole(resolvedRole)
  const [tab, setTab] = useState<DirectoryTab>(tabs[0])

  const [q, setQ] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all')
  const [availability, setAvailability] = useState<AvailabilityFilter>('all')
  const [directoryFilter, setDirectoryFilter] = useState<DirectoryFilter>('all')

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [selectedAuthority, setSelectedAuthority] = useState<Authority | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [addName, setAddName] = useState('')
  const [addPhone, setAddPhone] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState('Contact')
  const [addPhase, setAddPhase] = useState<ProjectPhase>('Foundation')
  const [addContactType, setAddContactType] = useState<ContactDirectoryType>('Internal Team')
  const [addSaving, setAddSaving] = useState(false)

  useEffect(() => {
    if (!addOpen) return
    setAddName('')
    setAddPhone('')
    setAddEmail('')
    setAddRole('Contact')
    setAddPhase('Foundation')
    setAddContactType('Internal Team')
    setAddSaving(false)
  }, [addOpen])

  const emergencyContacts = useMemo(() => {
    return contacts
      .filter((c) => c.isEmergency || c.directoryType === 'Emergency')
      .slice(0, 6)
  }, [contacts])

  const filteredContacts = useMemo(() => {
    const query = q.trim().toLowerCase()
    return contacts
      .filter((c) => visibleContactForRole(c, resolvedRole))
      .filter((c) => (roleFilter === 'all' ? true : c.role === roleFilter))
      .filter((c) => (phaseFilter === 'all' ? true : c.phase === phaseFilter))
      .filter((c) => (availability === 'all' ? true : c.availability === availability))
      .filter((c) => {
        if (directoryFilter === 'all') return true
        const dt: ContactDirectoryType = c.directoryType ?? 'Internal Team'
        return dt === directoryFilter
      })
      .filter((c) => {
        if (!query) return true
        const blob = [
          c.name,
          c.title,
          c.role,
          c.type,
          c.directoryType,
          c.phase,
          c.responsibility,
          c.phone,
          c.email,
        ]
          .join(' ')
          .toLowerCase()
        return blob.includes(query)
      })
      .sort((a, b) => (a.availability === 'On Site' ? -1 : 1) - (b.availability === 'On Site' ? -1 : 1))
  }, [q, roleFilter, phaseFilter, availability, directoryFilter, contacts, resolvedRole])

  const filteredSuppliers = useMemo(() => {
    const query = q.trim().toLowerCase()
    return suppliers
      .filter((s) => visibleSupplierForRole(s, resolvedRole))
      .filter((s) => (phaseFilter === 'all' ? true : s.phase === phaseFilter))
      .filter((s) => (availability === 'all' ? true : s.availability === availability))
      .filter((s) => {
        if (!query) return true
        const blob = [s.company, s.contactName, s.materials.join(','), s.phone, s.email, s.phase]
          .join(' ')
          .toLowerCase()
        return blob.includes(query)
      })
  }, [q, phaseFilter, availability, resolvedRole])

  const filteredAuthorities = useMemo(() => {
    const query = q.trim().toLowerCase()
    return authorities
      .filter((a) => visibleAuthorityForRole(a, resolvedRole))
      .filter((a) => (availability === 'all' ? true : a.availability === availability))
      .filter((a) => {
        if (!query) return true
        const blob = [a.department, a.contactName, a.jurisdiction, a.phone, a.email, a.role].join(' ').toLowerCase()
        return blob.includes(query)
      })
  }, [q, availability, resolvedRole])

  const closeDrawers = () => {
    setSelectedContact(null)
    setSelectedSupplier(null)
    setSelectedAuthority(null)
  }

  const handleSaveNewContact = async () => {
    const name = addName.trim()
    const phone = addPhone.trim()
    if (!name) {
      setToast('Name is required.')
      return
    }
    if (!phone) {
      setToast('Phone number is required.')
      return
    }
    if (backendContacts && !mongoProjectId) {
      setToast('Select a server project for contacts (or disable backend to use offline demo).')
      return
    }
    setAddSaving(true)
    try {
      if (backendContacts && mongoProjectId) {
        const { contact } = await createProjectContact(mongoProjectId, {
          name,
          phone,
          email: addEmail.trim() || undefined,
          role: addRole.trim() || 'Contact',
          phase: addPhase,
          contactType: addContactType,
        })
        setContacts((prev) => [...prev, mongoRowToContact(contact)])
        setToast('Contact saved.')
        setAddOpen(false)
      } else {
        const row: Contact = {
          id: `local_${Date.now().toString(36)}`,
          name,
          title: addRole.trim() || 'Contact',
          role: 'Worker',
          type: addContactType === 'Internal Team' ? 'Internal' : 'External',
          directoryType: addContactType,
          phone,
          email: addEmail.trim() || '',
          phase: addPhase,
          responsibility: '—',
          availability: 'On Site',
          isEmergency: addContactType === 'Emergency',
          emergencyKind: addContactType === 'Emergency' ? 'Safety Officer' : undefined,
          linked: { tasks: 0, openRfis: 0, activeIssues: 0 },
        }
        setContacts((prev) => [...prev, row])
        setToast('Contact added to local list (planning workspace mode).')
        setAddOpen(false)
      }
    } catch (e) {
      setToast(messageFromApiError(e))
    } finally {
      setAddSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {!projectId ? (
        <Card>
          <CardContent className="py-6 text-sm text-[color:var(--color-text_secondary)]">
            {backendContacts ? (
              <>
                Choose a project from the workspace selector in the header. Contacts load from{' '}
                <span className="font-mono text-xs">GET /api/projects/&#123;id&#125;/contacts</span> for that project.
              </>
            ) : (
              <>
                Select a project to load the directory from{' '}
                <span className="font-mono text-xs">GET /api/v1/workspaces/&#123;id&#125;/contacts</span>.
              </>
            )}
          </CardContent>
        </Card>
      ) : null}
      {contactsError ? (
        <Card className="border-[color:var(--color-error)]/35 bg-[color:var(--color-error)]/5">
          <CardContent className="py-4 text-sm text-[color:var(--color-error)]">{contactsError}</CardContent>
        </Card>
      ) : null}
      {projectId && contactsLoading ? (
        <div className="text-sm text-[color:var(--color-text_secondary)]">Loading directory…</div>
      ) : null}

      {projectId && backendContacts && teamProjects.length ? (
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-[color:var(--color-text)]">Server project for contacts</div>
                <div className="mt-0.5 text-xs text-[color:var(--color-text_muted)]">
                  People directory is loaded from <span className="font-mono">GET /api/projects/…/contacts</span> for the
                  selected Mongo project. Workspace cards still use the planning workspace id for suppliers.
                </div>
              </div>
              <select
                className="h-10 w-full max-w-md rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm sm:w-auto"
                value={mongoProjectId ?? ''}
                onChange={(e) => setMongoProjectId(e.target.value || null)}
              >
                {teamProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {toast ? (
        <div
          role="status"
          className="fixed bottom-24 right-6 z-[60] max-w-sm rounded-[var(--radius-2xl)] bg-[color:var(--color-text)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-card)]"
          onClick={() => setToast(null)}
        >
          {toast}
        </div>
      ) : null}

      {/* Top action bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-xl flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-text_muted)]" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-10"
            placeholder="Search by name, role, supplier, phase..."
            aria-label="Search contacts"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add Contact
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setToast('CSV import will call your backend when the endpoint is available.')}
          >
            <Upload className="size-4" />
            Import CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setToast('Directory export will call your backend when the endpoint is available.')}
          >
            <Download className="size-4" />
            Export Directory
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="mt-1 text-sm text-[color:var(--color-text_secondary)]">
            Find responsibility fast — who owns it, how to reach them, and who can unblock you.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerCountPill('Total', contactsStats.totalContacts)}
          {headerCountPill('On site', contactsStats.activeOnSite)}
          {resolvedRole !== 'worker' ? headerCountPill('Suppliers', contactsStats.suppliers) : null}
          {headerCountPill('Emergency', contactsStats.emergencyContacts)}
        </div>
      </div>

      {/* Emergency strip */}
      <Card className="border-[color:var(--color-error)]/25 bg-[color:var(--color-error)]/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Emergency contacts</CardTitle>
          <CardDescription>Pinned for safety-first response</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {emergencyContacts.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedContact(c)}
              className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 py-3 text-left transition hover:shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{c.emergencyKind ?? 'Emergency'}</div>
                  <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">{c.name}</div>
                </div>
                {availabilityPill(c.availability)}
              </div>
              <div className="mt-2 text-xs text-[color:var(--color-text_secondary)]">{c.phone}</div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-5">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <select
              className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
              disabled={resolvedRole === 'worker'}
              title={resolvedRole === 'worker' ? 'Worker view is limited to supervisors + emergency.' : undefined}
            >
              <option value="all">Role — All</option>
              <option value="Worker">Worker</option>
              <option value="Engineer">Engineer</option>
              <option value="Contractor">Contractor</option>
              <option value="Supplier">Supplier</option>
              <option value="Inspector">Inspector</option>
              <option value="Govt Contact">Govt Contact</option>
              <option value="Safety">Safety</option>
              <option value="Medical">Medical</option>
            </select>
            <select
              className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm"
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value as PhaseFilter)}
            >
              <option value="all">Project phase — All</option>
              <option value="Foundation">Foundation</option>
              <option value="Structure">Structure</option>
              <option value="MEP">MEP</option>
              <option value="Finishing">Finishing</option>
            </select>
            <select
              className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm"
              value={availability}
              onChange={(e) => setAvailability(e.target.value as AvailabilityFilter)}
            >
              <option value="all">Availability — All</option>
              <option value="On Site">Active / On site</option>
              <option value="Off-site">Off-site</option>
              <option value="On Leave">On leave</option>
            </select>
            <select
              className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm"
              value={directoryFilter}
              onChange={(e) => setDirectoryFilter(e.target.value as DirectoryFilter)}
              disabled={resolvedRole === 'worker'}
            >
              <option value="all">Contact category — All</option>
              <option value="Internal Team">Internal Team</option>
              <option value="Supplier">Supplier</option>
              <option value="External Authority">External Authority</option>
              <option value="Emergency">Emergency</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Directory tabs */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="inline-flex rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white p-1 shadow-sm">
              {tabs.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    closeDrawers()
                    setTab(t)
                  }}
                  className={segmentedTabButton(tab === t)}
                >
                  {t === 'internal' ? 'Internal Team' : t === 'suppliers' ? 'Suppliers' : 'External Authorities'}
                </button>
              ))}
            </div>
            <div className="text-xs text-[color:var(--color-text_muted)]">
              View: <span className="font-semibold text-[color:var(--color-text_secondary)]">{resolvedRole.toUpperCase()}</span>
              {resolvedRole === 'worker'
                ? ' · limited to supervisors and emergency contacts'
                : resolvedRole === 'engineer'
                  ? ' · hides owner-only vendor notes'
                  : ' · full directory including authority contacts'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main directory area */}
      {tab === 'internal' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredContacts.length === 0 ? (
            <div className="rounded-[var(--radius-xl)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg)] py-14 text-center text-sm text-[color:var(--color-text_secondary)] md:col-span-2 xl:col-span-3">
              No contacts match filters.
            </div>
          ) : (
            filteredContacts.map((c) => (
              <Card
                key={c.id}
                className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
                onClick={() => setSelectedContact(c)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{c.name}</CardTitle>
                      <CardDescription>
                        {c.title} · {c.role}
                      </CardDescription>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      {directoryTypeBadge(c.directoryType)}
                      {availabilityPill(c.availability)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1 text-sm text-[color:var(--color-text_secondary)]">
                    <div className="flex items-center gap-2">
                      <Phone className="size-4 text-[color:var(--color-text_muted)]" />
                      {c.phone}
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="size-4 text-[color:var(--color-text_muted)]" />
                      {c.email}
                    </div>
                  </div>

                  <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-xs text-[color:var(--color-text_secondary)]">
                    <div>
                      Phase: <span className="font-semibold text-[color:var(--color-text)]">{c.phase}</span>
                    </div>
                    <div className="mt-1">
                      Responsibility:{' '}
                      <span className="font-semibold text-[color:var(--color-text)]">{c.responsibility}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={(e) => e.stopPropagation()}>
                      <Phone className="size-4" />
                      Call
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={(e) => e.stopPropagation()}>
                      <Mail className="size-4" />
                      Email
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                      View Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : tab === 'suppliers' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredSuppliers.length === 0 ? (
            <div className="rounded-[var(--radius-xl)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg)] py-14 text-center text-sm text-[color:var(--color-text_secondary)] md:col-span-2 xl:col-span-3">
              No suppliers match filters.
            </div>
          ) : (
            filteredSuppliers.map((s) => (
              <Card
                key={s.id}
                className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
                onClick={() => setSelectedSupplier(s)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{s.company}</CardTitle>
                      <CardDescription>
                        Material: {s.materials.join(' / ')} · Phase: {s.phase}
                      </CardDescription>
                    </div>
                    {availabilityPill(s.availability)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1 text-sm text-[color:var(--color-text_secondary)]">
                    <div className="flex items-center gap-2">
                      <Phone className="size-4 text-[color:var(--color-text_muted)]" />
                      {s.phone}
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="size-4 text-[color:var(--color-text_muted)]" />
                      {s.email}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] px-3 py-2 ring-1 ring-[color:var(--color-border)]">
                      <div className="text-[color:var(--color-text_muted)]">Lead time</div>
                      <div className="mt-1 font-semibold">{s.leadTimeDays} days</div>
                    </div>
                    <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] px-3 py-2 ring-1 ring-[color:var(--color-border)]">
                      <div className="text-[color:var(--color-text_muted)]">Price</div>
                      <div className="mt-1 font-semibold">{s.priceTier}</div>
                    </div>
                    <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] px-3 py-2 ring-1 ring-[color:var(--color-border)]">
                      <div className="text-[color:var(--color-text_muted)]">Quality</div>
                      <div className="mt-1 font-semibold">{s.qualityRating.toFixed(1)}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={(e) => e.stopPropagation()}>
                      <Phone className="size-4" />
                      Call Supplier
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                      View Past Orders
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                      Compare Pricing
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredAuthorities.length === 0 ? (
            <div className="rounded-[var(--radius-xl)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg)] py-14 text-center text-sm text-[color:var(--color-text_secondary)] md:col-span-2 xl:col-span-3">
              No authority contacts match filters (owner-only).
            </div>
          ) : (
            filteredAuthorities.map((a) => (
              <Card
                key={a.id}
                className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
                onClick={() => setSelectedAuthority(a)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{a.department}</CardTitle>
                      <CardDescription>
                        {a.role} · {a.jurisdiction}
                      </CardDescription>
                    </div>
                    {availabilityPill(a.availability)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm font-semibold">{a.contactName}</div>
                  <div className="space-y-1 text-sm text-[color:var(--color-text_secondary)]">
                    <div className="flex items-center gap-2">
                      <Phone className="size-4 text-[color:var(--color-text_muted)]" />
                      {a.phone}
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="size-4 text-[color:var(--color-text_muted)]" />
                      {a.email}
                    </div>
                  </div>
                  <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] px-3 py-2 text-xs text-[color:var(--color-text_secondary)] ring-1 ring-[color:var(--color-border)]">
                    Inspections: <span className="font-semibold">{a.linked.inspections}</span> · Permits:{' '}
                    <span className="font-semibold">{a.linked.permits}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Contact drawer */}
      {selectedContact ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Contact details"
          onClick={() => setSelectedContact(null)}
        >
          <div
            className="h-full w-full max-w-md overflow-y-auto border-l border-[color:var(--color-border)] bg-[color:var(--color-card)] shadow-[var(--shadow-card)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[color:var(--color-border)] p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold leading-snug">{selectedContact.name}</h2>
                  <p className="mt-1 text-sm text-[color:var(--color-text_secondary)]">
                    {selectedContact.title} · {selectedContact.role}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedContact(null)}>
                  Close
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {directoryTypeBadge(selectedContact.directoryType)}
                {availabilityPill(selectedContact.availability)}
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', pillTone('muted'))}>
                  {selectedContact.type}
                </span>
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', pillTone('good'))}>
                  Phase: {selectedContact.phase}
                </span>
              </div>
            </div>

            <div className="space-y-4 p-5 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[color:var(--color-text_secondary)]">
                  <Phone className="size-4 text-[color:var(--color-text_muted)]" />
                  {selectedContact.phone}
                </div>
                <div className="flex items-center gap-2 text-[color:var(--color-text_secondary)]">
                  <Mail className="size-4 text-[color:var(--color-text_muted)]" />
                  {selectedContact.email}
                </div>
              </div>

              <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3">
                <div className="text-xs font-semibold text-[color:var(--color-text_muted)]">Responsibility</div>
                <div className="mt-1 font-semibold text-[color:var(--color-text)]">{selectedContact.responsibility}</div>
              </div>

              {selectedContact.secondaryContacts?.length ? (
                <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white p-3">
                  <div className="text-xs font-semibold text-[color:var(--color-text_muted)]">Secondary contacts</div>
                  <div className="mt-2 space-y-2">
                    {selectedContact.secondaryContacts.map((s) => (
                      <div key={s.phone} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{s.name}</span>
                        <span className="text-[color:var(--color-text_secondary)]">{s.phone}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white p-3">
                <div className="text-xs font-semibold text-[color:var(--color-text_muted)]">Linked project work</div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] px-3 py-2 ring-1 ring-[color:var(--color-border)]">
                    <div className="text-[color:var(--color-text_muted)]">Tasks</div>
                    <div className="mt-1 text-sm font-bold">{selectedContact.linked.tasks}</div>
                  </div>
                  <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] px-3 py-2 ring-1 ring-[color:var(--color-border)]">
                    <div className="text-[color:var(--color-text_muted)]">Open RFIs</div>
                    <div className="mt-1 text-sm font-bold">{selectedContact.linked.openRfis}</div>
                  </div>
                  <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] px-3 py-2 ring-1 ring-[color:var(--color-border)]">
                    <div className="text-[color:var(--color-text_muted)]">Issues</div>
                    <div className="mt-1 text-sm font-bold">{selectedContact.linked.activeIssues}</div>
                  </div>
                </div>
              </div>

              {isOwner && selectedContact.notes ? (
                <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-warning)]/5 p-3 text-sm">
                  <div className="text-xs font-semibold text-[color:var(--color-text_muted)]">Owner notes</div>
                  <div className="mt-1 text-[color:var(--color-text_secondary)]">{selectedContact.notes}</div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="secondary" className="w-full">
                  <Phone className="size-4" />
                  Call
                </Button>
                <Button type="button" variant="secondary" className="w-full">
                  <Mail className="size-4" />
                  Email
                </Button>
                <Button type="button" variant="outline" className="col-span-2 w-full">
                  View profile
                </Button>
              </div>

              <div className="text-xs text-[color:var(--color-text_muted)]">
                {selectedContact.lastContacted ? `Last contacted: ${selectedContact.lastContacted}` : 'Interaction history: coming next.'}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Supplier drawer */}
      {selectedSupplier ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Supplier details"
          onClick={() => setSelectedSupplier(null)}
        >
          <div
            className="h-full w-full max-w-md overflow-y-auto border-l border-[color:var(--color-border)] bg-[color:var(--color-card)] shadow-[var(--shadow-card)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[color:var(--color-border)] p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold leading-snug">{selectedSupplier.company}</h2>
                  <p className="mt-1 text-sm text-[color:var(--color-text_secondary)]">
                    {selectedSupplier.contactName} · Materials: {selectedSupplier.materials.join(' / ')}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedSupplier(null)}>
                  Close
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {availabilityPill(selectedSupplier.availability)}
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', pillTone('good'))}>
                  Phase: {selectedSupplier.phase}
                </span>
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', pillTone('muted'))}>
                  Price: {selectedSupplier.priceTier}
                </span>
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', pillTone('muted'))}>
                  Quality: {selectedSupplier.qualityRating.toFixed(1)}
                </span>
              </div>
            </div>

            <div className="space-y-4 p-5 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[color:var(--color-text_secondary)]">
                  <Phone className="size-4 text-[color:var(--color-text_muted)]" />
                  {selectedSupplier.phone}
                </div>
                <div className="flex items-center gap-2 text-[color:var(--color-text_secondary)]">
                  <Mail className="size-4 text-[color:var(--color-text_muted)]" />
                  {selectedSupplier.email}
                </div>
              </div>

              <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white p-3">
                <div className="text-xs font-semibold text-[color:var(--color-text_muted)]">Procurement</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] px-3 py-2 ring-1 ring-[color:var(--color-border)]">
                    <div className="text-[color:var(--color-text_muted)]">Past orders</div>
                    <div className="mt-1 text-sm font-bold">{selectedSupplier.linked.pastOrders}</div>
                  </div>
                  <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] px-3 py-2 ring-1 ring-[color:var(--color-border)]">
                    <div className="text-[color:var(--color-text_muted)]">Open POs</div>
                    <div className="mt-1 text-sm font-bold">{selectedSupplier.linked.openPo}</div>
                  </div>
                </div>
              </div>

              {isOwner && selectedSupplier.vendorNotes ? (
                <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-warning)]/5 p-3 text-sm">
                  <div className="text-xs font-semibold text-[color:var(--color-text_muted)]">Owner vendor notes</div>
                  <div className="mt-1 text-[color:var(--color-text_secondary)]">{selectedSupplier.vendorNotes}</div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="secondary" className="w-full">
                  <Phone className="size-4" />
                  Call
                </Button>
                <Button type="button" variant="secondary" className="w-full">
                  <Mail className="size-4" />
                  Email
                </Button>
                <Button type="button" variant="outline" className="col-span-2 w-full">
                  Compare pricing
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Authority drawer */}
      {selectedAuthority ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Authority details"
          onClick={() => setSelectedAuthority(null)}
        >
          <div
            className="h-full w-full max-w-md overflow-y-auto border-l border-[color:var(--color-border)] bg-[color:var(--color-card)] shadow-[var(--shadow-card)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[color:var(--color-border)] p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold leading-snug">{selectedAuthority.department}</h2>
                  <p className="mt-1 text-sm text-[color:var(--color-text_secondary)]">
                    {selectedAuthority.role} · {selectedAuthority.jurisdiction}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedAuthority(null)}>
                  Close
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {availabilityPill(selectedAuthority.availability)}
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', pillTone('muted'))}>
                  Inspections: {selectedAuthority.linked.inspections}
                </span>
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', pillTone('muted'))}>
                  Permits: {selectedAuthority.linked.permits}
                </span>
              </div>
            </div>

            <div className="space-y-4 p-5 text-sm">
              <div className="text-sm font-semibold">{selectedAuthority.contactName}</div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[color:var(--color-text_secondary)]">
                  <Phone className="size-4 text-[color:var(--color-text_muted)]" />
                  {selectedAuthority.phone}
                </div>
                <div className="flex items-center gap-2 text-[color:var(--color-text_secondary)]">
                  <Mail className="size-4 text-[color:var(--color-text_muted)]" />
                  {selectedAuthority.email}
                </div>
              </div>
              <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 text-xs text-[color:var(--color-text_secondary)]">
                Use this contact for inspections and permit clarifications. Keep a call log for audit.
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Add contact modal */}
      {addOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Add contact"
          onClick={() => setAddOpen(false)}
        >
          <Card className="relative w-full max-w-lg shadow-[var(--shadow-card)]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="absolute right-4 top-4 rounded-lg p-1 text-[color:var(--color-text_muted)] hover:bg-slate-100"
              onClick={() => setAddOpen(false)}
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
            <CardHeader>
              <CardTitle>Add contact</CardTitle>
              <CardDescription>
                {backendContacts
                  ? 'Saves to the selected Mongo project. Phone and contact type are required.'
                  : 'Offline list for this workspace view — phone and contact type are required.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium" htmlFor="c_name">
                    Name <span className="text-[color:var(--color-error)]">*</span>
                  </label>
                  <Input
                    id="c_name"
                    className="mt-1.5"
                    placeholder="Full name / company"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium" htmlFor="c_type">
                    Contact type <span className="text-[color:var(--color-error)]">*</span>
                  </label>
                  <select
                    id="c_type"
                    className="mt-1.5 h-10 w-full rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
                    value={addContactType}
                    onChange={(e) => setAddContactType(e.target.value as ContactDirectoryType)}
                  >
                    <option value="Internal Team">Internal Team</option>
                    <option value="Supplier">Supplier</option>
                    <option value="External Authority">External Authority</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="c_phone">
                    Phone <span className="text-[color:var(--color-error)]">*</span>
                  </label>
                  <Input
                    id="c_phone"
                    className="mt-1.5"
                    placeholder="+91 …"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    inputMode="tel"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="c_email">
                    Email
                  </label>
                  <Input
                    id="c_email"
                    className="mt-1.5"
                    placeholder="name@company.com (optional)"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="c_role">
                    Role / title
                  </label>
                  <Input
                    id="c_role"
                    className="mt-1.5"
                    placeholder="e.g. Site engineer"
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="c_phase">
                    Phase
                  </label>
                  <select
                    id="c_phase"
                    className="mt-1.5 h-10 w-full rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
                    value={addPhase}
                    onChange={(e) => setAddPhase(e.target.value as ProjectPhase)}
                  >
                    <option value="Foundation">Foundation</option>
                    <option value="Structure">Structure</option>
                    <option value="MEP">MEP</option>
                    <option value="Finishing">Finishing</option>
                  </select>
                </div>
              </div>
              <Button type="button" className="w-full" disabled={addSaving} onClick={() => void handleSaveNewContact()}>
                {addSaving ? 'Saving…' : 'Save contact'}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
