import { SendHorizontal, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Loader } from '@/components/ui/Loader'
import type { ChatMessage } from '@/types/dashboard.types'
import { cn } from '@/utils/cn'

function TypewriterLine({ text, onDone }: { text: string; onDone: () => void }) {
  const [shown, setShown] = useState('')

  useEffect(() => {
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setShown(text.slice(0, i))
      if (i >= text.length) {
        window.clearInterval(id)
        onDone()
      }
    }, 12)
    return () => window.clearInterval(id)
  }, [text, onDone])

  return <span>{shown}</span>
}

function AssistantBubble({
  content,
  sources,
  animate,
}: {
  content: string
  sources?: ChatMessage['sources']
  animate: boolean
}) {
  const [done, setDone] = useState(!animate)

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <Sparkles className="size-3.5 text-phase-structure" />
        Sanrachna Copilot
      </div>
      <div className="mt-2 text-sm leading-relaxed text-slate-800">
        {animate && !done ? (
          <TypewriterLine text={content} onDone={() => setDone(true)} />
        ) : (
          <span className="whitespace-pre-wrap">{content}</span>
        )}
      </div>
      {sources?.length && (done || !animate) ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sources</p>
          <ul className="mt-2 space-y-2">
            {sources.map((s) => (
              <li key={s.label} className="text-xs leading-relaxed text-slate-700">
                <span className="font-semibold text-slate-900">{s.label}</span>
                <span className="text-slate-400"> · </span>
                {s.doc}
                {s.clause ? (
                  <>
                    <span className="block font-mono text-[11px] text-slate-500">{s.clause}</span>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export function ChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  const send = async () => {
    const trimmed = input.trim()
    if (!trimmed || busy) return
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: trimmed,
    }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setBusy(true)

    window.setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content:
          'Pulling the flooring envelope from your stored estimate for Tower A: the model allocates ₹3.07 Cr across vitrified tiling, waterproofing, and slopes to drain — excluding loose furniture.\n\nIf you want millimetre-level variance, I can break this down by level or compare against CPWD finishing schedules for Maharashtra.',
        sources: [
          {
            label: 'CPWD DSR 2023',
            doc: 'Finishing works — flooring & dado (institutional uplift factors)',
            clause: 'Section 13 — item cluster FL-VT-01',
          },
          {
            label: 'Project snapshot',
            doc: 'Sanrachna plan JSON — finishing_inr allocation',
            clause: 'Field: cost_breakdown.finishing_inr',
          },
        ],
      }
      setMessages((m) => [...m, assistantMsg])
      setBusy(false)
    }, 650)
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI copilot</h1>
        <p className="mt-1 text-sm text-muted">
          Project-aware Q&A with explicit source citations — connect your copilot stream when the backend is ready.
        </p>
      </div>

      <Card className="flex h-[min(72vh,720px)] flex-col overflow-hidden shadow-card">
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Workspace copilot</p>
              <p className="text-xs text-muted">Responses require a configured assistant API</p>
            </div>
            <Badge variant="muted">Offline</Badge>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/80 px-4 py-4">
          {messages.map((m, idx) =>
            m.role === 'user' ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-sm">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex justify-start">
                <div className="max-w-[92%]">
                  <AssistantBubble
                    content={m.content}
                    sources={m.sources}
                    animate={idx === messages.length - 1 && !busy}
                  />
                </div>
              </div>
            ),
          )}
          {busy ? (
            <div className="flex items-center gap-2 text-xs text-muted">
              <Loader className="size-4" />
              Retrieving benchmark chunks…
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        <div className="border-t border-slate-100 bg-white p-3">
          <div className="flex gap-2">
            <input
              className={cn(
                'flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60',
              )}
              placeholder="Ask about rates, delays, RFIs, or forecast…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
            />
            <Button type="button" onClick={() => void send()} disabled={busy || !input.trim()}>
              <SendHorizontal className="size-4" />
              Send
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
