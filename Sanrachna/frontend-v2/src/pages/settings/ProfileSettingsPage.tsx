import { ShieldCheck, User } from 'lucide-react'
import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'

import { useAuth, type Role } from '@/auth/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { cn } from '@/utils/cn'

type ProfileForm = {
  fullName: string
  email: string
  phone: string
  departmentCrew: string
  employeeId: string
  companyName: string
  businessAddress: string
  specialization: string
  assignedProjects: string
  crewType: string
  supervisorName: string
}

export function ProfileSettingsPage() {
  const { role, user } = useAuth()
  const resolvedRole: Role = role ?? 'engineer'

  const initial = useMemo<ProfileForm>(
    () => ({
      fullName: user?.name ?? 'Demo User',
      email: user?.emailOrPhone ?? 'demo@company.com',
      phone: '+91 98XXX XXXXX',
      departmentCrew: resolvedRole === 'owner' ? 'Leadership' : resolvedRole === 'engineer' ? 'Engineering' : 'Field Crew',
      employeeId: resolvedRole === 'worker' ? 'EMP-041' : '',
      companyName: 'Sanrachna Construction Intelligence',
      businessAddress: 'Pune, Maharashtra',
      specialization: 'Structural Planning',
      assignedProjects: 'Sunrise Residency — Tower A',
      crewType: 'Masons',
      supervisorName: 'Arjun Singh (Site Supervisor)',
    }),
    [resolvedRole, user],
  )

  const [form, setForm] = useState(initial)
  const [draft, setDraft] = useState(initial)
  const [editing, setEditing] = useState(false)

  const cancel = () => {
    setDraft(form)
    setEditing(false)
  }

  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.fullName.trim() || !draft.email.trim() || !draft.phone.trim() || !draft.departmentCrew.trim()) return
    if (extraOwner && (!draft.companyName.trim() || !draft.businessAddress.trim())) return
    if (extraEngineer && (!draft.specialization.trim() || !draft.assignedProjects.trim())) return
    if (extraWorker && (!draft.crewType.trim() || !draft.supervisorName.trim())) return
    setForm(draft)
    setEditing(false)
  }

  const extraOwner = resolvedRole === 'owner'
  const extraEngineer = resolvedRole === 'engineer'
  const extraWorker = resolvedRole === 'worker'

  const fieldDisabled = !editing

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-4 text-[color:var(--color-primary_dark)]" />
            Profile
          </CardTitle>
          <CardDescription>Manage your personal info. Demo-only — values are local to the page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={save}>
          <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-[var(--radius-xl)] bg-[color:var(--color-primary_light)]/25 text-[color:var(--color-primary_dark)]">
                  <User className="size-5" />
                </div>
                <div>
                  <div className="text-base font-bold">{form.fullName}</div>
                  <div className="mt-1 inline-flex items-center gap-2 text-xs font-semibold text-[color:var(--color-text_secondary)]">
                    <ShieldCheck className="size-4 text-[color:var(--color-success)]" />
                    {resolvedRole.toUpperCase()}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[color:var(--color-text_muted)]">Member since</div>
                <div className="text-sm font-semibold">{resolvedRole === 'owner' ? 'Jan 2025' : resolvedRole === 'engineer' ? 'Mar 2025' : 'Oct 2025'}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="text-sm font-medium" htmlFor="fullName">
                Full Name <span className="text-[color:var(--color-error)]">*</span>
              </label>
              <Input
                id="fullName"
                value={draft.fullName}
                disabled={fieldDisabled}
                onChange={(e) => setDraft((p) => ({ ...p, fullName: e.target.value }))}
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium" htmlFor="email">
                Email <span className="text-[color:var(--color-error)]">*</span>
              </label>
              <Input
                id="email"
                type="email"
                value={draft.email}
                disabled={fieldDisabled}
                onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium" htmlFor="phone">
                Phone <span className="text-[color:var(--color-error)]">*</span>
              </label>
              <Input
                id="phone"
                value={draft.phone}
                disabled={fieldDisabled}
                onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))}
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium" htmlFor="departmentCrew">
                Department / Crew <span className="text-[color:var(--color-error)]">*</span>
              </label>
              <Input
                id="departmentCrew"
                value={draft.departmentCrew}
                disabled={fieldDisabled}
                onChange={(e) => setDraft((p) => ({ ...p, departmentCrew: e.target.value }))}
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium" htmlFor="employeeId">
                Employee ID (optional)
              </label>
              <Input
                id="employeeId"
                value={draft.employeeId}
                disabled={fieldDisabled}
                onChange={(e) => setDraft((p) => ({ ...p, employeeId: e.target.value }))}
                className="mt-1.5"
              />
            </div>
          </div>

          {(extraOwner || extraEngineer || extraWorker) ? (
            <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-4">
              <div className="text-sm font-bold">Tier details</div>
              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                {extraOwner ? (
                  <>
                    <div>
                      <label className="text-sm font-medium" htmlFor="companyName">
                        Company Name <span className="text-[color:var(--color-error)]">*</span>
                      </label>
                      <Input
                        id="companyName"
                        value={draft.companyName}
                        disabled={fieldDisabled}
                        onChange={(e) => setDraft((p) => ({ ...p, companyName: e.target.value }))}
                        className="mt-1.5"
                        required={extraOwner}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium" htmlFor="businessAddress">
                        Business Address <span className="text-[color:var(--color-error)]">*</span>
                      </label>
                      <Input
                        id="businessAddress"
                        value={draft.businessAddress}
                        disabled={fieldDisabled}
                        onChange={(e) => setDraft((p) => ({ ...p, businessAddress: e.target.value }))}
                        className="mt-1.5"
                        required={extraOwner}
                      />
                    </div>
                  </>
                ) : null}

                {extraEngineer ? (
                  <>
                    <div>
                      <label className="text-sm font-medium" htmlFor="specialization">
                        Specialization <span className="text-[color:var(--color-error)]">*</span>
                      </label>
                      <Input
                        id="specialization"
                        value={draft.specialization}
                        disabled={fieldDisabled}
                        onChange={(e) => setDraft((p) => ({ ...p, specialization: e.target.value }))}
                        className="mt-1.5"
                        required={extraEngineer}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium" htmlFor="assignedProjects">
                        Assigned Projects <span className="text-[color:var(--color-error)]">*</span>
                      </label>
                      <Input
                        id="assignedProjects"
                        value={draft.assignedProjects}
                        disabled={fieldDisabled}
                        onChange={(e) => setDraft((p) => ({ ...p, assignedProjects: e.target.value }))}
                        className="mt-1.5"
                        required={extraEngineer}
                      />
                    </div>
                  </>
                ) : null}

                {extraWorker ? (
                  <>
                    <div>
                      <label className="text-sm font-medium" htmlFor="crewType">
                        Crew Type <span className="text-[color:var(--color-error)]">*</span>
                      </label>
                      <Input
                        id="crewType"
                        value={draft.crewType}
                        disabled={fieldDisabled}
                        onChange={(e) => setDraft((p) => ({ ...p, crewType: e.target.value }))}
                        className="mt-1.5"
                        required={extraWorker}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium" htmlFor="supervisorName">
                        Supervisor Name <span className="text-[color:var(--color-error)]">*</span>
                      </label>
                      <Input
                        id="supervisorName"
                        value={draft.supervisorName}
                        disabled={fieldDisabled}
                        onChange={(e) => setDraft((p) => ({ ...p, supervisorName: e.target.value }))}
                        className="mt-1.5"
                        required={extraWorker}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {!editing ? (
              <Button type="button" onClick={() => setEditing(true)} className="sm:w-auto">
                Edit Profile
              </Button>
            ) : (
              <>
                <Button type="submit" className="sm:w-auto">
                  Save Changes
                </Button>
                <Button type="button" variant="outline" onClick={cancel} className="sm:w-auto">
                  Cancel
                </Button>
              </>
            )}
          </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="text-xs text-[color:var(--color-text_secondary)]">
          <div className={cn('rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3')}>
            Profile editing in this MVP is demo-only. In production, these fields would be persisted to the backend per user role.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

