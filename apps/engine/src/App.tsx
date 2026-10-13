import { useMemo, useState } from 'react'
import { projectSchema, starterGame, type Project } from '@ancadeba/schemas'
import { getProjectLabel } from '@ancadeba/utilities'
import { BattleRuntime } from '@ancadeba/game-runtime'
import { BattleView } from '@ancadeba/game-ui'

interface AppProps {
  project: Project
}

export function App({ project }: AppProps) {
  const [activeProject, setActiveProject] = useState(project)
  const [encounterId, setEncounterId] = useState(
    project.game?.startingEncounter ?? starterGame.startingEncounter,
  )
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const game = activeProject.game ?? starterGame
  const validation = useMemo(() => {
    try {
      return { runtime: new BattleRuntime(game), error: '' }
    } catch (failure) {
      return {
        runtime: null,
        error:
          failure instanceof Error ? failure.message : 'Invalid game content',
      }
    }
  }, [game])
  function loadProject(input: unknown) {
    const next = projectSchema.parse(input)
    if (!next.game) throw new Error('This project has no game content')
    new BattleRuntime(next.game)
    setActiveProject(next)
    setEncounterId(next.game.startingEncounter)
    setError('')
    setNotice('Game loaded. Choose an encounter to play.')
  }
  async function loadEditorProject() {
    setLoading(true)
    try {
      const response = await fetch('/api/project')
      if (!response.ok)
        throw new Error('Could not load the saved editor project')
      const body: unknown = await response.json()
      if (!body || typeof body !== 'object' || !('project' in body))
        throw new Error('Invalid project response')
      loadProject(body.project)
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Project loading failed',
      )
    } finally {
      setLoading(false)
    }
  }
  return (
    <main className='player-shell'>
      <header className='player-header'>
        <div className='player-brand'>
          <span>A</span>
          <div>
            <h1>Ancadeba Engine</h1>
            <p>{getProjectLabel(activeProject)}</p>
          </div>
        </div>
        <div className='toolbar'>
          <button disabled={loading} onClick={loadEditorProject}>
            {loading ? 'Loading…' : 'Load editor project'}
          </button>
          <label className='file-button'>
            Open game JSON
            <input
              type='file'
              accept='.json,application/json'
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (file) {
                  try {
                    loadProject(JSON.parse(await file.text()))
                  } catch (failure) {
                    setError(
                      failure instanceof Error
                        ? failure.message
                        : 'Invalid game file',
                    )
                  }
                }
                event.target.value = ''
              }}
            />
          </label>
        </div>
      </header>
      <section className='player-intro'>
        <span className='eyebrow'>THE ALDERFELL CHRONICLES</span>
        <h2>Every turn tells a story.</h2>
        <p>
          A small party. An untamed forest. Choose an encounter and lead your
          adventurers through the wildwood.
        </p>
      </section>
      {(error || validation.error) && (
        <p className='error' role='alert'>
          {error || validation.error}
        </p>
      )}
      {notice && <p role='status'>{notice}</p>}
      {validation.runtime && (
        <>
          <div className='encounter-picker'>
            <label>
              Choose encounter
              <select
                value={encounterId}
                onChange={(event) => setEncounterId(event.target.value)}
              >
                {validation.runtime.content.encounters.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>
            <span>
              {game.mods.filter((mod) => mod.enabled).length} active mods ·
              Speed-based initiative
            </span>
          </div>
          <BattleView
            key={`${JSON.stringify(game)}:${encounterId}`}
            runtime={validation.runtime}
            encounterId={encounterId}
            {...(typeof window !== 'undefined'
              ? { storage: window.localStorage }
              : {})}
            saveKey={`ancadeba-game:${activeProject.id}:${encounterId}`}
          />
        </>
      )}
      <footer className='player-footer'>
        Built with Ancadeba · Modular turn-based RPG runtime
      </footer>
    </main>
  )
}
