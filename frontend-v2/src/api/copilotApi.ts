import { apiJson, apiFetch } from '@/api/http'

export type BackendMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  usedModules?: string[]
  followUps?: string[]
  citations?: string[]
  imageBase64?: string | null
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
  language: string = 'English',
  imageBase64?: string | null,
  signal?: AbortSignal,
  onChunk?: (text: string) => void
): Promise<{ message: BackendMessage }> {
  const response = await apiFetch(
    `/api/projects/${encodeURIComponent(projectId)}/copilot/threads/${encodeURIComponent(threadId)}/messages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, language, imageBase64 }),
      signal,
    }
  )

  if (!response.body) {
    throw new Error('ReadableStream not supported or missing body.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let done = false
  let resultMeta: Partial<BackendMessage> = {}

  while (!done) {
    const { value, done: readerDone } = await reader.read()
    done = readerDone
    if (value) {
      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.done) {
              resultMeta = {
                id: data.messageId,
                usedModules: data.usedModules,
                followUps: data.followUps,
                citations: data.citations,
              }
            } else if (data.text && onChunk) {
              onChunk(data.text)
            }
          } catch (e) {
            console.error('Failed to parse SSE data', line, e)
          }
        }
      }
    }
  }

  return {
    message: {
      id: resultMeta.id || String(Date.now()),
      role: 'assistant',
      content: '', // content is streamed
      usedModules: resultMeta.usedModules || [],
      followUps: resultMeta.followUps || [],
      citations: resultMeta.citations || [],
    }
  }
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
