import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { starterProject } from '@ancadeba/schemas'
import {
  LocalProjectRepository,
  openFileRepository,
} from '../../../apps/editor-server/src/projectRepository.js'

describe('project repository', () => {
  it('serializes simultaneous saves and rejects stale revisions', async () => {
    const repository = new LocalProjectRepository({
      project: starterProject,
      revision: 0,
    })
    const saves = await Promise.allSettled([
      repository.save({ ...starterProject, name: 'First' }, 0),
      repository.save({ ...starterProject, name: 'Second' }, 0),
    ])
    expect(saves[0]!.status).toBe('fulfilled')
    expect(saves[1]!.status).toBe('rejected')
    expect(repository.read().project.name).toBe('First')
    expect(repository.read().revision).toBe(1)
    const snapshot = repository.read()
    snapshot.project.name = 'Mutation'
    expect(repository.read().project.name).toBe('First')
  })

  it('does not publish failed persistence and permits a subsequent retry', async () => {
    let fail = true
    const repository = new LocalProjectRepository(
      { project: starterProject, revision: 0 },
      async () => {
        if (fail) throw new Error('Disk full')
      },
    )
    await expect(
      repository.save({ ...starterProject, name: 'Changed' }, 0),
    ).rejects.toThrow('Disk full')
    expect(repository.read().revision).toBe(0)
    fail = false
    await expect(
      repository.save({ ...starterProject, name: 'Changed' }, 0),
    ).resolves.toMatchObject({ revision: 1 })
  })

  it('persists across repository instances and refuses to replace corrupted files', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ancadeba-repository-'))
    const path = join(directory, 'project.json')
    try {
      const repository = await openFileRepository(path, starterProject)
      await repository.save({ ...starterProject, name: 'On disk' }, 0)
      const reopened = await openFileRepository(path, starterProject)
      expect(reopened.read()).toMatchObject({
        project: { name: 'On disk' },
        revision: 1,
      })
      await reopened.save({ ...starterProject, name: 'Updated again' }, 1)
      expect(JSON.parse(await readFile(path, 'utf8')).revision).toBe(2)
      await writeFile(path, '{broken', 'utf8')
      await expect(openFileRepository(path, starterProject)).rejects.toThrow()
      expect(await readFile(path, 'utf8')).toBe('{broken')
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
