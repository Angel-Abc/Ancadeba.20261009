import { useState } from 'react'
import {
  starterTerrains,
  type ContentPack,
  type Game,
  type Position,
  type WorldMap,
} from '@ancadeba/schemas'
import { MapGrid } from '@ancadeba/game-ui'
import { clearMarker, nextMarkerId, paintTile, resizeMap } from './mapEditing'
import { TerrainEditor } from './TerrainEditor'

type Tool =
  'paint' | 'inspect' | 'spawn' | 'encounter' | 'portal' | 'npc' | 'erase'
const tools: { id: Tool; label: string }[] = [
  { id: 'paint', label: 'Paint terrain' },
  { id: 'inspect', label: 'Inspect tile' },
  { id: 'spawn', label: 'Place spawn' },
  { id: 'encounter', label: 'Place encounter' },
  { id: 'portal', label: 'Place portal' },
  { id: 'npc', label: 'Place NPC' },
  { id: 'erase', label: 'Erase marker' },
]

function MapSize({
  map,
  fill,
  onChange,
}: {
  map: WorldMap
  fill: string
  onChange: (map: WorldMap) => void
}) {
  const [width, setWidth] = useState(map.width)
  const [height, setHeight] = useState(map.height)
  return (
    <div className='map-size'>
      <label>
        Map width
        <input
          type='number'
          min={1}
          max={64}
          value={width}
          onChange={(event) => setWidth(Number(event.target.value))}
        />
      </label>
      <label>
        Map height
        <input
          type='number'
          min={1}
          max={64}
          value={height}
          onChange={(event) => setHeight(Number(event.target.value))}
        />
      </label>
      <button
        disabled={
          !Number.isInteger(width) ||
          !Number.isInteger(height) ||
          width < 1 ||
          height < 1 ||
          width > 64 ||
          height > 64 ||
          (width === map.width && height === map.height)
        }
        onClick={() => onChange(resizeMap(map, width, height, fill))}
      >
        Resize map
      </button>
      <p className='hint'>
        Shrinking crops tiles and markers. Portal destinations on other maps may
        need repair. Undo restores the previous size.
      </p>
    </div>
  )
}

export function MapEditor({
  game,
  catalog,
  canPlay,
  onChange,
  onPlay,
}: {
  game: Game
  catalog: ContentPack
  canPlay: boolean
  onChange: (game: Game) => void
  onPlay: (mapId: string) => void
}) {
  const [selectedId, setSelectedId] = useState(game.maps[0]?.id ?? '')
  const [tool, setTool] = useState<Tool>('paint')
  const [brushId, setBrushId] = useState(
    catalog.terrains.find((entry) => entry.walkable)?.id ?? '',
  )
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const [encounterId, setEncounterId] = useState(
    catalog.encounters[0]?.id ?? '',
  )
  const [targetMapId, setTargetMapId] = useState(catalog.maps[0]?.id ?? '')
  const [npcId, setNpcId] = useState(catalog.npcs[0]?.id ?? '')
  const [error, setError] = useState('')
  const [tileSize, setTileSize] = useState(36)
  const map = game.maps.find((entry) => entry.id === selectedId) ?? game.maps[0]
  const palette = catalog.terrains.length ? catalog.terrains : game.terrains
  const brush = palette.find((entry) => entry.id === brushId) ?? palette[0]
  const selected = map
    ? {
        x: Math.min(position.x, map.width - 1),
        y: Math.min(position.y, map.height - 1),
      }
    : position
  const trigger = map?.encounters.find(
    (entry) => entry.x === selected.x && entry.y === selected.y,
  )
  const portal = map?.portals.find(
    (entry) => entry.x === selected.x && entry.y === selected.y,
  )
  const targetMap =
    catalog.maps.find((entry) => entry.id === targetMapId) ?? catalog.maps[0]
  const npcPlacement = map?.npcs.find(
    (entry) => entry.x === selected.x && entry.y === selected.y,
  )
  function update(next: WorldMap) {
    onChange({
      ...game,
      maps: game.maps.map((entry) => (entry.id === next.id ? next : entry)),
    })
    setError('')
  }
  function add() {
    let index = 1
    while (
      catalog.maps.some((entry) => entry.id === `map-${index}`) ||
      game.maps.some((entry) => entry.id === `map-${index}`)
    )
      index++
    const id = `map-${index}`
    const terrains =
      game.terrains.length || catalog.terrains.length
        ? game.terrains
        : starterTerrains
    const fill = [...terrains, ...catalog.terrains].find(
      (entry) => entry.walkable,
    )
    if (!fill) {
      setError('Add a walkable terrain before creating a map.')
      return
    }
    const next: WorldMap = {
      id,
      name: 'New map',
      description: '',
      width: 8,
      height: 8,
      tiles: Array.from({ length: 64 }, () => fill.id),
      spawn: { x: 1, y: 1 },
      encounters: [],
      portals: [],
      npcs: [],
    }
    onChange({
      ...game,
      terrains,
      maps: [...game.maps, next],
      ...(game.startingMap ? {} : { startingMap: id }),
    })
    setSelectedId(id)
    setPosition(next.spawn)
    setError('')
  }
  function edit(position: Position) {
    if (!map) return
    setPosition(position)
    if (tool === 'inspect') return
    if (tool === 'paint') {
      if (!brush) {
        setError('Choose a terrain first.')
        return
      }
      update(paintTile(map, position, brush.id))
      return
    }
    if (tool === 'erase') {
      update(clearMarker(map, position))
      return
    }
    const terrain = palette.find(
      (entry) => entry.id === map.tiles[position.y * map.width + position.x],
    )
    if (!terrain?.walkable) {
      setError('Spawn, encounters, portals, and NPCs need a walkable tile.')
      return
    }
    if (tool === 'spawn') {
      update({ ...map, spawn: position })
      return
    }
    const cleared = clearMarker(map, position)
    if (tool === 'npc') {
      if (map.spawn.x === position.x && map.spawn.y === position.y) {
        setError('An NPC cannot occupy the player spawn.')
        return
      }
      const npc =
        catalog.npcs.find((entry) => entry.id === npcId) ?? catalog.npcs[0]
      if (!npc) {
        setError('Create an NPC first.')
        return
      }
      update({
        ...cleared,
        npcs: [
          ...cleared.npcs,
          { id: nextMarkerId(map, 'npc'), npcId: npc.id, ...position },
        ],
      })
      return
    }
    if (tool === 'encounter') {
      const encounter =
        catalog.encounters.find((entry) => entry.id === encounterId) ??
        catalog.encounters[0]
      if (!encounter) {
        setError('Create an encounter first.')
        return
      }
      update({
        ...cleared,
        encounters: [
          ...cleared.encounters,
          {
            id: nextMarkerId(map, 'encounter'),
            ...position,
            encounterId: encounter.id,
            repeatable: false,
          },
        ],
      })
    } else {
      if (!targetMap) {
        setError('Create a destination map first.')
        return
      }
      update({
        ...cleared,
        portals: [
          ...cleared.portals,
          {
            id: nextMarkerId(map, 'portal'),
            name: `To ${targetMap.name}`,
            ...position,
            targetMapId: targetMap.id,
            destination: { ...targetMap.spawn },
          },
        ],
      })
    }
  }
  return (
    <section className='map-editor'>
      <div className='section-heading'>
        <div>
          <span className='eyebrow'>WORLD BUILDER</span>
          <h2>World maps</h2>
          <p>
            Paint terrain, place encounters and NPCs, and connect maps with
            portals. Changes use the project’s undo history.
          </p>
        </div>
        <div className='toolbar'>
          <button onClick={add}>Add map</button>
          {map && (
            <>
              <button
                className='danger'
                onClick={() => {
                  onChange({
                    ...game,
                    maps: game.maps.filter((entry) => entry.id !== map.id),
                  })
                  setPosition({ x: 0, y: 0 })
                }}
              >
                Delete map
              </button>
              <button
                className='primary'
                disabled={!canPlay}
                onClick={() => onPlay(map.id)}
              >
                Playtest map
              </button>
            </>
          )}
        </div>
      </div>
      {error && (
        <p className='error' role='alert'>
          {error}
        </p>
      )}
      {map ? (
        <>
          <div className='map-authoring-layout'>
            <div className='map-canvas-panel'>
              <div className='map-toolbar'>
                <label>
                  Map definition
                  <select
                    aria-label='Map definition'
                    value={map.id}
                    onChange={(event) => {
                      setSelectedId(event.target.value)
                      setPosition({ x: 0, y: 0 })
                      setError('')
                    }}
                  >
                    {game.maps.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Editor zoom
                  <input
                    type='range'
                    min={24}
                    max={64}
                    step={4}
                    value={tileSize}
                    onChange={(event) =>
                      setTileSize(Number(event.target.value))
                    }
                  />
                </label>
              </div>
              <div className='map-tools'>
                {tools.map((entry) => (
                  <button
                    className={tool === entry.id ? 'selected' : ''}
                    key={entry.id}
                    onClick={() => setTool(entry.id)}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
              <div className='terrain-palette' aria-label='Terrain palette'>
                {palette.map((entry) => (
                  <button
                    key={entry.id}
                    className={brush?.id === entry.id ? 'selected' : ''}
                    onClick={() => {
                      setBrushId(entry.id)
                      setTool('paint')
                    }}
                  >
                    <span style={{ background: entry.color }}>
                      {entry.glyph}
                    </span>
                    {entry.name}
                    <small>{entry.walkable ? 'Walkable' : 'Blocked'}</small>
                  </button>
                ))}
              </div>
              <MapGrid
                map={map}
                terrains={palette}
                npcs={catalog.npcs}
                selected={selected}
                tileSize={tileSize}
                onSelect={edit}
              />
              <div className='map-legend'>
                <span>♙ {map.npcs.length} NPCs</span>
                <span>
                  ⌂ Spawn ({map.spawn.x}, {map.spawn.y})
                </span>
                <span>⚔ {map.encounters.length} encounters</span>
                <span>◇ {map.portals.length} portals</span>
                <span>
                  {map.width} × {map.height}
                </span>
              </div>
            </div>
            <aside className='map-inspector'>
              <h3>Map settings</h3>
              <label>
                Map name
                <input
                  value={map.name}
                  onChange={(event) =>
                    update({ ...map, name: event.target.value })
                  }
                />
              </label>
              <label>
                Map ID
                <input value={map.id} readOnly />
              </label>
              <label>
                Map description
                <textarea
                  value={map.description}
                  onChange={(event) =>
                    update({ ...map, description: event.target.value })
                  }
                />
              </label>
              <MapSize
                key={`${map.id}:${map.width}:${map.height}`}
                map={map}
                fill={
                  palette.find((entry) => entry.walkable)?.id ?? map.tiles[0]!
                }
                onChange={update}
              />
              <h3>
                Selected tile: {selected.x}, {selected.y}
              </h3>
              <label>
                NPC to place
                <select
                  aria-label='NPC to place'
                  value={npcId}
                  onChange={(event) => setNpcId(event.target.value)}
                >
                  {catalog.npcs.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tile terrain
                <select
                  aria-label='Tile terrain'
                  value={map.tiles[selected.y * map.width + selected.x]}
                  onChange={(event) =>
                    update(paintTile(map, selected, event.target.value))
                  }
                >
                  {palette.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Encounter to place
                <select
                  aria-label='Encounter to place'
                  value={encounterId}
                  onChange={(event) => setEncounterId(event.target.value)}
                >
                  {catalog.encounters.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Portal destination map
                <select
                  aria-label='Portal destination map'
                  value={targetMap?.id ?? ''}
                  onChange={(event) => setTargetMapId(event.target.value)}
                >
                  {catalog.maps.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </label>
              {trigger && (
                <div className='marker-inspector'>
                  <span className='eyebrow'>ENCOUNTER MARKER</span>
                  <code>{trigger.id}</code>
                  <label>
                    Marker encounter
                    <select
                      aria-label='Marker encounter'
                      value={trigger.encounterId}
                      onChange={(event) =>
                        update({
                          ...map,
                          encounters: map.encounters.map((entry) =>
                            entry.id === trigger.id
                              ? { ...entry, encounterId: event.target.value }
                              : entry,
                          ),
                        })
                      }
                    >
                      {catalog.encounters.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className='checkbox-label'>
                    <input
                      type='checkbox'
                      checked={trigger.repeatable}
                      onChange={(event) =>
                        update({
                          ...map,
                          encounters: map.encounters.map((entry) =>
                            entry.id === trigger.id
                              ? { ...entry, repeatable: event.target.checked }
                              : entry,
                          ),
                        })
                      }
                    />
                    Repeatable encounter
                  </label>
                </div>
              )}
              {portal && (
                <div className='marker-inspector'>
                  <span className='eyebrow'>PORTAL</span>
                  <code>{portal.id}</code>
                  <label>
                    Portal name
                    <input
                      value={portal.name}
                      onChange={(event) =>
                        update({
                          ...map,
                          portals: map.portals.map((entry) =>
                            entry.id === portal.id
                              ? { ...entry, name: event.target.value }
                              : entry,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Portal target
                    <select
                      aria-label='Portal target'
                      value={portal.targetMapId}
                      onChange={(event) => {
                        const target = catalog.maps.find(
                          (entry) => entry.id === event.target.value,
                        )!
                        update({
                          ...map,
                          portals: map.portals.map((entry) =>
                            entry.id === portal.id
                              ? {
                                  ...entry,
                                  targetMapId: target.id,
                                  destination: { ...target.spawn },
                                }
                              : entry,
                          ),
                        })
                      }}
                    >
                      {catalog.maps.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className='form-grid'>
                    {(['x', 'y'] as const).map((axis) => (
                      <label key={axis}>
                        Destination {axis.toUpperCase()}
                        <input
                          type='number'
                          min={0}
                          max={63}
                          value={portal.destination[axis]}
                          onChange={(event) =>
                            update({
                              ...map,
                              portals: map.portals.map((entry) =>
                                entry.id === portal.id
                                  ? {
                                      ...entry,
                                      destination: {
                                        ...entry.destination,
                                        [axis]: Number(event.target.value),
                                      },
                                    }
                                  : entry,
                              ),
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {npcPlacement && (
                <div className='marker-inspector'>
                  <span className='eyebrow'>NPC PLACEMENT</span>
                  <code>{npcPlacement.id}</code>
                  <label>
                    Placed NPC
                    <select
                      aria-label='Placed NPC'
                      value={npcPlacement.npcId}
                      onChange={(event) =>
                        update({
                          ...map,
                          npcs: map.npcs.map((entry) =>
                            entry.id === npcPlacement.id
                              ? { ...entry, npcId: event.target.value }
                              : entry,
                          ),
                        })
                      }
                    >
                      {catalog.npcs.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className='hint'>
                    Players interact from an adjacent tile. NPCs occupy their
                    tile and block movement.
                  </p>
                </div>
              )}
              {(trigger || portal || npcPlacement) && (
                <button
                  className='danger'
                  onClick={() => update(clearMarker(map, selected))}
                >
                  Remove selected marker
                </button>
              )}
            </aside>
          </div>
          <p className='hint'>
            This editor changes base definitions. Enabled mods can replace maps
            and terrain; playtesting uses the resolved content. Use Project JSON
            or a mod export to author map packs.
          </p>
        </>
      ) : (
        <div className='empty-state'>
          <h3>No world maps yet</h3>
          <p>Add a map to start building your world.</p>
          <button className='primary' onClick={add}>
            Create first map
          </button>
        </div>
      )}
      <TerrainEditor
        terrains={game.terrains}
        onChange={(terrains) => onChange({ ...game, terrains })}
      />
    </section>
  )
}
