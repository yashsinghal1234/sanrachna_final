import { ArrowRight, Brain, Clock3, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ContributorsStack } from '@/components/marketing/ContributorsStack'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'

const gradient =
  'bg-[linear-gradient(135deg,#2FBFAD_0%,#6EDBD0_45%,#3B82F6_100%)]'

export function LandingPage() {
  const highlights = [
    {
      title: 'AI Cost Estimation',
      description: 'Grounded estimates using CPWD DSR + RSMeans with source-backed confidence.',
    },
    {
      title: 'Smart Timeline',
      description: 'Auto-generated task dependencies and delay forecasting with recovery suggestions.',
    },
    {
      title: 'Daily Site Intelligence',
      description: 'Logs, photos, RFIs, and issue workflows tracked in one operational view.',
    },
  ]

  return (
    <div className="bg-[color:var(--color-bg)]">
      <header className="sticky top-0 z-20 border-b border-[color:var(--color-border)] bg-[color:var(--color-header_scrim)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className={`size-9 rounded-[var(--radius-xl)] ${gradient}`}
              aria-hidden
            />
            <div>
              <div className="text-sm font-bold tracking-tight">Sanrachna</div>
              <div className="text-xs text-[color:var(--color-text_secondary)]">
                Construction Intelligence
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Link to="/login">
              <Button variant="secondary">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button>
                Request demo
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 py-1 text-xs font-semibold text-[color:var(--color-text_secondary)] shadow-sm">
                <Sparkles className="size-4 text-[color:var(--color-primary)]" />
                AI-powered construction management
              </div>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-[color:var(--color-text)] md:text-5xl">
                The AI Brain for Construction Projects
              </h1>
              <p className="mt-4 text-base leading-relaxed text-[color:var(--color-text_secondary)]">
                Turn 2-3 days of manual planning into under 60 seconds. Sanrachna helps teams estimate costs, generate
                timelines, track execution, and make safer on-site decisions with data.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/signup">
                  <Button size="lg">Request Demo</Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline">
                    Explore Platform
                  </Button>
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-semibold">Speed</div>
                    <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">
                      Planning in minutes instead of days
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-semibold">Accuracy</div>
                    <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">
                      Targeting up to +-8% estimation precision
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-semibold">Control</div>
                    <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">
                      Role-based workflows and timely alerts
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-[28px] bg-[color:var(--color-primary_light)]/30 blur-2xl" />
              <div className="relative rounded-[28px] bg-[color:var(--color-card)] p-6 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--color-border)]">
                <div className="text-sm font-semibold">Core platform outcomes</div>
                <div className="mt-4 grid gap-3">
                  {highlights.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-4 py-3 text-sm text-[color:var(--color-text_secondary)]"
                    >
                      <div className="font-semibold text-[color:var(--color-text)]">{item.title}</div>
                      <div className="mt-1">{item.description}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 grid gap-3 rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] p-4 text-sm">
                  <div className="inline-flex items-center gap-2 font-semibold">
                    <Brain className="size-4 text-[color:var(--color-primary_dark)]" />
                    RAG-powered answers
                  </div>
                  <div className="inline-flex items-center gap-2 font-semibold">
                    <Clock3 className="size-4 text-[color:var(--color-info)]" />
                    <span>60-second planning workflow</span>
                  </div>
                  <div className="inline-flex items-center gap-2 font-semibold">
                    <ShieldCheck className="size-4 text-[color:var(--color-success)]" />
                    <span>Built for owners, engineers, and workers</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-6">
          <Card className="overflow-hidden">
            <CardContent className="grid gap-4 p-6 md:grid-cols-3">
              {[
                { value: '68%', label: 'Projects go over budget' },
                { value: '2-3 days', label: 'Manual planning time today' },
                { value: '< 60 sec', label: 'Sanrachna planning target' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] p-4">
                  <div className="text-2xl font-bold tracking-tight text-[color:var(--color-text)]">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-sm text-[color:var(--color-text_secondary)]">{stat.label}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-8">
          <Card className="overflow-hidden border-[color:var(--color-border)] bg-[color:var(--color-card)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--color-primary)]/10">
            <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <h2 className="text-xl font-bold tracking-tight text-[color:var(--color-text)]">Contributors</h2>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-text_secondary)]">
                  A cross-functional crew shipping estimation, planning, and site workflows — faces stack on purpose;
                  hover to read each name.
                </p>
              </div>
              <ContributorsStack variant="dark" className="md:pl-4" />
            </CardContent>
          </Card>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Everything you need in one platform</h2>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              'Instant cost estimation',
              'Auto-generated Gantt timeline',
              'AI copilot with source citation',
              'Daily logs with photo proof',
              'RFI and issue escalation workflow',
              'Emergency alerts and role dashboards',
            ].map((item) => (
              <Card key={item}>
                <CardContent className="p-4">
                  <div className="text-sm font-semibold">{item}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-bold tracking-tight">How Sanrachna works</h3>
              <div className="mt-5 grid gap-3 md:grid-cols-5">
                {[
                  '1. Enter project details',
                  '2. Retrieve benchmark context',
                  '3. AI generates cost + plan',
                  '4. Dashboard visualizes outputs',
                  '5. Track logs and alerts daily',
                ].map((step) => (
                  <div
                    key={step}
                    className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 text-sm text-[color:var(--color-text_secondary)]"
                  >
                    {step}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-10">
          <div className="rounded-[28px] bg-[linear-gradient(135deg,#1FA393_0%,#2FBFAD_45%,#3B82F6_100%)] p-8 text-white shadow-[var(--shadow-card)]">
            <h3 className="text-2xl font-bold tracking-tight">Ready to modernize your project planning?</h3>
            <p className="mt-2 max-w-2xl text-sm text-white/90">
              Start with a demo flow and see how cost estimation, planning, and site execution connect in one AI-powered workspace.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/signup">
                <Button variant="secondary" size="lg">
                  Start demo account
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" className="border border-white/30 bg-white/15 text-white hover:bg-white/20">
                  Go to login
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[color:var(--color-border)] bg-[linear-gradient(180deg,var(--color-card)_0%,var(--color-bg)_100%)]">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 md:grid-cols-[1.1fr_auto] md:px-5">
          <div>
            <div className="inline-flex items-center gap-3">
              <div className={`size-10 rounded-[var(--radius-xl)] ${gradient}`} aria-hidden />
              <div>
                <div className="text-sm font-bold tracking-tight text-[color:var(--color-text)]">Sanrachna</div>
                <div className="text-xs text-[color:var(--color-text_secondary)]">
                  The AI Brain for Construction Projects
                </div>
              </div>
            </div>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-[color:var(--color-text_secondary)]">
              Built for engineers and Indian construction SMEs to estimate faster, plan smarter, and execute with full project visibility.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {['RAG Grounded', 'Auto Planning', 'Daily Site Logs', 'Role-Based Control'].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface_muted)] px-3 py-1 font-semibold text-[color:var(--color-text_secondary)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="w-fit rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-3 shadow-[var(--shadow-soft)] md:justify-self-end">
            <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text_muted)]">
              Product
            </div>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-[color:var(--color-text_secondary)]">
              Team and access are managed inside your workspace after sign-in.
            </p>
            <div className="mt-3 text-xs text-[color:var(--color-text_muted)]">
              © {new Date().getFullYear()} Sanrachna
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

