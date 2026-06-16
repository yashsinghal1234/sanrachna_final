import { ShieldCheck, User, Save, Loader2, Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { useAuth, type Role } from '@/auth/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { apiGetProfile, apiUpdateProfile } from '@/api/profileApi'

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  departmentCrew: z.string().optional(),
  employeeId: z.string().optional(),
  companyName: z.string().optional(),
  businessAddress: z.string().optional(),
  specialization: z.string().optional(),
  assignedProjects: z.string().optional(),
  crewType: z.string().optional(),
  supervisorName: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export function ProfileSettingsPage() {
  const { role, user, login, token } = useAuth()
  const resolvedRole: Role = role ?? 'engineer'

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      departmentCrew: '',
      employeeId: '',
      companyName: '',
      businessAddress: '',
      specialization: '',
      assignedProjects: '',
      crewType: '',
      supervisorName: '',
    },
  })

  useEffect(() => {
    async function fetchProfile() {
      if (!token) return
      try {
        const { user: profile } = await apiGetProfile()
        reset({
          name: profile.name || '',
          email: profile.email || '',
          phone: profile.phone || '',
          departmentCrew: profile.departmentCrew || '',
          employeeId: profile.employeeId || '',
          companyName: profile.companyName || '',
          businessAddress: profile.businessAddress || '',
          specialization: profile.specialization || '',
          assignedProjects: profile.assignedProjects || '',
          crewType: profile.crewType || '',
          supervisorName: profile.supervisorName || '',
        })
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load profile.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchProfile()
  }, [token, reset])

  const onSubmit = async (data: ProfileFormValues) => {
    setIsSaving(true)
    setSuccessMsg(null)
    setErrorMsg(null)
    try {
      const { user: updatedUser } = await apiUpdateProfile(data)
      
      // Sync local context so sidebar/header updates instantly
      if (user && token) {
        login({ user: { ...user, name: updatedUser.name, emailOrPhone: updatedUser.email, phone: updatedUser.phone }, token })
      }
      
      // Update form state to reset dirty fields
      reset({
        name: updatedUser.name || '',
        email: updatedUser.email || '',
        phone: updatedUser.phone || '',
        departmentCrew: updatedUser.departmentCrew || '',
        employeeId: updatedUser.employeeId || '',
        companyName: updatedUser.companyName || '',
        businessAddress: updatedUser.businessAddress || '',
        specialization: updatedUser.specialization || '',
        assignedProjects: updatedUser.assignedProjects || '',
        crewType: updatedUser.crewType || '',
        supervisorName: updatedUser.supervisorName || '',
      })
      setSuccessMsg('Profile updated successfully.')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.')
    } finally {
      setIsSaving(false)
    }
  }

  const extraOwner = resolvedRole === 'owner'
  const extraEngineer = resolvedRole === 'engineer'
  const extraWorker = resolvedRole === 'worker'

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[color:var(--color-text_muted)]" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="border-none shadow-sm ring-1 ring-[color:var(--color-border)]">
        <CardHeader className="bg-[color:var(--color-bg)] pb-6 border-b border-[color:var(--color-border)]">
          <CardTitle className="flex items-center gap-2 text-xl">
            <User className="size-5 text-[color:var(--color-primary_dark)]" />
            Profile Settings
          </CardTitle>
          <CardDescription>Manage your personal information and contact details.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
            
            {/* Header Badge */}
            <div className="flex items-start justify-between gap-3 rounded-[var(--radius-xl)] border border-[color:var(--color-primary)]/20 bg-[color:var(--color-primary_light)]/5 p-4">
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-[var(--radius-xl)] bg-[color:var(--color-primary)] text-white shadow-sm">
                  <User className="size-6" />
                </div>
                <div>
                  <div className="text-lg font-bold">{user?.name || 'User'}</div>
                  <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-success)]/10 px-2.5 py-0.5 text-xs font-semibold text-[color:var(--color-success)]">
                    <ShieldCheck className="size-3.5" />
                    {resolvedRole.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-md bg-[color:var(--color-error)]/10 p-3 text-sm font-medium text-[color:var(--color-error)]">
                {errorMsg}
              </div>
            )}
            
            {successMsg && (
              <div className="rounded-md bg-[color:var(--color-success)]/10 p-3 text-sm font-medium text-[color:var(--color-success)]">
                {successMsg}
              </div>
            )}

            {/* Personal Information Section */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--color-text_secondary)] mb-4">Personal Information</h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Full Name <span className="text-[color:var(--color-error)]">*</span>
                  </label>
                  <Input {...register('name')} placeholder="e.g. Arjun Singh" className={errors.name ? 'border-[color:var(--color-error)]' : ''} />
                  {errors.name && <p className="text-xs text-[color:var(--color-error)]">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Email Address <span className="text-[color:var(--color-error)]">*</span>
                  </label>
                  <Input {...register('email')} type="email" placeholder="e.g. arjun@company.com" className={errors.email ? 'border-[color:var(--color-error)]' : ''} />
                  {errors.email && <p className="text-xs text-[color:var(--color-error)]">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input {...register('phone')} placeholder="+91 98XXX XXXXX" />
                  {errors.phone && <p className="text-xs text-[color:var(--color-error)]">{errors.phone.message}</p>}
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-[color:var(--color-border)]" />

            {/* Work Details Section */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--color-text_secondary)] mb-4">Work Details</h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Department / Crew</label>
                  <Input {...register('departmentCrew')} placeholder="e.g. Engineering" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Employee ID</label>
                  <Input {...register('employeeId')} placeholder="e.g. EMP-041" />
                </div>

                {extraOwner && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Company Name</label>
                      <Input {...register('companyName')} placeholder="Your Company Ltd" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Business Address</label>
                      <Input {...register('businessAddress')} placeholder="City, State" />
                    </div>
                  </>
                )}

                {extraEngineer && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Specialization</label>
                      <Input {...register('specialization')} placeholder="e.g. Structural Planning" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Assigned Projects</label>
                      <Input {...register('assignedProjects')} placeholder="e.g. Sunrise Residency" />
                    </div>
                  </>
                )}

                {extraWorker && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Crew Type</label>
                      <Input {...register('crewType')} placeholder="e.g. Masons, Electricians" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Supervisor Name</label>
                      <Input {...register('supervisorName')} placeholder="e.g. Rahul Sharma" />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-2 text-sm text-[color:var(--color-text_muted)]">
                <Info className="size-4" />
                Changes may take a moment to reflect across the workspace.
              </div>
              <Button type="submit" disabled={isSaving || !isDirty} className="min-w-[140px]">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 size-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  )
}
