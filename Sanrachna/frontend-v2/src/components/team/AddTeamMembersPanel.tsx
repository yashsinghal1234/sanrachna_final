import { ClipboardCheck, Search, UserCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import type { Role } from '@/auth/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  apiAddTeamMember,
  apiSearchUsers,
  messageFromApiError,
  type ProjectListItem,
  type UserSearchDto,
} from '@/api/projectTeamApi'

type Props = {
  /** Role of users returned by search (owner adds engineers, engineer adds workers). */
  targetAddRole: Extract<Role, 'engineer' | 'worker'>
  projectChoices: ProjectListItem[]
  projectId: string | null
  onProjectIdChange: (id: string | null) => void
  /** User ids already on the selected project (owner + members). Same person can still be added on other projects. */
  memberIdsOnProject?: string[]
  /** Called after a successful add so parent can refresh team + global store. */
  onAdded: () => void | Promise<void>
  onToast: (msg: string) => void
  disabled?: boolean
}

export function AddTeamMembersPanel({
  targetAddRole,
  projectChoices,
  projectId,
  onProjectIdChange,
  memberIdsOnProject = [],
  onAdded,
  onToast,
  disabled,
}: Props) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<UserSearchDto[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)

  const hasValidProjectSelection = Boolean(projectId && projectChoices.some((p) => p.id === projectId))
  const onProjectSet = useMemo(() => new Set(memberIdsOnProject), [memberIdsOnProject])

  useEffect(() => {
    let cancelled = false
    async function searchNow() {
      if (!hasValidProjectSelection) {
        setResults([])
        return
      }
      const query = q.trim()
      if (query.length < 2) {
        setResults([])
        return
      }
      setLoading(true)
      try {
        const { users } = await apiSearchUsers({ q: query, role: targetAddRole })
        if (cancelled) return
        setResults(users)
      } catch (e) {
        if (!cancelled) onToast(messageFromApiError(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    const id = window.setTimeout(() => void searchNow(), 250)
    return () => {
      cancelled = true
      window.clearTimeout(id)
    }
  }, [q, targetAddRole, hasValidProjectSelection, onToast])

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_320px] md:items-start">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="teamUserSearch">
          Search users (by username)
        </label>
        <div className="relative mt-1.5">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text_muted)]">
            <Search className="size-4" />
          </span>
          <Input
            id="teamUserSearch"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
            placeholder={`Search ${targetAddRole}s (min 2 chars)`}
            disabled={disabled || !hasValidProjectSelection}
          />
        </div>
        <div className="mt-1 text-xs text-[color:var(--color-text_muted)]">
          Allowed: {targetAddRole === 'engineer' ? 'Owner → Engineer' : 'Engineer → Worker'}
        </div>
        {!hasValidProjectSelection ? (
          <div className="text-xs text-[color:var(--color-warning)]">Select a valid project first.</div>
        ) : null}

        {hasValidProjectSelection && q.trim().length >= 2 ? (
          <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-[color:var(--color-text_muted)]">Results</div>
              {loading ? <div className="text-xs text-[color:var(--color-text_muted)]">Searching…</div> : null}
            </div>
            {!loading && results.length === 0 ? (
              <div className="mt-2 text-sm text-[color:var(--color-text_secondary)]">No matches found.</div>
            ) : null}
            {!loading && results.length ? (
              <div className="mt-2 max-h-56 space-y-2 overflow-auto pr-1">
                {results.map((u) => {
                  const alreadyHere = onProjectSet.has(u.id)
                  return (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-2 rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-semibold">{u.name}</div>
                          {alreadyHere ? (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[color:var(--color-primary)]/35 bg-[color:var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--color-primary_dark)] dark:text-[color:var(--color-primary_light)]">
                              <UserCheck className="size-3" />
                              On this project
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-[color:var(--color-text_muted)]">{u.role}</div>
                      </div>
                      <Button
                        size="sm"
                        variant={alreadyHere ? 'secondary' : 'primary'}
                        disabled={
                          disabled || !hasValidProjectSelection || !projectId || adding === u.id || alreadyHere
                        }
                        title={
                          alreadyHere
                            ? 'Already on this project. Pick another project to add them there.'
                            : undefined
                        }
                        onClick={async () => {
                          if (!projectId || !hasValidProjectSelection) {
                            onToast('Select a project first.')
                            return
                          }
                          if (alreadyHere) return
                          setAdding(u.id)
                          try {
                            await apiAddTeamMember(projectId, { username: u.name })
                            await onAdded()
                            onToast('Member added to project.')
                          } catch (err) {
                            onToast(messageFromApiError(err))
                          } finally {
                            setAdding(null)
                          }
                        }}
                      >
                        <ClipboardCheck className="size-4" />
                        {alreadyHere ? 'Added' : adding === u.id ? 'Adding…' : 'Add'}
                      </Button>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-xs text-[color:var(--color-text_muted)]">Tip: type at least 2 characters to search.</div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="teamProjSelect">
          Project
        </label>
        <select
          id="teamProjSelect"
          className="mt-1.5 w-full rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 py-2 text-sm"
          value={projectId ?? ''}
          disabled={disabled}
          onChange={(e) => onProjectIdChange(e.target.value || null)}
        >
          <option value="" disabled>
            {projectChoices.length ? 'Select project' : 'No projects'}
          </option>
          {projectChoices.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {!projectChoices.length ? (
          <div className="mt-2 text-xs text-[color:var(--color-text_muted)]">No projects available yet.</div>
        ) : null}
      </div>
    </div>
  )
}
