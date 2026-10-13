import { once } from 'node:events'
import { request } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { projectSchema, starterProject } from '@ancadeba/schemas'
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
      server.close((error) => (error ? reject(error) : resolve()))
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
      revision: 0,
      label: 'Basic Game (basic-game)',
    })
  })

  it('returns 404 for unknown routes', async () => {
    const response = await fetch(`${baseUrl}/missing`)

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Not found' })
  })

  it('rejects malformed URLs and continues serving requests', async () => {
    const result = await new Promise<{
      statusCode: number | undefined
      body: string
    }>((resolve, reject) => {
      // fetch normalizes URLs, so send the malformed request target directly.
      const invalidRequest = request(baseUrl, { path: '//[]/' }, (response) => {
        let body = ''
        response.setEncoding('utf8')
        response.on('data', (chunk: string) => (body += chunk))
        response.on('error', reject)
        response.on('end', () =>
          resolve({ statusCode: response.statusCode, body }),
        )
      })
      invalidRequest.on('error', reject)
      invalidRequest.end()
    })

    expect(result.statusCode).toBe(400)
    expect(JSON.parse(result.body)).toEqual({ error: 'Invalid request URL' })

    const response = await fetch(`${baseUrl}/api/health`)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  it('rejects unsupported HTTP methods', async () => {
    const response = await fetch(`${baseUrl}/api/project`, { method: 'POST' })

    expect(response.status).toBe(405)
    expect(response.headers.get('allow')).toBe('GET, PUT')
  })

  it('validates and saves content with a revision, rejecting stale writes', async () => {
    const save = (body: unknown) =>
      fetch(`${baseUrl}/api/project`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    const response = await save({ project: starterProject, revision: 0 })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      project: starterProject,
      revision: 1,
    })
    expect((await save({ project, revision: 0 })).status).toBe(409)
    const latest = await fetch(`${baseUrl}/api/project`)
    expect(await latest.json()).toMatchObject({
      project: starterProject,
      revision: 1,
    })
  })

  it('rejects broken game references without changing the project', async () => {
    const invalid = structuredClone(starterProject)
    invalid.game.actors[0]!.abilities = ['missing']
    const response = await fetch(`${baseUrl}/api/project`, {
      method: 'PUT',
      body: JSON.stringify({ project: invalid, revision: 0 }),
    })
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining('missing ability'),
    })
    expect(await (await fetch(`${baseUrl}/api/project`)).json()).toMatchObject({
      project,
      revision: 0,
    })
  })

  it('rejects malformed JSON and oversized bodies', async () => {
    const malformed = await fetch(`${baseUrl}/api/project`, {
      method: 'PUT',
      body: '{',
    })
    expect(malformed.status).toBe(400)
    const oversized = await fetch(`${baseUrl}/api/project`, {
      method: 'PUT',
      body: JSON.stringify({ padding: 'x'.repeat(2 * 1024 * 1024) }),
    })
    expect(oversized.status).toBe(400)
  })

  it('rejects broken map references and keeps saved world content intact', async () => {
    const valid = await fetch(`${baseUrl}/api/project`, {
      method: 'PUT',
      body: JSON.stringify({ project: starterProject, revision: 0 }),
    })
    expect(valid.status).toBe(200)
    const invalid = structuredClone(starterProject)
    invalid.game.maps[0]!.portals[0]!.targetMapId = 'missing'
    const rejected = await fetch(`${baseUrl}/api/project`, {
      method: 'PUT',
      body: JSON.stringify({ project: invalid, revision: 1 }),
    })
    expect(rejected.status).toBe(400)
    expect(await rejected.json()).toMatchObject({
      error: expect.stringContaining('missing map'),
    })
    expect(await (await fetch(`${baseUrl}/api/project`)).json()).toMatchObject({
      project: starterProject,
      revision: 1,
    })
  })

  it('validates dialogue links and persists NPC and dialogue content', async () => {
    const invalid = structuredClone(starterProject)
    invalid.game.dialogues[0]!.nodes[0]!.choices[0]!.nextNodeId = 'missing'
    const rejected = await fetch(`${baseUrl}/api/project`, {
      method: 'PUT',
      body: JSON.stringify({ project: invalid, revision: 0 }),
    })
    expect(rejected.status).toBe(400)
    expect(await rejected.json()).toMatchObject({
      error: expect.stringContaining('missing node'),
    })
    const saved = await fetch(`${baseUrl}/api/project`, {
      method: 'PUT',
      body: JSON.stringify({ project: starterProject, revision: 0 }),
    })
    expect(saved.status).toBe(200)
    const body = await (await fetch(`${baseUrl}/api/project`)).json()
    expect(body.project.game.npcs[0].name).toBe('Mara')
    expect(body.project.game.dialogues[0].nodes[0].choices[0].nextNodeId).toBe(
      'road',
    )
    expect(body.project.game.maps[0].npcs[0].npcId).toBe('mara')
  })
})
