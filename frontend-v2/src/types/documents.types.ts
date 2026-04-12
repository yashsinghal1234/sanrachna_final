export type DocPhase = 'Design' | 'Foundation' | 'Structure' | 'MEP' | 'Finishing'
export type DocKind =
  | 'Blueprint'
  | 'Contract'
  | 'Permit'
  | 'Inspection'
  | 'Soil Report'
  | 'Invoice'
  | 'Other'
export type DocReviewStatus = 'Approved' | 'Under Review' | 'Requires Attention'
export type AccessLevel = 'Restricted' | 'Public-to-Team' | 'Owner+PM'

export interface VersionEntry {
  version: number
  uploadedAt: string
  uploadedBy: string
  archived: boolean
}

export interface ProjectDocument {
  id: string
  name: string
  description: string
  tags: string[]
  type: DocKind
  phase: DocPhase
  currentVersion: number
  uploadedBy: string
  uploadedAt: string
  access: AccessLevel
  reviewStatus: DocReviewStatus
  linkedRfis: number
  linkedIssues: number
  versions: VersionEntry[]
  /** API path under backend base URL for authenticated file access (null = metadata-only). */
  fileUrl?: string | null
  /** Original upload filename when available. */
  originalFilename?: string
}
