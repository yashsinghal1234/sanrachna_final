/**
 * useApprovedReport.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns the approved PlanningReport for the currently active project.
 * Also exposes helper data derived from it (cost, timeline, workforce, BOM).
 *
 * If no report is approved yet, returns null for the report and empty/zero
 * values for the derived data — pages handle the "no data" state themselves.
 */

import { useMemo } from 'react'
import { useProjectsStore } from '@/store/useProjectsStore'
import type { PlanningReport, BillOfMaterialRow, OptimizationRow } from '@/types/planning.types'

export type ReportCostSummary = {
  totalCost: number
  grandTotal: number
  costPerSqFt: number
  contingency: number
  phases: { name: string; cost: number; percent: number }[]
}

export type ReportTimelineSummary = {
  totalMonths: number
  phases: { name: string; months: number; milestones: string[] }[]
}

export type ReportWorkforceSummary = {
  total: number
  peak: number
  byTrade: { trade: string; count: number; phase: string }[]
}

export type ReportRiskSummary = {
  risks: { risk: string; level: string; mitigation: string }[]
  highCount: number
  mediumCount: number
}

export function useApprovedReport() {
  const currentProjectId = useProjectsStore((s) => s.currentProjectId)
  const projects = useProjectsStore((s) => s.projects)

  const project = currentProjectId ? projects[currentProjectId] : undefined

  // masterPlan is set on approval via recordApproval(); fall back to lastGeneratedReport
  const report: PlanningReport | null =
    (project?.masterPlan as PlanningReport | undefined) ??
    (project?.lastGeneratedReport as PlanningReport | undefined) ??
    null

  const isApproved = project?.isApproved ?? false
  const projectName = project?.name ?? ''

  const cost = useMemo((): ReportCostSummary | null => {
    if (!report) return null
    const cb = report.costBreakdown
    return {
      totalCost: cb.totalCost,
      grandTotal: cb.totalCost + cb.contingencyAmount,
      costPerSqFt: cb.costPerSqFt,
      contingency: cb.contingencyAmount,
      phases: cb.phases.map((p) => ({ name: p.name, cost: p.cost, percent: p.percent })),
    }
  }, [report])

  const timeline = useMemo((): ReportTimelineSummary | null => {
    if (!report) return null
    return {
      totalMonths: report.timeline.totalMonths,
      phases: report.timeline.phases,
    }
  }, [report])

  const workforce = useMemo((): ReportWorkforceSummary | null => {
    if (!report) return null
    return {
      total: report.workforcePlan.totalWorkers,
      peak: report.workforcePlan.peakWorkers,
      byTrade: report.workforcePlan.byTrade,
    }
  }, [report])

  const bom = useMemo((): BillOfMaterialRow[] => {
    if (!report) return []
    return report.billOfMaterials
  }, [report])

  const optimizations = useMemo((): OptimizationRow[] => {
    if (!report) return []
    return report.optimizations
  }, [report])

  const risks = useMemo((): ReportRiskSummary | null => {
    if (!report) return null
    const risks = report.riskForecast
    return {
      risks,
      highCount: risks.filter((r) => r.level === 'High').length,
      mediumCount: risks.filter((r) => r.level === 'Medium').length,
    }
  }, [report])

  const feasibility = report?.executiveSummary.feasibility ?? null
  const confidence = report?.executiveSummary.confidencePercent ?? null
  const estimatedMonths = report?.executiveSummary.estimatedMonths ?? null
  const estimatedCost = report?.executiveSummary.estimatedCost ?? null
  const majorRisks = report?.executiveSummary.majorRisks ?? []
  const assumptions = report?.assumptions ?? []

  return {
    report,
    isApproved,
    projectName,
    cost,
    timeline,
    workforce,
    bom,
    optimizations,
    risks,
    feasibility,
    confidence,
    estimatedMonths,
    estimatedCost,
    majorRisks,
    assumptions,
    hasReport: !!report,
  }
}
