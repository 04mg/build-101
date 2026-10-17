import { useCallback, useEffect, useRef, useState } from 'react'

interface SpeechEvent { results: { length: number; [index: number]: { 0: { transcript: string } } } }
interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean
  onresult: ((event: SpeechEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void; abort: () => void
}
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }

export function useVoiceInput({ value, onChange, disabled = false, maxLength }: { value: string; onChange: (value: string) => void; disabled?: boolean; maxLength: number }) {
  const [listening, setListening] = useState(false), [error, setError] = useState('')
  const engine = useRef<Recognition | null>(null), active = useRef(false), restart = useRef<ReturnType<typeof setTimeout> | null>(null)
  const current = useRef(value), change = useRef(onChange)
  useEffect(() => { current.current = value; change.current = onChange }, [value, onChange])

  const stop = useCallback(() => {
    active.current = false
    if (restart.current) clearTimeout(restart.current)
    if (engine.current) {
      engine.current.onresult = null; engine.current.onerror = null; engine.current.onend = null
      engine.current.abort(); engine.current = null
    }
    setListening(false)
    // Interim text is already visible and remains editable when dictation stops.
    return current.current
  }, [])

  const start = useCallback(() => {
    if (disabled || active.current) return
    setError('')
    const browser = window as SpeechWindow, Engine = browser.SpeechRecognition ?? browser.webkitSpeechRecognition
    if (!Engine) { setError('Este navegador no admite dictado en vivo. Podés escribir tu respuesta.'); return }
    const recognition = new Engine()
    engine.current = recognition
    recognition.lang = 'es-UY'; recognition.continuous = true; recognition.interimResults = true
    let prefix = current.current.trimEnd()
    recognition.onresult = event => {
      if (!active.current) return
      const parts: string[] = []
      // The results contain the whole current recognition session, including
      // revisions of interim words. Replace that suffix instead of appending it.
      for (let i = 0; i < event.results.length; i++) parts.push(event.results[i][0].transcript.trim())
      const text = [prefix, parts.join(' ')].filter(Boolean).join(' ').slice(0, maxLength)
      current.current = text; change.current(text)
      if (text.length >= maxLength) stop()
    }
    recognition.onerror = event => {
      if (!active.current || event.error === 'no-speech') return
      const message = event.error === 'not-allowed' || event.error === 'service-not-allowed' ? 'Permití el acceso al micrófono para dictar.'
        : event.error === 'audio-capture' ? 'No se pudo acceder al micrófono. Revisá que esté disponible.'
          : 'Se interrumpió el dictado. El texto queda guardado en el campo; podés continuar escribiendo o volver a activar el micrófono.'
      stop(); setError(message)
    }
    recognition.onend = () => {
      if (!active.current) return
      // Some browsers end recognition at a pause even in continuous mode.
      prefix = current.current.trimEnd()
      restart.current = setTimeout(() => {
        if (!active.current) return
        try { recognition.start() } catch { stop(); setError('El dictado se detuvo. Podés volver a activar el micrófono.'); }
      }, 250)
    }
    try { active.current = true; recognition.start(); setListening(true) }
    catch { stop(); setError('No se pudo iniciar el dictado. Revisá el permiso del micrófono.') }
  }, [disabled, maxLength, stop])

  useEffect(() => { if (disabled && active.current) stop() }, [disabled, stop])
  useEffect(() => () => {
    active.current = false
    if (restart.current) clearTimeout(restart.current)
    if (engine.current) { engine.current.onresult = null; engine.current.onerror = null; engine.current.onend = null; engine.current.abort() }
  }, [])

  return { listening, error, start, stop, toggle: () => { if (active.current) stop(); else start() } }
}
