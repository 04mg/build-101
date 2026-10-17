import type { DeliverableKey, PhaseId, Project } from './types'

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
    { id: 'research', title: 'Investigar alternativas y pain points', done: doc?.research.status === 'complete', section: 'frame' },
    { id: 'hypotheses', title: 'Definir las hipótesis', done: Boolean(doc?.nodes.some(n => n.kind === 'hypothesis')), section: 'frame' },
    { id: 'experiment', title: 'Diseñar la validación', done: Boolean(doc?.nodes.some(n => n.kind === 'experiment')), section: 'validate' },
    { id: 'evidence', title: 'Reunir y contrastar evidencia', done: Boolean(doc?.nodes.some(n => n.kind === 'evidence' && n.status === 'done')), section: 'validate' },
    { id: 'decision', title: 'Tomar una decisión sobre el problema', done: Boolean(doc?.decision), section: 'validate' },
  ]
  return (Object.entries(artifacts) as [DeliverableKey, typeof artifacts[DeliverableKey]][])
    .filter(([, artifact]) => artifact.phase === phase && !artifact.optional)
    .map(([key, artifact]) => ({ id: key, title: artifact.title, done: doc?.nodes.find(n => n.id === `deliverable-${key}`)?.status === 'done', section: phase }))
}

export function overallPercent(project: Project | null) {
  return project?.overallProgress ?? Math.round(phases.reduce((sum, phase) => sum + phasePercent(project, phase.id), 0) / 3)
}
