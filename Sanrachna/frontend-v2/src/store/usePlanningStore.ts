import { create } from 'zustand'

import { defaultPlanningFormValues } from '@/planning/planningDefaults'
import type { PlanningFormValues } from '@/planning/planningSchema'
import type { ChatMessage, PlanningReport, PlanningStep } from '@/types/planning.types'

export type { PlanningStep }

type PlanningState = {
  formData: PlanningFormValues
  currentReport: PlanningReport | null
  reportLoading: boolean
  reportError: string | null
  revisionLoading: boolean
  chatHistory: ChatMessage[]
  currentStep: PlanningStep
  isApproved: boolean
  toast: string | null
  /** Prefill Step 3 input when jumping from optimization chips */
  pendingRevisionPrompt: string | null

  setFormData: (patch: Partial<PlanningFormValues>) => void
  replaceFormData: (next: PlanningFormValues) => void
  resetFormData: () => void
  setReport: (r: PlanningReport | null) => void
  setReportLoading: (v: boolean) => void
  setReportError: (e: string | null) => void
  setRevisionLoading: (v: boolean) => void
  addMessage: (m: ChatMessage) => void
  setChatHistory: (h: ChatMessage[]) => void
  setStep: (s: PlanningStep) => void
  approvePlan: () => void
  setToast: (t: string | null) => void
  setPendingRevisionPrompt: (t: string | null) => void
  resetPlanningFlow: () => void
}

export const usePlanningStore = create<PlanningState>()((set) => ({
  formData: defaultPlanningFormValues,
  currentReport: null,
  reportLoading: false,
  reportError: null,
  revisionLoading: false,
  chatHistory: [],
  currentStep: 1,
  isApproved: false,
  toast: null,
  pendingRevisionPrompt: null,

  setFormData: (patch) =>
    set((s) => ({
      formData: { ...s.formData, ...patch },
    })),
  replaceFormData: (next) => set({ formData: next }),
  resetFormData: () => set({ formData: defaultPlanningFormValues }),
  setReport: (r) => set({ currentReport: r }),
  setReportLoading: (v) => set({ reportLoading: v }),
  setReportError: (e) => set({ reportError: e }),
  setRevisionLoading: (v) => set({ revisionLoading: v }),
  addMessage: (m) => set((s) => ({ chatHistory: [...s.chatHistory, m] })),
  setChatHistory: (h) => set({ chatHistory: h }),
  setStep: (currentStep) => set({ currentStep }),
  approvePlan: () => set({ isApproved: true }),
  setToast: (toast) => set({ toast }),
  setPendingRevisionPrompt: (pendingRevisionPrompt) => set({ pendingRevisionPrompt }),
  resetPlanningFlow: () =>
    set({
      currentReport: null,
      reportError: null,
      chatHistory: [],
      currentStep: 1,
      isApproved: false,
      toast: null,
      pendingRevisionPrompt: null,
    }),
}))
