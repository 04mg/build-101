import type { GraphEdge, KnowledgeNote } from './types'

export function sourceContribution(note: KnowledgeNote, notes: KnowledgeNote[], edges: GraphEdge[]): string {
  if (note.kind !== 'source') return note.body
  if (note.quote && note.body.trim() !== note.quote.trim()) return note.body
  // Older projects stored the original excerpt in both body and quote. Prefer
  // an existing, cited insight until research generates a per-source contribution.
  const insights = edges
    .filter(edge => edge.target === note.id && edge.relation === 'derived_from')
    .map(edge => notes.find(candidate => candidate.id === edge.source && candidate.kind === 'insight'))
    .filter((insight): insight is KnowledgeNote => Boolean(insight))
  return insights.length ? insights.map(insight => insight.body).join('\n\n') : 'Aporte pendiente de sintetizar.'
}
