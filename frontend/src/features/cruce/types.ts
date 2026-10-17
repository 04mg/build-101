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
  /** Why research last rewrote this note; the linked sources justify it. */
  rationale?: string
  publishedAt?: string
  createdAt: string
  updatedAt: string
  history: { title: string; body: string; status: NoteStatus; at: string }[]
  archived?: boolean
  discovery?: { observation: string; insight: string; opportunity: string; evidenceIds: string[] }
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
export interface SurveyQuestion { id: string; prompt: string; type: 'single' | 'multiple' | 'text' | 'scale'; required: boolean; options: string[] }
export interface SurveyDraft { title: string; intro: string; questions: SurveyQuestion[] }
export interface ValidationPlan {
  hypothesisId: string; hypothesisBody: string; epoch: number; criterion: string; validatedAt: string | null; analyzedKey: string
  rejectedAt: string | null; assessmentError: string | null
  instrumentVersion: number; instrumentStatus: 'pending' | 'ready' | 'error'; instrumentError: string | null; insightIds: string[]
  instrumentHistory: { at: string; criterion: string; survey: SurveyDraft & { version: number }; interview: { intro: string; questions: string[] } }[]
  assessment: { verdict: 'supports' | 'contradicts' | 'insufficient'; reason: string; evidenceIds: string[]; evidenceKey: string; at: string } | null
  survey: SurveyDraft & { token: string; version: number; responses: { id: string; at: string; version: number; epoch: number; answers: Record<string, string | string[] | number>; questions: SurveyQuestion[] }[] }
  interview: { intro: string; questions: string[] }
  interviews: { id: string; person: string; transcript: string; at: string; epoch: number }[]
}
export function validationCounts(plan?: ValidationPlan) {
  return { surveys: plan?.survey.responses.filter(r => r.epoch === plan.epoch && r.version === plan.survey.version).length ?? 0,
    interviews: plan?.interviews.filter(r => r.epoch === plan.epoch).length ?? 0 }
}
export function hypothesisValidated(project: Project, id: string) {
  const plan = project.document.validation?.find(p => p.hypothesisId === id), note = project.document.nodes.find(n => n.id === id)
  const counts = validationCounts(plan)
  return Boolean(plan?.validatedAt && plan.hypothesisBody === note?.body && note.status === 'supported' && counts.surveys && counts.interviews && currentAssessment(project, plan)?.verdict === 'supports')
}
export function validationEvidenceKey(project: Project, plan: ValidationPlan) {
  const doc = project.document
  const connected = new Set(doc.edges.filter(e => e.source === plan.hypothesisId || e.target === plan.hypothesisId).flatMap(e => [e.source, e.target]))
  const insights = doc.nodes.filter(n => !n.archived && connected.has(n.id) && (n.kind === 'insight' || n.kind === 'evidence'))
    .map(n => `${n.id}:${n.body}`).sort()
  return `discovery-v3:${plan.epoch}:${plan.survey.version}:${plan.survey.responses.length}:${plan.interviews.length}:${JSON.stringify(insights)}`
}
export function currentAssessment(project: Project, plan?: ValidationPlan) {
  return plan && plan.hypothesisBody === project.document.nodes.find(n => n.id === plan.hypothesisId)?.body && plan.assessment?.evidenceKey === validationEvidenceKey(project, plan) ? plan.assessment : null
}
export function hypothesisRejected(project: Project, id: string) {
  const plan = project.document.validation?.find(p => p.hypothesisId === id), assessment = currentAssessment(project, plan)
  return Boolean(plan?.rejectedAt && assessment && assessment.verdict !== 'supports')
}
export function canExplore(project: Project | null) {
  const hypotheses = project?.document.nodes.filter(n => n.kind === 'hypothesis') ?? []
  return Boolean(project?.document.confirmed && hypotheses.length === 3 && hypotheses.every(n => hypothesisValidated(project, n.id)))
}
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
  validation: ValidationPlan[]
}
export interface Point { x: number; y: number }
export interface AssistantReply { message: string; destination: 'ideation' | 'timeline' | 'people' | 'evidence' | 'research'; phase: PhaseId }
export interface AssistantTurn extends AssistantReply { question: string; at: string }
/** A note the assistant is about to change; `at` is where a new note will appear. */
export interface EditTarget { op: 'update' | 'create' | 'delete' | 'link' | 'unlink'; id: string; at?: Point }
export interface AssistantEdit { question: string; plan: string; targets: EditTarget[] }
export interface Project { id: number; name: string; document: ProjectDocument; updatedAt: string; progress: number; phaseProgress: Record<PhaseId, number>; overallProgress: number; warning?: string; assistant?: AssistantReply; edit?: AssistantEdit }
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
