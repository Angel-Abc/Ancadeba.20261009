import { useEffect, useState } from 'react'
import type { Project } from '@ancadeba/schemas'
import type { ProjectLoader } from './projectLoader'
import { Workspace } from './Workspace'

interface AppProps {
  projectLoader: ProjectLoader
}

type ProjectState =
  | { status: 'loading' }
  | { status: 'ready'; project: Project }
  | { status: 'error' }

export function App({ projectLoader }: AppProps) {
  const [state, setState] = useState<ProjectState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    projectLoader.load(controller.signal).then(
      (project) => {
        if (!controller.signal.aborted) setState({ status: 'ready', project })
      },
      () => {
        if (!controller.signal.aborted) setState({ status: 'error' })
      },
    )

    return () => controller.abort()
  }, [projectLoader, attempt])

  function retry() {
    setState({ status: 'loading' })
    setAttempt((previous) => previous + 1)
  }

  if (state.status === 'ready')
    return <Workspace initialProject={state.project} loader={projectLoader} />

  return (
    <main className='loading-screen'>
      <h1>Ancadeba Editor</h1>
      {state.status === 'loading' && <p role='status'>Loading project…</p>}
      {state.status === 'error' && (
        <>
          <p role='alert'>Could not load the project. Please try again.</p>
          <button type='button' onClick={retry}>
            Retry
          </button>
        </>
      )}
    </main>
  )
}
