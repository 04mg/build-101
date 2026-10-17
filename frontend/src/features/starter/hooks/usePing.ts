import { useState, useEffect, useCallback } from 'react'
import { fetchPing } from '../api/ping'
import type { PingResponse } from '../types'

export function usePing() {
  const [data, setData] = useState<PingResponse | null>(null)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const triggerPing = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchPing()
      setData(res.data)
      setLatencyMs(res.latencyMs)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error connecting to WASM endpoint')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    triggerPing()
  }, [triggerPing])

  return { data, latencyMs, loading, error, refetch: triggerPing }
}
