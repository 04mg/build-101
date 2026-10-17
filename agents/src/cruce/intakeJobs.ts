import type { Config } from '../config.js';
import { HttpError } from '../http.js';
import { reportAIFailure } from './claude.js';
import { advanceIntake } from './intake.js';
import { link, putNote, type Project } from './model.js';
import type { ProjectStore } from './store.js';

// Accepted answers and the operation ID live in TrailBase. Only execution is
// in memory, so disconnects and service restarts never lose the founder's turn.
export class IntakeJobs {
  private running = new Map<string, Promise<void>>();
  constructor(private config: Config) {}
  get size() { return this.running.size; }
  has(key: string) { return this.running.has(key); }

  start(key: string, store: ProjectStore, projectId: number) {
    if (this.running.has(key)) return;
    const job = this.run(store, projectId).catch(error => {
      console.error('Cruce intake persistence failure', JSON.stringify({ projectId, status: error instanceof HttpError ? error.status : 500 }));
    }).finally(() => { this.running.delete(key); });
    this.running.set(key, job);
  }

  private async update(store: ProjectStore, projectId: number, operationId: string, apply: (project: Project) => void) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const latest = await store.get(projectId);
      if (latest.document.intake.id !== operationId || latest.document.intake.status !== 'running') return;
      apply(latest);
      try { await store.save(latest); return; }
      catch (error) { if (!(error instanceof HttpError) || error.status !== 409 || attempt === 4) throw error; }
    }
  }

  private async run(store: ProjectStore, projectId: number) {
    const accepted = await store.get(projectId), operation = accepted.document.intake;
    if (operation.status !== 'running' || !operation.id) return;
    try {
      const generated = structuredClone(accepted);
      const result = await advanceIntake(this.config, generated.document, async () => {
        await this.update(store, projectId, operation.id!, latest => { latest.document.intake.message = 'Preparando las encuestas y entrevistas con IA…'; });
      });
      if (!generated.document.question) generated.document.confirmed = true;
      generated.document.intake = { ...operation, status: 'idle', message: '' };
      await this.update(store, projectId, operation.id, latest => {
        // Research and layout can advance while the founder is answering.
        // Apply only the synthesis changed by this turn, retaining new sources.
        for (const note of generated.document.nodes) {
          const before = accepted.document.nodes.find(n => n.id === note.id);
          if (before && before.title === note.title && before.body === note.body && before.status === note.status && before.archived === note.archived) continue;
          const { history: _history, createdAt: _created, updatedAt: _updated, ...content } = note;
          putNote(latest.document, content, generated.document.positions[note.id]);
        }
        for (const edge of generated.document.edges) link(latest.document, edge.source, edge.target, edge.relation);
        latest.document.answers = generated.document.answers;
        latest.document.question = generated.document.question;
        latest.document.confirmed = generated.document.confirmed;
        latest.document.validation = generated.document.validation;
        latest.document.intake = generated.document.intake;
        latest.name = result.name;
      });
    } catch (error) {
      const message = error instanceof HttpError ? error.message : reportAIFailure(this.config, 'intake-job', error).message;
      await this.update(store, projectId, operation.id, latest => {
        latest.document.intake = { ...latest.document.intake, status: 'error', message };
      });
    }
  }
}
