import type { PingResponse } from '../types'

export async function fetchPing(): Promise<{ data: PingResponse; latencyMs: number }> {
  const start = performance.now()
  const res = await fetch('/api/ping', {
    headers: { 'Accept': 'application/json' },
  })
  const latencyMs = Math.round(performance.now() - start)

  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`)
  }

  const data: PingResponse = await res.json()
  return { data, latencyMs }
}
