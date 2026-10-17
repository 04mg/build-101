import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Config } from './config.js';
import { HttpError, json, readJson } from './http.js';
import { createCruceRoutes } from './cruce/routes.js';
import { register } from './register.js';
import { stopClaudeRuns } from './cruce/claude.js';

export function createApp(config: Config) {
  const handleCruce = createCruceRoutes(config);
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
      json(response, 200, { status: 'ok', configured: config.ai });
      return;
    }
    if (!pathname.startsWith('/api/agents/') && pathname !== '/api/agents') {
      // The former model endpoint is deliberately retired, including stale WASM builds.
      if (pathname === '/api/chat') {
        json(response, 410, { error: 'This endpoint was retired.' });
        return;
      }
      await proxy(request, response);
      return;
    }
    if (pathname === '/api/agents/register' && request.method === 'POST') {
      await register(await readJson(request), config.trailbaseUrl);
      json(response, 201, { ok: true });
      return;
    }
    if (await handleCruce(request, response, pathname)) return;
    throw new HttpError(404, 'Unknown agent endpoint.');
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
  server.on('close', stopClaudeRuns);
  return { server, abortRuns: stopClaudeRuns };
}
