import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Crosshair,
  FileText,
  Flame,
  HardHat,
  Shield,
  Siren,
  TriangleAlert,
  Wrench,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useAuth, type Role } from '@/auth/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { CameraCaptureModal } from '@/components/CameraCaptureModal'
import { useEmergency } from '@/emergency/EmergencyContext'
import type { EmergencyIncident, EmergencyIncidentType, EmergencySeverity, EmergencyStatus } from '@/emergency/types'
import { getBackendBaseUrl } from '@/api/http'
import { cn } from '@/utils/cn'

type IncidentTypeOption = {
  type: EmergencyIncidentType
  label: string
  icon: ComponentType<{ className?: string }>
  severity: EmergencySeverity
}

const typeOptions: IncidentTypeOption[] = [
  { type: 'injury_medical', label: 'Injury / Medical', icon: Siren, severity: 'high' },
  { type: 'fire_electrical', label: 'Fire / Electrical', icon: Flame, severity: 'critical' },
  { type: 'structural_risk', label: 'Structural Risk', icon: TriangleAlert, severity: 'critical' },
  { type: 'equipment_failure', label: 'Equipment Failure', icon: Wrench, severity: 'high' },
  { type: 'safety_hazard', label: 'Safety Hazard', icon: Shield, severity: 'medium' },
  { type: 'other', label: 'Other', icon: FileText, severity: 'medium' },
]

function severityTone(s: EmergencySeverity) {
  if (s === 'critical') return 'bg-[color:var(--color-error)]/12 text-[color:var(--color-error)]'
  if (s === 'high') return 'bg-[color:var(--color-warning)]/12 text-[color:var(--color-warning)]'
  if (s === 'medium') return 'bg-[color:var(--color-info)]/12 text-[color:var(--color-info)]'
  return 'bg-slate-100 text-[color:var(--color-text_secondary)]'
}

function statusLabel(s: EmergencyStatus) {
  switch (s) {
    case 'raised':
      return 'Raised'
    case 'acknowledged':
      return 'Acknowledged'
    case 'responding':
      return 'Responding'
    case 'resolved':
      return 'Resolved'
    case 'archived':
      return 'Archived'
  }
}

function typeLabel(t: EmergencyIncidentType) {
  return typeOptions.find((x) => x.type === t)?.label ?? 'Emergency'
}

function timeAgo(ts: number) {
  const diff = Math.max(0, Date.now() - ts)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}


function useGeo(onLocation?: (lat: number, lng: number) => void) {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const request = () => {
    setErr(null)
    if (!('geolocation' in navigator)) {
      setErr('Geolocation not supported on this device.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude })
        if (onLocation) onLocation(p.coords.latitude, p.coords.longitude)
      },
      () => setErr('Unable to fetch location (permission denied or unavailable).'),
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 },
    )
  }

  return { pos, err, request }
}

function WorkerEmergencyPanel() {
  const { user, role } = useAuth()
  const { trigger, loading } = useEmergency()

  const [incidentType, setIncidentType] = useState<IncidentTypeOption>(typeOptions[0])
  const [zone, setZone] = useState('')
  const [desc, setDesc] = useState('')

  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sentId, setSentId] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const { pos, err, request } = useGeo((lat, lng) => {
    setZone((prev) => prev ? prev : `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`)
  })

  useEffect(() => {
    request()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canTrigger = Boolean(zone.trim())

  const handleFile = async (f: File | null) => {
    if (!f) return
    if (!f.type.startsWith('image/')) return
    const reader = new FileReader()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onerror = () => reject(new Error('read_failed'))
      reader.onload = () => resolve(String(reader.result || ''))
      reader.readAsDataURL(f)
    }).catch(() => '')
    if (dataUrl) setPhotoDataUrl(dataUrl)
  }

  const submit = () => {
    if (!canTrigger || sending) return
    setConfirmOpen(true)
  }

  const send = async () => {
    if (!canTrigger || sending) return
    setSending(true)
    try {
      const id = await trigger({
        type: incidentType.type,
        severity: incidentType.severity,
        zone,
        description: desc,
        photoDataUrl,
        location: pos ?? undefined,
      })
      setSentId(id)
      setSending(false)
      setConfirmOpen(false)
      setPhotoDataUrl(undefined)
      setDesc('')
    } catch (error: any) {
      alert(error.message || 'Emergency trigger failed.')
      setSending(false)
      setConfirmOpen(false)
    }
  }

  const reporterName = user?.name ?? 'User'
  const resolvedRole: Role = role ?? 'worker'

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] min-w-0 max-w-full">
      <Card className="overflow-hidden min-w-0">
        <CardContent className="space-y-4 pt-4">
          <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-white p-4 shadow-[var(--shadow-soft)]">
            <Button
              type="button"
              variant="danger"
              size="lg"
              className="h-14 w-full rounded-[var(--radius-2xl)] text-base shadow-[var(--shadow-card)]"
              onClick={submit}
              disabled={!canTrigger}
            >
              <span className="text-xl">🚨</span>
              TRIGGER EMERGENCY ALERT
            </Button>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[color:var(--color-text_secondary)]">
              <span className="inline-flex min-w-0 items-center gap-1">
                <HardHat className="shrink-0 size-3.5" />
                Reporter: <span className="truncate font-semibold text-[color:var(--color-text)]">{reporterName}</span>
              </span>
              <span className="inline-flex min-w-0 items-center gap-1">
                <Clock className="shrink-0 size-3.5" />
                Role: <span className="truncate font-semibold text-[color:var(--color-text)]">{resolvedRole.toUpperCase()}</span>
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold tracking-widest text-[color:var(--color-text_muted)]">INCIDENT TYPE</div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {typeOptions.map((opt) => {
                const Icon = opt.icon
                const active = opt.type === incidentType.type
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setIncidentType(opt)}
                    className={cn(
                      'flex items-center gap-3 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 py-2 text-left text-sm font-semibold shadow-sm transition',
                      active
                        ? 'ring-2 ring-[color:var(--color-primary)]/40'
                        : 'hover:border-[color:var(--color-border_strong)] hover:bg-[color:var(--color-bg)]',
                    )}
                  >
                    <span className={cn('rounded-[var(--radius-xl)] px-2 py-1 text-xs font-semibold', severityTone(opt.severity))}>
                      {opt.severity.toUpperCase()}
                    </span>
                    <Icon className="size-4 text-[color:var(--color-text_secondary)]" />
                    <span className="flex-1">{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div>
              <div className="text-xs font-semibold tracking-widest text-[color:var(--color-text_muted)]">LOCATION / ZONE</div>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  placeholder="Enter specific zone or location"
                  className="w-full"
                />
                <Button type="button" variant="outline" size="sm" onClick={request} title="Auto-fill with GPS">
                  <Crosshair className="size-4" />
                </Button>
              </div>
              <div className="mt-2 text-xs text-[color:var(--color-text_secondary)]">
                {pos ? (
                  <span>
                    Auto location captured (device):{' '}
                    <span className="font-mono">
                      {pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}
                    </span>
                  </span>
                ) : err ? (
                  err
                ) : (
                  'Fetching device location…'
                )}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold tracking-widest text-[color:var(--color-text_muted)]">ONE-LINE DESCRIPTION (OPTIONAL)</div>
              <Input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="e.g., Scaffold collapse near stair core east"
                className="mt-2"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm text-[color:var(--color-text_secondary)]">
              <div className="font-semibold text-[color:var(--color-text)]">Photo (optional)</div>
              <div className="mt-1 text-xs">Attach a quick snapshot to help responders triage.</div>
              {photoDataUrl ? (
                <img
                  src={photoDataUrl}
                  alt="Emergency attachment preview"
                  className="mt-3 h-40 w-full rounded-[var(--radius-xl)] object-cover ring-1 ring-[color:var(--color-border)]"
                />
              ) : null}
            </div>
            <div className="flex gap-2 sm:flex-col">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              <Button type="button" variant="secondary" onClick={() => setShowCamera(true)}>
                Take Photo
              </Button>
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                Upload File
              </Button>
              {photoDataUrl ? (
                <Button type="button" variant="outline" onClick={() => setPhotoDataUrl(undefined)}>
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3 min-w-0">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base truncate">After sending</CardTitle>
              <CardDescription className="truncate">Immediate broadcast receipt + who was notified.</CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-xs text-[color:var(--color-text_secondary)] mt-1 truncate">
              <span className={`inline-block shrink-0 size-2 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span className="truncate">{loading ? 'Syncing…' : 'Live — auto-refreshes every 15s'}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {sentId ? (
              <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3">
                <div className="flex items-center gap-2 font-semibold text-[color:var(--color-success)]">
                  <CheckCircle2 className="size-4" />
                  Emergency Broadcast Sent
                </div>
                <div className="mt-2 text-xs text-[color:var(--color-text_secondary)]">
                  Incident ID: <span className="font-mono">{sentId}</span>
                </div>
                <div className="mt-3 text-xs font-semibold tracking-widest text-[color:var(--color-text_muted)]">NOTIFIED</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[color:var(--color-text_secondary)]">
                  <li>Owner</li>
                  <li>Senior Engineers</li>
                  <li>Safety Officer</li>
                  <li>Site Supervisor</li>
                </ul>
              </div>
            ) : (
              <div className="rounded-[var(--radius-xl)] border border-dashed border-[color:var(--color-border)] bg-white p-4 text-center text-[color:var(--color-text_secondary)]">
                Trigger an emergency to see the receipt.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[color:var(--color-error)]/30">
          <CardHeader>
            <CardTitle className="text-base truncate">Safety checklist</CardTitle>
            <CardDescription>Quick actions while help arrives.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[color:var(--color-text_secondary)]">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 rounded-full bg-[color:var(--color-error)]/12 px-2 py-0.5 text-xs font-semibold text-[color:var(--color-error)]">
                1
              </span>
              <span>Move people away from immediate hazards and stop work nearby.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 rounded-full bg-[color:var(--color-warning)]/12 px-2 py-0.5 text-xs font-semibold text-[color:var(--color-warning)]">
                2
              </span>
              <span>Call the on-site supervisor / safety officer (see Contacts).</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 rounded-full bg-[color:var(--color-info)]/12 px-2 py-0.5 text-xs font-semibold text-[color:var(--color-info)]">
                3
              </span>
              <span>Keep access routes clear for responders and equipment.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Modal
        open={confirmOpen}
        onOpenChange={(o) => (sending ? null : setConfirmOpen(o))}
        title="Confirm Emergency Broadcast"
        description="Are you sure you want to broadcast this emergency alert? This action is immediate and cannot be undone."
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={send} disabled={sending}>
              {sending ? 'Sending…' : 'Confirm & Send'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-[color:var(--color-text_secondary)]">
          <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-[color:var(--color-text)]">{typeLabel(incidentType.type)}</span>
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', severityTone(incidentType.severity))}>
                {incidentType.severity.toUpperCase()}
              </span>
            </div>
            <div className="mt-1 text-xs">Location: {zone}</div>
            {desc.trim() ? <div className="mt-2 text-xs">Note: {desc.trim()}</div> : null}
          </div>
          <div className="text-xs">
            This action immediately broadcasts the emergency incident to the Owner, Engineers, Safety Officer, and relevant supervisors. Support will be dispatched immediately.
          </div>
        </div>
      </Modal>

      {showCamera && (
        <CameraCaptureModal
          onClose={() => setShowCamera(false)}
          onCapture={(dataUrl) => {
            setPhotoDataUrl(dataUrl)
            setShowCamera(false)
          }}
        />
      )}
    </div>
  )
}

function EngineerCommandPanel() {
  const { user, role } = useAuth()
  const { incidents, activeIncidents, updateIncident, archiveIncident } = useEmergency()

  const resolvedRole: Role = role ?? 'engineer'
  const list = resolvedRole === 'engineer' ? activeIncidents : incidents

  const [selectedId, setSelectedId] = useState<string | null>(list[0]?.id ?? null)
  const selected = useMemo(() => list.find((x) => x.id === selectedId) ?? null, [list, selectedId])
  const [note, setNote] = useState('')
  const [toast, setToast] = useState<string | null>(null)


  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(id)
  }, [toast])

  const actorName = user?.name ?? 'User'

  const mark = (status: EmergencyStatus) => {
    if (!selected) return
    updateIncident(selected.id, { status })
    setToast(`Marked ${statusLabel(status)}.`)
    if (status === 'resolved') {
      setSelectedId(null)
    }
  }



  const escalate = () => {
    if (!selected) return
    updateIncident(selected.id, { escalateToOwner: true, note: note.trim() || undefined })
    setToast('Escalated to owner.')
    setNote('')
  }

  const addNote = () => {
    if (!selected) return
    if (!note.trim()) return
    updateIncident(selected.id, { note: note.trim() })
    setToast('Response note added.')
    setNote('')
  }

  return (
    <div className="grid h-[calc(100vh-120px)] gap-4 lg:grid-cols-[1fr_1.2fr]">
      <Card className="flex flex-col overflow-hidden">
        <CardHeader className="shrink-0">
          <CardTitle className="flex items-center gap-2">
            <HardHat className="size-4 text-[color:var(--color-primary_dark)]" />
            Active Emergency Feed
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-2 overflow-hidden">
          {activeIncidents.length === 0 ? (
            <div className="rounded-[var(--radius-xl)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg)] py-12 text-center text-sm text-[color:var(--color-text_secondary)]">
              No active emergencies right now.
            </div>
          ) : (
            <div className="space-y-2">
              {activeIncidents.slice(0, 5).map((inc) => (
                <button
                  key={inc.id}
                  type="button"
                  onClick={() => setSelectedId(inc.id)}
                  className={cn(
                    'w-full rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white p-3 text-left shadow-sm transition',
                    inc.id === selectedId ? 'ring-2 ring-[color:var(--color-primary)]/35' : 'hover:bg-[color:var(--color-bg)]',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{typeLabel(inc.type)}</div>
                      <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">{inc.location.zone}</div>
                    </div>
                    <div className="text-right">
                      <div className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold', severityTone(inc.severity))}>
                        {inc.severity.toUpperCase()}
                      </div>
                      <div className="mt-1 text-xs text-[color:var(--color-text_muted)]">{timeAgo(inc.createdAt)}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-[color:var(--color-text_secondary)]">
                      Reported by <span className="font-semibold text-[color:var(--color-text)]">{inc.reportedBy.name}</span>
                    </span>
                    <span className="rounded-full bg-[color:var(--color-bg)] px-2 py-0.5 font-semibold text-[color:var(--color-text_secondary)] ring-1 ring-[color:var(--color-border)]">
                      {statusLabel(inc.status)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col space-y-4 overflow-hidden">
        {toast ? (
          <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-3 text-sm font-semibold">
            {toast}
          </div>
        ) : null}

        <Card className="flex flex-1 flex-col overflow-hidden">
          <CardHeader className="shrink-0">
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-4 text-[color:var(--color-primary_dark)]" />
              Incident Detail
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-3 overflow-hidden">
            {!selected ? (
              <div className="rounded-[var(--radius-xl)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg)] py-12 text-center text-sm text-[color:var(--color-text_secondary)]">
                Select an incident to begin.
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white p-3">
                    <div className="text-xs text-[color:var(--color-text_secondary)]">Type</div>
                    <div className="mt-1 text-sm font-semibold">{typeLabel(selected.type)}</div>
                  </div>
                  <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white p-3">
                    <div className="text-xs text-[color:var(--color-text_secondary)]">Location</div>
                    <div className="mt-1 text-sm font-semibold">{selected.location.zone}</div>
                  </div>
                </div>

                <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[color:var(--color-bg)] px-2 py-0.5 text-xs font-semibold text-[color:var(--color-text_secondary)] ring-1 ring-[color:var(--color-border)]">
                      {statusLabel(selected.status)}
                    </span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', severityTone(selected.severity))}>
                      {selected.severity.toUpperCase()}
                    </span>
                    <span className="text-xs text-[color:var(--color-text_secondary)]">
                      Reported by <span className="font-semibold text-[color:var(--color-text)]">{selected.reportedBy.name}</span>
                    </span>
                  </div>
                  {selected.description ? (
                    <div className="mt-2 text-sm text-[color:var(--color-text_secondary)]">{selected.description}</div>
                  ) : null}
                </div>

                {selected.photoDataUrl ? (
                  <img
                    src={selected.photoDataUrl.startsWith('data:') || selected.photoDataUrl.startsWith('http') ? selected.photoDataUrl : `${getBackendBaseUrl() || ''}${selected.photoDataUrl.startsWith('/') ? '' : '/'}${selected.photoDataUrl}`}
                    alt="Incident photo"
                    className="h-44 w-full rounded-[var(--radius-2xl)] object-cover ring-1 ring-[color:var(--color-border)]"
                  />
                ) : null}

                <div className="grid gap-2 sm:grid-cols-2">

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => mark('responding')}
                    disabled={selected.status === 'resolved' || selected.status === 'archived'}
                  >
                    Mark Responding
                  </Button>

                  <Button type="button" variant="danger" onClick={() => mark('resolved')} disabled={selected.status === 'resolved' || selected.status === 'archived'}>
                    Resolve Incident
                  </Button>

                </div>

                <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white p-3">
                  <div className="text-xs font-semibold tracking-widest text-[color:var(--color-text_muted)]">RESPONSE NOTES</div>
                  <div className="mt-2 flex gap-2">
                    <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add response notes (e.g., dispatched first aid kit, cordoned zone)" />
                    <Button type="button" variant="secondary" onClick={addNote}>
                      Add
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-[color:var(--color-text_secondary)]">
                    <span>Responder: {actorName}</span>
                    <button type="button" onClick={escalate} className="font-semibold text-[color:var(--color-primary_dark)] hover:underline">
                      Escalate to owner
                    </button>
                  </div>
                </div>

              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function OwnerEmergencyDashboard() {
  const { incidents, activeIncidents, updateIncident } = useEmergency()

  const activeCount = activeIncidents.filter((x) => x.status !== 'resolved').length
  const resolvedCount = incidents.filter((x) => x.status === 'resolved').length

  const monthStart = useMemo(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }, [])

  const thisMonth = incidents.filter((x) => x.createdAt >= monthStart).length

  const avgResponseMinutes = useMemo(() => {
    const resolved = incidents.filter((x) => x.status === 'resolved')
    if (!resolved.length) return null
    const mins = resolved
      .map((x) => {
        const raised = x.audit.find((e) => e.kind === 'raised')?.at ?? x.createdAt
        const resolvedAt = x.audit.find((e) => e.kind === 'resolved')?.at ?? x.updatedAt
        return Math.max(1, Math.round((resolvedAt - raised) / 60000))
      })
      .reduce((a, b) => a + b, 0)
    return Math.round(mins / resolved.length)
  }, [incidents])

  const history = useMemo(() => {
    return incidents
      .filter((x) => x.status === 'resolved' || x.status === 'archived')
      .slice()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 20)
  }, [incidents])

  const commonType = useMemo(() => {
    const map = new Map<EmergencyIncidentType, number>()
    for (const i of incidents) map.set(i.type, (map.get(i.type) ?? 0) + 1)
    const top = [...map.entries()].sort((a, b) => b[1] - a[1])[0]
    return top ? { type: top[0], count: top[1] } : null
  }, [incidents])

  const topZones = useMemo(() => {
    const map = new Map<string, number>()
    for (const i of incidents) map.set(i.location.zone, (map.get(i.location.zone) ?? 0) + 1)
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
  }, [incidents])

  const resolveQuick = (inc: EmergencyIncident) => {
    updateIncident(inc.id, { status: 'resolved', note: 'Resolved by owner.' })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-none ring-1 ring-[color:var(--color-border)]">
          <CardContent className="pt-4">
            <div className="text-xs text-[color:var(--color-text_secondary)]">Active emergencies</div>
            <div className="mt-1 text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>
        <Card className="shadow-none ring-1 ring-[color:var(--color-border)]">
          <CardContent className="pt-4">
            <div className="text-xs text-[color:var(--color-text_secondary)]">This month</div>
            <div className="mt-1 text-2xl font-bold">{thisMonth}</div>
          </CardContent>
        </Card>
        <Card className="shadow-none ring-1 ring-[color:var(--color-border)]">
          <CardContent className="pt-4">
            <div className="text-xs text-[color:var(--color-text_secondary)]">Avg response time</div>
            <div className="mt-1 text-2xl font-bold">{avgResponseMinutes ? `${avgResponseMinutes}m` : '—'}</div>
          </CardContent>
        </Card>
        <Card className="shadow-none ring-1 ring-[color:var(--color-border)]">
          <CardContent className="pt-4">
            <div className="text-xs text-[color:var(--color-text_secondary)]">Resolved incidents</div>
            <div className="mt-1 text-2xl font-bold">{resolvedCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-[color:var(--color-error)]" />
              Live Incident Feed
            </CardTitle>
            <CardDescription>Active incidents and escalation overview.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeIncidents.length === 0 ? (
              <div className="rounded-[var(--radius-xl)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg)] py-12 text-center text-sm text-[color:var(--color-text_secondary)]">
                No active emergencies.
              </div>
            ) : (
              <div className="space-y-2">
                {activeIncidents.slice(0, 8).map((inc) => (
                  <div key={inc.id} className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{typeLabel(inc.type)}</div>
                        <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">{inc.location.zone}</div>
                        <div className="mt-1 text-xs text-[color:var(--color-text_muted)]">
                          Reported by {inc.reportedBy.name} · {timeAgo(inc.createdAt)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold', severityTone(inc.severity))}>
                          {inc.severity.toUpperCase()}
                        </div>
                        <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">{statusLabel(inc.status)}</div>
                        <div className="mt-2">
                          <Button type="button" size="sm" variant="danger" onClick={() => resolveQuick(inc)}>
                            Resolve
                          </Button>
                        </div>
                      </div>
                    </div>
                    {inc.description ? <div className="mt-2 text-sm text-[color:var(--color-text_secondary)]">{inc.description}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audit log</CardTitle>
              <CardDescription>Recent resolved/archived incidents.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {history.length === 0 ? (
                <div className="rounded-[var(--radius-xl)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg)] py-10 text-center text-sm text-[color:var(--color-text_secondary)]">
                  No history yet.
                </div>
              ) : (
                history.map((inc) => {
                  const resolvedBy = inc.audit.find((e) => e.kind === 'resolved')?.by?.name ?? '—'
                  const dur = (() => {
                    const raised = inc.audit.find((e) => e.kind === 'raised')?.at ?? inc.createdAt
                    const resolvedAt = inc.audit.find((e) => e.kind === 'resolved')?.at ?? inc.updatedAt
                    const mins = Math.max(1, Math.round((resolvedAt - raised) / 60000))
                    return `${mins}m`
                  })()
                  return (
                    <div key={inc.id} className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">{typeLabel(inc.type)}</div>
                          <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">{inc.location.zone}</div>
                        </div>
                        <div className="text-right text-xs text-[color:var(--color-text_secondary)]">
                          <div>Duration: {dur}</div>
                          <div>Resolved by: {resolvedBy}</div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Analytics</CardTitle>
              <CardDescription>Quick operational signals.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3">
                <div className="text-xs font-semibold tracking-widest text-[color:var(--color-text_muted)]">MOST COMMON TYPE</div>
                <div className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">
                  {commonType ? `${typeLabel(commonType.type)} (${commonType.count})` : '—'}
                </div>
              </div>
              <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3">
                <div className="text-xs font-semibold tracking-widest text-[color:var(--color-text_muted)]">HIGH-RISK ZONES</div>
                {topZones.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {topZones.map(([z, c]) => (
                      <li key={z}>
                        {z} <span className="text-[color:var(--color-text_muted)]">({c})</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">—</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export function EmergencyPage() {
  const { role } = useAuth()
  const resolvedRole: Role = role ?? 'engineer'

  return (
    <div className="space-y-2">
      {resolvedRole === 'owner' ? <OwnerEmergencyDashboard /> : resolvedRole === 'engineer' ? <EngineerCommandPanel /> : <WorkerEmergencyPanel />}
    </div>
  )
}


