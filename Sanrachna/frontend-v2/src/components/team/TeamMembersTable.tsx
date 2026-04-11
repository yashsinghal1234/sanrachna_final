import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { apiRemoveTeamMember, apiUpdateTeamMemberRole, messageFromApiError } from '@/api/projectTeamApi'
import type { TeamMemberRow } from '@/store/useTeamProjectStore'

type Viewer = 'owner' | 'engineer'

type Props = {
  viewer: Viewer
  projectId: string | null
  members: TeamMemberRow[]
  onRefresh: () => void | Promise<void>
  onToast: (msg: string) => void
}

export function TeamMembersTable({ viewer, projectId, members, onRefresh, onToast }: Props) {
  const [reassignFor, setReassignFor] = useState<TeamMemberRow | null>(null)
  const [nextRole, setNextRole] = useState<'engineer' | 'worker'>('engineer')
  const [editFor, setEditFor] = useState<TeamMemberRow | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const canRemove = (m: TeamMemberRow) => {
    if (m.role === 'owner') return false
    if (viewer === 'owner') return true
    if (viewer === 'engineer') return m.role === 'worker'
    return false
  }

  const canReassign = (m: TeamMemberRow) => {
    if (!projectId) return false
    if (viewer !== 'owner') return false
    if (m.role === 'owner') return false
    return true
  }

  const onRemove = async (m: TeamMemberRow) => {
    if (!projectId) {
      onToast('Select a project first, then try removing again.')
      return
    }
    if (!canRemove(m)) return
    if (!window.confirm(`Remove ${m.name} from this project?`)) return
    setBusyId(m.id)
    try {
      await apiRemoveTeamMember(projectId, m.id)
      await onRefresh()
      onToast('Member removed.')
    } catch (e) {
      onToast(messageFromApiError(e))
    } finally {
      setBusyId(null)
    }
  }

  const confirmReassign = async () => {
    if (!projectId || !reassignFor) return
    setBusyId(reassignFor.id)
    try {
      await apiUpdateTeamMemberRole(projectId, reassignFor.id, { role: nextRole })
      await onRefresh()
      onToast('Role updated.')
      setReassignFor(null)
    } catch (e) {
      onToast(messageFromApiError(e))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-[color:var(--color-bg)] text-xs font-semibold text-[color:var(--color-text_secondary)]">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--color-border)]">
          {members.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-10 text-center text-sm text-[color:var(--color-text_secondary)]">
                No members yet for this project.
              </td>
            </tr>
          ) : null}
          {members.map((m) => (
            <tr key={m.id} className="hover:bg-[color:var(--color-surface_hover)]/80">
              <td className="px-4 py-3 font-semibold">{m.name}</td>
              <td className="px-4 py-3 text-[color:var(--color-text_secondary)]">{m.role}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center rounded-full bg-[color:var(--color-success)]/10 px-2 py-1 text-[11px] font-semibold text-[color:var(--color-success)]">
                  {m.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => setEditFor(m)}>
                    Edit Member
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!canRemove(m) || busyId === m.id}
                    onClick={() => void onRemove(m)}
                  >
                    Remove
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!canReassign(m) || busyId === m.id}
                    onClick={() => {
                      setNextRole(m.role === 'worker' ? 'engineer' : 'worker')
                      setReassignFor(m)
                    }}
                  >
                    Reassign Role
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal
        open={Boolean(editFor)}
        onOpenChange={(o) => !o && setEditFor(null)}
        title="Member details"
        description="Directory snapshot (profile editing is handled in Profile settings)."
        footer={
          <Button type="button" onClick={() => setEditFor(null)}>
            Close
          </Button>
        }
      >
        {editFor ? (
          <div className="space-y-2 text-sm text-[color:var(--color-text_secondary)]">
            <div>
              <span className="font-semibold text-[color:var(--color-text)]">Name:</span> {editFor.name}
            </div>
            <div>
              <span className="font-semibold text-[color:var(--color-text)]">Role:</span> {editFor.role}
            </div>
            <div>
              <span className="font-semibold text-[color:var(--color-text)]">Status:</span> {editFor.status}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(reassignFor)}
        onOpenChange={(o) => !o && setReassignFor(null)}
        title="Reassign role"
        description={
          reassignFor
            ? `Choose a new app role for ${reassignFor.name}. This updates their login role (demo behaviour).`
            : undefined
        }
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setReassignFor(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={busyId !== null} onClick={() => void confirmReassign()}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="reassignRole">
            Role
          </label>
          <select
            id="reassignRole"
            value={nextRole}
            onChange={(e) => setNextRole(e.target.value as 'engineer' | 'worker')}
            className="h-10 w-full rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 text-sm"
          >
            <option value="engineer">Engineer</option>
            <option value="worker">Worker</option>
          </select>
        </div>
      </Modal>
    </div>
  )
}
