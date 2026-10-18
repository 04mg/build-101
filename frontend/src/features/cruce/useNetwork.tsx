import { useCallback, useEffect, useRef, useState } from 'react'
import { contactMatch, dismissMatch, getNetwork, respondRequest, savePushSubscription, type NetworkState } from './network'

export type ContactResult = { sent: true } | { error: string }
export type PushStatus = 'unsupported' | 'default' | 'granted' | 'denied'
type Handlers = { onOpenNote: (projectId: number, noteId: string) => void; onOpenPeople: (target?: string) => void }

// Polls the founder network (crossings and contact requests) and keeps this
// browser subscribed to push notifications. There are no in-page toasts.
export function useNetwork(enabled: boolean, handlers: Handlers) {
  const [state, setState] = useState<NetworkState | null>(null)
  const [busy, setBusy] = useState(''), [error, setError] = useState('')
  const [push, setPush] = useState<PushStatus>(() => pushSupported() ? Notification.permission as PushStatus : 'unsupported')
  const handlersRef = useRef(handlers), stateRef = useRef(state), inFlight = useRef(false)
  useEffect(() => { handlersRef.current = handlers })
  useEffect(() => { stateRef.current = state }, [state])

  const accept = useCallback((next: NetworkState) => { setState(next); stateRef.current = next }, [])

  const enablePush = useCallback(async (ask = true) => {
    const publicKey = stateRef.current?.push.publicKey
    if (!pushSupported() || !publicKey) { setPush(pushSupported() ? 'default' : 'unsupported'); return }
    try {
      let permission = Notification.permission
      if (permission === 'default' && ask) permission = await Notification.requestPermission()
      setPush(permission as PushStatus)
      if (permission !== 'granted') return
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()
      // A subscription made with another server key can no longer receive pushes.
      if (subscription && !sameKey(subscription.options.applicationServerKey, publicKey)) { await subscription.unsubscribe(); subscription = null }
      subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(publicKey) })
      await savePushSubscription(subscription.toJSON())
    } catch (cause) { if (ask) setError(`No se pudieron activar las notificaciones push: ${message(cause)}`) }
  }, [])

  const contact = useCallback(async (id: string): Promise<ContactResult> => {
    setBusy(id); setError('')
    try {
      accept(await contactMatch(id))
      void enablePush(false)
      return { sent: true }
    } catch (cause) {
      setError(message(cause))
      return { error: message(cause) }
    } finally { setBusy('') }
  }, [accept, enablePush])

  const respond = useCallback(async (id: string, value: boolean) => {
    setBusy(id); setError('')
    try {
      accept(await respondRequest(id, value))
      return true
    } catch (cause) { setError(message(cause)); return false }
    finally { setBusy('') }
  }, [accept])

  const dismiss = useCallback(async (id: string) => {
    setBusy(id)
    try { accept(await dismissMatch(id)) } catch (cause) { setError(message(cause)) } finally { setBusy('') }
  }, [accept])

  const refresh = useCallback(async () => {
    if (!enabled || inFlight.current) return
    inFlight.current = true
    try { accept(await getNetwork(AbortSignal.timeout(15000))) }
    catch { /* The network is optional; the next poll retries. */ }
    finally { inFlight.current = false }
  }, [enabled, accept])

  useEffect(() => {
    if (!enabled) return
    let active = true
    const tick = () => { if (active && document.visibilityState !== 'hidden') void refresh() }
    void Promise.resolve().then(async () => {
      await refresh()
      if (active && pushSupported()) {
        void navigator.serviceWorker.register('/sw.js').catch(() => undefined)
        if (Notification.permission === 'granted') void enablePush(false)
      }
    })
    const timer = window.setInterval(tick, 10000)
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'cruce-network') return
      if (event.data.action === 'open') handlersRef.current.onOpenPeople(event.data.target ?? undefined)
      void refresh()
    }
    window.addEventListener('focus', tick)
    navigator.serviceWorker?.addEventListener('message', onMessage)
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', tick); navigator.serviceWorker?.removeEventListener('message', onMessage) }
  }, [enabled, refresh, enablePush])

  return { state, busy, error, setError, push, enablePush, contact, respond, dismiss, refresh }
}

export type NetworkApi = ReturnType<typeof useNetwork>

function pushSupported() { return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window }
function decodeKey(value: string) {
  const base64 = (value + '='.repeat((4 - value.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0))
}
function sameKey(current: ArrayBuffer | null, publicKey: string) {
  if (!current) return false
  const expected = decodeKey(publicKey), actual = new Uint8Array(current)
  return actual.length === expected.length && actual.every((byte, index) => byte === expected[index])
}
function message(cause: unknown) { return cause instanceof Error ? cause.message : 'No se pudo completar la acción.' }
