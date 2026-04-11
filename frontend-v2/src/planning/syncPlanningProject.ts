import { apiPatchPlanningStudio } from '@/api/projectTeamApi'
import { isBackendConfigured } from '@/api/http'
import { usePlanningStore } from '@/store/usePlanningStore'
import { useProjectsStore } from '@/store/useProjectsStore'

function isMongoObjectId(id: string) {
  return /^[a-f0-9]{24}$/i.test(id)
}

/** Persist in-memory planning session into the active project record (and Mongo when API is configured). */
export function savePlanningToProject(projectId: string) {
  const p = useProjectsStore.getState().projects[projectId]
  if (!p) return
  const s = usePlanningStore.getState()
  useProjectsStore.getState().updatePlanningSession(projectId, {
    formData: s.formData,
    lastGeneratedReport: s.currentReport,
    planningStep: s.currentStep,
    isApproved: s.isApproved,
    chatHistory: s.chatHistory,
  })
  const merged = useProjectsStore.getState().projects[projectId]
  if (!merged) return
  if (isBackendConfigured() && isMongoObjectId(projectId)) {
    const studio = {
      currentForm: merged.currentForm,
      lastGeneratedReport: merged.lastGeneratedReport,
      masterPlan: merged.masterPlan,
      planningStep: merged.planningStep,
      isApproved: merged.isApproved,
      chatHistory: merged.chatHistory,
      planVersions: merged.planVersions,
      currentVersionLabel: merged.currentVersionLabel,
      moduleSync: merged.moduleSync,
      editHistory: merged.editHistory,
    }
    void apiPatchPlanningStudio(projectId, studio as unknown as Record<string, unknown>).catch(() => {
      // offline / stale token — local persist still applied
    })
  }
}

/** Load a project's saved planning session into the planning store (working copy). */
export function loadPlanningFromProject(projectId: string) {
  const p = useProjectsStore.getState().projects[projectId]
  if (!p) return
  const report = p.isApproved && p.masterPlan ? p.masterPlan : p.lastGeneratedReport
  usePlanningStore.setState({
    formData: p.currentForm,
    currentReport: report,
    currentStep: p.planningStep,
    isApproved: p.isApproved,
    chatHistory: p.chatHistory,
    reportError: null,
    reportLoading: false,
    revisionLoading: false,
  })
}
