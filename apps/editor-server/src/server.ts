import { createServer, type IncomingMessage } from 'node:http'
import { projectSchema, type Project } from '@ancadeba/schemas'
import { BattleRuntime } from '@ancadeba/game-runtime'
import { getProjectLabel } from '@ancadeba/utilities'
import {
  LocalProjectRepository,
  RevisionConflict,
  type ProjectRepository,
} from './projectRepository.js'

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk)
    size += buffer.length
    if (size > 2 * 1024 * 1024)
      throw new Error('Project exceeds the 2 MB limit')
    chunks.push(buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

export function createEditorServer(
  project: Project,
  repository: ProjectRepository = new LocalProjectRepository({
    project,
    revision: 0,
  }),
) {
  return createServer(async (request, response) => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.setHeader('Cache-Control', 'no-store')

    let pathname: string

    try {
      pathname = new URL(request.url ?? '/', 'http://localhost').pathname
    } catch {
      response.writeHead(400)
      response.end(JSON.stringify({ error: 'Invalid request URL' }))
      return
    }

    const allowed = pathname === '/api/project' ? 'GET, PUT' : 'GET'
    if (
      request.method !== 'GET' &&
      !(pathname === '/api/project' && request.method === 'PUT')
    ) {
      response.writeHead(405, { Allow: allowed })
      response.end(JSON.stringify({ error: 'Method not allowed' }))
      return
    }

    if (pathname === '/api/health') {
      response.end(JSON.stringify({ status: 'ok' }))
      return
    }

    if (pathname === '/api/project') {
      try {
        if (request.method === 'PUT') {
          const body = await readBody(request)
          if (
            !body ||
            typeof body !== 'object' ||
            !('project' in body) ||
            !('revision' in body) ||
            typeof body.revision !== 'number' ||
            !Number.isSafeInteger(body.revision) ||
            body.revision < 0
          )
            throw new Error('Expected a project and nonnegative revision')
          const next = projectSchema.parse(body.project)
          if (next.game) new BattleRuntime(next.game)
          await repository.save(next, body.revision)
        }
        const snapshot = repository.read()
        response.end(
          JSON.stringify({
            ...snapshot,
            label: getProjectLabel(snapshot.project),
          }),
        )
      } catch (error) {
        response.writeHead(
          error instanceof RevisionConflict
            ? 409
            : request.method === 'PUT'
              ? 400
              : 500,
        )
        response.end(
          JSON.stringify({
            error:
              error instanceof Error
                ? error.message
                : 'Project operation failed',
          }),
        )
      }
      return
    }

    response.writeHead(404)
    response.end(JSON.stringify({ error: 'Not found' }))
  })
}
