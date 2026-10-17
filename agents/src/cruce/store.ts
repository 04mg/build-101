import type { IncomingMessage } from 'node:http';
import type { Config } from '../config.js';
import { HttpError } from '../http.js';
import { documentSchema, type Project, type ProjectDocument, type Note } from './model.js';

type Row = { id: number; name: string; document: string | ProjectDocument; updated_at: string };

export class ProjectStore {
  private headers: Headers;
  constructor(private config: Config, request: IncomingMessage) {
    this.headers = new Headers({ Authorization: request.headers.authorization!, 'Content-Type': 'application/json' });
    if (typeof request.headers['refresh-token'] === 'string') this.headers.set('Refresh-Token', request.headers['refresh-token']);
  }

  private async request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.config.trailbaseUrl}/api/records/v1/${path}`, {
        method, headers: this.headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(15000), redirect: 'error',
      });
    } catch { throw new HttpError(503, 'No se pudo conectar con la memoria del proyecto.'); }
    if (response.status === 401) throw new HttpError(401, 'Tu sesión venció. Volvé a ingresar.');
    if (response.status === 403 || response.status === 404) throw new HttpError(404, 'El proyecto no está disponible.');
    if (!response.ok) {
      const detail = await response.text();
      if (detail.includes('CRUCE_REVISION_CONFLICT')) throw new HttpError(409, 'Llegó nueva evidencia mientras guardabas. Actualizá y reintentá.');
      console.error('Cruce storage request failed:', method, path.split('?')[0], response.status);
      throw new HttpError(503, 'No se pudo guardar o leer el proyecto. Revisá las migraciones de TrailBase.');
    }
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  private fromRow(row: Row): Project {
    return { id: row.id, name: row.name, document: documentSchema.parse(typeof row.document === 'string' ? JSON.parse(row.document) : row.document), updatedAt: row.updated_at };
  }

  async list(): Promise<Project[]> {
    const rows = await this.listRows<Row>('cruce_projects');
    return rows.map(row => this.fromRow(row));
  }

  async get(id: number): Promise<Project> { return this.fromRow(await this.request<Row>(`cruce_projects/${id}`)); }

  async create(owner: string, name: string, document: ProjectDocument): Promise<Project> {
    documentSchema.parse(document);
    const result = await this.request<{ ids: (number | string)[] }>('cruce_projects', 'POST', {
      owner, name, document: JSON.stringify(document), updated_at: new Date().toISOString(),
    });
    return this.get(Number(result.ids[0]));
  }

  async save(project: Project): Promise<Project> {
    project.document.revision++;
    documentSchema.parse(project.document);
    try {
      await this.request(`cruce_projects/${project.id}`, 'PATCH', {
        name: project.name, document: JSON.stringify(project.document), updated_at: new Date().toISOString(),
      });
    } catch (error) {
      // Some TrailBase versions omit the SQLite trigger message from API errors.
      // Compare the persisted clock before classifying that failure as storage.
      if (error instanceof HttpError && error.status === 503) {
        const current = await this.get(project.id);
        if (current.document.revision >= project.document.revision) throw new HttpError(409, 'Llegó nueva evidencia mientras guardabas. Actualizá y reintentá.');
      }
      throw error;
    }
    return this.get(project.id);
  }

  async knowledge(): Promise<{ project_id: number; node_key: string; title: string; body: string; kind: string; data: string | Note }[]> {
    return this.listRows('cruce_knowledge');
  }

  private async listRows<T>(api: string): Promise<T[]> {
    const records: T[] = [];
    let cursor: string | undefined;
    do {
      const params = new URLSearchParams({ limit: '200' });
      if (cursor) params.set('cursor', cursor);
      const page = await this.request<{ records: T[]; cursor?: string }>(`${api}?${params}`);
      records.push(...page.records);
      if (!page.records.length || page.cursor === cursor) break;
      cursor = page.cursor;
    } while (cursor);
    return records;
  }
}
