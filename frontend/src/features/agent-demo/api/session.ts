export interface Session {
  auth_token: string | null
  refresh_token: string | null
  csrf_token: string | null
}

const signedOut: Session = { auth_token: null, refresh_token: null, csrf_token: null }

export async function getSession(): Promise<Session> {
  const response = await fetch('/api/auth/v1/status', {
    credentials: 'same-origin',
    cache: 'no-store',
  })
  if (response.status === 401 || response.status === 403) return signedOut
  if (!response.ok) throw new Error('No se pudo comprobar la sesión.')
  return response.json()
}

export async function signIn(identifier: string, password: string): Promise<void> {
  // Form login lets TrailBase set HttpOnly cookies. JSON login only returns tokens.
  const response = await fetch('/api/auth/v1/login', {
    method: 'POST',
    credentials: 'same-origin',
    body: new URLSearchParams({ email_or_username: identifier.trim(), password, redirect_uri: '/' }),
  })
  if (response.status === 424) {
    throw new Error('No se pudo enviar el correo de verificación. Falta configurar SMTP en TrailBase.')
  }
  if (!response.ok) {
    throw new Error('No se pudo iniciar sesión. Comprueba tus credenciales y que la cuenta esté verificada.')
  }
  if (!(await getSession()).auth_token) throw new Error('No se pudo guardar la sesión. Vuelve a iniciar sesión.')
}

export async function register(email: string, password: string): Promise<void> {
  const response = await fetch('/api/agents/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? 'No se pudo crear la cuenta.')
  }
}

export async function signOut(): Promise<void> {
  const response = await fetch('/api/auth/v1/logout?redirect_uri=/', { credentials: 'same-origin' })
  if (!response.ok) throw new Error('No se pudo cerrar la sesión.')
}

export async function agentHeaders(): Promise<Record<string, string>> {
  const session = await getSession()
  if (!session.auth_token) throw new Error('Inicia sesión para hablar con el asistente.')
  return {
    Authorization: `Bearer ${session.auth_token}`,
    ...(session.refresh_token ? { 'Refresh-Token': session.refresh_token } : {}),
  }
}

export function readableError(error: Error): string {
  try {
    const body = JSON.parse(error.message) as { error?: string }
    return body.error ?? error.message
  } catch {
    return error.message
  }
}
