"""
app/models_planning.py — Input/Output models that match the React frontend's
PlanningFormValues and PlanningReport schemas exactly.

The FastAPI /generate and /revise endpoints use these so that the frontend
can POST planning form data and receive a PlanningReport directly.
"""

from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


# ── Planning Form Input (mirrors PlanningFormValues in planningSchema.ts) ──────

class CustomConstraint(BaseModel):
    key: str
    value: str


class PlanningFormValues(BaseModel):
    """Mirrors the React PlanningFormValues Zod schema exactly."""

    # Identity
    projectName: str = Field(..., min_length=1)
    siteLocation: str = ""
    plotArea: float = Field(..., gt=0)
    builtUpArea: float = Field(..., gt=0)
    numberOfFloors: Optional[int] = None
    projectType: str = ""
    constructionType: str = "New"
    basementParking: str = ""

    # Budget & schedule
    totalBudget: float = Field(..., gt=0)
    targetCompletionDate: str = ""
    deadlineType: str = ""
    priorityMode: str = "Balanced"

    # Structural
    structuralSystem: str = "RCC"
    foundationType: str = ""
    soilCondition: str = ""
    seismicZone: str = ""
    windZone: str = ""
    floorHeightFt: Optional[float] = None
    roofType: str = ""

    # Materials
    cementGrade: str = ""
    steelGrade: str = ""
    brickType: str = ""
    concreteGrade: str = ""
    finishQuality: str = "Standard"
    preferredBrands: str = ""

    # Workforce
    availableWorkforce: str = ""
    existingContractors: str = ""
    ownedEquipment: str = ""
    rentalPartners: str = ""
    shiftPolicy: str = "Single"

    # Site
    siteAccessibility: str = ""
    storageSpace: str = ""
    locationType: str = ""
    workingHourRestrictions: str = ""
    seasonalConstraints: str = ""
    nearbyRisks: str = ""

    # Procurement
    preferredSuppliers: str = ""
    materialLeadTimes: str = ""
    procurementStrategy: str = ""
    importedMaterials: str = ""

    # Misc
    greenBuildingTarget: str = ""
    safetyComplianceLevel: str = ""
    regulatoryRequirements: str = ""
    riskTolerance: str = ""
    contingencyPercent: Optional[float] = None
    historicalSimilarProject: str = ""
    additionalNotes: str = ""
    customConstraints: list[CustomConstraint] = []


# ── Revision request ──────────────────────────────────────────────────────────

class ReviseRequest(BaseModel):
    form: PlanningFormValues
    report: dict[str, Any]          # current PlanningReport (raw JSON)
    chatHistory: list[dict[str, str]] = []
    newMessage: str


# ── Output models (mirror planning.types.ts) ──────────────────────────────────

class CostPhase(BaseModel):
    name: str
    cost: float
    percent: float


class CostBreakdown(BaseModel):
    totalCost: float
    costPerSqFt: float
    contingencyAmount: float
    phases: list[CostPhase]


class BillOfMaterialRow(BaseModel):
    material: str
    quantity: float
    unit: str
    unitRate: float
    totalCost: float


class WorkforceByTrade(BaseModel):
    trade: str
    count: int
    phase: str


class WorkforcePlan(BaseModel):
    totalWorkers: int
    peakWorkers: int
    byTrade: list[WorkforceByTrade]


class EquipmentRow(BaseModel):
    name: str
    recommendation: str    # 'Buy' | 'Rent' | 'Not needed'
    reason: str


class TimelinePhase(BaseModel):
    name: str
    months: float
    milestones: list[str]


class TimelinePlan(BaseModel):
    totalMonths: float
    phases: list[TimelinePhase]


class RiskRow(BaseModel):
    risk: str
    level: str             # 'High' | 'Medium' | 'Low'
    mitigation: str


class OptimizationRow(BaseModel):
    suggestion: str
    impact: str
    savingAmount: Optional[float] = None


class ExecutiveSummary(BaseModel):
    feasibility: str       # 'Feasible' | 'Challenging' | 'Not Feasible'
    estimatedMonths: float
    estimatedCost: float
    confidencePercent: int
    majorRisks: list[str]
    keyAssumptions: list[str]


class PlanningReport(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    executiveSummary: ExecutiveSummary
    costBreakdown: CostBreakdown
    billOfMaterials: list[BillOfMaterialRow]
    workforcePlan: WorkforcePlan
    equipmentPlan: list[EquipmentRow]
    timeline: TimelinePlan
    riskForecast: list[RiskRow]
    optimizations: list[OptimizationRow]
    assumptions: list[str]
    revisionSummary: Optional[str] = Field(default=None, exclude=False)
