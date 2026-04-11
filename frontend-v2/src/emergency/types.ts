import type { Role } from '@/auth/AuthContext'

export type EmergencyStatus = 'raised' | 'acknowledged' | 'responding' | 'resolved' | 'archived'

export type EmergencySeverity = 'critical' | 'high' | 'medium' | 'low'

export type EmergencyIncidentType =
  | 'injury_medical'
  | 'fire_electrical'
  | 'structural_risk'
  | 'equipment_failure'
  | 'safety_hazard'
  | 'other'

export type EmergencyAssignment = {
  safetyOfficer?: string
  siteSupervisor?: string
  respondingBy?: string
}

export type EmergencyAuditEvent =
  | { kind: 'raised'; at: number; by: { id: string; name: string; role: Role }; message?: string }
  | { kind: 'acknowledged'; at: number; by: { id: string; name: string; role: Role } }
  | { kind: 'responding'; at: number; by: { id: string; name: string; role: Role } }
  | { kind: 'assigned'; at: number; by: { id: string; name: string; role: Role }; assignment: EmergencyAssignment }
  | { kind: 'escalated'; at: number; by: { id: string; name: string; role: Role }; note?: string }
  | { kind: 'resolved'; at: number; by: { id: string; name: string; role: Role }; note?: string }
  | { kind: 'archived'; at: number; by: { id: string; name: string; role: Role } }
  | { kind: 'note'; at: number; by: { id: string; name: string; role: Role }; note: string }

export type EmergencyIncident = {
  id: string
  status: EmergencyStatus
  severity: EmergencySeverity
  type: EmergencyIncidentType
  location: {
    zone: string
    lat?: number
    lng?: number
  }
  description?: string
  photoDataUrl?: string
  reportedBy: {
    id: string
    name: string
    role: Role
  }
  createdAt: number
  updatedAt: number
  assignment?: EmergencyAssignment
  audit: EmergencyAuditEvent[]
}

