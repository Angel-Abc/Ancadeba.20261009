import { useState } from 'react'
import type { ContentPack, Game, Npc } from '@ancadeba/schemas'

export function NpcEditor({
  game,
  catalog,
  onChange,
}: {
  game: Game
  catalog: ContentPack
  onChange: (game: Game) => void
}) {
  const [selected, setSelected] = useState(game.npcs[0]?.id ?? '')
  const npc = game.npcs.find((entry) => entry.id === selected) ?? game.npcs[0]
  function replace(next: Npc) {
    onChange({
      ...game,
      npcs: game.npcs.map((entry) => (entry.id === next.id ? next : entry)),
    })
  }
  function add() {
    if (!catalog.dialogues.length) return
    let index = 1
    while (catalog.npcs.some((entry) => entry.id === `npc-${index}`)) index++
    const next: Npc = {
      id: `npc-${index}`,
      name: 'New NPC',
      description: '',
      dialogueId: catalog.dialogues[0]!.id,
      glyph: '♙',
      color: '#d9b47f',
    }
    onChange({ ...game, npcs: [...game.npcs, next] })
    setSelected(next.id)
  }
  return (
    <div className='content-editor'>
      <aside className='entry-list'>
        <div className='section-heading'>
          <span>{game.npcs.length} NPCs</span>
          <button disabled={!catalog.dialogues.length} onClick={add}>
            Add NPC
          </button>
        </div>
        {game.npcs.map((entry) => (
          <button
            key={entry.id}
            className={entry.id === npc?.id ? 'selected' : ''}
            onClick={() => setSelected(entry.id)}
          >
            <strong>{entry.name || 'Untitled'}</strong>
            <code>{entry.id}</code>
          </button>
        ))}
        <p className='hint'>
          Create a dialogue first, then assign it to an NPC and place the NPC on
          a map.
        </p>
      </aside>
      <section className='inspector'>
        {npc ? (
          <>
            <div className='section-heading'>
              <div>
                <span className='eyebrow'>WORLD CHARACTER</span>
                <h2>{npc.name || 'Untitled'}</h2>
              </div>
              <button
                className='danger'
                onClick={() =>
                  onChange({
                    ...game,
                    npcs: game.npcs.filter((entry) => entry.id !== npc.id),
                  })
                }
              >
                Delete NPC
              </button>
            </div>
            <div className='form-grid'>
              <label>
                NPC name
                <input
                  value={npc.name}
                  onChange={(event) =>
                    replace({ ...npc, name: event.target.value })
                  }
                />
              </label>
              <label>
                NPC ID
                <input readOnly value={npc.id} />
              </label>
              <label>
                NPC glyph
                <input
                  maxLength={4}
                  value={npc.glyph}
                  onChange={(event) =>
                    replace({ ...npc, glyph: event.target.value })
                  }
                />
              </label>
              <label>
                NPC color
                <input
                  type='color'
                  value={npc.color}
                  onChange={(event) =>
                    replace({ ...npc, color: event.target.value })
                  }
                />
              </label>
            </div>
            <label>
              NPC description
              <textarea
                aria-label='NPC description'
                value={npc.description}
                onChange={(event) =>
                  replace({ ...npc, description: event.target.value })
                }
              />
            </label>
            <label>
              NPC dialogue
              <select
                aria-label='NPC dialogue'
                value={npc.dialogueId}
                onChange={(event) =>
                  replace({ ...npc, dialogueId: event.target.value })
                }
              >
                {catalog.dialogues.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>
            <p className='hint'>
              This definition can be placed on multiple maps. Mods can replace
              its appearance and dialogue assignment.
            </p>
          </>
        ) : (
          <div className='empty-state'>
            <h2>No NPCs yet</h2>
            <p>Create a dialogue, then add a character to your world.</p>
            <button disabled={!catalog.dialogues.length} onClick={add}>
              Create first NPC
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
