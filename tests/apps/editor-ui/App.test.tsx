import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { projectSchema } from '@ancadeba/schemas'
import { App } from '../../../apps/editor-ui/src/App'

it('renders project data through both shared packages', () => {
  const project = projectSchema.parse({ id: 'basic-game', name: 'Basic Game' })
  const html = renderToStaticMarkup(createElement(App, { project }))

  expect(html).toContain('Ancadeba Editor')
  expect(html).toContain('Basic Game (basic-game)')
})
