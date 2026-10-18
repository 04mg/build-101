import { useCallback, useEffect, useRef, useState } from 'react'
import type { AssistantReply } from './types'
import { useRealtimeConnection, type RealtimeEvent } from './useRealtimeConnection'

// The assistant bar on GPT-Realtime: one founder turn may span several model
// responses (answer → tool → follow-up); each finished turn is saved to history.

export type NextStep = Pick<AssistantReply, 'destination' | 'phase'>
export interface RealtimeHandlers {
  readProject: () => Promise<unknown>
  editMap: (operations: unknown[]) => Promise<unknown>
  findFounders: (refresh: boolean, query?: string, intent?: 'learning' | 'builder') => Promise<unknown>
  findExperiences: (query: string) => Promise<unknown>
  contactFounder: (matchId: string) => Promise<unknown>
  answerContact: (requestId: string, accept: boolean) => Promise<unknown>
  navigate: (next: NextStep, now: boolean) => void
  saveTurn: (turn: { question: string; message: string } & NextStep) => void
}
export function useRealtimeAssistant(projectId: number | null, handlers: RealtimeHandlers) {
  const [speaking, setSpeaking] = useState(false), [responding, setResponding] = useState(false)
  const [question, setQuestion] = useState(''), [reply, setReply] = useState(''), [tool, setTool] = useState<'read' | 'edit' | 'network' | 'contact' | 'cases' | null>(null), [next, setNext] = useState<NextStep | null>(null)
  // Crossings of the founder network that the cofounder brought up in this turn.
  const [founders, setFounders] = useState<string[]>([])
  const handlersRef = useRef(handlers)
  useEffect(() => { handlersRef.current = handlers })
  // One founder turn may span several model responses (answer → tool → follow-up).
  const turn = useRef({ question: '', message: '', next: null as NextStep | null, voice: false, active: false })

  const connection = useRealtimeConnection(projectId ? `projects/${projectId}/realtime` : null, event => onEvent(event), () => {
    finishTurn(); setSpeaking(false); setResponding(false); setTool(null)
  })
  const { send, setError } = connection
  const respond = () => send({ type: 'response.create', response: turn.current.voice ? {} : { output_modalities: ['text'] } })

  function startTurn(text: string, voice: boolean) {
    turn.current = { question: text, message: '', next: null, voice, active: true }
    setQuestion(text); setReply(''); setNext(null); setFounders([]); setError('')
  }
  function finishTurn() {
    const t = turn.current
    if (!t.active) return
    t.active = false
    const message = t.message.trim()
    if (message) handlersRef.current.saveTurn({ question: t.question.trim() || 'Conversación por voz', message, ...(t.next ?? { destination: 'ideation', phase: 'discover' }) })
  }

  async function runTools(calls: { name?: string; call_id?: string; arguments?: string }[]) {
    for (const call of calls) {
      let output: unknown
      try {
        const args = JSON.parse(call.arguments || '{}')
        if (call.name === 'read_project') { setTool('read'); output = await handlersRef.current.readProject() }
        else if (call.name === 'edit_map') { setTool('edit'); output = await handlersRef.current.editMap(Array.isArray(args.operations) ? args.operations : []) }
        else if (call.name === 'find_founders') {
          setTool('network'); output = await handlersRef.current.findFounders(Boolean(args.refresh), typeof args.query === 'string' && args.query.trim() ? args.query.trim() : undefined, args.intent === 'builder' ? 'builder' : 'learning')
          const matches = (output as { matches?: { matchId: string }[] }).matches
          if (Array.isArray(matches)) setFounders(matches.map(m => m.matchId))
        }
        else if (call.name === 'find_experiences') { setTool('cases'); output = await handlersRef.current.findExperiences(String(args.query ?? '')) }
        else if (call.name === 'answer_contact') { setTool('contact'); output = await handlersRef.current.answerContact(String(args.requestId ?? ''), Boolean(args.accept)) }
        else if (call.name === 'contact_founder') { setTool('contact'); output = await handlersRef.current.contactFounder(String(args.matchId ?? '')); setFounders(ids => ids.includes(args.matchId) ? ids : [...ids, args.matchId]) }
        else if (call.name === 'navigate') {
          const step = { destination: args.destination, phase: args.phase } as NextStep
          turn.current.next = step; setNext(step)
          handlersRef.current.navigate(step, Boolean(args.now))
          output = { ok: true }
        } else output = { error: 'Herramienta desconocida.' }
      } catch (cause) { output = { error: cause instanceof Error ? cause.message : 'Falló la herramienta.' } }
      finally { setTool(null) }
      send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(output) } })
    }
    respond()
  }

  function onEvent(event: RealtimeEvent) {
    switch (event.type) {
      case 'input_audio_buffer.speech_started': finishTurn(); startTurn('', true); setSpeaking(true); break
      case 'input_audio_buffer.speech_stopped': setSpeaking(false); break
      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript?.trim()) { turn.current.question = event.transcript.trim(); setQuestion(turn.current.question) }
        break
      case 'response.created': setResponding(true); if (turn.current.message) { turn.current.message += '\n\n'; setReply(turn.current.message) } break
      case 'response.output_text.delta':
      case 'response.output_audio_transcript.delta':
        turn.current.message += event.delta ?? ''; setReply(turn.current.message); break
      case 'response.done': {
        setResponding(false)
        const calls = (event.response?.output ?? []).filter(item => item.type === 'function_call')
        if (calls.length && event.response?.status === 'completed') void runTools(calls)
        else finishTurn()
        break
      }
    }
  }

  const { disconnect } = connection

  async function sendText(text: string) {
    const value = text.trim()
    if (!value) return
    try { await connection.open() } catch { return }
    if (turn.current.active) send({ type: 'response.cancel' })
    finishTurn(); startTurn(value, false)
    send({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: value }] } })
    respond()
  }

  async function toggleMic() {
    if (connection.listening) { connection.stopMic(); setSpeaking(false); return }
    await connection.startMic()
  }

  /** Tells the model what the founder is looking at, without asking for a reply. */
  const notify = useCallback((text: string) => send({ type: 'conversation.item.create', item: { type: 'message', role: 'system', content: [{ type: 'input_text', text }] } }), [send])

  /** Tells the model about something new, like a crossing, and lets it speak up if the founder is not mid-turn. */
  const announce = useCallback((text: string) => {
    notify(text)
    if (turn.current.active) return
    startTurn('', connection.hasMic())
    turn.current.question = 'Aviso de la red de founders'
    respond()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notify])

  const { levels, status, error, listening } = connection
  return { levels, status, error, listening, speaking, responding, question, reply, tool, next, founders, sendText, toggleMic, notify, announce, disconnect, connected: connection.connected }
}
