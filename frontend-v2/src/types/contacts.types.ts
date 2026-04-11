export type ContactRole =
  | 'Worker'
  | 'Engineer'
  | 'Contractor'
  | 'Supplier'
  | 'Inspector'
  | 'Govt Contact'
  | 'Safety'
  | 'Medical'

export type ProjectPhase = 'Foundation' | 'Structure' | 'MEP' | 'Finishing'
export type Availability = 'On Site' | 'Off-site' | 'On Leave'
export type ContactType = 'Internal' | 'External'

/** Directory / procurement category (stored on Mongo contacts as `contactType`). */
export type ContactDirectoryType = 'Internal Team' | 'Supplier' | 'External Authority' | 'Emergency'

export type DirectoryTab = 'internal' | 'suppliers' | 'authorities'

export type EmergencyKind =
  | 'Safety Officer'
  | 'Site Supervisor'
  | 'Nearest Hospital'
  | 'Fire Dept'
  | 'Structural Consultant'

export type Contact = {
  id: string
  name: string
  title: string
  role: ContactRole
  type: ContactType
  /** When set (Mongo-backed directory), shown as a badge on cards and used for filters. */
  directoryType?: ContactDirectoryType
  phone: string
  email: string
  phase: ProjectPhase
  responsibility: string
  availability: Availability
  isEmergency: boolean
  emergencyKind?: EmergencyKind
  notes?: string
  secondaryContacts?: { name: string; phone: string }[]
  linked: { tasks: number; openRfis: number; activeIssues: number }
  lastContacted?: string
}

export type Supplier = {
  id: string
  company: string
  contactName: string
  phone: string
  email: string
  materials: string[]
  leadTimeDays: number
  priceTier: '₹' | '₹₹' | '₹₹₹'
  qualityRating: number
  type: 'External'
  phase: ProjectPhase
  availability: Availability
  vendorNotes?: string
  linked: { pastOrders: number; openPo: number }
}

export type Authority = {
  id: string
  department: string
  contactName: string
  role: 'Inspector' | 'Govt Contact'
  phone: string
  email: string
  jurisdiction: string
  availability: Availability
  linked: { inspections: number; permits: number }
}

export type ContactsStats = {
  totalContacts: number
  activeOnSite: number
  suppliers: number
  emergencyContacts: number
}
