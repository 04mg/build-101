import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { pipeUIMessageStreamToResponse, toUIMessageStream } from 'ai';
import { z } from 'zod';
import type { Config } from './config.js';
import { authenticate } from './auth.js';
import { createCofounderAgent } from './agents/cofounder.js';
import { HttpError, json, readJson } from './http.js';

const chatRequest = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    parts: z.array(z.object({
      type: z.literal('text'),
      text: z.string().max(4000),
    })).min(1).max(4),
  })).min(1).max(20),
});

export function createApp(config: Config) {
  const agent = createCofounderAgent(config);
  // One public origin; do not consume or rewrite proxied auth/record request bodies.
  const proxy = createProxyMiddleware<IncomingMessage, ServerResponse>({
    target: config.trailbaseUrl,
    changeOrigin: false,
    on: {
      error: (_error, _request, response) => {
        if ('writeHead' in response && !response.headersSent) {
          json(response, 502, { error: 'TrailBase is unavailable.' });
        } else {
          response.destroy();
        }
      },
    },
  });

  // Bound concurrency independently of the number of agent definitions/users.
  let activeRuns = 0;
  const usersRunning = new Set<string>();
  const abortControllers = new Set<AbortController>();

  async function handle(request: IncomingMessage, response: ServerResponse) {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    if ((pathname === '/_/' || pathname === '/_') && request.method === 'GET') {
      response.writeHead(302, { Location: '/_/admin/', 'Cache-Control': 'no-store' });
      response.end();
      return;
    }
    if (pathname === '/_/auth/login' && request.method === 'GET') {
      const original = new URL(request.url!, 'http://localhost');
      const destination = original.searchParams.get('redirect_uri') ?? '/';
      response.writeHead(302, {
        Location: `/login?redirect_uri=${encodeURIComponent(destination)}`,
        'Cache-Control': 'no-store',
      });
      response.end();
      return;
    }
    if (pathname === '/api/agents/health' && request.method === 'GET') {
      json(response, 200, { status: 'ok', configured: Boolean(config.apiKey) });
      return;
    }
    if (!pathname.startsWith('/api/agents/') && pathname !== '/api/agents') {
      // The former model endpoint is deliberately retired, including stale WASM builds.
      if (pathname === '/api/chat') {
        json(response, 410, { error: 'Use the authenticated /api/agents/chat endpoint.' });
        return;
      }
      await proxy(request, response);
      return;
    }
    if (pathname !== '/api/agents/chat') throw new HttpError(404, 'Unknown agent endpoint.');
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      throw new HttpError(405, 'Use POST.');
    }

    const user = await authenticate(request, config.trailbaseUrl);
    const parsed = chatRequest.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, 'Send 1–20 text-only user/assistant messages (up to 4000 characters per part).');
    const latest = parsed.data.messages.at(-1)!;
    if (latest.role !== 'user' || !latest.parts.some(part => part.text.trim())) {
      throw new HttpError(400, 'The final message must be a nonempty user message.');
    }
    if (!config.apiKey) throw new HttpError(503, 'Set AI_API_KEY in the root .env to enable the agent.');
    if (activeRuns >= 4 || usersRunning.has(user.sub)) {
      throw new HttpError(429, 'An agent is already busy. Please try again shortly.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    const disconnect = () => { if (!response.writableFinished) controller.abort(); };
    response.on('close', disconnect);
    abortControllers.add(controller);
    activeRuns++;
    usersRunning.add(user.sub);
    try {
      const result = await agent.stream({
        messages: parsed.data.messages.map(message => ({
          role: message.role,
          content: message.parts.map(part => part.text).join('\n'),
        })),
        abortSignal: controller.signal,
      });
      await pipeUIMessageStreamToResponse({
        response,
        headers: { 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
        stream: toUIMessageStream({
          stream: result.stream,
          sendReasoning: false,
          onError: () => 'The model could not finish its response. Check the provider configuration and try again.',
        }),
      });
    } finally {
      clearTimeout(timeout);
      response.off('close', disconnect);
      abortControllers.delete(controller);
      activeRuns--;
      usersRunning.delete(user.sub);
    }
  }

  const server = createServer((request, response) => {
    void handle(request, response).catch(error => {
      if (response.destroyed) return;
      if (response.headersSent) { response.destroy(); return; }
      const known = error instanceof HttpError;
      if (!known) console.error('Agent request failed.');
      json(response, known ? error.status : 500, {
        error: known ? error.message : 'The agent request failed. Please try again.',
      });
    });
  });
  server.on('close', () => { for (const controller of abortControllers) controller.abort(); });
  return { server, abortRuns: () => { for (const controller of abortControllers) controller.abort(); } };
}
