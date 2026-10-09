import type { Project } from '@ancadeba/schemas'

export function getProjectLabel(project: Project): string {
  return `${project.name} (${project.id})`
}
