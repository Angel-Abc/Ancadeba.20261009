import { useState } from 'react'
import type {
  Dialogue,
  DialogueFlags,
  DialogueNode,
  Game,
} from '@ancadeba/schemas'
import { DialogueRuntime } from '@ancadeba/game-runtime'
import { DialogueView } from '@ancadeba/game-ui'
import { DialogueChoiceEditor } from './DialogueChoiceEditor'

function Preview({ dialogue }: { dialogue: Dialogue }) {
  const [runtime] = useState(() => new DialogueRuntime([dialogue]))
  const [session, setSession] = useState<ReturnType<
    DialogueRuntime['start']
  > | null>(() => runtime.start(dialogue.id))
  const [flags, setFlags] = useState<DialogueFlags>({})
  const [error, setError] = useState('')
  return (
    <div className='dialogue-preview'>
      <div className='section-heading'>
        <h3>Conversation preview</h3>
        <button
          onClick={() => {
            setSession(runtime.start(dialogue.id))
            setFlags({})
            setError('')
          }}
        >
          Restart conversation
        </button>
      </div>
      {error && (
        <p className='error' role='alert'>
          {error}
        </p>
      )}
      {session ? (
        <DialogueView
          runtime={runtime}
          session={session}
          flags={flags}
          showFlags
          autoFocus={false}
          onChoose={(id) => {
            try {
              const result = runtime.choose(session, flags, id)
              setSession(result.session)
              setFlags(result.flags)
            } catch (failure) {
              setError(
                failure instanceof Error ? failure.message : 'Choice failed',
              )
            }
          }}
          onEnd={() => setSession(null)}
        />
      ) : (
        <p role='status'>Conversation ended. Restart to try another branch.</p>
      )}
    </div>
  )
}

export function DialogueEditor({
  game,
  canPlay,
  onChange,
}: {
  game: Game
  canPlay: boolean
  onChange: (game: Game) => void
}) {
  const [selectedId, setSelectedId] = useState(game.dialogues[0]?.id ?? '')
  const [selectedNodeId, setSelectedNodeId] = useState('')
  const [preview, setPreview] = useState(false)
  const dialogue =
    game.dialogues.find((entry) => entry.id === selectedId) ?? game.dialogues[0]
  const node =
    dialogue?.nodes.find((entry) => entry.id === selectedNodeId) ??
    dialogue?.nodes[0]
  function replace(next: Dialogue) {
    onChange({
      ...game,
      dialogues: game.dialogues.map((entry) =>
        entry.id === next.id ? next : entry,
      ),
    })
  }
  function replaceNode(next: DialogueNode) {
    if (dialogue)
      replace({
        ...dialogue,
        nodes: dialogue.nodes.map((entry) =>
          entry.id === next.id ? next : entry,
        ),
      })
  }
  function addDialogue() {
    let index = 1
    while (game.dialogues.some((entry) => entry.id === `dialogue-${index}`))
      index++
    const next: Dialogue = {
      id: `dialogue-${index}`,
      name: 'New dialogue',
      startNodeId: 'greeting',
      nodes: [
        { id: 'greeting', speaker: '', text: 'Hello, traveller.', choices: [] },
      ],
    }
    onChange({ ...game, dialogues: [...game.dialogues, next] })
    setSelectedId(next.id)
    setSelectedNodeId('greeting')
    setPreview(false)
  }
  function addNode() {
    if (!dialogue) return
    let index = 1
    while (dialogue.nodes.some((entry) => entry.id === `node-${index}`)) index++
    const next: DialogueNode = {
      id: `node-${index}`,
      speaker: '',
      text: 'A new part of the conversation.',
      choices: [],
    }
    replace({ ...dialogue, nodes: [...dialogue.nodes, next] })
    setSelectedNodeId(next.id)
  }
  function addChoice() {
    if (!node) return
    let index = 1
    while (node.choices.some((entry) => entry.id === `choice-${index}`)) index++
    replaceNode({
      ...node,
      choices: [
        ...node.choices,
        {
          id: `choice-${index}`,
          text: 'New response',
          nextNodeId: null,
          conditions: [],
          effects: [],
        },
      ],
    })
  }
  return (
    <section className='dialogue-editor'>
      <div className='section-heading'>
        <div>
          <span className='eyebrow'>BRANCHING STORIES</span>
          <h2>Dialogue editor</h2>
          <p>
            Connect nodes with responses. Conditions hide choices; effects
            remember the player’s decisions.
          </p>
        </div>
        <div className='toolbar'>
          <button onClick={addDialogue}>Add dialogue</button>
          {dialogue && (
            <>
              <button
                className='danger'
                onClick={() =>
                  onChange({
                    ...game,
                    dialogues: game.dialogues.filter(
                      (entry) => entry.id !== dialogue.id,
                    ),
                  })
                }
              >
                Delete dialogue
              </button>
              <button
                disabled={!canPlay}
                className='primary'
                onClick={() => setPreview(!preview)}
              >
                {preview ? 'Close preview' : 'Preview dialogue'}
              </button>
            </>
          )}
        </div>
      </div>
      {dialogue ? (
        <>
          <div className='form-grid'>
            <label>
              Dialogue definition
              <select
                aria-label='Dialogue definition'
                value={dialogue.id}
                onChange={(event) => {
                  setSelectedId(event.target.value)
                  setSelectedNodeId('')
                  setPreview(false)
                }}
              >
                {game.dialogues.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Dialogue name
              <input
                value={dialogue.name}
                onChange={(event) =>
                  replace({ ...dialogue, name: event.target.value })
                }
              />
            </label>
            <label>
              Dialogue ID
              <input readOnly value={dialogue.id} />
            </label>
            <label>
              Start node
              <select
                aria-label='Start node'
                value={dialogue.startNodeId}
                onChange={(event) =>
                  replace({ ...dialogue, startNodeId: event.target.value })
                }
              >
                {dialogue.nodes.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.id}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className='dialogue-authoring-layout'>
            <aside className='dialogue-node-list'>
              <div className='section-heading'>
                <h3>{dialogue.nodes.length} nodes</h3>
                <button onClick={addNode}>Add node</button>
              </div>
              {dialogue.nodes.map((entry) => (
                <button
                  key={entry.id}
                  className={entry.id === node?.id ? 'selected' : ''}
                  onClick={() => setSelectedNodeId(entry.id)}
                >
                  <strong>
                    {entry.id}
                    {entry.id === dialogue.startNodeId ? ' · start' : ''}
                  </strong>
                  <span>{entry.text.slice(0, 70)}</span>
                  <small>
                    {entry.choices
                      .map(
                        (choice) =>
                          `${choice.id} → ${choice.nextNodeId ?? 'end'}`,
                      )
                      .join(' · ') || 'End node'}
                  </small>
                </button>
              ))}
            </aside>
            <section className='dialogue-node-editor'>
              {node && (
                <>
                  <div className='section-heading'>
                    <h3>Node: {node.id}</h3>
                    <button
                      disabled={dialogue.nodes.length === 1}
                      className='danger'
                      onClick={() =>
                        replace({
                          ...dialogue,
                          nodes: dialogue.nodes.filter(
                            (entry) => entry.id !== node.id,
                          ),
                        })
                      }
                    >
                      Delete node
                    </button>
                  </div>
                  <label>
                    Speaker override
                    <input
                      value={node.speaker}
                      placeholder='Uses the NPC name when blank'
                      onChange={(event) =>
                        replaceNode({ ...node, speaker: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Node text
                    <textarea
                      aria-label='Node text'
                      value={node.text}
                      onChange={(event) =>
                        replaceNode({ ...node, text: event.target.value })
                      }
                    />
                  </label>
                  <div className='section-heading'>
                    <h3>Player responses</h3>
                    <button onClick={addChoice}>Add choice</button>
                  </div>
                  {node.choices.map((choice) => (
                    <DialogueChoiceEditor
                      key={choice.id}
                      choice={choice}
                      nodes={dialogue.nodes}
                      onChange={(next) =>
                        replaceNode({
                          ...node,
                          choices: node.choices.map((entry) =>
                            entry.id === next.id ? next : entry,
                          ),
                        })
                      }
                      onDelete={() =>
                        replaceNode({
                          ...node,
                          choices: node.choices.filter(
                            (entry) => entry.id !== choice.id,
                          ),
                        })
                      }
                    />
                  ))}
                  {node.choices.length === 0 && (
                    <p className='hint'>
                      This is an end node. Add a response to continue the
                      conversation.
                    </p>
                  )}
                </>
              )}
            </section>
          </div>
          {preview && canPlay && (
            <Preview key={JSON.stringify(dialogue)} dialogue={dialogue} />
          )}
          <p className='hint'>
            Node IDs and response IDs are stable. Deleting a referenced node
            shows a validation error until links are repaired or the deletion is
            undone. Use Project JSON to rename IDs. Map previews use enabled mod
            overrides.
          </p>
        </>
      ) : (
        <div className='empty-state'>
          <h3>No dialogues yet</h3>
          <button onClick={addDialogue}>Create first dialogue</button>
        </div>
      )}
    </section>
  )
}
