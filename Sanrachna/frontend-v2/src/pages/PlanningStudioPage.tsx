import { History } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { ProjectRevisionDrawer } from '@/components/planning/ProjectRevisionDrawer'
import { ProjectSelectorBar } from '@/components/planning/ProjectSelectorBar'
import { StepIndicator } from '@/components/planning/StepIndicator'
import { InputForm } from '@/components/planning/Step1_InputForm/InputForm'
import { ReportView } from '@/components/planning/Step2_AIReport/ReportView'
import { RevisionChat } from '@/components/planning/Step3_RevisionChat/RevisionChat'
import { FinalizeApproval } from '@/components/planning/Step4_Finalize/FinalizeApproval'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { loadPlanningFromProject, savePlanningToProject } from '@/planning/syncPlanningProject'
import { defaultPlanningFormValues } from '@/planning/planningDefaults'
import { usePlanningStore, type PlanningStep } from '@/store/usePlanningStore'
import { useProjectsStore } from '@/store/useProjectsStore'

const RESUME_KEY = 'planning_resume_prompt_done'

export function PlanningStudioPage() {
  const [formKey, setFormKey] = useState(0)
  const [resumeOpen, setResumeOpen] = useState(false)
  const [stepBackOpen, setStepBackOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const currentProjectId = useProjectsStore((s) => s.currentProjectId)
  const prevProjectRef = useRef<string | null>(null)

  const currentStep = usePlanningStore((s) => s.currentStep)
  const setStep = usePlanningStore((s) => s.setStep)
  const currentReport = usePlanningStore((s) => s.currentReport)
  const reportLoading = usePlanningStore((s) => s.reportLoading)
  const isApproved = usePlanningStore((s) => s.isApproved)
  const toast = usePlanningStore((s) => s.toast)
  const replaceFormData = usePlanningStore((s) => s.replaceFormData)
  const resetFormData = usePlanningStore((s) => s.resetFormData)
  const setReport = usePlanningStore((s) => s.setReport)
  const setChatHistory = usePlanningStore((s) => s.setChatHistory)

  useEffect(() => {
    if (!currentProjectId) return
    if (prevProjectRef.current !== null && prevProjectRef.current !== currentProjectId) {
      savePlanningToProject(prevProjectRef.current)
    }
    loadPlanningFromProject(currentProjectId)
    prevProjectRef.current = currentProjectId
    setFormKey((k) => k + 1)
  }, [currentProjectId])

  useEffect(() => {
    try {
      if (sessionStorage.getItem(RESUME_KEY)) return
      const p = useProjectsStore.getState().getCurrentProject()
      if (p?.currentForm.projectName.trim().length >= 3) setResumeOpen(true)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const flush = () => {
      const id = useProjectsStore.getState().currentProjectId
      if (id) savePlanningToProject(id)
    }
    window.addEventListener('beforeunload', flush)
    return () => window.removeEventListener('beforeunload', flush)
  }, [])

  const dismissResume = () => {
    try {
      sessionStorage.setItem(RESUME_KEY, '1')
    } catch {
      // ignore
    }
    setResumeOpen(false)
  }

  const handleStepRequest = (s: PlanningStep) => {
    if (isApproved && s === 1) return
    if (s === 1 && currentStep >= 2 && currentReport && !isApproved) {
      setStepBackOpen(true)
      return
    }
    setStep(s)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-[color:var(--color-text_muted)]">Engineer workspace</p>
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-text)]">AI Planning Studio</h1>
          <p className="mt-1 max-w-3xl text-sm text-[color:var(--color-text_secondary)]">
            Per-project master plan, version history, and downstream module sync. Use the history panel to audit plan
            versions and propagation events.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setHistoryOpen(true)}>
          <History className="size-4" />
          Project history
        </Button>
      </div>

      <ProjectSelectorBar />

      <StepIndicator
        currentStep={currentStep}
        isApproved={isApproved}
        hasReport={!!currentReport}
        reportLoading={reportLoading}
        onStepRequest={handleStepRequest}
      />

      {toast ? (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-50 max-w-sm -translate-x-1/2 rounded-[var(--radius-xl)] bg-[color:var(--color-text)] px-4 py-2 text-center text-sm font-semibold text-white shadow-[var(--shadow-card)]"
        >
          {toast}
        </div>
      ) : null}

      {currentStep === 1 && !isApproved ? (
        <InputForm key={`plan-${currentProjectId ?? 'none'}-${formKey}`} />
      ) : null}

      {currentStep === 1 && isApproved ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[color:var(--color-text_secondary)]">
            This plan is locked after approval. Continue from the dashboard or switch project above.
          </CardContent>
        </Card>
      ) : null}

      {currentStep === 2 ? <ReportView /> : null}
      {currentStep === 3 ? <RevisionChat /> : null}
      {currentStep === 4 ? <FinalizeApproval /> : null}

      <ProjectRevisionDrawer open={historyOpen} onOpenChange={setHistoryOpen} />

      <Modal
        open={resumeOpen}
        onOpenChange={(o) => !o && dismissResume()}
        title="Resume draft?"
        description="We found saved inputs for this project. Continue editing or discard and start fresh."
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                resetFormData()
                replaceFormData(defaultPlanningFormValues)
                setFormKey((k) => k + 1)
                dismissResume()
              }}
            >
              Discard
            </Button>
            <Button type="button" onClick={() => dismissResume()}>
              Continue with draft
            </Button>
          </>
        }
      />

      <Modal
        open={stepBackOpen}
        onOpenChange={setStepBackOpen}
        title="Edit inputs?"
        description="Going back will let you change inputs; you should regenerate the AI plan afterward."
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setStepBackOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                const pid = useProjectsStore.getState().currentProjectId
                setReport(null)
                setChatHistory([])
                setStep(1)
                if (pid) {
                  useProjectsStore.getState().updatePlanningSession(pid, {
                    formData: usePlanningStore.getState().formData,
                    lastGeneratedReport: null,
                    planningStep: 1,
                    isApproved: false,
                    chatHistory: [],
                  })
                  savePlanningToProject(pid)
                }
                setStepBackOpen(false)
              }}
            >
              Continue
            </Button>
          </>
        }
      />
    </div>
  )
}
