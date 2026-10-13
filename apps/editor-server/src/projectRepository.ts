import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { projectSchema, type Project } from '@ancadeba/schemas'

export interface ProjectSnapshot {
  project: Project
  revision: number
}
export interface ProjectRepository {
  read(): ProjectSnapshot
  save(project: Project, expectedRevision: number): Promise<ProjectSnapshot>
}

export class RevisionConflict extends Error {}

/** Serializes writes and publishes a new revision only after persistence succeeds. */
export class LocalProjectRepository implements ProjectRepository {
  private pending: Promise<unknown> = Promise.resolve()
  constructor(
    private snapshot: ProjectSnapshot,
    private readonly persist: (
      snapshot: ProjectSnapshot,
    ) => Promise<void> = async () => {},
  ) {}
  read(): ProjectSnapshot {
    return structuredClone(this.snapshot)
  }
  save(project: Project, expectedRevision: number): Promise<ProjectSnapshot> {
    const operation = this.pending.then(async () => {
      if (expectedRevision !== this.snapshot.revision)
        throw new RevisionConflict(
          'Project changed. Reload before saving again.',
        )
      const next = {
        project: projectSchema.parse(project),
        revision: this.snapshot.revision + 1,
      }
      await this.persist(next)
      this.snapshot = next
      return this.read()
    })
    this.pending = operation.catch(() => {})
    return operation
  }
}

export async function openFileRepository(
  path: string,
  fallback: Project,
): Promise<ProjectRepository> {
  let snapshot: ProjectSnapshot = { project: fallback, revision: 0 }
  try {
    const saved: unknown = JSON.parse(await readFile(path, 'utf8'))
    if (
      !saved ||
      typeof saved !== 'object' ||
      !('project' in saved) ||
      !('revision' in saved) ||
      typeof saved.revision !== 'number' ||
      !Number.isSafeInteger(saved.revision) ||
      saved.revision < 0
    )
      throw new Error('Invalid saved project envelope')
    snapshot = {
      project: projectSchema.parse(saved.project),
      revision: saved.revision,
    }
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT'))
      throw error
  }
  return new LocalProjectRepository(snapshot, async (next) => {
    await mkdir(dirname(path), { recursive: true })
    const temporary = `${path}.${randomUUID()}.tmp`
    await writeFile(temporary, JSON.stringify(next, null, 2), 'utf8')
    await rename(temporary, path)
  })
}
