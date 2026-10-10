import { createServer } from 'node:http'
import type { Project } from '@ancadeba/schemas'
import { getProjectLabel } from '@ancadeba/utilities'

export function createEditorServer(project: Project) {
  return createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8')

    if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET' })
      response.end(JSON.stringify({ error: 'Method not allowed' }))
      return
    }

    let pathname: string

    try {
      pathname = new URL(request.url ?? '/', 'http://localhost').pathname
    } catch {
      response.writeHead(400)
      response.end(JSON.stringify({ error: 'Invalid request URL' }))
      return
    }

    if (pathname === '/api/health') {
      response.end(JSON.stringify({ status: 'ok' }))
      return
    }

    if (pathname === '/api/project') {
      response.end(JSON.stringify({ project, label: getProjectLabel(project) }))
      return
    }

    response.writeHead(404)
    response.end(JSON.stringify({ error: 'Not found' }))
  })
}
