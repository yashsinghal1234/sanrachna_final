import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { useAuth, type Role, type User } from '@/auth/AuthContext'
import { useProjectsStore } from '@/store/useProjectsStore'
import {
  fetchWorkspaceEmergency,
  createWorkspaceEmergency,
  updateWorkspaceEmergency,
} from '@/api/resources'
import type {
  EmergencyAssignment,
  EmergencyIncident,
  EmergencyIncidentType,
  EmergencySeverity,
  EmergencyStatus,
} from '@/emergency/types'

type EmergencyEvent =
  | { kind: 'broadcast_sent'; at: number; incidentId: string }
  | { kind: 'incident_updated'; at: number; incidentId: string; status: EmergencyStatus }

type TriggerInput = {
  type: EmergencyIncidentType
  severity?: EmergencySeverity
  zone: string
  description?: string
  photoDataUrl?: string
  location?: { lat?: number; lng?: number }
}

type UpdateInput = {
  status?: EmergencyStatus
  assignment?: EmergencyAssignment
  note?: string
  escalateToOwner?: boolean
}

type EmergencyContextValue = {
  incidents: EmergencyIncident[]
  activeIncidents: EmergencyIncident[]
  activeBanner: { incidentId: string; label: string } | null
  lastEvent: EmergencyEvent | null
  loading: boolean

  trigger: (input: TriggerInput) => string
  updateIncident: (id: string, patch: UpdateInput) => void
  archiveIncident: (id: string) => void
  getIncident: (id: string) => EmergencyIncident | null
}

const EmergencyContext = createContext<EmergencyContextValue | undefined>(undefined)

const POLL_INTERVAL_MS = 15_000 // re-fetch every 15 s so teammates see new alerts

function makeId(prefix = 'emg') {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

function displayType(t: EmergencyIncidentType) {
  switch (t) {
    case 'injury_medical': return 'Injury / Medical'
    case 'fire_electrical': return 'Fire / Electrical'
    case 'structural_risk': return 'Structural Risk'
    case 'equipment_failure': return 'Equipment Failure'
    case 'safety_hazard': return 'Safety Hazard'
    default: return 'Other'
  }
}

function defaultSeverityForType(t: EmergencyIncidentType): EmergencySeverity {
  if (t === 'fire_electrical' || t === 'structural_risk') return 'critical'
  if (t === 'injury_medical') return 'high'
  return 'medium'
}

function actorFromUser(u: User | null, role: Role | null) {
  const resolvedRole: Role = role ?? 'engineer'
  return { id: u?.id ?? 'demo_user', name: u?.name ?? 'Demo User', role: resolvedRole }
}

/** Normalize a backend incident row into the frontend EmergencyIncident shape */
function normalizeBackendIncident(raw: Record<string, unknown>): EmergencyIncident {
  const id = String(raw.id ?? makeId('inc'))
  const createdAt = raw.createdAt
    ? new Date(raw.createdAt as string).getTime()
    : Date.now()
  const updatedAt = raw.updatedAt
    ? new Date(raw.updatedAt as string).getTime()
    : createdAt

  const reportedByName = String(raw.reported_by ?? raw.reportedBy ?? 'Unknown')
  const zone = String(raw.zone ?? (raw.location as any)?.zone ?? 'Unknown zone')

  const rawStatus = String(raw.status ?? 'raised') as EmergencyStatus
  const rawSeverity = String(raw.severity ?? 'high') as EmergencySeverity

  // Normalize audit log
  const rawAudit = Array.isArray(raw.audit) ? raw.audit : []
  const audit = rawAudit.map((e: any) => ({
    kind: e.kind ?? 'note',
    at: typeof e.at === 'number' ? e.at : new Date(e.at ?? createdAt).getTime(),
    by: e.by ?? { id: 'system', name: reportedByName, role: 'worker' as Role },
    note: e.note,
    message: e.message,
  })) as EmergencyIncident['audit']

  if (audit.length === 0) {
    audit.push({
      kind: 'raised',
      at: createdAt,
      by: { id: 'system', name: reportedByName, role: 'worker' as Role },
    } as any)
  }

  return {
    id,
    status: rawStatus,
    severity: rawSeverity,
    type: (raw.type as EmergencyIncidentType) ?? 'other',
    location: { zone, lat: undefined, lng: undefined },
    description: raw.description ? String(raw.description) : undefined,
    photoDataUrl: undefined, // base64 not stored server-side; keep undefined
    reportedBy: { id: 'server', name: reportedByName, role: 'worker' as Role },
    createdAt,
    updatedAt,
    assignment: (raw.assignment as EmergencyAssignment) ?? {},
    audit,
    // store the server _id so we can PATCH later
    _serverId: id,
  } as EmergencyIncident & { _serverId: string }
}

export function EmergencyProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth()
  const currentProjectId = useProjectsStore((s) => s.currentProjectId)

  const [incidents, setIncidents] = useState<EmergencyIncident[]>([])
  const [loading, setLoading] = useState(false)
  const [lastEvent, setLastEvent] = useState<EmergencyEvent | null>(null)

  // Map: local incident id → backend mongo id (for PATCH calls)
  const serverIdMap = useRef<Record<string, string>>({})

  /** Fetch all emergencies from backend and merge into state */
  const fetchFromBackend = useCallback(async (projectId: string) => {
    try {
      const rows = await fetchWorkspaceEmergency(projectId)
      const normalized = (rows as Record<string, unknown>[]).map(normalizeBackendIncident)
      setIncidents((prev) => {
        // Build map of existing server-sourced incidents by server id
        const byServerId = new Map(
          prev
            .filter((i) => (i as any)._serverId)
            .map((i) => [(i as any)._serverId as string, i]),
        )
        // Merge: server is source of truth; keep local-only (no _serverId) as additions
        const localOnly = prev.filter((i) => !(i as any)._serverId)
        const merged = normalized.map((n) => {
          const existing = byServerId.get(n.id)
          // Prefer server version but keep local photoDataUrl if set
          return existing ? { ...n, photoDataUrl: existing.photoDataUrl ?? n.photoDataUrl } : n
        })
        // Register server ids
        normalized.forEach((n) => { serverIdMap.current[n.id] = n.id })
        return [...localOnly, ...merged].sort((a, b) => b.createdAt - a.createdAt)
      })
    } catch {
      // silently ignore if offline
    }
  }, [])

  // Initial load + re-fetch when project changes
  useEffect(() => {
    if (!currentProjectId) {
      setIncidents([])
      return
    }
    setLoading(true)
    fetchFromBackend(currentProjectId).finally(() => setLoading(false))
  }, [currentProjectId, fetchFromBackend])

  // Poll every 15 s so all team members see new incidents
  useEffect(() => {
    if (!currentProjectId) return
    const timer = setInterval(() => {
      void fetchFromBackend(currentProjectId)
    }, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [currentProjectId, fetchFromBackend])

  const getIncident = useCallback(
    (incidentId: string) => incidents.find((x) => x.id === incidentId) ?? null,
    [incidents],
  )

  const activeIncidents = useMemo(() => {
    return incidents
      .filter((x) => x.status !== 'archived')
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }, [incidents])

  const activeBanner = useMemo(() => {
    const active = activeIncidents.find(
      (x) => x.status === 'raised' || x.status === 'acknowledged' || x.status === 'responding',
    )
    if (!active) return null
    return {
      incidentId: active.id,
      label: `🚨 Active Emergency at ${active.location.zone} — ${displayType(active.type)}`,
    }
  }, [activeIncidents])

  const trigger = useCallback(
    (input: TriggerInput): string => {
      const at = Date.now()
      const localId = makeId('inc')
      const by = actorFromUser(user, role)
      const severity = input.severity ?? defaultSeverityForType(input.type)

      const newIncident: EmergencyIncident & { _serverId?: string } = {
        id: localId,
        status: 'raised',
        severity,
        type: input.type,
        location: { zone: input.zone, lat: input.location?.lat, lng: input.location?.lng },
        description: input.description?.trim() || undefined,
        photoDataUrl: input.photoDataUrl,
        reportedBy: by,
        createdAt: at,
        updatedAt: at,
        assignment: {},
        audit: [
          {
            kind: 'raised',
            at,
            by,
            message: input.description?.trim() || undefined,
          } as any,
        ],
      }

      // Optimistic local add
      setIncidents((prev) => [newIncident, ...prev])
      setLastEvent({ kind: 'broadcast_sent', at, incidentId: localId })

      // Persist to DB — all team members will see it on next poll
      if (currentProjectId) {
        createWorkspaceEmergency(currentProjectId, {
          type: input.type,
          severity,
          zone: input.zone,
          description: input.description || '',
          reported_by: by.name,
        }).then((saved: any) => {
          if (saved?.id) {
            // Replace local incident with server version
            serverIdMap.current[localId] = saved.id
            const serverIncident = normalizeBackendIncident(saved)
            serverIncident.photoDataUrl = input.photoDataUrl // keep local photo
            setIncidents((prev) =>
              prev.map((inc) => (inc.id === localId ? { ...serverIncident, id: localId, _serverId: saved.id } : inc)),
            )
          }
        }).catch(() => {
          // Keep local version if API fails
        })
      }

      return localId
    },
    [user, role, currentProjectId],
  )

  const updateIncident = useCallback(
    (incidentId: string, patch: UpdateInput) => {
      const at = Date.now()
      const by = actorFromUser(user, role)

      setIncidents((prev) =>
        prev.map((inc) => {
          if (inc.id !== incidentId) return inc
          const audit = [...inc.audit]
          let status = inc.status

          if (patch.status && patch.status !== inc.status) {
            status = patch.status
            if (patch.status === 'acknowledged') audit.push({ kind: 'acknowledged', at, by } as any)
            if (patch.status === 'responding') audit.push({ kind: 'responding', at, by } as any)
            if (patch.status === 'resolved') audit.push({ kind: 'resolved', at, by, note: patch.note } as any)
          }

          const assignment = patch.assignment
            ? { ...(inc.assignment ?? {}), ...patch.assignment }
            : inc.assignment

          if (patch.assignment) audit.push({ kind: 'assigned', at, by, assignment: patch.assignment } as any)
          if (patch.escalateToOwner) audit.push({ kind: 'escalated', at, by, note: patch.note } as any)
          if (patch.note && !patch.status && !patch.escalateToOwner) {
            audit.push({ kind: 'note', at, by, note: patch.note } as any)
          }

          return { ...inc, status, assignment, audit, updatedAt: at }
        }),
      )

      if (patch.status) setLastEvent({ kind: 'incident_updated', at, incidentId, status: patch.status })

      // Persist to backend — use server id if available
      const serverId = serverIdMap.current[incidentId] ?? incidentId
      if (currentProjectId) {
        updateWorkspaceEmergency(currentProjectId, serverId, {
          status: patch.status,
          note: patch.note,
          assignment: patch.assignment,
        }).catch(() => {})
      }
    },
    [user, role, currentProjectId],
  )

  const archiveIncident = useCallback(
    (incidentId: string) => {
      const at = Date.now()
      const by = actorFromUser(user, role)
      setIncidents((prev) =>
        prev.map((inc) => {
          if (inc.id !== incidentId) return inc
          return {
            ...inc,
            status: 'archived',
            updatedAt: at,
            audit: [...inc.audit, { kind: 'archived', at, by } as any],
          }
        }),
      )
      setLastEvent({ kind: 'incident_updated', at, incidentId, status: 'archived' })

      const serverId = serverIdMap.current[incidentId] ?? incidentId
      if (currentProjectId) {
        updateWorkspaceEmergency(currentProjectId, serverId, { status: 'archived' }).catch(() => {})
      }
    },
    [user, role, currentProjectId],
  )

  const value = useMemo<EmergencyContextValue>(
    () => ({
      incidents,
      activeIncidents,
      activeBanner,
      lastEvent,
      loading,
      trigger,
      updateIncident,
      archiveIncident,
      getIncident,
    }),
    [incidents, activeIncidents, activeBanner, lastEvent, loading, trigger, updateIncident, archiveIncident, getIncident],
  )

  return <EmergencyContext.Provider value={value}>{children}</EmergencyContext.Provider>
}

export function useEmergency() {
  const ctx = useContext(EmergencyContext)
  if (!ctx) throw new Error('useEmergency must be used within EmergencyProvider')
  return ctx
}
