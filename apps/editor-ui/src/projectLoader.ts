import { projectSchema, type Project } from '@ancadeba/schemas'

export interface ProjectLoader {
  load(signal: AbortSignal): Promise<Project>
}

export class ApiProjectLoader implements ProjectLoader {
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

    return projectSchema.parse(body.project)
  }
}
