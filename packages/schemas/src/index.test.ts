import { describe, expect, it } from 'vitest'
import { projectSchema } from './index.js'

describe('projectSchema', () => {
  it('normalizes valid project data', () => {
    expect(projectSchema.parse({ id: ' basic-game ', name: ' Basic Game ' })).toEqual({
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
})
