import { useState } from 'react'
import type { Terrain } from '@ancadeba/schemas'

export function TerrainEditor({
  terrains,
  onChange,
}: {
  terrains: Terrain[]
  onChange: (terrains: Terrain[]) => void
}) {
  const [selected, setSelected] = useState(terrains[0]?.id ?? '')
  const terrain = terrains.find((entry) => entry.id === selected) ?? terrains[0]
  function replace(next: Terrain) {
    onChange(terrains.map((entry) => (entry.id === next.id ? next : entry)))
  }
  return (
    <details className='terrain-editor'>
      <summary>Edit terrain definitions</summary>
      <p className='hint'>
        The palette controls appearance and collision on every map using these
        IDs. Mods can replace definitions.
      </p>
      <div className='toolbar'>
        <label>
          Terrain definition
          <select
            aria-label='Terrain definition'
            value={terrain?.id ?? ''}
            onChange={(event) => setSelected(event.target.value)}
          >
            {terrains.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={() => {
            let index = 1
            while (terrains.some((entry) => entry.id === `terrain-${index}`))
              index++
            const id = `terrain-${index}`
            onChange([
              ...terrains,
              {
                id,
                name: 'New terrain',
                color: '#76648a',
                glyph: '·',
                walkable: true,
              },
            ])
            setSelected(id)
          }}
        >
          Add terrain
        </button>
      </div>
      {terrain && (
        <>
          <div className='form-grid'>
            <label>
              Terrain name
              <input
                value={terrain.name}
                onChange={(event) =>
                  replace({ ...terrain, name: event.target.value })
                }
              />
            </label>
            <label>
              Terrain ID
              <input readOnly value={terrain.id} />
            </label>
            <label>
              Terrain color
              <input
                type='color'
                value={terrain.color}
                onChange={(event) =>
                  replace({ ...terrain, color: event.target.value })
                }
              />
            </label>
            <label>
              Terrain glyph
              <input
                maxLength={4}
                value={terrain.glyph}
                onChange={(event) =>
                  replace({ ...terrain, glyph: event.target.value })
                }
              />
            </label>
          </div>
          <div className='toolbar'>
            <label className='checkbox-label'>
              <input
                type='checkbox'
                checked={terrain.walkable}
                onChange={(event) =>
                  replace({ ...terrain, walkable: event.target.checked })
                }
              />
              Walkable terrain
            </label>
            <button
              className='danger'
              onClick={() =>
                onChange(terrains.filter((entry) => entry.id !== terrain.id))
              }
            >
              Delete terrain
            </button>
          </div>
        </>
      )}
    </details>
  )
}
