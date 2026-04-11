import { Crown, HardHat, Wrench } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useAuth, type Role } from '@/auth/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'

const roles: { role: Role; title: string; desc: string; icon: typeof Crown }[] = [
  {
    role: 'owner',
    title: 'Owner',
    desc: 'Insights, budgets, forecasts — view-only controls for leadership.',
    icon: Crown,
  },
  {
    role: 'engineer',
    title: 'Engineer',
    desc: 'Execution cockpit — scheduling, logs, RFI, issues, AI copilot.',
    icon: HardHat,
  },
  {
    role: 'worker',
    title: 'Worker',
    desc: 'Task-first — submit logs, report issues, emergency access.',
    icon: Wrench,
  },
]

export function RoleSelectionPage() {
  const { user, setRole } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--color-bg)] p-6">
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Select your role</h1>
          <p className="mt-2 text-sm text-[color:var(--color-text_secondary)]">
            This controls what you can see and do in Sanrachna. You can switch roles by logging in again.
          </p>
          {user ? (
            <p className="mt-2 text-xs text-[color:var(--color-text_muted)]">
              Signed in as <span className="font-semibold">{user.emailOrPhone}</span>
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {roles.map((r) => (
            <Card key={r.role} className="transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-[var(--radius-xl)] bg-[color:var(--color-primary_light)]/25 text-[color:var(--color-primary_dark)]">
                    <r.icon className="size-5" />
                  </div>
                  <div>
                    <CardTitle>{r.title}</CardTitle>
                    <CardDescription>{r.desc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => {
                    setRole(r.role)
                    navigate('/app', { replace: true })
                  }}
                >
                  Continue as {r.title}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

