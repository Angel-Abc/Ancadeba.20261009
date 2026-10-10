import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { projectSchema } from '@ancadeba/schemas'
import { createEditorServer } from '../../../apps/editor-server/src/server.js'

describe('editor server', () => {
  const project = projectSchema.parse({ id: 'basic-game', name: 'Basic Game' })
  let server: ReturnType<typeof createEditorServer>
  let baseUrl: string

  beforeEach(async () => {
    server = createEditorServer(project)
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${address.port}`
  })

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve())
    })
  })

  it('returns health status', async () => {
    const response = await fetch(`${baseUrl}/api/health`)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  it('serves the injected project using both shared packages', async () => {
    const response = await fetch(`${baseUrl}/api/project?preview=true`)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      project,
      label: 'Basic Game (basic-game)',
    })
  })

  it('returns 404 for unknown routes', async () => {
    const response = await fetch(`${baseUrl}/missing`)

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Not found' })
  })

  it('rejects unsupported HTTP methods', async () => {
    const response = await fetch(`${baseUrl}/api/project`, { method: 'POST' })

    expect(response.status).toBe(405)
    expect(response.headers.get('allow')).toBe('GET')
  })
})
