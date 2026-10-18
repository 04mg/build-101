import type { DeliverableKey, PhaseId, Project } from './types'
import { chosenSolution, hypothesisValidated } from './types'

export const phases: { id: PhaseId; name: string; question: string; description: string; subtitle: string }[] = [
  { id: 'discover', name: 'Discover', question: '¿Qué problema vale la pena resolver?', description: 'Entender a quién le pasa, cómo lo resuelve hoy y qué evidencia tenemos.', subtitle: 'Discover & Frame · Validate Problem' },
  { id: 'explore', name: 'Explore', question: '¿Cuál es la mejor forma de resolverlo?', description: 'Comparar alternativas, definir una propuesta y hacer explícitos sus riesgos.', subtitle: 'Explore & Define Solution' },
  { id: 'prototype', name: 'Prototype', question: '¿La gente realmente quiere esta solución?', description: 'Probar la propuesta con el menor esfuerzo posible y aprender de lo que pasa.', subtitle: 'Prototype & Test' },
]

export const artifacts: Record<DeliverableKey, { phase: PhaseId; title: string; description: string; placeholder: string; optional?: boolean }> = {
  'customer-journey': { phase: 'discover', title: 'Customer Journey', description: 'El proceso actual, sus fricciones y los momentos que importan.', placeholder: 'Situación → acción → alternativa actual → pain point → evidencia', optional: true },
  'interview-guide': { phase: 'discover', title: 'Guía de entrevistas', description: 'Preguntas sobre hechos recientes, sin vender la solución.', placeholder: 'Perfil, invitación, preguntas y registro de observaciones.', optional: true },
  survey: { phase: 'discover', title: 'Encuesta de problema', description: 'Un cuestionario para contrastar las hipótesis del problema.', placeholder: 'Objetivo, preguntas, opciones de respuesta y criterio previo.', optional: true },
  'comparison-matrix': { phase: 'explore', title: 'Matriz de alternativas', description: 'Comparar el proceso actual con distintas formas de resolverlo.', placeholder: 'Alternativa | Valor | Fricción | Viabilidad | Riesgo', optional: true },
  'solution-concept': { phase: 'explore', title: 'Solution Concept', description: 'Qué proponemos, para quién y cómo resuelve el problema.', placeholder: 'Segmento, problema, mecanismo de solución y alcance mínimo.' },
  'value-proposition': { phase: 'explore', title: 'Value Proposition', description: 'El resultado que prometemos y por qué elegir esta alternativa.', placeholder: 'Para [segmento], ayudamos a [resultado] mediante [mecanismo].' },
  'critical-assumptions': { phase: 'explore', title: 'Critical Assumptions', description: 'Qué tendría que ser cierto para que la solución funcione.', placeholder: 'Supuesto → riesgo → evidencia → experimento mínimo.' },
  prototype: { phase: 'prototype', title: 'Prototype', description: 'Landing, Mago de Oz o Fake Door: probar antes de construir.', placeholder: 'Propuesta, CTA, operación mínima, canal y criterio del experimento.' },
  'experiment-results': { phase: 'prototype', title: 'Experiment Results', description: 'Qué hicieron las personas y qué pudimos medir.', placeholder: 'Hipótesis, método, muestra, resultados reales y limitaciones.' },
  learnings: { phase: 'prototype', title: 'Learnings', description: 'Lo aprendido, lo que cambió y el próximo movimiento.', placeholder: 'Qué apoyamos, qué contradijimos, qué queda abierto y qué decidimos.' },
}

export function phasePercent(project: Project | null, phase: PhaseId) {
  return project?.phaseProgress?.[phase] ?? (phase === 'discover' ? project?.progress ?? 0 : 0)
}

export function getSteps(project: Project | null, phase: PhaseId) {
  const doc = project?.document
  if (phase === 'discover') return [
    { id: 'problem', title: 'Formular el problema', done: Boolean(doc?.confirmed), section: 'frame' },
    ...[0, 1, 2].map(i => {
      const hypothesis = doc?.nodes.filter(n => n.kind === 'hypothesis')[i]
      return { id: hypothesis?.id ?? `hypothesis-${i}`, title: `Validar hipótesis 0${i + 1}`, done: Boolean(project && hypothesis && hypothesisValidated(project, hypothesis.id)), section: 'validate' }
    }),
  ]
  const approved = (key: DeliverableKey) => doc?.nodes.find(n => n.id === `deliverable-${key}`)?.status === 'done'
  if (phase === 'explore') return [
    { id: 'matrix', title: 'Matriz de alternativas', done: Boolean(doc?.explore?.rows.length), section: phase },
    { id: 'choice', title: 'Elegir la solución', done: Boolean(chosenSolution(project)), section: phase },
    ...(['solution-concept', 'value-proposition', 'critical-assumptions'] as const).map(key => ({ id: key, title: artifacts[key].title, done: approved(key), section: phase })),
  ]
  const prototype = doc?.prototype
  return [
    { id: 'landing', title: 'Landing publicada', done: Boolean(prototype?.hasLanding && prototype.solutionId === doc?.explore?.chosenId), section: phase },
    ...[0, 1, 2].map(i => ({ id: `lh-${i + 1}`, title: `Hipótesis 0${i + 1} de la landing`, done: Boolean(prototype?.hypotheses[i]?.decision), section: phase })),
  ]
}

export function overallPercent(project: Project | null) {
  return project?.overallProgress ?? Math.round(phases.reduce((sum, phase) => sum + phasePercent(project, phase.id), 0) / 3)
}
