import { apiJson } from '@/api/http'

export type MongoContactRow = {
  id?: string
  _id?: string
  name?: string
  role?: string
  phone?: string
  email?: string
  phase?: string
  contactType?: string
}

export async function listProjectContacts(projectId: string): Promise<{ contacts: MongoContactRow[] }> {
  return apiJson<{ contacts: MongoContactRow[] }>(
    `/api/projects/${encodeURIComponent(projectId)}/contacts`,
  )
}

export async function createProjectContact(
  projectId: string,
  body: {
    name: string
    phone: string
    email?: string
    role?: string
    phase?: string
    contactType: string
  },
): Promise<{ contact: MongoContactRow }> {
  return apiJson<{ contact: MongoContactRow }>(
    `/api/projects/${encodeURIComponent(projectId)}/contacts`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )
}
