import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'

import { useProjectsStore } from '@/store/useProjectsStore'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

export function EmergencyAlertButton() {
  const projectName = useProjectsStore((s) => {
    const id = s.currentProjectId
    return id ? s.projects[id]?.name : null
  })
  const label = projectName ?? 'the active project'

  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSend = () => {
    setSent(true)
    window.setTimeout(() => {
      setSent(false)
      setOpen(false)
    }, 1200)
  }

  return (
    <>
      <Button
        type="button"
        variant="danger"
        className="fixed bottom-6 right-6 z-40 h-12 gap-2 rounded-2xl px-5 shadow-lg shadow-red-600/25 hover:shadow-red-600/35"
        onClick={() => setOpen(true)}
      >
        <AlertTriangle className="size-5" />
        Emergency Alert
      </Button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Broadcast emergency alert"
        description={`Notify stakeholders for ${label}. Connect your notification service to send real alerts.`}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleSend} disabled={sent}>
              {sent ? 'Sent' : 'Send alert'}
            </Button>
          </>
        }
      >
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-medium text-slate-900">Pre-filled message</p>
          <p className="mt-2 font-mono text-xs leading-5 text-slate-600">EMERGENCY — immediate attention required at {label}</p>
        </div>
      </Modal>
    </>
  )
}
