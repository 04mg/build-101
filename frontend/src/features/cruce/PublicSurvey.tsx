import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, Check, LoaderCircle } from 'lucide-react'
import { Logo } from './Logo'
import type { SurveyDraft } from './types'

type Answers = Record<string, string | string[] | number>
export function PublicSurvey({ token }: { token: string }) {
  const [survey, setSurvey] = useState<(SurveyDraft & { version: number }) | null>(null), [answers, setAnswers] = useState<Answers>({})
  const [loading, setLoading] = useState(true), [sending, setSending] = useState(false), [done, setDone] = useState(false), [error, setError] = useState('')
  const [id] = useState(() => crypto.randomUUID())
  useEffect(() => { let active = true; void fetch(`/api/public/surveys/${encodeURIComponent(token)}`, { cache: 'no-store' }).then(async response => { if (!response.ok) throw new Error(response.status === 503 ? await response.text() : 'Esta encuesta no está disponible. Pedile un link actualizado a quien te la compartió.'); return response.json() }).then(value => { if (active) setSurvey(value) }).catch(cause => { if (active) setError(cause.message) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [token])
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!survey || sending) return
    const missing = survey.questions.find(q => q.required && (answers[q.id] === undefined || answers[q.id] === '' || (Array.isArray(answers[q.id]) && !(answers[q.id] as string[]).length)))
    if (missing) { setError(`Completá la pregunta: ${missing.prompt}`); return }
    setSending(true); setError('')
    try {
      const response = await fetch(`/api/public/surveys/${encodeURIComponent(token)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, version: survey.version, answers }) })
      if (!response.ok) throw new Error(await response.text() || 'No se pudo enviar. Reintentá en unos segundos.')
      setDone(true)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo enviar la respuesta.') }
    finally { setSending(false) }
  }
  function choose(key: string, value: string | string[] | number) { setAnswers(a => ({ ...a, [key]: value })) }
  return <main className="public-survey-page"><div className="public-survey-brand"><Logo /><span>Una conversación para aprender</span></div><section className="public-survey-card">
    {loading ? <div className="public-survey-state"><LoaderCircle size={22} className="spin" /><p>Abriendo encuesta…</p></div> : done ? <div className="public-survey-state"><span className="public-survey-success"><Check size={28} /></span><h1>Gracias por compartir tu experiencia.</h1><p>Tu respuesta quedó guardada.</p></div> : survey ? <form onSubmit={event => void submit(event)}><span className="eyebrow">TU EXPERIENCIA IMPORTA</span><h1>{survey.title}</h1><p className="public-survey-intro">{survey.intro}</p>
      {survey.questions.map((q, index) => <fieldset className="public-survey-question" key={q.id}><legend><span>{String(index + 1).padStart(2, '0')}</span>{q.prompt}<small>{q.required ? 'Obligatoria' : 'Opcional'}</small></legend>
        {q.type === 'text' ? <textarea aria-label={q.prompt} rows={4} maxLength={4000} value={String(answers[q.id] ?? '')} onChange={e => choose(q.id, e.target.value)} /> : q.type === 'scale' ? <div className="survey-scale">{[1, 2, 3, 4, 5].map(n => <button type="button" key={n} aria-pressed={answers[q.id] === n} className={answers[q.id] === n ? 'chosen' : ''} onClick={() => choose(q.id, n)}>{n}</button>)}</div> : <div className="survey-choices">{q.options.map(option => { const picked = q.type === 'multiple' ? Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(option) : answers[q.id] === option; return <button type="button" key={option} className={picked ? 'chosen' : ''} aria-pressed={picked} onClick={() => { if (q.type === 'single') choose(q.id, option); else { const selected = (answers[q.id] as string[] | undefined) ?? []; choose(q.id, picked ? selected.filter(v => v !== option) : [...selected, option]) } }}><span className={`survey-choice-mark ${q.type}`}>{picked && <Check size={13} />}</span>{option}</button> })}</div>}
      </fieldset>)}<button className="primary public-survey-submit" disabled={sending}>{sending ? <LoaderCircle size={15} className="spin" /> : <ArrowRight size={15} />}{sending ? 'Enviando…' : 'Enviar respuestas'}</button>
    </form> : null}{error && <p className="survey-error" role="alert">{error}</p>}
  </section><p className="public-survey-footer">Hecho con cruce · No necesitás crear una cuenta.</p></main>
}
