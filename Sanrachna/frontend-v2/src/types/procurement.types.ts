export type SupplierQuote = {
  material: string
  supplierName: string
  unitRate: number
  unit: string
  qualityRating: number
  leadTimeDays: number
}

export type ProcurementScheduleRow = {
  id: string
  material: string
  procureBy: string
  deliveryDeadline: string
  linkedPhase: string
  linkedTask: string
  status: 'planned' | 'ordered' | 'delivered'
}

export type ProcurementRecommendation = {
  id: string
  title: string
  rationale: string
}
