import type { PlanningFormValues } from '@/planning/planningSchema'

export const defaultPlanningFormValues: PlanningFormValues = {
  projectName: '',
  siteLocation: '',
  plotArea: 0,
  builtUpArea: 0,
  numberOfFloors: undefined,
  projectType: '',
  constructionType: 'New',
  basementParking: '',

  totalBudget: 0,
  targetCompletionDate: '',
  deadlineType: '',
  priorityMode: 'Balanced',

  structuralSystem: 'RCC',
  foundationType: '',
  soilCondition: '',
  seismicZone: '',
  windZone: '',
  floorHeightFt: undefined,
  roofType: '',

  cementGrade: '',
  steelGrade: '',
  brickType: '',
  concreteGrade: '',
  finishQuality: 'Standard',
  preferredBrands: '',

  availableWorkforce: '',
  existingContractors: '',
  ownedEquipment: '',
  rentalPartners: '',
  shiftPolicy: 'Single',

  siteAccessibility: '',
  storageSpace: '',
  locationType: '',
  workingHourRestrictions: '',
  seasonalConstraints: '',
  nearbyRisks: '',

  preferredSuppliers: '',
  materialLeadTimes: '',
  procurementStrategy: '',
  importedMaterials: '',

  greenBuildingTarget: '',
  safetyComplianceLevel: '',
  regulatoryRequirements: '',
  riskTolerance: '',
  contingencyPercent: undefined,
  historicalSimilarProject: '',

  additionalNotes: '',
  customConstraints: [],
}
