import { Camera, FolderOpen, ImagePlus, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchWorkspaceDailyLogs } from '@/api/resources'
import { isBackendConfigured } from '@/api/http'
import {
  apiCreateProjectLogPhoto,
  apiListProjectLogs,
  apiPatchProjectLogStatus,
  logPhotoAbsoluteUrl,
  type ProjectLogDto,
} from '@/api/projectLogsApi'
import { messageFromApiError } from '@/api/projectTeamApi'
import { useAuth } from '@/auth/AuthContext'
import { CameraCaptureDialog, type CameraCaptureMeta } from '@/components/CameraCaptureDialog'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { PageLoader } from '@/components/ui/Loader'
import { useProjectsStore } from '@/store/useProjectsStore'
import type { DailyLogEntry } from '@/types/dashboard.types'
import { cn } from '@/utils/cn'

const MONGO_ID_RE = /^[a-f0-9]{24}$/i

function mapDtoToEntry(row: ProjectLogDto): DailyLogEntry {
  return {
    id: row.id,
    date: row.date,
    tasks_completed: row.tasks_completed,
    workers_present: row.workers_present,
    issues: row.issues,
    photo_url: row.photo_url,
    author: row.author,
    status: row.status,
    createdAt: row.createdAt,
    submittedBy: row.submittedBy ?? null,
    submittedByName: row.submittedByName ?? null,
    photoCapturedAt: row.photoCapturedAt ?? null,
    photoUploadedAt: row.photoUploadedAt ?? null,
  }
}

function fmtIso(iso: string | null | undefined): string | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return iso
  return new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function statusBadge(status: string | undefined) {
  const s = status || 'approved'
  if (s === 'pending') return 'bg-amber-500/15 text-amber-900 ring-amber-500/30'
  if (s === 'rejected') return 'bg-[color:var(--color-error)]/12 text-[color:var(--color-error)] ring-[color:var(--color-error)]/25'
  return 'bg-emerald-500/12 text-emerald-900 ring-emerald-500/25'
}

export function DailyLogsPage() {
  const { role, token, user } = useAuth()
  const resolvedRole = role ?? 'engineer'
  const currentProjectId = useProjectsStore((s) => s.currentProjectId)

  const [items, setItems] = useState<DailyLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const backendOk = Boolean(isBackendConfigured() && token && currentProjectId && MONGO_ID_RE.test(currentProjectId))

  const load = useCallback(async () => {
    if (!currentProjectId) {
      setItems([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      if (backendOk) {
        const { logs } = await apiListProjectLogs(currentProjectId)
        setItems((logs || []).map(mapDtoToEntry))
      } else {
        const rows = await fetchWorkspaceDailyLogs(currentProjectId)
        setItems(rows)
      }
    } catch (e) {
      setError(messageFromApiError(e))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [currentProjectId, backendOk])

  useEffect(() => {
    void load()
  }, [load])

  const galleryRef = useRef<HTMLInputElement>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  type PendingPhoto = {
    id: string
    file: File
    url: string
    photoCapturedAt: string
    captureSource: 'live_camera' | 'gallery'
  }
  const [pendingFiles, setPendingFiles] = useState<PendingPhoto[]>([])
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return
    const next: PendingPhoto[] = []
    for (const file of Array.from(list)) {
      if (!file.type.startsWith('image/')) continue
      const photoCapturedAt =
        file.lastModified && !Number.isNaN(file.lastModified)
          ? new Date(file.lastModified).toISOString()
          : new Date().toISOString()
      next.push({
        id: `pf_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        file,
        url: URL.createObjectURL(file),
        photoCapturedAt,
        captureSource: 'gallery',
      })
    }
    if (next.length) setPendingFiles((p) => [...p, ...next])
  }

  const addCapturedFile = (file: File, meta: CameraCaptureMeta) => {
    if (!file.type.startsWith('image/')) return
    setPendingFiles((p) => [
      ...p,
      {
        id: `pf_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        file,
        url: URL.createObjectURL(file),
        photoCapturedAt: meta.capturedAtISO,
        captureSource: 'live_camera',
      },
    ])
  }

  const removePending = (id: string) => {
    setPendingFiles((p) => {
      const row = p.find((x) => x.id === id)
      if (row) URL.revokeObjectURL(row.url)
      return p.filter((x) => x.id !== id)
    })
  }

  const submitPhotos = async () => {
    if (!backendOk || !currentProjectId) {
      setUploadMsg('Connect to the API and select a server project to upload photos.')
      return
    }
    if (resolvedRole !== 'worker') return
    if (!pendingFiles.length) {
      setUploadMsg('Add at least one photo.')
      return
    }
    setUploading(true)
    setUploadMsg(null)
    try {
      for (const p of pendingFiles) {
        const fd = new FormData()
        fd.append('photo', p.file)
        fd.append('date', logDate)
        fd.append('tasks_completed', caption.trim() || 'Site photo log')
        fd.append('issues', '')
        fd.append('photoCapturedAt', p.photoCapturedAt || new Date().toISOString())
        await apiCreateProjectLogPhoto(currentProjectId, fd)
      }
      for (const p of pendingFiles) URL.revokeObjectURL(p.url)
      setPendingFiles([])
      setCaption('')
      setUploadMsg('Photos submitted. Waiting for engineer approval.')
      await load()
    } catch (e) {
      setUploadMsg(messageFromApiError(e))
    } finally {
      setUploading(false)
    }
  }

  const [approveCounts, setApproveCounts] = useState<Record<string, string>>({})

  const approveLog = async (logId: string, status: 'approved' | 'rejected') => {
    if (!backendOk || !currentProjectId || resolvedRole !== 'engineer') return
    const raw = approveCounts[logId]
    const workersPresent = raw !== undefined && raw !== '' ? Number(raw) : 1
    try {
      await apiPatchProjectLogStatus(currentProjectId, logId, {
        status,
        workersPresent: status === 'approved' ? (Number.isFinite(workersPresent) && workersPresent >= 0 ? workersPresent : 1) : undefined,
      })
      await load()
    } catch (e) {
      setError(messageFromApiError(e))
    }
  }

  if (!currentProjectId) {
    return (
      <div className="space-y-8">
        <EmptyState
          icon={FolderOpen}
          title="Select a project"
          description={
            backendOk
              ? 'Daily logs load from the server for the selected MongoDB project.'
              : 'Daily logs load from GET /api/v1/workspaces/:id/daily-logs in demo mode.'
          }
        />
      </div>
    )
  }

  const ownerReadOnly = resolvedRole === 'owner'
  const engineerActions = resolvedRole === 'engineer'
  const workerSubmit = resolvedRole === 'worker'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-text)]">Daily Logs</h1>
        <p className="mt-1 text-sm text-[color:var(--color-text_secondary)]">
          Submit/view site photos. Engineers approve logs; approved headcount rolls up into project attendance automatically.
        </p>
      </div>

      {error ? (
        <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-error)]/35 bg-[color:var(--color-error)]/5 px-4 py-3 text-sm text-[color:var(--color-error)]">
          {error}
        </div>
      ) : null}

      {workerSubmit && backendOk ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImagePlus className="size-4 text-[color:var(--color-primary_dark)]" />
              Submit photo log
            </CardTitle>
            <CardDescription>
              Use <strong>Take photo</strong> for a live camera capture (time is saved with the image), or choose from your gallery. After an engineer approves, each log adds one attendance mark for you on that day.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-[color:var(--color-text_secondary)]">Log date</div>
                <Input className="mt-1" type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
              </div>
              <div>
                <div className="text-xs font-semibold text-[color:var(--color-text_secondary)]">Caption (optional)</div>
                <Input
                  className="mt-1"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Area / activity — e.g. North façade progress"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files)
                  e.target.value = ''
                }}
              />
              <Button type="button" variant="secondary" onClick={() => galleryRef.current?.click()}>
                <ImagePlus className="size-4" />
                Choose photos
              </Button>
              <Button type="button" variant="secondary" onClick={() => setCameraOpen(true)}>
                <Camera className="size-4" />
                Take photo
              </Button>
              <Button type="button" disabled={uploading || !pendingFiles.length} onClick={() => void submitPhotos()}>
                {uploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  'Submit to server'
                )}
              </Button>
            </div>
            {pendingFiles.length ? (
              <div className="flex flex-wrap gap-3">
                {pendingFiles.map((p) => (
                  <div key={p.id} className="flex w-28 flex-col gap-1">
                    <button
                      type="button"
                      className="overflow-hidden rounded-[var(--radius-xl)] ring-1 ring-[color:var(--color-border)] transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                      onClick={() => setLightboxUrl(p.url)}
                      title="Tap to enlarge"
                    >
                      <img
                        src={p.url}
                        alt=""
                        className="h-24 w-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                    </button>
                    <p className="text-[10px] text-[color:var(--color-text_muted)]">
                      {p.captureSource === 'live_camera' ? 'Live camera' : 'Gallery'} ·{' '}
                      {new Date(p.photoCapturedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                    <button
                      type="button"
                      className="text-center text-xs font-semibold text-[color:var(--color-error)] hover:underline"
                      onClick={() => removePending(p.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[color:var(--color-text_muted)]">No photos queued.</p>
            )}
            {uploadMsg ? <p className="text-sm text-[color:var(--color-text_secondary)]">{uploadMsg}</p> : null}
            <p className="text-xs text-[color:var(--color-text_muted)]">Signed in as {user?.name ?? 'Worker'}.</p>
          </CardContent>
        </Card>
      ) : null}

      {workerSubmit && !backendOk ? (
        <Card className="border-amber-500/25 bg-amber-500/5">
          <CardContent className="py-4 text-sm text-[color:var(--color-text_secondary)]">
            Photo upload to the database requires the app to be pointed at your Sanrachna API (VITE_BACKEND_URL) and a server-backed project selected. Use{' '}
            <span className="font-semibold">Submit log</span> in the menu for the full daily workflow, or switch to demo mode logs only.
          </CardContent>
        </Card>
      ) : null}

      {(ownerReadOnly || engineerActions) && backendOk ? (
        <Card className="border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
          <CardContent className="py-3 text-sm text-[color:var(--color-text_secondary)]">
            {ownerReadOnly
              ? 'Owner: read-only access to submitted photo logs.'
              : 'Engineer: approve each pending log and set headcount for that photo (defaults to 1). Totals by date are stored under project planning for attendance.'}
          </CardContent>
        </Card>
      ) : null}

      {loading ? <PageLoader /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Recent logs</CardTitle>
          <CardDescription>{backendOk ? 'From your project database' : 'Demo workspace feed'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 && !loading ? (
            <p className="text-sm text-[color:var(--color-text_muted)]">No logs yet for this project.</p>
          ) : null}
          {items.map((log) => {
            const src = logPhotoAbsoluteUrl(log.photo_url)
            const st = log.status || 'approved'
            return (
              <div
                key={log.id}
                className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text_muted)]">{log.date}</span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
                          statusBadge(typeof log.status === 'string' ? log.status : undefined),
                        )}
                      >
                        {st}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-[color:var(--color-text)]">{log.tasks_completed}</p>
                    <p className="mt-1 text-xs text-[color:var(--color-text_secondary)]">
                      {log.submittedByName || log.author}
                      {st === 'approved' ? ` · People in frame (engineer): ${log.workers_present}` : null}
                    </p>
                    {fmtIso(log.photoCapturedAt) ? (
                      <p className="mt-1 text-xs text-[color:var(--color-text_muted)]">Photo time: {fmtIso(log.photoCapturedAt)}</p>
                    ) : null}
                    {fmtIso(log.photoUploadedAt) ? (
                      <p className="text-xs text-[color:var(--color-text_muted)]">Uploaded: {fmtIso(log.photoUploadedAt)}</p>
                    ) : null}
                    {st === 'approved' && (log.submittedByName || log.author) ? (
                      <p className="mt-1 text-xs font-medium text-emerald-800">
                        Attendance: +1 for {log.submittedByName || log.author} on {log.date} (rolled into project totals).
                      </p>
                    ) : null}
                    {st === 'pending' ? (
                      <p className="mt-1 text-xs text-amber-900/90">Pending approval — attendance for the worker is applied after engineer approval.</p>
                    ) : null}
                    {log.issues ? <p className="mt-2 text-xs text-[color:var(--color-text)]">{log.issues}</p> : null}
                  </div>
                  {src ? (
                    <button
                      type="button"
                      className="shrink-0 overflow-hidden rounded-[var(--radius-lg)] ring-1 ring-[color:var(--color-border)] transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                      onClick={() => setLightboxUrl(src)}
                      title="View full size"
                    >
                      <img
                        src={src}
                        alt=""
                        className="h-28 w-40 object-cover"
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement
                          img.style.display = 'none'
                          const parent = img.closest('button')
                          if (parent) {
                            parent.insertAdjacentHTML('afterend', '<div class="flex h-28 w-40 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">No image</div>')
                            parent.remove()
                          }
                        }}
                      />
                    </button>
                  ) : (
                    <div className="flex h-28 w-40 items-center justify-center rounded-[var(--radius-lg)] bg-[color:var(--color-bg)] text-xs text-[color:var(--color-text_muted)]">
                      No image
                    </div>
                  )}
                </div>
                {engineerActions && st === 'pending' && backendOk ? (
                  <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-[color:var(--color-border)] pt-4">
                    <div>
                      <div className="text-xs font-semibold text-[color:var(--color-text_secondary)]">Workers counted</div>
                      <Input
                        className="mt-1 w-24"
                        type="number"
                        min={0}
                        placeholder="1"
                        value={approveCounts[log.id] ?? '1'}
                        onChange={(e) => setApproveCounts((m) => ({ ...m, [log.id]: e.target.value }))}
                      />
                    </div>
                    <Button type="button" onClick={() => void approveLog(log.id, 'approved')}>
                      Approve
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => void approveLog(log.id, 'rejected')}>
                      Reject
                    </Button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </CardContent>
      </Card>

      <CameraCaptureDialog open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={(file, meta) => addCapturedFile(file, meta)} />

      {lightboxUrl ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-4xl flex-col gap-3 rounded-[var(--radius-2xl)] bg-[color:var(--color-card)] p-4 shadow-xl ring-1 ring-[color:var(--color-border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button type="button" variant="secondary" onClick={() => window.open(lightboxUrl, '_blank', 'noopener,noreferrer')}>
                Open in new tab
              </Button>
              <Button type="button" variant="secondary" onClick={() => setLightboxUrl(null)}>
                Close
              </Button>
            </div>
            <div className="min-h-0 overflow-auto rounded-[var(--radius-xl)] bg-black/5 p-2">
              <img src={lightboxUrl} alt="" className="mx-auto max-h-[min(75vh,800px)] w-auto max-w-full object-contain" />
            </div>
            <p className="text-center text-xs text-[color:var(--color-text_secondary)]">Click outside this panel to close</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
