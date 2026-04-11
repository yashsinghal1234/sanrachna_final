import { z } from 'zod'

const customConstraintSchema = z.object({
  key: z.string(),
  value: z.string(),
})

function optionalNumber(min?: number, max?: number) {
  return z.preprocess((val) => {
    if (val === '' || val === undefined || val === null) return undefined
    const n = Number(val)
    return Number.isNaN(n) ? undefined : n
  }, z.number().min(min ?? Number.MIN_SAFE_INTEGER).max(max ?? Number.MAX_SAFE_INTEGER).optional())
}

function optionalInt(min: number, max: number) {
  return z.preprocess((val) => {
    if (val === '' || val === undefined || val === null) return undefined
    const n = Number(val)
    return Number.isNaN(n) ? undefined : Math.trunc(n)
  }, z.number().int().min(min).max(max).optional())
}

export const planningFormSchema = z
  .object({
    projectName: z.string().min(3, 'At least 3 characters').max(80),
    siteLocation: z.string().min(3, 'At least 3 characters'),
    plotArea: z.coerce.number().positive('Must be greater than 0').max(999_999),
    builtUpArea: z.coerce.number().positive('Must be greater than 0'),
    numberOfFloors: optionalInt(1, 50),
    projectType: z.string().min(1, 'Select a project type'),
    constructionType: z.string().optional().default('New'),
    basementParking: z.string().optional().default(''),

    totalBudget: z.coerce.number().positive('Must be greater than 0'),
    targetCompletionDate: z.string().min(1, 'Pick a date'),
    deadlineType: z.string().optional().default(''),
    priorityMode: z.string().optional().default('Balanced'),

    structuralSystem: z.string().optional().default('RCC'),
    foundationType: z.string().optional().default(''),
    soilCondition: z.string().optional().default(''),
    seismicZone: z.string().optional().default(''),
    windZone: z.string().optional().default(''),
    floorHeightFt: optionalNumber(6, 20),
    roofType: z.string().optional().default(''),

    cementGrade: z.string().optional().default(''),
    steelGrade: z.string().optional().default(''),
    brickType: z.string().optional().default(''),
    concreteGrade: z.string().optional().default(''),
    finishQuality: z.string().optional().default('Standard'),
    preferredBrands: z.string().optional().default(''),

    availableWorkforce: z.string().optional().default(''),
    existingContractors: z.string().optional().default(''),
    ownedEquipment: z.string().optional().default(''),
    rentalPartners: z.string().optional().default(''),
    shiftPolicy: z.string().optional().default('Single'),

    siteAccessibility: z.string().optional().default(''),
    storageSpace: z.string().optional().default(''),
    locationType: z.string().optional().default(''),
    workingHourRestrictions: z.string().optional().default(''),
    seasonalConstraints: z.string().optional().default(''),
    nearbyRisks: z.string().optional().default(''),

    preferredSuppliers: z.string().optional().default(''),
    materialLeadTimes: z.string().optional().default(''),
    procurementStrategy: z.string().optional().default(''),
    importedMaterials: z.string().optional().default(''),

    greenBuildingTarget: z.string().optional().default(''),
    safetyComplianceLevel: z.string().optional().default(''),
    regulatoryRequirements: z.string().optional().default(''),
    riskTolerance: z.string().optional().default(''),
    contingencyPercent: optionalNumber(0, 30),
    historicalSimilarProject: z.string().optional().default(''),

    additionalNotes: z.string().optional().default(''),
    customConstraints: z.array(customConstraintSchema).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.builtUpArea > data.plotArea) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Must be less than or equal to plot area',
        path: ['builtUpArea'],
      })
    }
    const d = new Date(data.targetCompletionDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (!Number.isNaN(d.getTime()) && d <= today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Must be a future date',
        path: ['targetCompletionDate'],
      })
    }
  })

export type PlanningFormValues = z.infer<typeof planningFormSchema>

export const planningReportSchema = z.object({
  executiveSummary: z.object({
    feasibility: z.enum(['Feasible', 'Challenging', 'Not Feasible']),
    estimatedMonths: z.number(),
    estimatedCost: z.number(),
    confidencePercent: z.number(),
    majorRisks: z.array(z.string()),
    keyAssumptions: z.array(z.string()),
  }),
  costBreakdown: z.object({
    totalCost: z.number(),
    costPerSqFt: z.number(),
    contingencyAmount: z.number(),
    phases: z.array(
      z.object({
        name: z.string(),
        cost: z.number(),
        percent: z.number(),
      }),
    ),
  }),
  billOfMaterials: z.array(
    z.object({
      material: z.string(),
      quantity: z.number(),
      unit: z.string(),
      unitRate: z.number(),
      totalCost: z.number(),
    }),
  ),
  workforcePlan: z.object({
    totalWorkers: z.number(),
    peakWorkers: z.number(),
    byTrade: z.array(
      z.object({
        trade: z.string(),
        count: z.number(),
        phase: z.string(),
      }),
    ),
  }),
  equipmentPlan: z.array(
    z.object({
      name: z.string(),
      recommendation: z.enum(['Buy', 'Rent', 'Not needed']),
      reason: z.string(),
    }),
  ),
  timeline: z.object({
    totalMonths: z.number(),
    phases: z.array(
      z.object({
        name: z.string(),
        months: z.number(),
        milestones: z.array(z.string()),
      }),
    ),
  }),
  riskForecast: z.array(
    z.object({
      risk: z.string(),
      level: z.enum(['High', 'Medium', 'Low']),
      mitigation: z.string(),
    }),
  ),
  optimizations: z.array(
    z.object({
      suggestion: z.string(),
      impact: z.string(),
      savingAmount: z.number().nullable(),
    }),
  ),
  assumptions: z.array(z.string()),
  revisionSummary: z.string().optional(),
})
