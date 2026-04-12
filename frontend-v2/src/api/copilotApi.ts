import { apiJson } from '@/api/http'

export type BackendMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  usedModules?: string[]
  followUps?: string[]
  citations?: string[]
  createdAt?: string
}

export type BackendThread = {
  id: string
  projectId: string
  title: string
  mode: string
  messages: BackendMessage[]
  createdAt: string
  updatedAt: string
}

export async function apiListThreads(projectId: string): Promise<BackendThread[]> {
  const res = await apiJson<{ threads: BackendThread[] }>(
    `/api/projects/${encodeURIComponent(projectId)}/copilot/threads`,
  )
  return res.threads ?? []
}

export async function apiCreateThread(
  projectId: string,
  title: string,
): Promise<BackendThread> {
  const res = await apiJson<{ thread: BackendThread }>(
    `/api/projects/${encodeURIComponent(projectId)}/copilot/threads`,
    { method: 'POST', body: JSON.stringify({ title, mode: 'project' }) },
  )
  return res.thread
}

export async function apiSendMessage(
  projectId: string,
  threadId: string,
  content: string,
): Promise<{ thread: BackendThread; message: BackendMessage }> {
  return apiJson<{ thread: BackendThread; message: BackendMessage }>(
    `/api/projects/${encodeURIComponent(projectId)}/copilot/threads/${encodeURIComponent(threadId)}/messages`,
    { method: 'POST', body: JSON.stringify({ content }) },
  )
}

export async function apiRenameThread(
  projectId: string,
  threadId: string,
  title: string,
): Promise<BackendThread> {
  const res = await apiJson<{ thread: BackendThread }>(
    `/api/projects/${encodeURIComponent(projectId)}/copilot/threads/${encodeURIComponent(threadId)}`,
    { method: 'PATCH', body: JSON.stringify({ title }) },
  )
  return res.thread
}

export async function apiDeleteThread(
  projectId: string,
  threadId: string,
): Promise<void> {
  await apiJson<{ success: boolean }>(
    `/api/projects/${encodeURIComponent(projectId)}/copilot/threads/${encodeURIComponent(threadId)}`,
    { method: 'DELETE' },
  )
}
