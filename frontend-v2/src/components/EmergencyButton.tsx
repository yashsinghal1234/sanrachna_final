import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { canSendEmergency } from '@/auth/rbac'
import { useEmergency } from '@/emergency/EmergencyContext'
import { Button } from '@/components/ui/Button'

export function EmergencyButton() {
  const { role } = useAuth()
  const { activeBanner } = useEmergency()
  
  if (!canSendEmergency(role)) return null
  if (!activeBanner) return null

  return (
    <Link to="/app/emergency" className="fixed bottom-6 right-6 z-50">
      <Button
        type="button"
        variant="danger"
        size="lg"
        className="rounded-[var(--radius-2xl)] shadow-[var(--shadow-soft)]"
      >
        <AlertTriangle className="size-5" />
        Emergency
      </Button>
    </Link>
  )
}

