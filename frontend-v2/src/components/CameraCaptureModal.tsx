import { useEffect, useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface CameraCaptureModalProps {
  onCapture: (dataUrl: string) => void
  onClose: () => void
}

export function CameraCaptureModal({ onCapture, onClose }: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activeStream: MediaStream | null = null

    async function initCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        activeStream = mediaStream
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          // Ignore interruption errors if the component unmounts before play resolves
          await videoRef.current.play().catch(e => {
            if (e.name !== 'AbortError' && !e.message.includes('interrupted')) {
              throw e
            }
          })
        }
      } catch (err: any) {
        setError(err.message || 'Could not access the camera. Please ensure permissions are granted.')
      }
    }

    void initCamera()

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const handleCapture = () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      onCapture(dataUrl)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-[color:var(--color-text_secondary)] hover:bg-[color:var(--color-bg_hover)] hover:text-[color:var(--color-text)]"
        >
          <X className="size-5" />
        </button>

        <h2 className="mb-4 text-xl font-bold">Take Photo</h2>

        {error ? (
          <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-error)]/10 p-4 text-sm text-[color:var(--color-error)]">
            {error}
          </div>
        ) : (
          <div className="relative aspect-video w-full overflow-hidden rounded-[var(--radius-xl)] bg-black">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
            />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {!error && (
            <Button variant="primary" onClick={handleCapture} className="gap-2">
              <Camera className="size-4" />
              Capture
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
