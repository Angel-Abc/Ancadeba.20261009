import { resolve } from 'node:path'
import { starterProject } from '@ancadeba/schemas'
import { createEditorServer } from './server.js'
import { openFileRepository } from './projectRepository.js'

const port = Number(process.env.PORT ?? 3000)
const host = process.env.HOST ?? '127.0.0.1'

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535')
}

const path = resolve(process.env.PROJECT_FILE ?? '../../data/project.json')
const repository = await openFileRepository(path, starterProject)
const server = createEditorServer(starterProject, repository)

server.listen(port, host, () => {
  console.log(`Editor server listening on http://${host}:${port}`)
})

server.on('error', (error) => {
  console.error(error)
  process.exitCode = 1
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => server.close())
}
