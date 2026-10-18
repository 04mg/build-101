import { z } from 'zod';

export const phaseSchema = z.enum(['discover', 'explore', 'prototype']);
export const kindSchema = z.enum(['problem', 'segment', 'alternative', 'impact', 'hypothesis', 'source', 'insight', 'experiment', 'evidence', 'decision', 'note', 'deliverable']);
export const statusSchema = z.enum(['open', 'indirect', 'supported', 'contradicted', 'done']);
export const positionSchema = z.object({ x: z.number().finite().min(-20000).max(20000), y: z.number().finite().min(-20000).max(20000) });
const revisionSchema = z.object({ title: z.string(), body: z.string(), status: statusSchema, at: z.string() });
export const discoverySchema = z.object({ observation: z.string().trim().min(10).max(700), insight: z.string().trim().min(10).max(700),
  opportunity: z.string().trim().min(10).max(450).regex(/^¿?Cómo podríamos/i), evidenceIds: z.array(z.string()).min(1).max(100) });
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
  archived: z.boolean().default(false), discovery: discoverySchema.optional(),
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
export const surveyQuestionSchema = z.object({
  id: z.string().min(1).max(80), prompt: z.string().trim().min(1).max(600),
  type: z.enum(['single', 'multiple', 'text', 'scale']), required: z.boolean(),
  options: z.array(z.string().trim().min(1).max(200)).max(10),
});
export const surveyDraftSchema = z.object({
  title: z.string().trim().min(1).max(180), intro: z.string().max(1000),
  questions: z.array(surveyQuestionSchema).min(2).max(10),
}).superRefine((survey, ctx) => {
  if (new Set(survey.questions.map(q => q.id)).size !== survey.questions.length) ctx.addIssue({ code: 'custom', message: 'Las preguntas deben tener identificadores únicos.' });
  survey.questions.forEach((q, i) => {
    if ((q.type === 'single' || q.type === 'multiple') && (q.options.length < 2 || new Set(q.options).size !== q.options.length)) ctx.addIssue({ code: 'custom', path: ['questions', i], message: 'Usá al menos dos opciones diferentes.' });
    if (q.type === 'text' && q.required) ctx.addIssue({ code: 'custom', path: ['questions', i], message: 'Las preguntas abiertas son opcionales.' });
  });
});
export const validationPlanSchema = z.object({
  hypothesisId: z.string(), hypothesisBody: z.string(), epoch: z.number().int().default(1),
  criterion: z.string().max(1500), validatedAt: z.string().nullable().default(null), analyzedKey: z.string().default(''),
  rejectedAt: z.string().nullable().default(null), assessmentError: z.string().nullable().default(null),
  instrumentVersion: z.number().int().default(0), instrumentStatus: z.enum(['pending', 'ready', 'error']).default('pending'), instrumentError: z.string().nullable().default(null),
  insightIds: z.array(z.string()).default([]),
  instrumentHistory: z.array(z.object({ at: z.string(), criterion: z.string(), survey: z.object({ title: z.string(), intro: z.string(), version: z.number().int(), questions: z.array(surveyQuestionSchema) }),
    interview: z.object({ intro: z.string(), questions: z.array(z.string()) }) })).default([]),
  assessment: z.object({ verdict: z.enum(['supports', 'contradicts', 'insufficient']), reason: z.string().min(1).max(1800),
    evidenceIds: z.array(z.string()).max(100), evidenceKey: z.string(), at: z.string(),
  }).nullable().default(null),
  survey: z.object({ title: z.string(), intro: z.string(), questions: z.array(surveyQuestionSchema), token: z.string(), version: z.number().int(),
    responses: z.array(z.object({ id: z.string(), at: z.string(), version: z.number().int(), epoch: z.number().int(),
      answers: z.record(z.string(), z.union([z.string(), z.array(z.string()), z.number()])),
      questions: z.array(surveyQuestionSchema),
    })).default([]),
  }),
  interview: z.object({ intro: z.string(), questions: z.array(z.string().min(1).max(600)).max(10) }),
  interviews: z.array(z.object({ id: z.string(), person: z.string().min(1).max(1000), transcript: z.string().min(1).max(30000), at: z.string(), epoch: z.number().int() })).default([]),
});
export type ValidationPlan = z.infer<typeof validationPlanSchema>;
const jobSchema = { status: z.enum(['idle', 'running', 'ready', 'error']).default('idle'), error: z.string().nullable().default(null), at: z.string().nullable().default(null) };
const scoreSchema = z.object({ criterionId: z.string().max(40), score: z.number().int().min(0).max(3).nullable(), note: z.string().max(240) });
// Explore: a matrix that scores current alternatives and proposed solutions on
// criteria taken from the Discover insights; the founder picks one solution.
export const exploreSchema = z.object({ ...jobSchema, task: z.enum(['matrix', 'deliverables']).default('matrix'),
  criteria: z.array(z.object({ id: z.string().max(40), label: z.string().max(80), insightId: z.string().max(100).nullable() })).max(6).default([]),
  rows: z.array(z.object({ id: z.string().max(40), type: z.enum(['current', 'competitor', 'solution']), name: z.string().max(120), summary: z.string().max(400),
    url: z.string().max(2000).nullable(), hmw: z.string().max(450).nullable(), scores: z.array(scoreSchema).max(6) })).max(10).default([]),
  chosenId: z.string().nullable().default(null),
});
export type ExploreState = z.infer<typeof exploreSchema>;
export const landingAssessmentSchema = z.object({ verdict: z.enum(['supports', 'contradicts', 'insufficient']), reason: z.string().max(1200), statsKey: z.string(), at: z.string() });
// Prototype: one landing for the chosen solution, iterated by chat, with three
// hypotheses its traffic and leads can support or contradict.
export const prototypeSchema = z.object({ ...jobSchema, task: z.enum(['landing', 'iterate']).default('landing'),
  solutionId: z.string().nullable().default(null), token: z.string().nullable().default(null),
  html: z.string().max(200000).default(''), version: z.number().int().nonnegative().default(0), pending: z.string().max(1500).nullable().default(null),
  chat: z.array(z.object({ role: z.enum(['founder', 'cofounder']), text: z.string().max(1500), at: z.string() })).max(60).default([]),
  hypotheses: z.array(z.object({ id: z.string().max(40), statement: z.string().max(400), signal: z.string().max(300), criterion: z.string().max(300),
    assessment: landingAssessmentSchema.nullable().default(null), decision: z.enum(['validated', 'rejected']).nullable().default(null), decidedAt: z.string().nullable().default(null) })).max(3).default([]),
});
export type PrototypeState = z.infer<typeof prototypeSchema>;
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
  validation: z.array(validationPlanSchema).default([]),
  intake: z.object({ status: z.enum(['idle', 'running', 'error']), id: z.string().nullable(), questionId: z.string().nullable(),
    message: z.string(), startedAt: z.string().nullable(),
    // Who runs the turn: the Claude job on the server, or GPT-Realtime from the founder's browser.
    engine: z.enum(['claude', 'realtime']).optional() }).default({ status: 'idle', id: null, questionId: null, message: '', startedAt: null }),
  explore: exploreSchema.default(() => exploreSchema.parse({})),
  prototype: prototypeSchema.default(() => prototypeSchema.parse({})),
});
export type ProjectDocument = z.infer<typeof documentSchema>;
export type Project = { id: number; name: string; document: ProjectDocument; updatedAt: string };

export const initialQuestion: Question = {
  id: 'idea', prompt: '¿Qué tenés en mente?', options: [],
  placeholder: 'Una idea, un problema que viste o algo que te gustaría cambiar…',
};

export function emptyDocument(): ProjectDocument {
  return { version: 1, revision: 0, activePhase: 'discover', answers: [], question: initialQuestion, nodes: [], edges: [], positions: {}, confirmed: false,
    research: { status: 'idle', message: '' }, decision: null, pivots: [], parent: null, assistant: [], validation: [],
    intake: { status: 'idle', id: null, questionId: null, message: '', startedAt: null }, explore: exploreSchema.parse({}), prototype: prototypeSchema.parse({}) };
}

export function progress(doc: ProjectDocument) {
  return doc.confirmed ? 25 + doc.nodes.filter(n => n.kind === 'hypothesis').slice(0, 3).filter(n => hypothesisValidated(doc, n.id)).length * 25 : 0;
}

export function validationCounts(plan: ValidationPlan) {
  return { surveys: plan.survey.responses.filter(r => r.epoch === plan.epoch && r.version === plan.survey.version).length,
    interviews: plan.interviews.filter(r => r.epoch === plan.epoch).length };
}
export function hypothesisValidated(doc: ProjectDocument, id: string) {
  const plan = doc.validation.find(p => p.hypothesisId === id), note = doc.nodes.find(n => n.id === id);
  if (!plan || !plan.validatedAt || plan.hypothesisBody !== note?.body) return false;
  const counts = validationCounts(plan);
  return (counts.surveys > 0 || counts.interviews > 0) && note.status === 'supported' && currentAssessment(doc, plan)?.verdict === 'supports';
}
export function validationEvidenceKey(doc: ProjectDocument, plan: ValidationPlan) {
  const connected = new Set(doc.edges.filter(e => e.source === plan.hypothesisId || e.target === plan.hypothesisId).flatMap(e => [e.source, e.target]));
  const insights = doc.nodes.filter(n => !n.archived && connected.has(n.id) && (n.kind === 'insight' || n.kind === 'evidence'))
    .map(n => `${n.id}:${n.body}`).sort();
  return `discovery-v3:${plan.epoch}:${plan.survey.version}:${plan.survey.responses.length}:${plan.interviews.length}:${JSON.stringify(insights)}`;
}
export function currentAssessment(doc: ProjectDocument, plan: ValidationPlan) {
  return plan.hypothesisBody === doc.nodes.find(n => n.id === plan.hypothesisId)?.body && plan.assessment?.evidenceKey === validationEvidenceKey(doc, plan) ? plan.assessment : null;
}
export function canExplore(doc: ProjectDocument) {
  const hypotheses = doc.nodes.filter(n => n.kind === 'hypothesis');
  // One validated hypothesis is enough to move on (lighter gate for demos).
  return doc.confirmed && hypotheses.some(n => hypothesisValidated(doc, n.id));
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
    doc.nodes.push({ status: 'open', phase: 'discover', origin: 'agent', archived: false, createdAt: now, updatedAt: now, history: [], ...input });
  }
  if (position && !doc.positions[input.id]) doc.positions[input.id] = position;
}

export function link(doc: ProjectDocument, source: string, target: string, relation: GraphEdge['relation']) {
  if (source === target || !doc.nodes.some(n => n.id === source) || !doc.nodes.some(n => n.id === target)) return;
  const id = `${source}:${relation}:${target}`;
  if (!doc.edges.some(e => e.id === id)) doc.edges.push({ id, source, target, relation });
}

// The experiment sits to the right of the three hypotheses (x −340, −30, 280).
export const EXPERIMENT_SPOT = { x: 620, y: 530 };

// Cards are 220×180 on the canvas; slots keep a 30px margin around each one.
const clear = (taken: { x: number; y: number }[], spot: { x: number; y: number }) => taken.every(p => Math.abs(p.x - spot.x) > 250 || Math.abs(p.y - spot.y) > 210);
function obstacles(doc: ProjectDocument, positions = doc.positions) {
  // Sources render as lists beside their note, so their stored positions are not obstacles.
  const sources = new Set(doc.nodes.filter(n => n.kind === 'source').map(n => n.id));
  return Object.entries(positions).filter(([id]) => !sources.has(id) && !id.startsWith('sources:')).map(([, p]) => p);
}

// First free slot on rings around `near`, skipping notes and reserved slots.
export function freeSpot(doc: ProjectDocument, near: { x: number; y: number }, reserved: { x: number; y: number }[] = [], positions = doc.positions) {
  const taken = [...obstacles(doc, positions), ...reserved];
  if (clear(taken, near)) return near;
  for (let ring = 1; ring < 8; ring++) {
    for (let step = 0; step < ring * 8; step++) {
      const angle = (step / (ring * 8)) * Math.PI * 2;
      const spot = { x: Math.round(near.x + Math.cos(angle) * ring * 290), y: Math.round(near.y + Math.sin(angle) * ring * 250) };
      if (clear(taken, spot)) return spot;
    }
  }
  return { x: near.x + 300, y: near.y + 260 };
}

// First free slot in the column under a note (insights stack under their hypothesis).
export function slotBelow(doc: ProjectDocument, anchorId: string) {
  const anchor = doc.positions[anchorId] ?? { x: 0, y: 530 }, taken = obstacles(doc);
  for (let y = anchor.y + 240; y < anchor.y + 240 + 20 * 220; y += 220) if (clear(taken, { x: anchor.x, y })) return { x: anchor.x, y };
  return freeSpot(doc, { x: anchor.x, y: anchor.y + 240 });
}

// Insights (and their HMW) come only from survey or interview responses. Web
// research used to publish its own; those stay in storage but never surface.
export const webInsight = (n: Note) => n.kind === 'insight' && n.origin === 'agent' && n.status === 'indirect' && !n.inheritedFrom;

export function publicProject(project: Project) {
  const phaseProgress = { discover: progress(project.document), explore: exploreProgress(project.document), prototype: prototypeProgress(project.document) };
  const nodes = project.document.nodes.filter(n => !n.archived && (n.kind !== 'insight' || n.origin === 'founder' || (n.discovery && !webInsight(n)))), visible = new Set(nodes.map(n => n.id));
  // Notes saved without a position (older experiments) would all stack on the problem.
  const positions = { ...project.document.positions };
  for (const note of nodes.filter(n => n.kind !== 'source' && !positions[n.id])) positions[note.id] = freeSpot(project.document, note.kind === 'experiment' ? EXPERIMENT_SPOT : { x: 0, y: 0 }, [], positions);
  // The landing is served at /l/:token; the workspace previews it there, not in every poll.
  const prototype = { ...project.document.prototype, html: '', hasLanding: Boolean(project.document.prototype.html) };
  return { ...project, progress: phaseProgress.discover, phaseProgress, overallProgress: Math.round((phaseProgress.discover + phaseProgress.explore + phaseProgress.prototype) / 3), document: { ...project.document, positions, prototype,
    nodes: nodes.map(({ embedding: _embedding, embeddingModel: _model, ...note }) => note), edges: project.document.edges.filter(e => visible.has(e.source) && visible.has(e.target)) } };
}

// Draft deliverables count half; approved ones count whole.
function deliverableUnits(doc: ProjectDocument, keys: string[]) {
  return keys.reduce((total, key) => {
    const note = doc.nodes.find(n => n.id === `deliverable-${key}`);
    return total + (!note?.body.trim() || note.status === 'indirect' ? 0 : note.status === 'done' ? 1 : 0.5);
  }, 0);
}
export const exploreDeliverables = ['solution-concept', 'value-proposition', 'critical-assumptions'] as const;
// Explore: matrix, chosen solution and its three deliverables.
export function exploreProgress(doc: ProjectDocument) {
  const units = (doc.explore.rows.length ? 1 : 0) + (chosenSolution(doc) ? 1 : 0) + deliverableUnits(doc, [...exploreDeliverables]);
  return Math.round(units / 5 * 100);
}
// Prototype: the landing is live, then each of its three hypotheses gets a verdict.
export function prototypeProgress(doc: ProjectDocument) {
  const p = doc.prototype, live = Boolean(p.html && p.solutionId === doc.explore.chosenId);
  return live ? 25 + p.hypotheses.slice(0, 3).filter(h => h.decision).length * 25 : 0;
}
export function chosenSolution(doc: ProjectDocument) {
  return doc.explore.rows.find(r => r.type === 'solution' && r.id === doc.explore.chosenId);
}
