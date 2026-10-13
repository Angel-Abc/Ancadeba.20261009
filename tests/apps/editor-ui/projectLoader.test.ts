import { describe, expect, it, vi } from 'vitest'
import { ApiProjectLoader } from '../../../apps/editor-ui/src/projectLoader'

describe('ApiProjectLoader', () => {
  it('loads and validates the project, forwarding the cancellation signal', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        project: { id: ' server-game ', name: ' Server Game ' },
        label: 'A stale server label',
      }),
    )
    const signal = new AbortController().signal

    await expect(new ApiProjectLoader(request).load(signal)).resolves.toEqual({
      id: 'server-game',
      name: 'Server Game',
    })
    expect(request).toHaveBeenCalledWith('/api/project', { signal })
  })

  it('rejects unsuccessful HTTP responses before parsing their body', async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('Service unavailable', { status: 503 }))

    await expect(
      new ApiProjectLoader(request).load(new AbortController().signal),
    ).rejects.toThrow('Project request failed with status 503')
  })

  it.each([
    null,
    [],
    {},
    { project: null },
    { project: { id: 'server-game', name: ' ' } },
    { project: { id: 42, name: 'Server Game' } },
  ])('rejects invalid response data: %j', async (body) => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body))

    await expect(
      new ApiProjectLoader(request).load(new AbortController().signal),
    ).rejects.toThrow()
  })

  it('rejects malformed JSON', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response('{'))

    await expect(
      new ApiProjectLoader(request).load(new AbortController().signal),
    ).rejects.toThrow(SyntaxError)
  })

  it.each([
    new TypeError('Failed to fetch'),
    new DOMException('Request aborted', 'AbortError'),
  ])('propagates request failures: %s', async (failure) => {
    const request = vi.fn<typeof fetch>().mockRejectedValue(failure)

    await expect(
      new ApiProjectLoader(request).load(new AbortController().signal),
    ).rejects.toBe(failure)
  })

  it('saves with the loaded revision and forwards conflict errors', async () => {
    const project = { id: 'game', name: 'Game' }
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ project, revision: 7 }))
      .mockResolvedValueOnce(Response.json({ project, revision: 8 }))
      .mockResolvedValueOnce(
        Response.json(
          { error: 'Project changed. Reload before saving again.' },
          { status: 409 },
        ),
      )
    const loader = new ApiProjectLoader(request)
    await loader.load(new AbortController().signal)
    await expect(loader.save(project)).resolves.toEqual(project)
    expect(JSON.parse(String(request.mock.calls[1]?.[1]?.body))).toEqual({
      project,
      revision: 7,
    })
    await expect(loader.save(project)).rejects.toThrow('Project changed')
    expect(JSON.parse(String(request.mock.calls[2]?.[1]?.body)).revision).toBe(
      8,
    )
  })
})
