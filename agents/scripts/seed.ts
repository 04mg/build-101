// Loads the demo base: a clean database (only admins survive), the library of
// documented experiences (seed/data/experiences-*.json) with embeddings, and the
// founders of the network (seed/data/founders.json) with their projects,
// projected into the shared memory. Agents are not told about any of this: they
// find it through the same retrieval and network matching real data goes through.
//
// Run with TrailBase up (./start.sh): pnpm --dir agents seed
// `pnpm --dir agents seed --update` keeps everything and only creates or
// replaces the founders' projects from founders.json.
import { randomUUID } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { loadConfig } from '../src/config.js';
import { register } from '../src/register.js';
import { embed, EMBEDDING_MODEL, experienceText, type Experience } from '../src/cruce/experiences.js';
import { networkNotes } from '../src/cruce/network.js';
import { documentSchema, emptyDocument, link, putNote, slotBelow, surveyQuestionSchema, validationEvidenceKey, type ProjectDocument } from '../src/cruce/model.js';
import { discoveryBody, ensureValidation, INSTRUMENT_VERSION } from '../src/cruce/validation.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dataDir = `${root}seed/data/`;
const config = loadConfig();

const experienceSchema = z.object({
  id: z.string().min(3), company: z.string().min(1), country: z.string().default(''), year: z.string().default(''),
  kind: z.enum(['failure', 'pivot', 'success']), sector: z.string().default(''), title: z.string().min(3), summary: z.string().min(20),
  tried: z.string().default(''), outcome: z.string().default(''), lessons: z.array(z.string()).default([]), tags: z.array(z.string()).default([]),
  quote: z.string().default(''), urls: z.array(z.string().url()).min(1), origin: z.string().default(''),
});
// Evidence for a resolved hypothesis: the same records the app stores after a real validation.
const validationSchema = z.object({
  criterion: z.string().min(20),
  survey: z.object({ title: z.string(), intro: z.string(), questions: z.array(surveyQuestionSchema).min(2) }),
  responses: z.array(z.record(z.string(), z.union([z.string(), z.array(z.string()), z.number()]))).min(1),
  interview: z.object({ intro: z.string(), questions: z.array(z.string()).min(3) }),
  interviews: z.array(z.object({ person: z.string(), transcript: z.string().min(40) })).min(1),
  insight: z.object({ title: z.string(), observation: z.string(), insight: z.string(), opportunity: z.string().regex(/^¿?Cómo podríamos/i) }),
  assessment: z.string().min(10),
});
const founderSchema = z.object({
  email: z.email(), password: z.string().min(8), name: z.string().min(2).max(60),
  basedOn: z.array(z.string()).default([]),
  answers: z.array(z.object({ prompt: z.string(), value: z.string().min(10) })).min(1),
  problem: z.string().min(20), segment: z.string().default(''), currentProcess: z.string().default(''), painPoints: z.string().default(''),
  confirmed: z.boolean().default(true),
  hypotheses: z.array(z.object({ title: z.string(), body: z.string(), status: z.enum(['testing', 'rejected', 'validated']).default('testing'),
    evidence: z.object({ title: z.string(), body: z.string(), url: z.string().url().optional() }).optional(),
    validation: validationSchema.optional() })).length(3),
  decision: z.object({ decision: z.enum(['persevere', 'pivot', 'pause']), reason: z.string() }).optional(),
});
type Founder = z.infer<typeof founderSchema>;

function open() {
  const db = new DatabaseSync(`${root}backend/data/main.db`);
  db.exec('PRAGMA busy_timeout = 10000; PRAGMA foreign_keys = ON');
  // TrailBase's CHECK constraints call its own SQL functions.
  db.function('is_email', { deterministic: true }, value => value === null || /^[^\s@]+@[^\s@]+$/.test(String(value)) ? 1 : 0);
  db.function('is_uuid', { deterministic: true }, (_value: unknown) => 1);
  db.function('jsonschema', { deterministic: true, varargs: true }, (..._args: unknown[]) => 1);
  return db;
}

async function memory(path: string, body: unknown) {
  const response = await fetch(`${config.memoryUrl}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`memory ${path} ${response.status}`);
  return response.json();
}

/** The id TrailBase puts in `sub`: the user's UUID bytes as padded base64url. */
function subject(id: Uint8Array) {
  const value = Buffer.from(id).toString('base64url');
  return value + '='.repeat((4 - value.length % 4) % 4);
}

// The same shape the grill and the evidence form produce, built with the model's helpers.
function buildDocument(founder: Founder): ProjectDocument {
  const doc = emptyDocument();
  const now = new Date().toISOString();
  doc.answers = founder.answers.map((answer, i) => ({ questionId: i ? `seed-${i}` : 'idea', prompt: answer.prompt, value: answer.value, at: now }));
  putNote(doc, { id: 'problem', kind: 'problem', title: 'Problema', body: founder.problem, origin: 'founder' }, { x: 0, y: 0 });
  for (const [kind, title, body, position, relation] of [
    ['segment', 'Personas afectadas', founder.segment, { x: -350, y: -220 }, 'affects'],
    ['alternative', 'Proceso actual', founder.currentProcess, { x: 300, y: -230 }, 'uses'],
    ['impact', 'Pain points', founder.painPoints, { x: 330, y: 70 }, 'causes'],
  ] as const) {
    if (!body.trim()) continue;
    putNote(doc, { id: kind, kind, title, body }, position); link(doc, 'problem', kind, relation);
  }
  founder.hypotheses.forEach((hypothesis, i) => {
    const id = `hypothesis-${i}`;
    putNote(doc, { id, kind: 'hypothesis', title: hypothesis.title, body: hypothesis.body }, { x: -340 + i * 310, y: 530 });
    link(doc, 'problem', id, 'assumes');
  });
  doc.question = null;
  doc.confirmed = founder.confirmed;
  ensureValidation(doc);
  founder.hypotheses.forEach((hypothesis, i) => {
    if (hypothesis.status === 'testing') return;
    const id = `hypothesis-${i}`, plan = doc.validation.find(p => p.hypothesisId === id)!;
    const evidence = hypothesis.validation;
    if (evidence) {
      // Instruments, answers and interviews as the validation workspace stores them.
      plan.criterion = evidence.criterion;
      Object.assign(plan.survey, evidence.survey);
      plan.interview = evidence.interview;
      plan.instrumentStatus = 'ready'; plan.instrumentVersion = INSTRUMENT_VERSION;
      plan.survey.responses = evidence.responses.map(answers => ({ id: randomUUID(), at: now, version: plan.survey.version, epoch: plan.epoch, answers, questions: evidence.survey.questions }));
      plan.interviews = evidence.interviews.map(record => ({ id: randomUUID(), person: record.person, transcript: record.transcript, at: now, epoch: plan.epoch }));
      const evidenceIds = [...plan.survey.responses, ...plan.interviews].map(r => r.id);
      const discovery = { observation: evidence.insight.observation, insight: evidence.insight.insight, opportunity: evidence.insight.opportunity, evidenceIds };
      const insightId = `insight-${randomUUID().slice(0, 8)}`;
      putNote(doc, { id: insightId, kind: 'insight', title: evidence.insight.title, body: discoveryBody(discovery), discovery, origin: 'agent', status: 'open' }, slotBelow(doc, id));
      link(doc, insightId, id, 'informs');
      plan.insightIds.push(insightId);
    }
    if (hypothesis.evidence) {
      const evidenceId = `evidence-${randomUUID()}`;
      putNote(doc, { id: evidenceId, kind: 'evidence', title: hypothesis.evidence.title, body: hypothesis.evidence.body, origin: 'experiment', status: 'done', url: hypothesis.evidence.url },
        { x: -650, y: 830 + doc.nodes.filter(n => n.kind === 'evidence').length * 240 });
      link(doc, evidenceId, id, hypothesis.status === 'validated' ? 'supports' : 'contradicts');
    }
    putNote(doc, { ...doc.nodes.find(n => n.id === id)!, status: hypothesis.status === 'validated' ? 'supported' : 'contradicted' });
    if (hypothesis.status === 'validated') plan.validatedAt = now; else plan.rejectedAt = now;
    if (evidence) {
      // The assessment is bound to this exact evidence, so the app treats it as current and does not re-analyze it.
      const key = validationEvidenceKey(doc, plan);
      plan.assessment = { verdict: hypothesis.status === 'validated' ? 'supports' : 'contradicts', reason: evidence.assessment,
        evidenceIds: [...plan.survey.responses, ...plan.interviews].map(r => r.id), evidenceKey: key, at: now };
      plan.analyzedKey = key;
    }
  });
  if (founder.decision) {
    doc.decision = founder.decision.decision;
    putNote(doc, { id: 'decision', kind: 'decision', title: 'Decisión', body: founder.decision.reason, status: 'done' }, { x: 650, y: 530 });
  }
  // Fails here, not in the app, if a seeded project would not load.
  return documentSchema.parse(doc);
}

async function seedFounder(db: DatabaseSync, founder: Founder) {
  if (!db.prepare('SELECT 1 FROM _user WHERE email = ?').get(founder.email)) await register({ email: founder.email, password: founder.password }, config.trailbaseUrl);
  const user = db.prepare('SELECT id FROM _user WHERE email = ?').get(founder.email) as { id: Uint8Array };
  const doc = buildDocument(founder), now = new Date().toISOString();
  const existing = db.prepare("SELECT id, document->>'$.revision' AS revision FROM cruce_projects WHERE owner = ? AND name = ?").get(user.id, founder.name) as { id: number; revision: number | null } | undefined;
  // Replacing a project is one more revision of it, as the app's own saves are.
  if (existing) doc.revision = (existing.revision ?? 0) + 1;
  const projectId = existing?.id ?? Number(db.prepare('INSERT INTO cruce_projects(owner, name, document, updated_at) VALUES (?, ?, ?, ?)').run(user.id, founder.name, JSON.stringify(doc), now).lastInsertRowid);
  if (existing) {
    db.prepare('UPDATE cruce_projects SET document = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(doc), now, projectId);
    // The app projects it again (and looks for crossings) the next time it is opened.
    db.prepare('DELETE FROM cruce_network_scans WHERE project_id = ?').run(projectId);
  }
  const owner = subject(user.id);
  db.prepare('INSERT INTO cruce_network_profiles(user_id, email, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET email = excluded.email').run(owner, founder.email, now);
  // Projection only, like the app's backfill: crossings appear when founders use the app.
  await memory('/projects/upsert', { owner, projectId, name: founder.name, notes: networkNotes(doc) }).catch(() => undefined);
  console.log(`  ${founder.email.padEnd(36)} ${founder.name}${existing ? ' (actualizado)' : ''}`);
}

async function main() {
  const experiences = readdirSync(dataDir).filter(f => /^experiences-.*\.json$/.test(f)).flatMap(file => {
    const parsed = z.array(z.unknown()).parse(JSON.parse(readFileSync(dataDir + file, 'utf8')));
    return parsed.flatMap(item => { const result = experienceSchema.safeParse(item); if (!result.success) console.warn(`  skip ${file}: ${JSON.stringify(item).slice(0, 80)}`); return result.success ? [result.data] : []; });
  });
  const unique = [...new Map(experiences.map(e => [e.id, e])).values()];
  const founders = z.array(founderSchema).parse(JSON.parse(readFileSync(`${dataDir}founders.json`, 'utf8')));

  const db = open();
  if (process.argv.includes('--update')) {
    for (const founder of founders) await seedFounder(db, founder);
    db.close();
    console.log(`\nListo: ${founders.length} founders actualizados, sin tocar el resto de la base.`);
    return;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  mkdirSync(`${root}backend/data/backups`, { recursive: true });
  db.exec(`VACUUM INTO '${root}backend/data/backups/main-before-seed-${stamp}.db'`);
  console.log(`Backup: backend/data/backups/main-before-seed-${stamp}.db`);

  // Clean base: every project, crossing and non-admin account goes.
  db.exec('BEGIN');
  for (const table of ['cruce_network_messages', 'cruce_network_requests', 'cruce_network_matches', 'cruce_network_scans', 'cruce_network_push', 'cruce_network_profiles', 'cruce_landing_events', 'cruce_projects', 'cruce_experiences']) db.exec(`DELETE FROM ${table}`);
  db.exec('DELETE FROM _user WHERE admin = 0');
  db.exec('COMMIT');
  console.log('Base limpia (solo quedan los admins).');
  await memory('/reset', {}).then(() => console.log('Memoria de la red vaciada.'), () => console.warn('Memoria de la red no disponible: se omitió (la app la reconstruye al abrir proyectos).'));

  // Library, embedded in batches so retrieval is semantic from the first query.
  const insert = db.prepare(`INSERT INTO cruce_experiences(id, company, country, year, kind, sector, title, summary, tried, outcome, lessons, tags, quote, urls, origin, embedding, embedding_model, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  let embedded = 0;
  for (let i = 0; i < unique.length; i += 64) {
    const batch = unique.slice(i, i + 64);
    const vectors = await embed(config, batch.map(e => experienceText(e as Experience)));
    batch.forEach((e, j) => {
      const vector = vectors?.[j];
      if (vector) embedded++;
      insert.run(e.id, e.company, e.country, e.year, e.kind, e.sector, e.title, e.summary, e.tried, e.outcome, JSON.stringify(e.lessons), JSON.stringify(e.tags), e.quote,
        JSON.stringify(e.urls), e.origin, vector ? JSON.stringify(vector) : null, vector ? EMBEDDING_MODEL : '', new Date().toISOString());
    });
  }
  console.log(`Biblioteca: ${unique.length} experiencias (${embedded} con embeddings).`);

  // Founders: real accounts through TrailBase, projects in the shape the app writes.
  for (const founder of founders) await seedFounder(db, founder);
  db.close();
  console.log(`\nListo: ${founders.length} founders y ${unique.length} experiencias. Contraseña de cada cuenta en seed/data/founders.json.`);
}

main().catch(error => { console.error(error); process.exit(1); });
