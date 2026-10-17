import { agentHeaders } from '@/features/agent-demo/api/session'
import type { Capabilities, MemoryHit, Project, ProjectSummary } from './types'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

export async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/agents/cruce/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...await agentHeaders(), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const value = await response.json().catch(() => ({ error: 'El servidor no pudo completar la solicitud.' }))
  if (!response.ok) throw new ApiError(value.error || 'No se pudo completar la solicitud.', response.status)
  return value as T
}

export const listProjects = () => request<{ projects: ProjectSummary[]; capabilities: Capabilities }>('projects')
export const getProject = (id: number) => request<Project>(`projects/${id}`)
export const createProject = (idea: string) => request<Project>('projects', { idea })
export const updateProject = (project: Project, action: Record<string, unknown>) => request<Project>(`projects/${project.id}`, { ...action, revision: project.document.revision })
export const researchProject = (id: number) => request<Project>(`projects/${id}/research`, {})
export const findMemory = (query: string) => request<{ mode: 'hybrid' | 'text'; hits: MemoryHit[] }>(`memory?q=${encodeURIComponent(query)}`)
