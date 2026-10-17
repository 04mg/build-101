import { z } from 'zod';

export const phaseSchema = z.enum(['discover', 'explore', 'prototype']);
export const kindSchema = z.enum(['problem', 'segment', 'alternative', 'impact', 'hypothesis', 'source', 'insight', 'experiment', 'evidence', 'decision', 'note', 'deliverable']);
export const statusSchema = z.enum(['open', 'indirect', 'supported', 'contradicted', 'done']);
export const positionSchema = z.object({ x: z.number().finite().min(-20000).max(20000), y: z.number().finite().min(-20000).max(20000) });
const revisionSchema = z.object({ title: z.string(), body: z.string(), status: statusSchema, at: z.string() });
export const noteSchema = z.object({
  id: z.string().min(1).max(100), kind: kindSchema,
  phase: phaseSchema.default('discover'),
  title: z.string().max(180), body: z.string().max(8000), status: statusSchema,
  origin: z.enum(['founder', 'agent', 'web', 'experiment']),
  url: z.string().max(2000).optional(), quote: z.string().max(6000).optional(),
  // Why research last rewrote this note; its sources are the notes linked to it.
  rationale: z.string().max(1500).optional(),
  publishedAt: z.string().optional(), createdAt: z.string(), updatedAt: z.string(),
  history: z.array(revisionSchema).default([]),
  embedding: z.array(z.number().finite()).optional(), embeddingModel: z.string().optional(),
  inheritedFrom: z.object({ projectId: z.number(), nodeId: z.string() }).optional(),
});
export type Note = z.infer<typeof noteSchema>;
export const edgeSchema = z.object({
  id: z.string().max(150), source: z.string().max(100), target: z.string().max(100),
  relation: z.enum(['affects', 'causes', 'uses', 'assumes', 'supports', 'contradicts', 'derived_from', 'tests', 'informs', 'related']),
});
export type GraphEdge = z.infer<typeof edgeSchema>;
export const questionSchema = z.object({
  id: z.string(), prompt: z.string().max(600),
  options: z.array(z.object({ label: z.string().max(200), recommended: z.boolean(), reason: z.string().max(250) })).max(4),
  placeholder: z.string().max(250),
});
export type Question = z.infer<typeof questionSchema>;
export const destinationSchema = z.enum(['ideation', 'timeline', 'people', 'evidence', 'research']);
const assistantTurnSchema = z.object({ question: z.string(), message: z.string(), destination: destinationSchema, phase: phaseSchema, at: z.string() });
export const documentSchema = z.object({
  version: z.literal(1), revision: z.number().int().nonnegative(),
  activePhase: phaseSchema.default('discover'),
  // Each answer keeps the question as it was asked, so the chat can show it and rewind to it.
  answers: z.array(z.object({ questionId: z.string(), prompt: z.string(), options: questionSchema.shape.options.optional(), placeholder: z.string().optional(), value: z.string().max(4000), at: z.string() })).max(12),
  question: questionSchema.nullable(),
  nodes: z.array(noteSchema).max(250), edges: z.array(edgeSchema).max(600),
  positions: z.record(z.string(), positionSchema), confirmed: z.boolean(),
  research: z.object({ status: z.enum(['idle', 'running', 'complete', 'partial', 'error']), message: z.string(), at: z.string().optional() }),
  decision: z.enum(['persevere', 'pivot', 'pause']).nullable(),
  pivots: z.array(z.object({ title: z.string(), problem: z.string(), hypothesis: z.string(), experiment: z.string() })).default([]),
  parent: z.object({ projectId: z.number(), name: z.string() }).nullable(),
  // Conversation with the bottom assistant, newest last.
  assistant: z.array(assistantTurnSchema).default([]),
});
export type ProjectDocument = z.infer<typeof documentSchema>;
export type Project = { id: number; name: string; document: ProjectDocument; updatedAt: string };

export const initialQuestion: Question = {
  id: 'idea', prompt: '¿Qué tenés en mente?', options: [],
  placeholder: 'Una idea, un problema que viste o algo que te gustaría cambiar…',
};

export function emptyDocument(): ProjectDocument {
  return { version: 1, revision: 0, activePhase: 'discover', answers: [], question: initialQuestion, nodes: [], edges: [], positions: {}, confirmed: false,
    research: { status: 'idle', message: '' }, decision: null, pivots: [], parent: null, assistant: [] };
}

export function progress(doc: ProjectDocument) {
  return (doc.confirmed ? 15 : Math.min(10, doc.answers.length * 2))
    + (doc.research.status === 'complete' ? 20 : doc.research.status === 'partial' ? 10 : 0)
    + (doc.nodes.some(n => n.kind === 'hypothesis') ? 15 : 0)
    + (doc.nodes.some(n => n.kind === 'experiment') ? 10 : 0)
    + (doc.nodes.some(n => n.kind === 'evidence' && n.status === 'done') ? 25 : 0)
    + (doc.decision ? 15 : 0);
}

export function putNote(doc: ProjectDocument, input: Pick<Note, 'id' | 'kind' | 'title' | 'body'> & Partial<Note>, position?: { x: number; y: number }) {
  const now = new Date().toISOString();
  const old = doc.nodes.find(n => n.id === input.id);
  if (old) {
    const changed = old.title !== input.title || old.body !== input.body || (input.status && input.status !== old.status);
    const { embedding: _embedding, embeddingModel: _model, ...rest } = old;
    Object.assign(old, changed ? rest : old, input, { updatedAt: now });
    if (changed) {
      old.history = [...old.history, { title: rest.title, body: rest.body, status: rest.status, at: rest.updatedAt }];
      delete old.embedding; delete old.embeddingModel;
    }
  } else {
    doc.nodes.push({ status: 'open', phase: 'discover', origin: 'agent', createdAt: now, updatedAt: now, history: [], ...input });
  }
  if (position && !doc.positions[input.id]) doc.positions[input.id] = position;
}

export function link(doc: ProjectDocument, source: string, target: string, relation: GraphEdge['relation']) {
  if (source === target || !doc.nodes.some(n => n.id === source) || !doc.nodes.some(n => n.id === target)) return;
  const id = `${source}:${relation}:${target}`;
  if (!doc.edges.some(e => e.id === id)) doc.edges.push({ id, source, target, relation });
}

export function publicProject(project: Project) {
  const phaseProgress = { discover: progress(project.document), explore: deliverableProgress(project.document, ['solution-concept', 'value-proposition', 'critical-assumptions']), prototype: deliverableProgress(project.document, ['prototype', 'experiment-results', 'learnings']) };
  return { ...project, progress: phaseProgress.discover, phaseProgress, overallProgress: Math.round((phaseProgress.discover + phaseProgress.explore + phaseProgress.prototype) / 3), document: { ...project.document,
    nodes: project.document.nodes.map(({ embedding: _embedding, embeddingModel: _model, ...note }) => note) } };
}

function deliverableProgress(doc: ProjectDocument, keys: string[]) {
  return Math.round(keys.reduce((total, key) => {
    const note = doc.nodes.find(n => n.id === `deliverable-${key}`);
    return total + (!note?.body.trim() || note.status === 'indirect' ? 0 : note.status === 'done' ? 2 : 1);
  }, 0) / (keys.length * 2) * 100);
}
