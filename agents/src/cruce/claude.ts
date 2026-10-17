import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import type { Config } from '../config.js';

// The agent core is Claude Code in headless mode (`claude -p`). Each call is a
// fresh, sessionless run with no built-in tools, no project settings and a JSON
// schema for the answer. Research runs additionally get Exa as an MCP server.
export const CLAUDE_MODEL = 'claude-haiku-5-5';

const workdir = mkdtempSync(join(tmpdir(), 'cruce-claude-'));
let exaConfig: string | undefined;
const running = new Set<ReturnType<typeof spawn>>();
const shutdown = new AbortController();

export function stopClaudeRuns() { shutdown.abort(); for (const child of running) child.kill('SIGTERM'); }

export function claudeAvailable() {
  return spawnSync('claude', ['--version'], { stdio: 'ignore', timeout: 10000 }).status === 0;
}

export class ClaudeError extends Error {
  constructor(public code: string, message: string, public feedback?: string) { super(message); this.name = 'ClaudeError'; }
}

type ClaudeRequest<T extends z.ZodType> = {
  system: string; prompt: string; schema: T; web?: boolean; timeoutMs?: number; attempts?: number;
  validateOutput?: (output: z.infer<T>) => void | Promise<void>;
};

export async function runClaude<T extends z.ZodType>(config: Config, request: ClaudeRequest<T>): Promise<{ output: z.infer<T>; toolText: string }> {
  const attempts = request.attempts ?? 6;
  let feedback = '';
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (shutdown.signal.aborted) throw new ClaudeError('shutdown', 'El servicio se está reiniciando. Reintentá en unos segundos.');
    try {
      const result = await runClaudeAttempt(config, { ...request,
        timeoutMs: Math.min(240000, (request.timeoutMs ?? 90000) + attempt * 15000),
        prompt: feedback ? `${request.prompt}\n\nCONTROL DE CALIDAD DEL INTENTO ANTERIOR (corregí la salida, no lo incluyas en el contenido final):\n${feedback}` : request.prompt,
      });
      await request.validateOutput?.(result.output);
      return result;
    } catch (error) {
      if (!(error instanceof ClaudeError) || ['authentication', 'cli_missing', 'exa_missing', 'shutdown', 'capacity'].includes(error.code) || attempt === attempts - 1) throw error;
      feedback = error.feedback ?? (error.code === 'invalid_output' ? 'La respuesta no cumplió el esquema. Revisá los campos obligatorios, tipos y límites; devolvé exclusivamente la estructura pedida.' : 'El intento anterior se interrumpió. Completá la tarea desde el contexto recibido.');
      console.error('Cruce AI retry', JSON.stringify({ attempt: attempt + 1, maxAttempts: attempts, code: error.code }));
      await delay(Math.min(16000, 1000 * 2 ** attempt) + Math.floor(Math.random() * 500), undefined, { signal: shutdown.signal }).catch(() => { throw new ClaudeError('shutdown', 'El servicio se está reiniciando.'); });
    }
  }
  throw new ClaudeError('run_failed', 'No se pudo completar la generación. Podés reintentar.');
}

async function runClaudeAttempt<T extends z.ZodType>(config: Config, { system, prompt, schema, web = false, timeoutMs = 90000 }: ClaudeRequest<T>): Promise<{ output: z.infer<T>; toolText: string }> {
  const args = ['-p', '--model', CLAUDE_MODEL, '--output-format', 'stream-json', '--verbose',
    '--system-prompt', system, '--json-schema', JSON.stringify(jsonSchema(schema)),
    '--setting-sources', '', '--no-session-persistence', '--strict-mcp-config', '--tools', ''];
  if (web) {
    if (!config.exaApiKey) throw new ClaudeError('exa_missing', 'Falta EXA_API_KEY para investigar la web.');
    // Written once with owner-only permissions so the key never appears in `ps`.
    exaConfig ??= writeSecret('exa-mcp.json', JSON.stringify({ mcpServers: { exa: { type: 'http', url: `https://mcp.exa.ai/mcp?exaApiKey=${encodeURIComponent(config.exaApiKey)}` } } }));
    args.push('--mcp-config', exaConfig, '--allowedTools', 'mcp__exa__web_search_exa', 'mcp__exa__web_fetch_exa');
  }
  const child = spawn('claude', args, { cwd: workdir, stdio: ['pipe', 'pipe', 'pipe'] });
  running.add(child);
  let killTimer: ReturnType<typeof setTimeout> | undefined;
  const timer = setTimeout(() => { child.kill('SIGTERM'); killTimer = setTimeout(() => child.kill('SIGKILL'), 5000); }, timeoutMs);
  let buffer = '', stderr = '', toolText = '', final: Record<string, unknown> | undefined;
  child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
    buffer += chunk;
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line) as { type: string; message?: { content?: unknown } } & Record<string, unknown>;
        if (event.type === 'result') final = event;
        if (event.type === 'user' && Array.isArray(event.message?.content)) {
          for (const part of event.message.content as { type?: string; content?: unknown }[]) {
            if (part.type === 'tool_result') toolText += `${typeof part.content === 'string' ? part.content : Array.isArray(part.content) ? part.content.map((c: { text?: string }) => c.text ?? '').join('\n') : ''}\n`;
          }
        }
      } catch { /* Non-JSON diagnostics are ignored. */ }
    }
  });
  child.stderr.setEncoding('utf8').on('data', (chunk: string) => { stderr = (stderr + chunk).slice(-2000); });
  child.stdin.on('error', () => { /* Early CLI exits are classified from the process result and retried. */ });
  child.stdin.end(prompt);
  const exit = await new Promise<number | null>((resolve, reject) => {
    child.on('error', reject);
    child.on('close', code => resolve(code));
  }).catch((error: NodeJS.ErrnoException) => {
    throw new ClaudeError(error.code === 'ENOENT' ? 'cli_missing' : 'spawn_failed', 'No se pudo ejecutar Claude Code.');
  }).finally(() => { clearTimeout(timer); clearTimeout(killTimer); running.delete(child); });
  if (buffer.trim()) {
    try { const event = JSON.parse(buffer) as Record<string, unknown>; if (event.type === 'result') final = event; } catch { /* A truncated final line is retried. */ }
  }
  if (!final) {
    if (child.killed) throw new ClaudeError('timeout', 'Claude excedió el tiempo de espera.');
    throw new ClaudeError('no_result', `Claude terminó sin respuesta (código ${exit}). ${stderr.trim().slice(0, 300)}`);
  }
  if (final.is_error || final.subtype !== 'success') {
    const text = String(final.result ?? final.subtype ?? '');
    if (/log ?in|auth|api key|credential/i.test(text)) throw new ClaudeError('authentication', 'Claude Code no tiene una sesión válida. Ejecutá `claude` y autenticá.');
    if (/rate|limit|overloaded/i.test(text)) throw new ClaudeError('rate_limit', 'Claude alcanzó su límite de uso. Reintentá en unos momentos.');
    throw new ClaudeError('run_failed', `Claude no pudo completar la respuesta (${String(final.subtype)}).`);
  }
  const parsed = schema.safeParse(final.structured_output);
  if (!parsed.success) throw new ClaudeError('invalid_output', 'Claude respondió, pero su JSON no cumple el esquema esperado.', parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('\n').slice(0, 1800));
  return { output: parsed.data, toolText };
}

function writeSecret(name: string, content: string) {
  const path = join(workdir, name);
  writeFileSync(path, content, { mode: 0o600 });
  return path;
}

export function reportAIFailure(_config: Config, operation: string, error: unknown) {
  const reference = randomUUID().slice(0, 8);
  const known = error instanceof ClaudeError;
  // Never log prompts or model output; only diagnostic metadata.
  console.error('Cruce AI failure', JSON.stringify({ reference, operation, model: CLAUDE_MODEL,
    code: known ? error.code : 'unexpected', errorName: error instanceof Error ? error.name : 'UnknownError',
    ...(known ? { detail: error.message.slice(0, 300) } : {}) }));
  return { code: known ? error.code : 'unexpected', reference,
    message: `${known ? error.message : 'No se pudo completar la llamada a Claude.'} Referencia: ${reference}.` };
}

// The CLI validates against draft-07; drop zod's 2020-12 `$schema` marker.
function jsonSchema(schema: z.ZodType) {
  const { $schema: _draft, ...rest } = z.toJSONSchema(schema, { target: 'draft-7' });
  return rest;
}
