import { expect, it } from 'vitest'
import { projectSchema } from '@ancadeba/schemas'
import { getProjectLabel } from '@ancadeba/utilities'

it('formats a project parsed by the shared schemas package', () => {
  const project = projectSchema.parse({ id: 'basic-game', name: 'Basic Game' })

  expect(getProjectLabel(project)).toBe('Basic Game (basic-game)')
})
