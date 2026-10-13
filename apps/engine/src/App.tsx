import { useMemo, useState } from 'react'
import { projectSchema, starterGame, type Project } from '@ancadeba/schemas'
import { getProjectLabel } from '@ancadeba/utilities'
import { BattleRuntime, WorldRuntime } from '@ancadeba/game-runtime'
import { BattleView, WorldView } from '@ancadeba/game-ui'

interface AppProps {
  project: Project
}

export function App({ project }: AppProps) {
  const [activeProject, setActiveProject] = useState(project)
  const [mode, setMode] = useState<'world' | 'battle'>(
    (project.game ?? starterGame).maps.length ? 'world' : 'battle',
  )
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
  const worldRuntime = useMemo(
    () =>
      validation.runtime && validation.runtime.content.maps.length
        ? new WorldRuntime(validation.runtime, game.startingMap)
        : null,
    [validation.runtime, game.startingMap],
  )
  function loadProject(input: unknown) {
    const next = projectSchema.parse(input)
    if (!next.game) throw new Error('This project has no game content')
    new BattleRuntime(next.game)
    setActiveProject(next)
    setEncounterId(next.game.startingEncounter)
    setMode(next.game.maps.length ? 'world' : 'battle')
    setError('')
    setNotice('Game loaded. Explore the world or try a battle.')
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
        <span className='eyebrow'>{activeProject.name.toUpperCase()}</span>
        <h2>Every turn tells a story.</h2>
        <p>
          Explore connected maps, discover encounters, and lead your party
          through every battle.
        </p>
      </section>
      {(error || validation.error) && (
        <p className='error' role='alert'>
          {error || validation.error}
        </p>
      )}
      {notice && <p role='status'>{notice}</p>}
      <div className='player-modes' aria-label='Game modes'>
        <button
          className={mode === 'world' ? 'selected' : ''}
          disabled={!worldRuntime}
          onClick={() => setMode('world')}
        >
          Explore world
        </button>
        <button
          className={mode === 'battle' ? 'selected' : ''}
          onClick={() => setMode('battle')}
        >
          Battle sandbox
        </button>
      </div>
      {worldRuntime && (
        <div hidden={mode !== 'world'}>
          <WorldView
            active={mode === 'world'}
            key={JSON.stringify(game)}
            runtime={worldRuntime}
            mapId={game.startingMap ?? worldRuntime.content.maps[0]!.id}
            {...(typeof window !== 'undefined'
              ? { storage: window.localStorage }
              : {})}
            saveKey={`ancadeba-world:${activeProject.id}`}
          />
        </div>
      )}
      {mode === 'battle' && validation.runtime && (
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
