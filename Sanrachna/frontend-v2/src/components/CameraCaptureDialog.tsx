import { Camera, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'

export type CameraCaptureMeta = {
  /** ISO time when the frame was grabbed (shutter moment). */
  capturedAtISO: string
  source: 'live_camera'
}

type Props = {
  open: boolean
  onClose: () => void
  /** JPEG from the live preview; `meta.capturedAtISO` is the capture instant. */
  onCapture: (file: File, meta: CameraCaptureMeta) => void
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop())
}

export function CameraCaptureDialog({ open, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  /** Lets the Capture button enable after the stream is attached (refs do not re-render). */
  const [streamReady, setStreamReady] = useState(false)

  const attachStream = useCallback((stream: MediaStream) => {
    streamRef.current = stream
    const v = videoRef.current
    if (v) {
      v.srcObject = stream
      void v.play().catch(() => {})
    }
    setStreamReady(true)
  }, [])

  useEffect(() => {
    if (!open) {
      stopStream(streamRef.current)
      streamRef.current = null
      const v = videoRef.current
      if (v) v.srcObject = null
      setError(null)
      setStarting(false)
      setStreamReady(false)
      return
    }

    let cancelled = false
    setError(null)
    setStarting(true)
    setStreamReady(false)

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) setError('Camera is not supported in this browser.')
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        })
        if (cancelled) {
          stopStream(stream)
          return
        }
        attachStream(stream)
      } catch {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          })
          if (cancelled) {
            stopStream(stream)
            return
          }
          attachStream(stream)
        } catch (e) {
          if (!cancelled) setError(e instanceof Error ? e.message : 'Could not access the camera.')
        }
      } finally {
        if (!cancelled) setStarting(false)
      }
    }

    void start()

    return () => {
      cancelled = true
      setStreamReady(false)
      stopStream(streamRef.current)
      streamRef.current = null
      const v = videoRef.current
      if (v) v.srcObject = null
    }
  }, [open, attachStream])

  const handleClose = () => {
    setStreamReady(false)
    stopStream(streamRef.current)
    streamRef.current = null
    const v = videoRef.current
    if (v) v.srcObject = null
    onClose()
  }

  const capture = () => {
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream || video.readyState < 2) return

    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) return

    const capturedAtISO = new Date().toISOString()

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, w, h)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `site_${Date.now()}.jpg`, { type: 'image/jpeg' })
        setStreamReady(false)
        stopStream(streamRef.current)
        streamRef.current = null
        if (video) video.srcObject = null
        onCapture(file, { capturedAtISO, source: 'live_camera' })
        onClose()
      },
      'image/jpeg',
      0.92,
    )
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Live camera"
      onClick={handleClose}
    >
      <div
        className="flex w-full max-w-lg flex-col gap-4 rounded-[var(--radius-2xl)] bg-[color:var(--color-card)] p-4 shadow-xl ring-1 ring-[color:var(--color-border)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--color-text)]">
            <Camera className="size-4 text-[color:var(--color-primary_dark)]" />
            Live camera
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-[color:var(--color-text_secondary)] hover:bg-[color:var(--color-bg)]"
            onClick={handleClose}
            aria-label="Close camera"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="relative aspect-video w-full overflow-hidden rounded-[var(--radius-xl)] bg-black ring-1 ring-[color:var(--color-border)]">
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
          {starting ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-medium text-white">
              Starting camera…
            </div>
          ) : null}
        </div>

        {error ? <p className="text-sm text-[color:var(--color-error)]">{error}</p> : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" disabled={Boolean(error) || starting || !streamReady} onClick={capture}>
            Capture photo
          </Button>
        </div>
        <p className="text-xs text-[color:var(--color-text_muted)]">
          Allow camera access when prompted. Capture time is saved with the photo for attendance records.
        </p>
      </div>
    </div>
  )
}
