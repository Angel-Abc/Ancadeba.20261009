import { useEffect, useMemo, useState } from 'react'
import {
  modSchema,
  projectSchema,
  starterGame,
  type Project,
} from '@ancadeba/schemas'
import { BattleRuntime } from '@ancadeba/game-runtime'
import { BattleView, downloadJson } from '@ancadeba/game-ui'
import { getProjectLabel } from '@ancadeba/utilities'
import { ContentEditor, type Collection } from './ContentEditor'
import type { ProjectLoader } from './projectLoader'
import { useProjectHistory } from './useProjectHistory'

type Tab = 'overview' | Collection | 'mods' | 'source' | 'playtest'
const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '◈' },
  { id: 'actors', label: 'Actors', icon: '♙' },
  { id: 'abilities', label: 'Abilities', icon: '✦' },
  { id: 'encounters', label: 'Encounters', icon: '⚑' },
  { id: 'mods', label: 'Mods', icon: '▧' },
  { id: 'source', label: 'Project JSON', icon: '{ }' },
  { id: 'playtest', label: 'Playtest', icon: '▷' },
]

function SourceEditor({
  project,
  apply,
}: {
  project: Project
  apply: (json: string) => void
}) {
  const [json, setJson] = useState(JSON.stringify(project, null, 2))
  return (
    <section className='panel'>
      <div className='section-heading'>
        <div>
          <span className='eyebrow'>PORTABLE GAME DATA</span>
          <h2>Project source</h2>
          <p>
            Edit the complete project, including mod packs. Apply validates the
            schema and content references.
          </p>
        </div>
        <button className='primary' onClick={() => apply(json)}>
          Apply JSON
        </button>
      </div>
      <label>
        Project JSON
        <textarea
          className='source-editor'
          spellCheck={false}
          value={json}
          onChange={(event) => setJson(event.target.value)}
        />
      </label>
    </section>
  )
}

export function Workspace({
  initialProject,
  loader,
}: {
  initialProject: Project
  loader: ProjectLoader
}) {
  const { project, setProject, undo, redo, canUndo, canRedo } =
    useProjectHistory({
      ...initialProject,
      game: initialProject.game ?? starterGame,
    })
  const [savedJson, setSavedJson] = useState(JSON.stringify(initialProject))
  const [tab, setTab] = useState<Tab>('overview')
  const [encounterId, setEncounterId] = useState(
    project.game!.startingEncounter,
  )
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const game = project.game!
  const dirty = JSON.stringify(project) !== savedJson
  const validation = useMemo(() => {
    try {
      const parsed = projectSchema.parse(project)
      return { runtime: new BattleRuntime(parsed.game!), error: '' }
    } catch (failure) {
      return {
        runtime: null,
        error: failure instanceof Error ? failure.message : 'Invalid project',
      }
    }
  }, [project])
  const runtime = validation.runtime
  const activeEncounter =
    runtime?.content.encounters.find((entry) => entry.id === encounterId)?.id ??
    game.startingEncounter

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function change(next: Project) {
    setProject(next)
    setNotice('')
    setError('')
  }
  function apply(json: string) {
    try {
      const next = projectSchema.parse(JSON.parse(json))
      if (!next.game)
        throw new Error('Imported projects must include game content')
      new BattleRuntime(next.game)
      change(next)
      setEncounterId(next.game.startingEncounter)
      setNotice('Project imported. Save to keep these changes on disk.')
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Invalid project JSON',
      )
    }
  }
  async function save() {
    if (!loader.save) {
      setError(
        'This project loader does not support saving. Export JSON instead.',
      )
      return
    }
    setBusy(true)
    setError('')
    try {
      const saved = await loader.save(project)
      setSavedJson(JSON.stringify(saved))
      setNotice('Project saved to disk.')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }
  async function reload() {
    setBusy(true)
    try {
      const next = await loader.load(new AbortController().signal)
      setProject({ ...next, game: next.game ?? structuredClone(starterGame) })
      setSavedJson(JSON.stringify(next))
      setEncounterId(
        next.game?.startingEncounter ?? starterGame.startingEncounter,
      )
      setNotice('Saved project reloaded.')
      setError('')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Reload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='editor-shell'>
      <aside className='sidebar'>
        <div className='brand'>
          <span className='brand-mark'>A</span>
          <div>
            <strong>ANCADEBA</strong>
            <span>RPG WORKSPACE</span>
          </div>
        </div>
        <div className='sidebar-project'>
          <span className='eyebrow'>PROJECT</span>
          <strong>{project.name}</strong>
          <code>{project.id}</code>
        </div>
        <nav aria-label='Editor sections'>
          {tabs.map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? 'active' : ''}
              onClick={() => {
                setTab(item.id)
                setError('')
              }}
            >
              <span aria-hidden='true'>{item.icon}</span>
              {item.label}
              {item.id in game &&
                Array.isArray(game[item.id as Collection]) && (
                  <small>{game[item.id as Collection].length}</small>
                )}
            </button>
          ))}
        </nav>
        <div className='sidebar-footer'>
          <span className='status-dot' />
          Runtime v1
          <p>
            Build worlds.
            <br />
            Make every turn matter.
          </p>
        </div>
      </aside>
      <div className='workspace'>
        <header className='workspace-header'>
          <div>
            <h1>Ancadeba Editor</h1>
            <span className='muted'>{getProjectLabel(project)}</span>
          </div>
          <div className='toolbar'>
            <span className={`save-status ${dirty ? 'dirty' : ''}`}>
              {dirty ? 'Unsaved changes' : 'All changes saved'}
            </span>
            <button
              disabled={busy || !canUndo}
              onClick={() => {
                undo()
                setError('')
                setNotice('')
              }}
            >
              Undo
            </button>
            <button
              disabled={busy || !canRedo}
              onClick={() => {
                redo()
                setError('')
                setNotice('')
              }}
            >
              Redo
            </button>
            <button
              onClick={() =>
                downloadJson(
                  `${project.id}.json`,
                  JSON.stringify(project, null, 2),
                )
              }
            >
              Export JSON
            </button>
            <label className='file-button'>
              Import project
              <input
                type='file'
                accept='.json,application/json'
                disabled={busy}
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    try {
                      apply(await file.text())
                    } catch {
                      setError('Could not read project file')
                    }
                  }
                  event.target.value = ''
                }}
              />
            </label>
            <button
              className='primary'
              disabled={busy || !!validation.error || !dirty}
              onClick={save}
            >
              {busy ? 'Working…' : 'Save project'}
            </button>
          </div>
        </header>
        <main className='workspace-main'>
          <div className='page-heading'>
            <div>
              <span className='eyebrow'>
                GAME AUTHORING / {tab.toUpperCase()}
              </span>
              <h2>{tabs.find((entry) => entry.id === tab)!.label}</h2>
            </div>
            <button onClick={() => setTab('playtest')} disabled={!runtime}>
              ▷ Playtest game
            </button>
          </div>
          {error && (
            <p className='error' role='alert'>
              {error}
            </p>
          )}
          {validation.error && (
            <p className='error' role='alert'>
              Content needs attention: {validation.error}
            </p>
          )}
          {notice && (
            <p className='notice' role='status'>
              {notice}
            </p>
          )}
          <fieldset className='workspace-fields' disabled={busy}>
            {tab === 'overview' && (
              <>
                <div className='welcome-panel'>
                  <span className='eyebrow'>
                    YOUR NEXT ADVENTURE STARTS HERE
                  </span>
                  <h2>A world shaped by your choices.</h2>
                  <p>
                    Define your party, craft their abilities, and balance every
                    encounter. Playtest each change with the same runtime that
                    powers your game.
                  </p>
                  <button
                    className='primary'
                    onClick={() => setTab('playtest')}
                    disabled={!runtime}
                  >
                    Play the starting encounter →
                  </button>
                  <span className='welcome-orbit' aria-hidden='true'>
                    ✦
                  </span>
                </div>
                <div className='stat-grid'>
                  {(['actors', 'abilities', 'encounters', 'mods'] as const).map(
                    (key) => (
                      <button
                        key={key}
                        className='stat-card'
                        onClick={() => setTab(key)}
                      >
                        <span>{key}</span>
                        <strong>
                          {game[key].length.toString().padStart(2, '0')}
                        </strong>
                        <small>
                          {key === 'mods'
                            ? `${game.mods.filter((mod) => mod.enabled).length} enabled`
                            : 'Base definitions →'}
                        </small>
                      </button>
                    ),
                  )}
                </div>
                <section className='panel'>
                  <div className='section-heading'>
                    <div>
                      <h2>Project settings</h2>
                      <p>
                        Content is portable JSON. Changes remain a draft until
                        you save.
                      </p>
                    </div>
                    <button onClick={reload}>Reload saved project</button>
                  </div>
                  <div className='form-grid'>
                    <label>
                      Project name
                      <input
                        value={project.name}
                        onChange={(event) =>
                          change({ ...project, name: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      Starting encounter
                      <select
                        value={game.startingEncounter}
                        onChange={(event) =>
                          change({
                            ...project,
                            game: {
                              ...game,
                              startingEncounter: event.target.value,
                            },
                          })
                        }
                      >
                        {(runtime?.content.encounters ?? game.encounters).map(
                          (entry) => (
                            <option key={entry.id} value={entry.id}>
                              {entry.name}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  </div>
                </section>
                <section className='panel getting-started'>
                  <h3>From idea to encounter</h3>
                  <div>
                    <p>
                      <b>01 · Build your cast</b>Actors hold stats and known
                      abilities. IDs connect definitions across the project.
                    </p>
                    <p>
                      <b>02 · Give them choices</b>Combine effects into skills.
                      Tune costs, power, and target rules.
                    </p>
                    <p>
                      <b>03 · Make it yours</b>Import a mod, override a
                      definition, and test the result immediately.
                    </p>
                  </div>
                </section>
              </>
            )}
            {(tab === 'actors' ||
              tab === 'abilities' ||
              tab === 'encounters') && (
              <ContentEditor
                key={tab}
                game={game}
                catalog={runtime?.content ?? game}
                collection={tab}
                onChange={(next) => change({ ...project, game: next })}
              />
            )}
            {tab === 'mods' && (
              <section className='panel'>
                <div className='section-heading'>
                  <div>
                    <span className='eyebrow'>EXTEND YOUR WORLD</span>
                    <h2>Content mods</h2>
                    <p>
                      Enabled mods load after the base game. Dependencies load
                      first; later definitions with the same ID replace earlier
                      ones.
                    </p>
                  </div>
                  <label className='file-button'>
                    Import mod
                    <input
                      type='file'
                      accept='.json,application/json'
                      onChange={async (event) => {
                        const file = event.target.files?.[0]
                        if (file) {
                          try {
                            const mod = modSchema.parse(
                              JSON.parse(await file.text()),
                            )
                            if (game.mods.some((entry) => entry.id === mod.id))
                              throw new Error(
                                'A mod with this ID already exists',
                              )
                            change({
                              ...project,
                              game: { ...game, mods: [...game.mods, mod] },
                            })
                          } catch (failure) {
                            setError(
                              failure instanceof Error
                                ? failure.message
                                : 'Invalid mod',
                            )
                          }
                        }
                        event.target.value = ''
                      }}
                    />
                  </label>
                </div>
                {game.mods.map((mod, index) => (
                  <article className='mod-card' key={mod.id}>
                    <div>
                      <h3>
                        {mod.name} <small>v{mod.version}</small>
                      </h3>
                      <p>{mod.description}</p>
                      <code>{mod.id}</code>
                      <p className='hint'>
                        {mod.actors.length} actors · {mod.abilities.length}{' '}
                        abilities · {mod.encounters.length} encounters
                        {mod.requires.length > 0
                          ? ` · Requires: ${mod.requires.join(', ')}`
                          : ''}
                      </p>
                    </div>
                    <div className='mod-controls'>
                      <label className='checkbox-label'>
                        <input
                          type='checkbox'
                          checked={mod.enabled}
                          onChange={(event) =>
                            change({
                              ...project,
                              game: {
                                ...game,
                                mods: game.mods.map((entry) =>
                                  entry.id === mod.id
                                    ? {
                                        ...entry,
                                        enabled: event.target.checked,
                                      }
                                    : entry,
                                ),
                              },
                            })
                          }
                        />
                        Enabled
                      </label>
                      <button
                        disabled={index === 0}
                        onClick={() => {
                          const mods = [...game.mods]
                          ;[mods[index - 1], mods[index]] = [
                            mods[index]!,
                            mods[index - 1]!,
                          ]
                          change({ ...project, game: { ...game, mods } })
                        }}
                      >
                        Move earlier
                      </button>
                      <button
                        onClick={() =>
                          downloadJson(
                            `${mod.id}.json`,
                            JSON.stringify(mod, null, 2),
                          )
                        }
                      >
                        Export mod
                      </button>
                      <button
                        className='danger'
                        onClick={() =>
                          change({
                            ...project,
                            game: {
                              ...game,
                              mods: game.mods.filter(
                                (entry) => entry.id !== mod.id,
                              ),
                            },
                          })
                        }
                      >
                        Remove mod
                      </button>
                    </div>
                  </article>
                ))}
                {game.mods.length === 0 && (
                  <p>
                    No mods installed. Import a content pack to extend this
                    game.
                  </p>
                )}
                <p className='hint'>
                  Use Project JSON to author a mod pack or edit its definitions.
                  Code plugins can register custom effect handlers through the
                  runtime API; imported JSON is data only.
                </p>
              </section>
            )}
            {tab === 'source' && (
              <SourceEditor project={project} apply={apply} />
            )}
            {tab === 'playtest' && runtime && (
              <>
                <div className='playtest-controls'>
                  <label>
                    Encounter
                    <select
                      value={activeEncounter}
                      onChange={(event) => setEncounterId(event.target.value)}
                    >
                      {runtime.content.encounters.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p>
                    Playing your current draft ·{' '}
                    {game.mods.filter((mod) => mod.enabled).length} active mods
                  </p>
                </div>
                <BattleView
                  key={`${JSON.stringify(game)}:${activeEncounter}`}
                  runtime={runtime}
                  encounterId={activeEncounter}
                  storage={window.localStorage}
                  saveKey={`ancadeba-preview:${project.id}:${activeEncounter}`}
                />
              </>
            )}
          </fieldset>
        </main>
        <footer className='workspace-footer'>
          <span>ANCADEBA · TURN-BASED RPG TOOLKIT</span>
          <span>
            Schema v{game.formatVersion} ·{' '}
            {runtime ? 'Content valid' : 'Validation required'}
          </span>
        </footer>
      </div>
    </div>
  )
}
