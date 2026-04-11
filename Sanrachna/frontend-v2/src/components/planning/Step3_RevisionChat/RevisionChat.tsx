import { Loader2, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'

import { revisePlanningReport } from '@/api/planningApi'
import { savePlanningToProject } from '@/planning/syncPlanningProject'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { usePlanningStore } from '@/store/usePlanningStore'
import { useProjectsStore } from '@/store/useProjectsStore'
import { cn } from '@/utils/cn'

const QUICK_PROMPTS = [
  'Reduce total budget by 10%',
  'Prioritise speed over cost',
  'Use premium finishes throughout',
  'Avoid renting any equipment',
  'Add basement parking to the plan',
  'Reduce total workforce count',
  'Add 2 more floors to the plan',
  'Increase contingency buffer to 15%',
  'Suggest cheaper material alternatives',
  'What are the top 3 risk mitigations?',
]

export function RevisionChat() {
  const formData = usePlanningStore((s) => s.formData)
  const report = usePlanningStore((s) => s.currentReport)
  const chatHistory = usePlanningStore((s) => s.chatHistory)
  const addMessage = usePlanningStore((s) => s.addMessage)
  const setReport = usePlanningStore((s) => s.setReport)
  const setRevisionLoading = usePlanningStore((s) => s.setRevisionLoading)
  const revisionLoading = usePlanningStore((s) => s.revisionLoading)
  const setToast = usePlanningStore((s) => s.setToast)
  const setStep = usePlanningStore((s) => s.setStep)
  const approvePlan = usePlanningStore((s) => s.approvePlan)
  const pendingRevisionPrompt = usePlanningStore((s) => s.pendingRevisionPrompt)
  const setPendingRevisionPrompt = usePlanningStore((s) => s.setPendingRevisionPrompt)

  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (pendingRevisionPrompt) {
      setInput(pendingRevisionPrompt)
      setPendingRevisionPrompt(null)
    }
  }, [pendingRevisionPrompt, setPendingRevisionPrompt])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, revisionLoading])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || !report || revisionLoading) return

    const userMsg = { role: 'user' as const, content: trimmed }
    addMessage(userMsg)
    setInput('')
    setRevisionLoading(true)
    try {
      const hist = [...usePlanningStore.getState().chatHistory]
      const next = await revisePlanningReport({
        form: formData,
        report,
        chatHistory: hist,
        newMessage: trimmed,
      })
      setReport(next)
      addMessage({
        role: 'assistant',
        content: `**Plan updated.**\n\n${next.revisionSummary ?? 'The structured report has been refreshed.'}`,
      })
      const pid = useProjectsStore.getState().currentProjectId
      if (pid) savePlanningToProject(pid)
      setToast('Report updated')
      window.setTimeout(() => setToast(null), 2400)
    } catch (e) {
      addMessage({
        role: 'assistant',
        content: `Could not apply changes: ${e instanceof Error ? e.message : 'Unknown error'}. Try again.`,
      })
    } finally {
      setRevisionLoading(false)
    }
  }

  if (!report) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-[color:var(--color-text_secondary)]">
          Generate a plan first (Step 1 → Step 2).
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 pb-24">
      <Card>
        <CardHeader>
          <CardTitle>Revise with AI</CardTitle>
          <CardDescription>Iterate on the structured plan; each reply refreshes the report JSON from your planning API.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 py-1.5 text-left text-[11px] font-semibold text-[color:var(--color-text_secondary)] transition hover:border-[color:var(--color-primary)]/35 hover:text-[color:var(--color-text)]"
                onClick={() => send(p)}
                disabled={revisionLoading}
              >
                {p}
              </button>
            ))}
          </div>

          <div
            className="max-h-[400px] min-h-[260px] space-y-3 overflow-y-auto rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3"
            role="log"
            aria-live="polite"
          >
            {chatHistory.length === 0 && !revisionLoading ? (
              <p className="py-8 text-center text-sm text-[color:var(--color-text_muted)]">
                Ask for changes, or tap a quick prompt above.
              </p>
            ) : null}
            {chatHistory.map((m, i) => (
              <div
                key={`${i}-${m.role}`}
                className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[90%] rounded-[var(--radius-xl)] px-3 py-2 text-sm shadow-sm ring-1',
                    m.role === 'user'
                      ? 'bg-[color:var(--color-primary)]/14 text-[color:var(--color-text)] ring-[color:var(--color-primary)]/25'
                      : 'bg-[color:var(--color-card)] text-[color:var(--color-text)] ring-[color:var(--color-border)]',
                  )}
                >
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--color-text_muted)]">
                    {m.role === 'user' ? 'Engineer' : 'Sanrachna AI'}
                  </div>
                  {m.role === 'assistant' ? (
                    <div className="max-w-none text-[13px] leading-relaxed text-[color:var(--color-text)] [&_p]:my-1 [&_ul]:my-1 [&_strong]:font-semibold">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              </div>
            ))}
            {revisionLoading ? (
              <div className="flex justify-start">
                <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-card)] px-3 py-2 text-sm ring-1 ring-[color:var(--color-border)]">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--color-text_muted)]">
                    Sanrachna AI
                  </span>
                  <div className="mt-2 flex gap-1">
                    <span className="size-1.5 animate-bounce rounded-full bg-[color:var(--color-text_muted)] [animation-delay:0ms]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-[color:var(--color-text_muted)] [animation-delay:150ms]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-[color:var(--color-text_muted)] [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
          >
            <Input
              className="min-w-[200px] flex-1"
              placeholder="Describe the change you want…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={revisionLoading}
            />
            <Button type="submit" disabled={revisionLoading || !input.trim()}>
              {revisionLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Send
            </Button>
          </form>

          <div className="flex flex-wrap gap-2 border-t border-[color:var(--color-border)] pt-3">
            <Button type="button" variant="secondary" onClick={() => setStep(2)}>
              Back to report
            </Button>
            <Button
              type="button"
              className="bg-[color:var(--color-success)] text-white hover:brightness-95"
              onClick={() => {
                const pid = useProjectsStore.getState().currentProjectId
                const r = usePlanningStore.getState().currentReport
                const f = usePlanningStore.getState().formData
                if (pid && r) {
                  useProjectsStore.getState().recordApproval(pid, f, r)
                }
                approvePlan()
                setStep(4)
                if (pid) savePlanningToProject(pid)
              }}
            >
              Approve revised plan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
