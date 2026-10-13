import { describe, expect, it } from 'vitest'
import { gameSchema, projectSchema, starterProject } from '@ancadeba/schemas'

describe('projectSchema', () => {
  it('normalizes valid project data', () => {
    expect(
      projectSchema.parse({ id: ' basic-game ', name: ' Basic Game ' }),
    ).toEqual({
      id: 'basic-game',
      name: 'Basic Game',
    })
  })

  it.each([
    { id: '', name: 'Basic Game' },
    { id: 'basic-game', name: '   ' },
    { id: 'basic-game' },
  ])('rejects invalid project data: %j', (project) => {
    expect(projectSchema.safeParse(project).success).toBe(false)
  })

  it('validates the starter project and rejects incompatible formats and negative stats', () => {
    expect(projectSchema.parse(starterProject)).toEqual(starterProject)
    expect(
      gameSchema.safeParse({ ...starterProject.game, formatVersion: 2 })
        .success,
    ).toBe(false)
    const invalid = structuredClone(starterProject)
    invalid.game.actors[0]!.maxHp = -1
    expect(projectSchema.safeParse(invalid).success).toBe(false)
    invalid.game.actors[0]!.id = '../escape'
    expect(projectSchema.safeParse(invalid).success).toBe(false)
  })
})
