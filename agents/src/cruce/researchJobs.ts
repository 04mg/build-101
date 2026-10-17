import type { Config } from '../config.js';
import { HttpError } from '../http.js';
import { link, putNote } from './model.js';
import { research } from './research.js';
import type { ProjectStore } from './store.js';

// Exploratory research runs alongside the conversation, never under its lock.
export class ResearchJobs {
  private running = new Map<string, Promise<void>>();
  constructor(private config: Config) {}
  get size() { return this.running.size; }
  has(key: string) { return this.running.has(key); }
  start(key: string, store: ProjectStore, projectId: number) {
    if (this.running.has(key)) return;
    const job = this.run(store, projectId).catch(error => {
      console.error('Cruce research persistence failure', JSON.stringify({ projectId, status: error instanceof HttpError ? error.status : 500 }));
    }).finally(() => { this.running.delete(key); });
    this.running.set(key, job);
  }
  private async run(store: ProjectStore, projectId: number) {
    const baseline = await store.get(projectId);
    if (baseline.document.research.status !== 'running') return;
    const generated = structuredClone(baseline);
    await research(this.config, generated.document);
    for (let attempt = 0; attempt < 5; attempt++) {
      const latest = await store.get(projectId);
      if (latest.document.research.status !== 'running' || latest.document.research.at !== baseline.document.research.at) return;
      for (const note of generated.document.nodes) {
        const before = baseline.document.nodes.find(n => n.id === note.id);
        if (before && before.body === note.body && before.title === note.title && before.rationale === note.rationale) continue;
        const current = latest.document.nodes.find(n => n.id === note.id);
        if (before && !current) continue;
        if (before && current && note.kind !== 'source' && (current.body !== before.body || current.title !== before.title)) continue;
        // A newer founder turn wins over a research rewrite of a main note.
        if (['problem', 'segment', 'alternative', 'impact'].includes(note.kind) && current?.body !== before?.body) continue;
        const { history: _history, createdAt: _created, updatedAt: _updated, ...content } = note;
        putNote(latest.document, content, generated.document.positions[note.id]);
      }
      for (const edge of generated.document.edges) link(latest.document, edge.source, edge.target, edge.relation);
      latest.document.research = generated.document.research;
      try { await store.save(latest); return; }
      catch (error) { if (!(error instanceof HttpError) || error.status !== 409 || attempt === 4) throw error; }
    }
  }
}
