import type { Npc, Position, Terrain, WorldMap } from '@ancadeba/schemas'
import { encounterKey } from '@ancadeba/game-runtime'

interface Props {
  map: WorldMap
  terrains: Terrain[]
  npcs?: Npc[]
  player?: Position
  selected?: Position
  cleared?: string[]
  tileSize?: number
  onSelect?: (position: Position) => void
}

export function MapGrid({
  map,
  terrains,
  npcs = [],
  player,
  selected,
  cleared = [],
  tileSize = 40,
  onSelect,
}: Props) {
  const palette = new Map(terrains.map((entry) => [entry.id, entry]))
  const encounters = new Map(
    map.encounters.map((entry) => [`${entry.x},${entry.y}`, entry]),
  )
  const portals = new Map(
    map.portals.map((entry) => [`${entry.x},${entry.y}`, entry]),
  )
  const placements = new Map(
    map.npcs.map((entry) => [`${entry.x},${entry.y}`, entry]),
  )
  const characters = new Map(npcs.map((entry) => [entry.id, entry]))
  return (
    <div className='map-scroll'>
      <div
        className='map-grid'
        role='group'
        aria-label={`${map.name} tiles`}
        style={{ gridTemplateColumns: `repeat(${map.width}, ${tileSize}px)` }}
      >
        {map.tiles.map((id, index) => {
          const x = index % map.width
          const y = Math.floor(index / map.width)
          const terrain = palette.get(id)
          const trigger = encounters.get(`${x},${y}`)
          const defeated =
            trigger && cleared.includes(encounterKey(map.id, trigger.id))
          const portal = portals.get(`${x},${y}`)
          const placement = placements.get(`${x},${y}`)
          const npc = placement ? characters.get(placement.npcId) : undefined
          const isPlayer = player?.x === x && player.y === y
          const isSpawn = map.spawn.x === x && map.spawn.y === y
          const isSelected = selected?.x === x && selected.y === y
          const label = `Tile ${x},${y}: ${terrain?.name ?? id}${isSpawn ? ', spawn' : ''}${trigger ? (defeated ? ', cleared encounter' : ', encounter') : ''}${portal ? `, portal ${portal.name}` : ''}${placement ? `, NPC ${npc?.name ?? placement.npcId}` : ''}${isPlayer ? ', player' : ''}`
          return (
            <button
              type='button'
              key={index}
              className={`map-tile ${isSelected ? 'tile-selected' : ''} ${isPlayer ? 'player-tile' : ''}`}
              aria-label={label}
              title={label}
              style={{
                width: tileSize,
                height: tileSize,
                backgroundColor: terrain?.color ?? '#5e293a',
              }}
              onClick={() => onSelect?.({ x, y })}
            >
              <span className='terrain-glyph' aria-hidden='true'>
                {terrain?.glyph}
              </span>
              {isSpawn && (
                <span className='spawn-marker' aria-hidden='true'>
                  ⌂
                </span>
              )}
              {trigger && (
                <span
                  className={`encounter-marker ${defeated ? 'cleared-marker' : ''}`}
                  aria-hidden='true'
                >
                  {defeated ? '✓' : '⚔'}
                </span>
              )}
              {portal && (
                <span className='portal-marker' aria-hidden='true'>
                  ◇
                </span>
              )}
              {placement && (
                <span
                  className='npc-marker'
                  style={{ color: npc?.color ?? '#d9b47f' }}
                  aria-hidden='true'
                >
                  {npc?.glyph ?? '♙'}
                </span>
              )}
              {isPlayer && (
                <span className='player-marker' aria-hidden='true'>
                  ♟
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
