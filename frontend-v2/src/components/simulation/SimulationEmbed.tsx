import { OwnerSimulationCards } from '@/components/simulation/OwnerSimulationCards'
import { EngineerSimulationWorkspace } from '@/components/simulation/EngineerSimulationWorkspace'
import { useAuth } from '@/auth/AuthContext'

export function SimulationEmbed({
  context,
}: {
  context: 'project-insights' | 'project-intelligence'
}) {
  const { role } = useAuth()
  if (role === 'worker') return null

  // `context` reserved for future fine-tuning of module-specific copy/layout.
  void context

  return role === 'owner' ? <OwnerSimulationCards /> : <EngineerSimulationWorkspace />
}

