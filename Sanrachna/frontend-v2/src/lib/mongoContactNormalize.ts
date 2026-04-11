import type {
  Availability,
  Contact,
  ContactDirectoryType,
  ContactRole,
  ContactType,
  ProjectPhase,
} from '@/types/contacts.types'
import type { MongoContactRow } from '@/api/projectContactsApi'

const DIRECTORY_TYPES: ContactDirectoryType[] = [
  'Internal Team',
  'Supplier',
  'External Authority',
  'Emergency',
]

function asDirectoryType(raw: string | undefined): ContactDirectoryType {
  if (raw && DIRECTORY_TYPES.includes(raw as ContactDirectoryType)) return raw as ContactDirectoryType
  return 'Internal Team'
}

function asContactRole(raw: string | undefined): ContactRole {
  if (raw === 'Owner') return 'Engineer'
  const allowed: ContactRole[] = [
    'Worker',
    'Engineer',
    'Contractor',
    'Supplier',
    'Inspector',
    'Govt Contact',
    'Safety',
    'Medical',
  ]
  if (raw && allowed.includes(raw as ContactRole)) return raw as ContactRole
  return 'Worker'
}

function asPhase(raw: string | undefined): ProjectPhase {
  const phases: ProjectPhase[] = ['Foundation', 'Structure', 'MEP', 'Finishing']
  if (raw && phases.includes(raw as ProjectPhase)) return raw as ProjectPhase
  if (raw === 'All phases' || raw === 'HSE' || raw === 'Execution' || raw === 'Materials') return 'Structure'
  return 'Foundation'
}

/** Maps Mongo `/api/projects/:id/contacts` rows into UI `Contact` records. */
export function mongoRowToContact(row: MongoContactRow): Contact {
  const directoryType = asDirectoryType(row.contactType)
  const type: ContactType =
    directoryType === 'Internal Team' ? 'Internal' : 'External'
  const availability: Availability = directoryType === 'Emergency' ? 'On Site' : 'On Site'

  return {
    id: String(row.id ?? row._id ?? ''),
    name: String(row.name ?? ''),
    title: String(row.role ?? 'Contact'),
    role: asContactRole(row.role),
    type,
    phone: String(row.phone ?? ''),
    email: String(row.email ?? ''),
    phase: asPhase(row.phase),
    responsibility: '—',
    availability,
    isEmergency: directoryType === 'Emergency',
    emergencyKind: directoryType === 'Emergency' ? 'Safety Officer' : undefined,
    directoryType,
    linked: { tasks: 0, openRfis: 0, activeIssues: 0 },
  }
}
