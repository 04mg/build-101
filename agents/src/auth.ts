import type { IncomingMessage } from 'node:http';
import { z } from 'zod';
import { HttpError } from './http.js';

const claimsSchema = z.object({
  sub: z.string().min(1),
  email: z.string().nullable().optional(),
});

export type AuthenticatedUser = z.infer<typeof claimsSchema>;

export async function authenticate(
  request: IncomingMessage,
  trailbaseUrl: string,
): Promise<AuthenticatedUser> {
  // Bearer-only agent routes: browser cookies cannot authorize a cross-site POST.
  // TrailBase's built-in cookie login remains available through the proxy.
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ') || authorization.length > 16_384) {
    throw new HttpError(401, 'Sign in to use the agent.');
  }
  const headers = new Headers({ Authorization: authorization });
  const refreshToken = request.headers['refresh-token'];
  if (typeof refreshToken === 'string') headers.set('Refresh-Token', refreshToken);

  let result: Response;
  try {
    result = await fetch(`${trailbaseUrl}/api/auth/v1/status`, {
      headers,
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw new HttpError(503, 'Authentication service is unavailable.');
  }
  if (result.status === 401 || result.status === 403) {
    throw new HttpError(401, 'Your session has expired. Sign in again.');
  }
  if (!result.ok) throw new HttpError(503, 'Authentication service is unavailable.');

  const status = await result.json() as { auth_token?: unknown };
  if (typeof status.auth_token !== 'string') {
    // TrailBase returns 200 with null tokens for unauthenticated/invalid requests.
    throw new HttpError(401, 'Your session has expired. Sign in again.');
  }
  try {
    // Decode ONLY the token returned by TrailBase after its signature/session check.
    // Never authorize using an unverified client-supplied JWT payload.
    return claimsSchema.parse(JSON.parse(
      Buffer.from(status.auth_token.split('.')[1], 'base64url').toString('utf8'),
    ));
  } catch {
    throw new HttpError(503, 'Invalid authentication service response.');
  }
}
