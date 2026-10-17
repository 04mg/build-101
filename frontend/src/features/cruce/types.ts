export type PhaseId = 'discover' | 'explore' | 'prototype'
export type DeliverableKey = 'customer-journey' | 'interview-guide' | 'survey' | 'comparison-matrix' | 'solution-concept' | 'value-proposition' | 'critical-assumptions' | 'prototype' | 'experiment-results' | 'learnings'
export type NoteKind = 'problem' | 'segment' | 'alternative' | 'impact' | 'hypothesis' | 'source' | 'insight' | 'experiment' | 'evidence' | 'decision' | 'note' | 'deliverable'
export type NoteStatus = 'open' | 'indirect' | 'supported' | 'contradicted' | 'done'
export interface KnowledgeNote {
  id: string
  kind: NoteKind
  phase?: PhaseId
  title: string
  body: string
  status: NoteStatus
  origin: 'founder' | 'agent' | 'web' | 'experiment'
  url?: string
  quote?: string
  publishedAt?: string
  createdAt: string
  updatedAt: string
  history: { title: string; body: string; status: NoteStatus; at: string }[]
  inheritedFrom?: { projectId: number; nodeId: string }
}
export interface GraphEdge {
  id: string
  source: string
  target: string
  relation: 'affects' | 'causes' | 'uses' | 'assumes' | 'supports' | 'contradicts' | 'derived_from' | 'tests' | 'informs' | 'related'
}
export interface Question {
  id: string
  prompt: string
  options: { label: string; recommended: boolean; reason: string }[]
  placeholder: string
}
export interface Pivot { title: string; problem: string; hypothesis: string; experiment: string }
export interface ProjectDocument {
  version: 1
  activePhase: PhaseId
  revision: number
  answers: { questionId: string; prompt: string; options?: Question['options']; placeholder?: string; value: string; at: string }[]
  question: Question | null
  nodes: KnowledgeNote[]
  edges: GraphEdge[]
  positions: Record<string, Point>
  confirmed: boolean
  research: { status: 'idle' | 'running' | 'complete' | 'partial' | 'error'; message: string; at?: string }
  decision: 'persevere' | 'pivot' | 'pause' | null
  pivots: Pivot[]
  parent: { projectId: number; name: string } | null
  assistant?: AssistantTurn[]
}
export interface Point { x: number; y: number }
export interface AssistantReply { message: string; destination: 'ideation' | 'timeline' | 'people' | 'evidence' | 'research'; phase: PhaseId }
export interface AssistantTurn extends AssistantReply { question: string; at: string }
export interface Project { id: number; name: string; document: ProjectDocument; updatedAt: string; progress: number; phaseProgress: Record<PhaseId, number>; overallProgress: number; warning?: string; assistant?: AssistantReply }
export interface ProjectSummary { id: number; name: string; progress: number; phaseProgress?: Record<PhaseId, number>; activePhase?: PhaseId; parent: ProjectDocument['parent'] }
export interface Capabilities { ai: boolean; research: boolean; semanticMemory: boolean }
export interface MemoryHit { projectId: number; note: KnowledgeNote; score: number }

export const kindLabels: Record<NoteKind, string> = {
  problem: 'Problema', segment: 'Personas', alternative: 'Soluciones actuales', impact: 'Consecuencia',
  hypothesis: 'Hipótesis', source: 'Fuente', insight: 'Aprendizaje', experiment: 'Experimento',
  evidence: 'Evidencia', decision: 'Decisión', note: 'Nota',
  deliverable: 'Entregable',
}
export const statusLabels: Record<NoteStatus, string> = {
  open: 'Por contrastar', indirect: 'Señal indirecta', supported: 'Apoyo inicial', contradicted: 'Contradicha', done: 'Registrada',
}
export const relationLabels: Record<GraphEdge['relation'], string> = {
  affects: 'afecta a', causes: 'provoca', uses: 'se resuelve con', assumes: 'supone', supports: 'apoya',
  contradicts: 'contradice', derived_from: 'deriva de', tests: 'contrasta', informs: 'aporta contexto', related: 'relacionado con',
}
export const initialQuestion: Question = { id: 'idea', prompt: '¿Qué tenés en mente?', options: [], placeholder: 'Una idea, algo que te frustra o un problema que viste de cerca…' }
