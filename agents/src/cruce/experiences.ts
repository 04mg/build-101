import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import type { Config } from '../config.js';
import type { ProjectDocument } from './model.js';

// Documented experiences of other companies (failures, pivots, successes) with
// their public sources: the ground truth the agents consult when a founder's
// problem or strategy resembles a real case. Retrieval is semantic with OpenAI
// embeddings when OPENAI_API_KEY is set, lexical otherwise; the model decides
// what is relevant and how to use it.

const database = fileURLToPath(new URL('../../../backend/data/main.db', import.meta.url));
export const EMBEDDING_MODEL = 'text-embedding-3-small';

export interface Experience {
  id: string; company: string; country: string; year: string; kind: 'failure' | 'pivot' | 'success'; sector: string
  title: string; summary: string; tried: string; outcome: string; lessons: string[]; tags: string[]; quote: string; urls: string[]; origin: string
}
type Row = Omit<Experience, 'lessons' | 'tags' | 'urls'> & { lessons: string; tags: string; urls: string; embedding: string | null; embedding_model: string }
type Loaded = Experience & { vector: number[] | null; words: Set<string> }

let cache: { count: number; items: Loaded[] } | undefined;

function load(): Loaded[] {
  const db = new DatabaseSync(database, { readOnly: true });
  try {
    db.exec('PRAGMA busy_timeout = 5000');
    const count = (db.prepare('SELECT count(*) AS n FROM cruce_experiences').get() as { n: number }).n;
    if (cache?.count === count) return cache.items;
    const items = (db.prepare('SELECT * FROM cruce_experiences').all() as Row[]).map(row => {
      const experience: Experience = { ...row, lessons: JSON.parse(row.lessons), tags: JSON.parse(row.tags), urls: JSON.parse(row.urls) };
      return { ...experience, vector: row.embedding && row.embedding_model === EMBEDDING_MODEL ? JSON.parse(row.embedding) as number[] : null, words: words(experienceText(experience)) };
    });
    cache = { count, items };
    return items;
  } catch { return [] } // Before the migration runs there is no library yet.
  finally { db.close(); }
}

export const experienceText = (e: Experience) => [e.title, e.summary, e.tried, e.outcome, e.lessons.join(' '), e.tags.join(' '), e.sector].join('\n');

function words(text: string) {
  return new Set(text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9]{4,}/g) ?? []);
}

export async function embed(config: Config, inputs: string[]): Promise<number[][] | null> {
  if (!config.openaiApiKey || !inputs.length) return null;
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST', headers: { Authorization: `Bearer ${config.openaiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: inputs.map(text => text.slice(0, 8000)) }), signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return null;
    const { data } = await response.json() as { data: { embedding: number[] }[] };
    return data.map(d => d.embedding);
  } catch { return null; }
}

const cosine = (a: number[], b: number[]) => { let dot = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return dot / (Math.sqrt(na * nb) || 1); };

/**
 * The documented cases closest to what the founder said, most similar first. Each
 * query (a note, an answer) is matched on its own, so a strategy mentioned in one
 * answer finds its cases even when the rest of the project is about something else.
 */
export async function findExperiences(config: Config, query: string | string[], limit = 5) {
  const items = load();
  const queries = (Array.isArray(query) ? query : [query]).map(q => q.trim()).filter(q => q.length >= 8).slice(0, 12);
  if (!items.length || !queries.length) return [];
  const vectors = await embed(config, queries);
  const scores = queries.map((text, i) => {
    const vector = vectors?.[i], asked = words(text);
    return items.map(item => vector && item.vector ? cosine(vector, item.vector) : [...asked].filter(w => item.words.has(w)).length / Math.sqrt(asked.size * item.words.size || 1));
  });
  // Best match of each query first, then the strongest of the rest.
  const best = items.map((_, j) => Math.max(...scores.map(row => row[j])));
  const picked = new Set<number>();
  for (const row of scores) picked.add(row.indexOf(Math.max(...row.filter((_, j) => !picked.has(j)))));
  const order = [...picked, ...best.map((score, j) => ({ score, j })).sort((a, b) => b.score - a.score).map(x => x.j).filter(j => !picked.has(j))];
  return order.slice(0, limit).sort((a, b) => best[b] - best[a])
    .map(j => { const { vector: _vector, words: _words, ...experience } = items[j]; return { ...experience, similarity: Math.round(best[j] * 100) / 100 }; });
}

/** What a founder is working on, as retrieval queries: problem, notes, hypotheses and their own recent words. */
export function projectQuery(doc: ProjectDocument) {
  const notes = doc.nodes.filter(n => !n.archived && ['problem', 'segment', 'alternative', 'impact', 'hypothesis'].includes(n.kind)).map(n => n.body);
  return [...doc.answers.slice(-3).reverse().map(a => a.value), ...notes].map(text => text.slice(0, 2000));
}

/** The compact form the agents read. */
export const caseForModel = (e: Experience & { similarity?: number }) => ({ company: e.company, country: e.country, year: e.year, kind: e.kind, sector: e.sector,
  title: e.title, summary: e.summary, tried: e.tried, outcome: e.outcome, lessons: e.lessons, source: e.urls[0] ?? '', similarity: e.similarity });
