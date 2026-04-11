import { Controller, useFieldArray, useFormContext } from 'react-hook-form'
import { Plus, X } from 'lucide-react'

import { AccordionSection } from '@/components/planning/AccordionSection'
import { RadioPills } from '@/components/planning/RadioPills'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { PlanningFormValues } from '@/planning/planningSchema'
import { cn } from '@/utils/cn'

function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: string
  hint?: string
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="text-xs font-medium text-[color:var(--color-text_secondary)]">{label}</div>
      {children}
      {hint ? <p className="text-[11px] text-[color:var(--color-text_muted)]">{hint}</p> : null}
      {error ? <p className="text-[11px] font-medium text-[color:var(--color-error)]">{error}</p> : null}
    </div>
  )
}

function countFilled(watchVals: Record<string, unknown>, keys: string[]) {
  return keys.filter((k) => {
    const v = watchVals[k]
    if (v === undefined || v === null || v === '') return false
    if (typeof v === 'number' && !Number.isFinite(v)) return false
    return true
  }).length
}

export function PlanningFormSections() {
  const {
    register,
    control,
    formState: { errors },
    watch,
  } = useFormContext<PlanningFormValues>()

  const w = watch()
  const { fields, append, remove } = useFieldArray({ control, name: 'customConstraints' })

  const grid = 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3'

  return (
    <div className="space-y-2.5">
      <AccordionSection
        title="Project basics"
        required
        defaultOpen
        hasError={!!(errors.projectName || errors.siteLocation || errors.plotArea || errors.builtUpArea || errors.projectType)}
      >
        <div className={grid}>
          <Field label="Project name" error={errors.projectName?.message} className="sm:col-span-2">
            <Input placeholder="e.g. Riverside Tower A" {...register('projectName')} />
          </Field>
          <Field label="Site location" error={errors.siteLocation?.message} className="sm:col-span-2">
            <Input placeholder="City, State / PIN" {...register('siteLocation')} />
          </Field>
          <Field label="Plot area" hint="sq ft or sq m" error={errors.plotArea?.message}>
            <Input type="number" min={1} step="1" {...register('plotArea', { valueAsNumber: true })} />
          </Field>
          <Field label="Built-up area" hint="≤ plot area" error={errors.builtUpArea?.message}>
            <Input type="number" min={1} step="1" {...register('builtUpArea', { valueAsNumber: true })} />
          </Field>
          <Field label="Number of floors" error={errors.numberOfFloors?.message}>
            <Input type="number" min={1} max={50} placeholder="1" {...register('numberOfFloors')} />
          </Field>
          <Field label="Project type" error={errors.projectType?.message} className="sm:col-span-2 lg:col-span-3">
            <Controller
              name="projectType"
              control={control}
              render={({ field }) => (
                <RadioPills
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: 'Residential', label: 'Residential' },
                    { value: 'Commercial', label: 'Commercial' },
                    { value: 'Industrial', label: 'Industrial' },
                    { value: 'Infra', label: 'Infra' },
                  ]}
                />
              )}
            />
          </Field>
          <Field label="Construction type" className="sm:col-span-2">
            <Controller
              name="constructionType"
              control={control}
              render={({ field }) => (
                <RadioPills
                  value={field.value || 'New'}
                  onChange={field.onChange}
                  options={[
                    { value: 'New', label: 'New' },
                    { value: 'Renovation', label: 'Renovation' },
                    { value: 'Extension', label: 'Extension' },
                  ]}
                />
              )}
            />
          </Field>
          <Field label="Basement / parking" className="sm:col-span-2">
            <Controller
              name="basementParking"
              control={control}
              render={({ field }) => (
                <RadioPills
                  value={field.value || ''}
                  onChange={field.onChange}
                  options={[
                    { value: 'Yes', label: 'Yes' },
                    { value: 'No', label: 'No' },
                  ]}
                />
              )}
            />
          </Field>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Budget & timeline"
        required
        defaultOpen
        hasError={!!(errors.totalBudget || errors.targetCompletionDate)}
      >
        <div className={grid}>
          <Field label="Total budget (INR)" error={errors.totalBudget?.message}>
            <Input type="number" min={1} step="1000" {...register('totalBudget', { valueAsNumber: true })} />
          </Field>
          <Field label="Target completion date" error={errors.targetCompletionDate?.message}>
            <Input type="date" {...register('targetCompletionDate')} />
          </Field>
          <Field label="Deadline type" className="sm:col-span-2">
            <Controller
              name="deadlineType"
              control={control}
              render={({ field }) => (
                <RadioPills
                  value={field.value || ''}
                  onChange={field.onChange}
                  options={[
                    { value: 'Hard Deadline', label: 'Hard deadline' },
                    { value: 'Soft Deadline', label: 'Soft deadline' },
                  ]}
                />
              )}
            />
          </Field>
          <Field label="Priority mode" className="sm:col-span-2 lg:col-span-3">
            <Controller
              name="priorityMode"
              control={control}
              render={({ field }) => (
                <RadioPills
                  value={field.value || 'Balanced'}
                  onChange={field.onChange}
                  options={[
                    { value: 'Lowest Cost', label: 'Lowest cost' },
                    { value: 'Fastest', label: 'Fastest' },
                    { value: 'Balanced', label: 'Balanced' },
                    { value: 'Premium', label: 'Premium' },
                  ]}
                />
              )}
            />
          </Field>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Structural / technical specs"
        filledCount={countFilled(w as Record<string, unknown>, [
          'structuralSystem',
          'foundationType',
          'soilCondition',
          'seismicZone',
          'windZone',
          'floorHeightFt',
          'roofType',
        ])}
      >
        <div className={grid}>
          <Field label="Structural system" className="sm:col-span-2">
            <Controller
              name="structuralSystem"
              control={control}
              render={({ field }) => (
                <RadioPills
                  value={field.value || 'RCC'}
                  onChange={field.onChange}
                  options={[
                    { value: 'RCC', label: 'RCC' },
                    { value: 'Steel', label: 'Steel' },
                    { value: 'Composite', label: 'Composite' },
                    { value: 'Load Bearing', label: 'Load bearing' },
                  ]}
                />
              )}
            />
          </Field>
          <Field label="Foundation type">
            <Input placeholder="e.g. Raft, isolated footing" {...register('foundationType')} />
          </Field>
          <Field label="Soil condition">
            <Input placeholder="e.g. Hard rock, medium" {...register('soilCondition')} />
          </Field>
          <Field label="Seismic zone">
            <Input placeholder="II–V" {...register('seismicZone')} />
          </Field>
          <Field label="Wind zone">
            <Input placeholder="I–IV" {...register('windZone')} />
          </Field>
          <Field label="Floor height (ft)" error={errors.floorHeightFt?.message}>
            <Input type="number" placeholder="10" {...register('floorHeightFt')} />
          </Field>
          <Field label="Roof type">
            <Input placeholder="Flat RCC, metal, green…" {...register('roofType')} />
          </Field>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Materials & finish"
        filledCount={countFilled(w as Record<string, unknown>, [
          'cementGrade',
          'steelGrade',
          'brickType',
          'concreteGrade',
          'finishQuality',
          'preferredBrands',
        ])}
      >
        <div className={grid}>
          <Field label="Cement brand / grade">
            <Input {...register('cementGrade')} />
          </Field>
          <Field label="Steel grade">
            <Input placeholder="Fe 500D" {...register('steelGrade')} />
          </Field>
          <Field label="Brick / block type">
            <Input {...register('brickType')} />
          </Field>
          <Field label="Concrete grade">
            <Input placeholder="M25, M30" {...register('concreteGrade')} />
          </Field>
          <Field label="Finish quality" className="sm:col-span-2">
            <Controller
              name="finishQuality"
              control={control}
              render={({ field }) => (
                <RadioPills
                  value={field.value || 'Standard'}
                  onChange={field.onChange}
                  options={[
                    { value: 'Economy', label: 'Economy' },
                    { value: 'Standard', label: 'Standard' },
                    { value: 'Premium', label: 'Premium' },
                  ]}
                />
              )}
            />
          </Field>
          <Field label="Preferred brands / vendors" className="sm:col-span-2 lg:col-span-3">
            <Input placeholder="Comma-separated" {...register('preferredBrands')} />
          </Field>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Workforce & resources"
        filledCount={countFilled(w as Record<string, unknown>, [
          'availableWorkforce',
          'existingContractors',
          'ownedEquipment',
          'rentalPartners',
          'shiftPolicy',
        ])}
      >
        <div className={grid}>
          <Field label="Available workforce" className="sm:col-span-2">
            <Input placeholder="e.g. 12 masons, 6 helpers" {...register('availableWorkforce')} />
          </Field>
          <Field label="Existing contractors" className="sm:col-span-2">
            <Input placeholder="Name / trade / contact" {...register('existingContractors')} />
          </Field>
          <Field label="Owned equipment">
            <Input {...register('ownedEquipment')} />
          </Field>
          <Field label="Rental partners">
            <Input {...register('rentalPartners')} />
          </Field>
          <Field label="Shift policy" className="sm:col-span-2">
            <Controller
              name="shiftPolicy"
              control={control}
              render={({ field }) => (
                <RadioPills
                  value={field.value || 'Single'}
                  onChange={field.onChange}
                  options={[
                    { value: 'Single', label: 'Single' },
                    { value: 'Double', label: 'Double' },
                    { value: 'Night Shift', label: 'Night shift' },
                  ]}
                />
              )}
            />
          </Field>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Site constraints"
        filledCount={countFilled(w as Record<string, unknown>, [
          'siteAccessibility',
          'storageSpace',
          'locationType',
          'workingHourRestrictions',
          'seasonalConstraints',
          'nearbyRisks',
        ])}
      >
        <div className={grid}>
          <Field label="Site accessibility">
            <Controller
              name="siteAccessibility"
              control={control}
              render={({ field }) => (
                <RadioPills
                  value={field.value || ''}
                  onChange={field.onChange}
                  options={[
                    { value: 'Good', label: 'Good' },
                    { value: 'Limited', label: 'Limited' },
                    { value: 'Congested', label: 'Congested' },
                  ]}
                />
              )}
            />
          </Field>
          <Field label="Storage space">
            <Controller
              name="storageSpace"
              control={control}
              render={({ field }) => (
                <RadioPills
                  value={field.value || ''}
                  onChange={field.onChange}
                  options={[
                    { value: 'Adequate', label: 'Adequate' },
                    { value: 'Limited', label: 'Limited' },
                    { value: 'None', label: 'None' },
                  ]}
                />
              )}
            />
          </Field>
          <Field label="Location type">
            <Controller
              name="locationType"
              control={control}
              render={({ field }) => (
                <RadioPills
                  value={field.value || ''}
                  onChange={field.onChange}
                  options={[
                    { value: 'Urban', label: 'Urban' },
                    { value: 'Semi-Urban', label: 'Semi-urban' },
                    { value: 'Rural', label: 'Rural' },
                  ]}
                />
              )}
            />
          </Field>
          <Field label="Working hour restrictions" className="sm:col-span-2">
            <Input {...register('workingHourRestrictions')} />
          </Field>
          <Field label="Seasonal constraints" className="sm:col-span-2">
            <Input placeholder="e.g. Monsoon June–Sept" {...register('seasonalConstraints')} />
          </Field>
          <Field label="Nearby structures / risks" className="sm:col-span-2 lg:col-span-3">
            <Input {...register('nearbyRisks')} />
          </Field>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Procurement / supply"
        filledCount={countFilled(w as Record<string, unknown>, [
          'preferredSuppliers',
          'materialLeadTimes',
          'procurementStrategy',
          'importedMaterials',
        ])}
      >
        <div className={grid}>
          <Field label="Preferred suppliers" className="sm:col-span-2">
            <Input {...register('preferredSuppliers')} />
          </Field>
          <Field label="Material lead times" className="sm:col-span-2">
            <Input placeholder="Steel 3 weeks, tiles 2 weeks…" {...register('materialLeadTimes')} />
          </Field>
          <Field label="Procurement strategy">
            <Controller
              name="procurementStrategy"
              control={control}
              render={({ field }) => (
                <RadioPills
                  value={field.value || ''}
                  onChange={field.onChange}
                  options={[
                    { value: 'Bulk', label: 'Bulk' },
                    { value: 'Phase-wise', label: 'Phase-wise' },
                  ]}
                />
              )}
            />
          </Field>
          <Field label="Imported materials">
            <Controller
              name="importedMaterials"
              control={control}
              render={({ field }) => (
                <RadioPills
                  value={field.value || ''}
                  onChange={field.onChange}
                  options={[
                    { value: 'Yes', label: 'Yes' },
                    { value: 'No', label: 'No' },
                  ]}
                />
              )}
            />
          </Field>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Compliance & special requirements"
        filledCount={countFilled(w as Record<string, unknown>, [
          'greenBuildingTarget',
          'safetyComplianceLevel',
          'regulatoryRequirements',
          'riskTolerance',
          'contingencyPercent',
          'historicalSimilarProject',
        ])}
      >
        <div className={grid}>
          <Field label="Green building target">
            <Input placeholder="GRIHA, IGBC…" {...register('greenBuildingTarget')} />
          </Field>
          <Field label="Safety compliance level">
            <Controller
              name="safetyComplianceLevel"
              control={control}
              render={({ field }) => (
                <RadioPills
                  value={field.value || ''}
                  onChange={field.onChange}
                  options={[
                    { value: 'Basic', label: 'Basic' },
                    { value: 'Standard', label: 'Standard' },
                    { value: 'High', label: 'High' },
                  ]}
                />
              )}
            />
          </Field>
          <Field label="Regulatory requirements" className="sm:col-span-2">
            <Input {...register('regulatoryRequirements')} />
          </Field>
          <Field label="Risk tolerance">
            <Controller
              name="riskTolerance"
              control={control}
              render={({ field }) => (
                <RadioPills
                  value={field.value || ''}
                  onChange={field.onChange}
                  options={[
                    { value: 'Low', label: 'Low' },
                    { value: 'Moderate', label: 'Moderate' },
                    { value: 'High', label: 'High' },
                  ]}
                />
              )}
            />
          </Field>
          <Field label="Contingency % override (0–30)" error={errors.contingencyPercent?.message}>
            <Input type="number" min={0} max={30} placeholder="10" {...register('contingencyPercent')} />
          </Field>
          <Field label="Historical similar project" className="sm:col-span-2 lg:col-span-3">
            <Input {...register('historicalSimilarProject')} />
          </Field>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Advanced inputs"
        filledCount={countFilled(w as Record<string, unknown>, ['historicalSimilarProject', 'riskTolerance', 'contingencyPercent'])}
      >
        <p className="text-sm text-[color:var(--color-text_secondary)]">
          Capture historical references, client standards, risk tolerance, and contingency in{' '}
          <span className="font-medium text-[color:var(--color-text)]">Compliance & special requirements</span>. Use
          Additional notes for anything that does not fit the structured fields.
        </p>
      </AccordionSection>

      <AccordionSection
        title="Additional notes & custom constraints"
        defaultOpen
        filledCount={
          (w.additionalNotes ? 1 : 0) +
          (Array.isArray(w.customConstraints) ? w.customConstraints.filter((c) => c.key || c.value).length : 0)
        }
      >
        <Field label="Additional requirements, assumptions, or special notes" className="mb-4">
          <textarea
            className="min-h-[80px] w-full resize-y rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 py-2 text-[13px] text-[color:var(--color-text)] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]/35"
            placeholder="e.g. Phased handover for two towers; prefer local suppliers within 50km; noise limits after 6pm…"
            {...register('additionalNotes')}
          />
        </Field>
        <div className="space-y-2">
          {fields.map((row, index) => (
            <div key={row.id} className="flex flex-wrap items-end gap-2">
              <Field label="Constraint name" className="min-w-[140px] flex-1">
                <Input placeholder="Name" {...register(`customConstraints.${index}.key` as const)} />
              </Field>
              <Field label="Value / description" className="min-w-[180px] flex-[2]">
                <Input placeholder="Description" {...register(`customConstraints.${index}.value` as const)} />
              </Field>
              <Button type="button" variant="ghost" size="sm" className="mb-0.5 shrink-0" onClick={() => remove(index)}>
                <X className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ key: '', value: '' })}
            className="mt-1"
          >
            <Plus className="size-4" />
            Add custom constraint
          </Button>
        </div>
      </AccordionSection>
    </div>
  )
}
