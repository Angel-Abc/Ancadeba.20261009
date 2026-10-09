import type { Project } from '@ancadeba/schemas'
import { getProjectLabel } from '@ancadeba/utilities'

interface AppProps {
  project: Project
}

export function App({ project }: AppProps) {
  return (
    <main>
      <h1>Ancadeba Engine</h1>
      <p>{getProjectLabel(project)}</p>
      <p>The engine workspace is ready.</p>
    </main>
  )
}
