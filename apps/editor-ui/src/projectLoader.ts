import { projectSchema, type Project } from '@ancadeba/schemas'

export interface ProjectLoader {
  load(signal: AbortSignal): Promise<Project>
  save?(project: Project): Promise<Project>
}

export class ApiProjectLoader implements ProjectLoader {
  private revision = 0
  constructor(private readonly request: typeof fetch) {}

  async load(signal: AbortSignal): Promise<Project> {
    const request = this.request
    const response = await request('/api/project', { signal })

    if (!response.ok) {
      throw new Error(`Project request failed with status ${response.status}`)
    }

    const body: unknown = await response.json()

    if (typeof body !== 'object' || body === null || !('project' in body)) {
      throw new Error('Invalid project response')
    }

    const project = projectSchema.parse(body.project)
    if ('revision' in body && typeof body.revision === 'number')
      this.revision = body.revision
    return project
  }

  async save(project: Project): Promise<Project> {
    const request = this.request
    const response = await request('/api/project', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, revision: this.revision }),
    })
    const body: unknown = await response.json()
    if (!response.ok) {
      const message =
        body && typeof body === 'object' && 'error' in body
          ? String(body.error)
          : 'Could not save project'
      throw new Error(message)
    }
    if (
      !body ||
      typeof body !== 'object' ||
      !('project' in body) ||
      !('revision' in body) ||
      typeof body.revision !== 'number'
    )
      throw new Error('Invalid save response')
    const saved = projectSchema.parse(body.project)
    this.revision = body.revision
    return saved
  }
}
