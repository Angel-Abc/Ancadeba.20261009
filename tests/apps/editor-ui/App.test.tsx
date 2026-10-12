import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { App } from '../../../apps/editor-ui/src/App'

it('renders the loading state before requesting project data', () => {
  const load = vi.fn()
  const html = renderToStaticMarkup(
    createElement(App, { projectLoader: { load } }),
  )

  expect(html).toContain('Ancadeba Editor')
  expect(html).toContain('Loading project…')
  expect(html).not.toContain('The editor workspace is ready.')
  expect(load).not.toHaveBeenCalled()
})
