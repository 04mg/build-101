import { useCallback, useEffect, useRef, useState } from 'react'
import { request } from './api'

// One WebRTC connection to OpenAI GPT-Realtime: voice in and out through the peer
// connection, events and tool calls through the "oai-events" data channel. The
// server only mints the ephemeral key with the session already configured.
// The assistant bar and the onboarding grill each drive one.

export type RealtimeStatus = 'idle' | 'connecting' | 'ready' | 'error'
export interface RealtimeEvent { type: string; delta?: string; transcript?: string; item_id?: string; error?: { message?: string; code?: string }; response?: { status?: string; output?: { type: string; name?: string; call_id?: string; arguments?: string }[] } }
interface Connection { pc: RTCPeerConnection; dc: RTCDataChannel; sender: RTCRtpSender; audio: HTMLAudioElement; mic: MediaStreamTrack | null; context: AudioContext; input: AnalyserNode | null; output: AnalyserNode | null }

const benign = new Set(['response_cancel_not_active', 'conversation_already_has_active_response'])

// Only one session talks at a time in the whole browser: opening one closes the
// others, in this tab (grill and assistant bar) and in any other tab, so two
// cofounders never hear the same question and answer over each other.
const sessions = new Set<(remote: boolean) => void>()
const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('cruce-realtime')
if (channel) channel.onmessage = () => sessions.forEach(close => close(true))
function claim(self: (remote: boolean) => void) {
  sessions.forEach(close => { if (close !== self) close(false) })
  channel?.postMessage('claim')
}

function analyser(context: AudioContext, stream: MediaStream) {
  const node = context.createAnalyser()
  node.fftSize = 512; node.smoothingTimeConstant = 0.6
  context.createMediaStreamSource(stream).connect(node)
  return node
}
const samples = new Uint8Array(512)
/** Loudness 0–1 of the analysed stream, scaled so normal speech fills the range. */
function loudness(node: AnalyserNode | null) {
  if (!node) return 0
  node.getByteTimeDomainData(samples)
  let sum = 0
  for (let i = 0; i < node.fftSize; i++) { const v = (samples[i] - 128) / 128; sum += v * v }
  return Math.min(1, Math.sqrt(sum / node.fftSize) * 4)
}

/** `sessionPath` is the agents endpoint that mints the key; null means there is nothing to talk to yet. */
export function useRealtimeConnection(sessionPath: string | null, onEvent: (event: RealtimeEvent) => void, onClose?: () => void) {
  const [status, setStatus] = useState<RealtimeStatus>('idle'), [error, setError] = useState(''), [listening, setListening] = useState(false)
  const live = useRef<Connection | null>(null), opening = useRef<Promise<Connection> | null>(null), closeOthers = useRef<(remote: boolean) => void>(() => {})
  const callbacks = useRef({ onEvent, onClose, sessionPath })
  useEffect(() => { callbacks.current = { onEvent, onClose, sessionPath } })

  const send = useCallback((event: object) => { if (live.current?.dc.readyState === 'open') live.current.dc.send(JSON.stringify(event)) }, [])

  const disconnect = useCallback(() => {
    const current = live.current
    live.current = null; opening.current = null
    current?.mic?.stop(); current?.dc.close(); current?.pc.close()
    if (current) { current.audio.srcObject = null; void current.context.close() }
    setStatus('idle'); setListening(false)
    if (current) callbacks.current.onClose?.()
  }, [])

  const open = useCallback(async (): Promise<Connection> => {
    if (live.current) return live.current
    if (opening.current) return opening.current
    const path = callbacks.current.sessionPath
    if (!path) throw new Error('Abrí un proyecto para hablar con tu cofounder.')
    claim(closeOthers.current)
    setStatus('connecting'); setError('')
    // Checked after the awaits inside, once it is assigned.
    let attempt: Promise<Connection> | null = null
    attempt = (async (): Promise<Connection> => {
      const { clientSecret } = await request<{ clientSecret: string }>(path, {})
      const pc = new RTCPeerConnection()
      const audio = new Audio(); audio.autoplay = true
      const context = new AudioContext()
      const levels = { output: null as AnalyserNode | null }
      pc.ontrack = event => { audio.srcObject = event.streams[0]; levels.output = analyser(context, event.streams[0]); if (live.current) live.current.output = levels.output }
      // Audio is negotiated up front without a track; the mic is attached later with replaceTrack.
      const { sender } = pc.addTransceiver('audio', { direction: 'sendrecv' })
      const dc = pc.createDataChannel('oai-events')
      dc.onmessage = message => {
        let event: RealtimeEvent
        try { event = JSON.parse(message.data) } catch { return }
        if (event.type === 'error' && !benign.has(event.error?.code ?? '')) setError(event.error?.message ?? 'Tu cofounder tuvo un problema. Probá de nuevo.')
        callbacks.current.onEvent(event)
      }
      const ready = new Promise<void>((resolve, reject) => { dc.onopen = () => resolve(); setTimeout(() => reject(new Error('OpenAI tardó demasiado en responder.')), 15000) })
      await pc.setLocalDescription(await pc.createOffer())
      const answer = await fetch('https://api.openai.com/v1/realtime/calls', { method: 'POST', body: pc.localDescription!.sdp, headers: { Authorization: `Bearer ${clientSecret}`, 'Content-Type': 'application/sdp' } })
      if (!answer.ok) { pc.close(); throw new Error('OpenAI no aceptó la conexión de voz.') }
      await pc.setRemoteDescription({ type: 'answer', sdp: await answer.text() })
      await ready
      // Closed while connecting (another session took over): this one never goes live.
      if (opening.current !== attempt) { dc.close(); pc.close(); void context.close(); throw new Error('cancelled') }
      const connection: Connection = { pc, dc, sender, audio, mic: null, context, input: null, output: levels.output }
      pc.onconnectionstatechange = () => { if (['failed', 'closed', 'disconnected'].includes(pc.connectionState) && live.current === connection) disconnect() }
      live.current = connection
      setStatus('ready')
      return connection
    })()
    opening.current = attempt
    try { return await attempt }
    catch (cause) {
      if (opening.current !== attempt) throw cause
      opening.current = null; setStatus('error'); setError(cause instanceof Error ? cause.message : 'No pudimos conectar con tu cofounder.'); throw cause
    }
  }, [disconnect])

  const stopMic = useCallback(() => {
    const c = live.current
    c?.mic?.stop()
    if (c) { c.mic = null; c.input = null; void c.sender.replaceTrack(null) }
    setListening(false)
  }, [])

  const startMic = useCallback(async () => {
    let connection: Connection
    try { connection = await open() } catch { return false }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      connection.mic = stream.getAudioTracks()[0]
      await connection.sender.replaceTrack(connection.mic)
      connection.input = analyser(connection.context, stream)
      void connection.context.resume()
      setListening(true)
      return true
    } catch { setError('Permití el acceso al micrófono para hablar con tu cofounder.'); return false }
  }, [open])

  /** Live loudness of the founder's mic and the cofounder's voice, read every animation frame. */
  const levels = useCallback(() => ({ input: loudness(live.current?.input ?? null), output: loudness(live.current?.output ?? null) }), [])
  const hasMic = useCallback(() => Boolean(live.current?.mic), [])

  useEffect(() => {
    const close = (remote: boolean) => {
      if (!live.current && !opening.current) return
      disconnect()
      if (remote) setError('La conversación con tu cofounder siguió en otra pestaña.')
    }
    closeOthers.current = close
    sessions.add(close)
    return () => { sessions.delete(close); disconnect() }
  }, [disconnect])
  return { status, error, setError, listening, send, open, disconnect, startMic, stopMic, levels, hasMic, connected: status === 'ready' }
}
