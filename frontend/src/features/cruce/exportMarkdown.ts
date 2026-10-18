import { artifacts } from './phases'
import type { DeliverableKey, Project } from './types'

// A phase's deliverables as one Markdown file the founder can take anywhere.
export function deliverablesMarkdown(project: Project, title: string, keys: DeliverableKey[], extra: string[] = []) {
  const sections = keys.map(key => {
    const note = project.document.nodes.find(n => n.id === `deliverable-${key}`)
    return note?.body.trim() ? `## ${artifacts[key].title}${note.status === 'done' ? '' : ' (borrador)'}\n\n${note.body.trim()}` : ''
  }).filter(Boolean)
  const problem = project.document.nodes.find(n => n.id === 'problem')?.body
  return [`# ${title} · ${project.name}`, problem ? `> ${problem}` : '', ...extra, ...sections].filter(Boolean).join('\n\n') + '\n'
}

export function downloadMarkdown(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url; link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
