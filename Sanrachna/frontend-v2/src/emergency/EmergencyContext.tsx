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
import type { EmergencyAssignment, EmergencyIncident, EmergencyIncidentType, EmergencySeverity, EmergencyStatus } from '@/emergency/types'

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

  trigger: (input: TriggerInput) => string
  updateIncident: (id: string, patch: UpdateInput) => void
  archiveIncident: (id: string) => void
  getIncident: (id: string) => EmergencyIncident | null
}

const EmergencyContext = createContext<EmergencyContextValue | undefined>(undefined)

const STORAGE_KEY = 'sanrachna_emergencies_v1'

function now() {
  return Date.now()
}

function id(prefix = 'emg') {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

function displayType(t: EmergencyIncidentType) {
  switch (t) {
    case 'injury_medical':
      return 'Injury / Medical'
    case 'fire_electrical':
      return 'Fire / Electrical'
    case 'structural_risk':
      return 'Structural Risk'
    case 'equipment_failure':
      return 'Equipment Failure'
    case 'safety_hazard':
      return 'Safety Hazard'
    case 'other':
      return 'Other'
  }
}

function defaultSeverityForType(t: EmergencyIncidentType): EmergencySeverity {
  if (t === 'fire_electrical' || t === 'structural_risk') return 'critical'
  if (t === 'injury_medical') return 'high'
  return 'medium'
}

function actorFromUser(u: User | null, role: Role | null) {
  const resolvedRole: Role = role ?? 'engineer'
  return {
    id: u?.id ?? 'demo_user',
    name: u?.name ?? 'Demo User',
    role: resolvedRole,
  }
}

export function EmergencyProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth()
  const [incidents, setIncidents] = useState<EmergencyIncident[]>([])
  const [lastEvent, setLastEvent] = useState<EmergencyEvent | null>(null)
  const lastPersisted = useRef<string | null>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as EmergencyIncident[]
      if (Array.isArray(parsed)) setIncidents(parsed)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      const serialized = JSON.stringify(incidents)
      if (serialized === lastPersisted.current) return
      lastPersisted.current = serialized
      window.localStorage.setItem(STORAGE_KEY, serialized)
    } catch {
      // ignore
    }
  }, [incidents])

  const getIncident = useCallback(
    (incidentId: string) => {
      return incidents.find((x) => x.id === incidentId) ?? null
    },
    [incidents],
  )

  const activeIncidents = useMemo(() => {
    const active = incidents.filter((x) => x.status !== 'archived')
    return active.sort((a, b) => b.updatedAt - a.updatedAt)
  }, [incidents])

  const activeBanner = useMemo(() => {
    const active = activeIncidents.find((x) => x.status === 'raised' || x.status === 'acknowledged' || x.status === 'responding')
    if (!active) return null
    const label = `🚨 Active Emergency at ${active.location.zone} — ${displayType(active.type)}`
    return { incidentId: active.id, label }
  }, [activeIncidents])

  const trigger = useCallback(
    (input: TriggerInput) => {
      const at = now()
      const incidentId = id('inc')
      const by = actorFromUser(user, role)
      const severity = input.severity ?? defaultSeverityForType(input.type)

      const next: EmergencyIncident = {
        id: incidentId,
        status: 'raised',
        severity,
        type: input.type,
        location: { zone: input.zone, lat: input.location?.lat, lng: input.location?.lng },
        description: input.description?.trim() ? input.description.trim() : undefined,
        photoDataUrl: input.photoDataUrl,
        reportedBy: by,
        createdAt: at,
        updatedAt: at,
        assignment: {},
        audit: [{ kind: 'raised', at, by, message: input.description?.trim() ? input.description.trim() : undefined }],
      }

      setIncidents((prev) => [next, ...prev])
      setLastEvent({ kind: 'broadcast_sent', at, incidentId })
      return incidentId
    },
    [user, role],
  )

  const updateIncident = useCallback(
    (incidentId: string, patch: UpdateInput) => {
      const at = now()
      const by = actorFromUser(user, role)

      setIncidents((prev) =>
        prev.map((inc) => {
          if (inc.id !== incidentId) return inc
          const audit = [...inc.audit]

          let status = inc.status
          if (patch.status && patch.status !== inc.status) {
            status = patch.status
            if (patch.status === 'acknowledged') audit.push({ kind: 'acknowledged', at, by })
            if (patch.status === 'responding') audit.push({ kind: 'responding', at, by })
            if (patch.status === 'resolved') audit.push({ kind: 'resolved', at, by, note: patch.note })
          }

          const assignment: EmergencyAssignment | undefined = patch.assignment
            ? { ...(inc.assignment ?? {}), ...patch.assignment }
            : inc.assignment

          if (patch.assignment) audit.push({ kind: 'assigned', at, by, assignment: patch.assignment })

          if (patch.escalateToOwner) audit.push({ kind: 'escalated', at, by, note: patch.note })

          if (patch.note && !patch.status && !patch.escalateToOwner) {
            audit.push({ kind: 'note', at, by, note: patch.note })
          }

          const updated: EmergencyIncident = {
            ...inc,
            status,
            assignment,
            audit,
            updatedAt: at,
          }
          return updated
        }),
      )

      if (patch.status) setLastEvent({ kind: 'incident_updated', at, incidentId, status: patch.status })
    },
    [user, role],
  )

  const archiveIncident = useCallback(
    (incidentId: string) => {
      const at = now()
      const by = actorFromUser(user, role)
      setIncidents((prev) =>
        prev.map((inc) => {
          if (inc.id !== incidentId) return inc
          return {
            ...inc,
            status: 'archived',
            updatedAt: at,
            audit: [...inc.audit, { kind: 'archived', at, by }],
          }
        }),
      )
      setLastEvent({ kind: 'incident_updated', at, incidentId, status: 'archived' })
    },
    [user, role],
  )

  const value = useMemo<EmergencyContextValue>(() => {
    return { incidents, activeIncidents, activeBanner, lastEvent, trigger, updateIncident, archiveIncident, getIncident }
  }, [incidents, activeIncidents, activeBanner, lastEvent, trigger, updateIncident, archiveIncident, getIncident])

  return <EmergencyContext.Provider value={value}>{children}</EmergencyContext.Provider>
}

export function useEmergency() {
  const ctx = useContext(EmergencyContext)
  if (!ctx) throw new Error('useEmergency must be used within EmergencyProvider')
  return ctx
}

