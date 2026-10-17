import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { HttpError } from './http.js';

const registration = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(128),
});

// Same path from src/ and dist/.
const database = fileURLToPath(new URL('../../backend/data/main.db', import.meta.url));

export async function register(body: unknown, trailbaseUrl: string) {
  const parsed = registration.safeParse(body);
  if (!parsed.success) throw new HttpError(400, 'Usá un email válido y una contraseña de al menos 8 caracteres.');
  const { email, password } = parsed.data;

  let result: Response;
  try {
    result = await fetch(`${trailbaseUrl}/api/auth/v1/register`, {
      method: 'POST',
      body: new URLSearchParams({ email, password, password_repeat: password }),
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new HttpError(503, 'El servicio de autenticación no está disponible.');
  }
  // 424: TrailBase created the user but has no SMTP to send the verification email.
  if (!result.ok && result.status !== 424 && (result.status < 300 || result.status >= 400)) {
    throw new HttpError(result.status === 409 ? 409 : 400, result.status === 409
      ? 'Ya existe una cuenta con ese email.'
      : 'No se pudo crear la cuenta. Probá con otra contraseña.');
  }

  // Without SMTP there is no verification link, so new accounts are verified here.
  const db = new DatabaseSync(database);
  try {
    db.exec('PRAGMA busy_timeout = 5000');
    // TrailBase's CHECK constraints call its own SQL functions.
    db.function('is_email', { deterministic: true }, value => value === null || /^[^\s@]+@[^\s@]+$/.test(String(value)) ? 1 : 0);
    db.function('is_uuid', { deterministic: true }, (_value: unknown) => 1);
    const verified = db.prepare(
      'UPDATE _user SET email = unverified_email, unverified_email = NULL WHERE unverified_email = ? AND email IS NULL',
    ).run(email);
    if (!verified.changes && !db.prepare('SELECT 1 FROM _user WHERE email = ?').get(email)) {
      throw new HttpError(400, 'No se pudo crear la cuenta.');
    }
  } finally {
    db.close();
  }
}
