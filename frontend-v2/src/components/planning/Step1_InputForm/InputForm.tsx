import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import type { FieldErrors, Resolver } from 'react-hook-form'
import { FormProvider, useForm } from 'react-hook-form'

import { generatePlanningReport } from '@/api/planningApi'
import { savePlanningToProject } from '@/planning/syncPlanningProject'
import { Button } from '@/components/ui/Button'
import { defaultPlanningFormValues } from '@/planning/planningDefaults'
import { planningFormSchema, type PlanningFormValues } from '@/planning/planningSchema'
import { usePlanningStore } from '@/store/usePlanningStore'
import { useProjectsStore } from '@/store/useProjectsStore'
import { PlanningFormSections } from './formSections'

export function InputForm() {
  const replaceFormData = usePlanningStore((s) => s.replaceFormData)
  const setReportLoading = usePlanningStore((s) => s.setReportLoading)
  const setReport = usePlanningStore((s) => s.setReport)
  const setReportError = usePlanningStore((s) => s.setReportError)
  const setStep = usePlanningStore((s) => s.setStep)
  const setToast = usePlanningStore((s) => s.setToast)
  const reportLoading = usePlanningStore((s) => s.reportLoading)
  const reportError = usePlanningStore((s) => s.reportError)

  const methods = useForm<PlanningFormValues>({
    resolver: zodResolver(planningFormSchema) as Resolver<PlanningFormValues>,
    defaultValues: usePlanningStore.getState().formData ?? defaultPlanningFormValues,
    mode: 'onBlur',
  })

  const { handleSubmit, setFocus, getValues } = methods

  const onValid = async (data: PlanningFormValues) => {
    setReportError(null)
    setReportLoading(true)
    replaceFormData(data)
    try {
      const report = await generatePlanningReport(data)
      setReport(report)
      setStep(2)
      const pid = useProjectsStore.getState().currentProjectId
      if (pid) {
        useProjectsStore.getState().applyGeneratedReport(pid, data, report, 2)
      }
    } catch (e) {
      setReportError(e instanceof Error ? e.message : 'Report generation failed')
    } finally {
      setReportLoading(false)
    }
  }

  const onInvalid = (errs: FieldErrors<PlanningFormValues>) => {
    const order: (keyof PlanningFormValues)[] = [
      'projectName',
      'siteLocation',
      'plotArea',
      'builtUpArea',
      'projectType',
      'totalBudget',
      'targetCompletionDate',
    ]
    const key =
      order.find((k) => errs[k]) ?? (Object.keys(errs)[0] as keyof PlanningFormValues | undefined)
    if (key) {
      setFocus(key)
      window.requestAnimationFrame(() => {
        const el = document.querySelector(`[name="${String(key)}"]`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    }
  }

  const saveDraft = () => {
    const v = getValues()
    replaceFormData({
      ...defaultPlanningFormValues,
      ...v,
      customConstraints: v.customConstraints?.length ? v.customConstraints : [],
    })
    const pid = useProjectsStore.getState().currentProjectId
    if (pid) savePlanningToProject(pid)
    setToast('Draft saved locally')
    window.setTimeout(() => setToast(null), 2400)
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onValid, onInvalid)} className="space-y-4" noValidate>
        <PlanningFormSections />
        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" disabled={reportLoading} className="min-w-[160px]">
            {reportLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Generating report…
              </>
            ) : (
              'Generate Report'
            )}
          </Button>
          <Button type="button" variant="secondary" onClick={saveDraft} disabled={reportLoading}>
            Save draft
          </Button>
        </div>
        {reportError ? (
          <p className="text-sm font-medium text-[color:var(--color-error)]" role="alert">
            {reportError}. Try again.
          </p>
        ) : null}
      </form>
    </FormProvider>
  )
}
