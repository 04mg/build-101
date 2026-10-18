import type { Config } from '../config.js';
import { HttpError } from '../http.js';
import { reportAIFailure } from './claude.js';
import { generateExploreDeliverables, generateMatrix, matrixMarkdown } from './explore.js';
import { generateLanding, generateLandingHypotheses, savePrototypeBrief } from './landing.js';
import { saveDeliverable } from './deliverables.js';
import { exploreDeliverables, type ProjectDocument } from './model.js';
import type { ProjectStore } from './store.js';

// Explore and Prototype generations run in the background like research: the
// request saves `status: running`, the job merges its result into the latest
// revision, and the browser's poll picks it up. A restart resumes from `running`.
export class PhaseJobs {
  private running = new Map<string, Promise<void>>();
  constructor(private config: Config) {}
  get size() { return this.running.size; }
  has(key: string, phase: 'explore' | 'prototype') { return this.running.has(`${key}:${phase}`); }
  start(key: string, store: ProjectStore, projectId: number, phase: 'explore' | 'prototype', origin = '') {
    const id = `${key}:${phase}`;
    if (this.running.has(id)) return;
    const job = (phase === 'explore' ? this.explore(store, projectId) : this.prototype(store, projectId, origin)).catch(error => {
      console.error('Cruce phase job persistence failure', JSON.stringify({ projectId, phase, status: error instanceof HttpError ? error.status : 500 }));
    }).finally(() => { this.running.delete(id); });
    this.running.set(id, job);
  }

  private async save(store: ProjectStore, projectId: number, at: string | null, phase: 'explore' | 'prototype', apply: (doc: ProjectDocument) => void) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const latest = await store.get(projectId), state = latest.document[phase];
      if (state.status !== 'running' || state.at !== at) return;
      apply(latest.document);
      try { await store.save(latest); return; }
      catch (error) { if (!(error instanceof HttpError) || error.status !== 409 || attempt === 4) throw error; }
    }
  }

  private async explore(store: ProjectStore, projectId: number) {
    const baseline = await store.get(projectId), doc = baseline.document, at = doc.explore.at;
    if (doc.explore.status !== 'running') return;
    try {
      if (doc.explore.task === 'matrix') {
        const matrix = await generateMatrix(this.config, doc);
        await this.save(store, projectId, at, 'explore', latest => {
          Object.assign(latest.explore, matrix, { status: 'ready', error: null, chosenId: null });
          saveDeliverable(latest, 'comparison-matrix', matrixMarkdown(matrix), false, 'agent');
        });
      } else {
        await generateExploreDeliverables(this.config, doc);
        await this.save(store, projectId, at, 'explore', latest => {
          for (const key of exploreDeliverables) {
            const note = doc.nodes.find(n => n.id === `deliverable-${key}`);
            if (note) saveDeliverable(latest, key, note.body, false, 'agent');
          }
          Object.assign(latest.explore, { status: 'ready', error: null });
        });
      }
    } catch (error) {
      const { message } = reportAIFailure(this.config, `explore-${doc.explore.task}`, error);
      await this.save(store, projectId, at, 'explore', latest => { Object.assign(latest.explore, { status: 'error', error: message }); });
    }
  }

  private async prototype(store: ProjectStore, projectId: number, origin: string) {
    const baseline = await store.get(projectId), doc = baseline.document, at = doc.prototype.at;
    if (doc.prototype.status !== 'running') return;
    const instruction = doc.prototype.task === 'iterate' ? doc.prototype.pending : null;
    try {
      // A new solution starts a new experiment: new hypotheses, new link.
      if (!instruction && (!doc.prototype.hypotheses.length || doc.prototype.solutionId !== doc.explore.chosenId)) doc.prototype.hypotheses = await generateLandingHypotheses(this.config, doc);
      const result = await generateLanding(this.config, doc, instruction);
      await this.save(store, projectId, at, 'prototype', latest => {
        const p = latest.prototype;
        if (p.solutionId !== latest.explore.chosenId) { p.hypotheses = doc.prototype.hypotheses; p.solutionId = latest.explore.chosenId; }
        Object.assign(p, { html: result.html, version: p.version + 1, status: 'ready', error: null, pending: null,
          chat: [...p.chat, { role: 'cofounder' as const, text: result.reply.trim(), at: new Date().toISOString() }].slice(-60) });
        savePrototypeBrief(latest, `${origin}/l/${p.token}`);
      });
    } catch (error) {
      const { message } = reportAIFailure(this.config, `landing-${doc.prototype.task}`, error);
      await this.save(store, projectId, at, 'prototype', latest => { Object.assign(latest.prototype, { status: 'error', error: message }); });
    }
  }
}
