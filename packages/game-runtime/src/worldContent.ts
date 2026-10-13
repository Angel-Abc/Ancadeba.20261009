import type { ContentPack, Game, Position, WorldMap } from '@ancadeba/schemas'

export function withinMap(map: WorldMap, position: Position): boolean {
  return (
    Number.isInteger(position.x) &&
    Number.isInteger(position.y) &&
    position.x >= 0 &&
    position.y >= 0 &&
    position.x < map.width &&
    position.y < map.height
  )
}

export function validateWorldContent(game: Game, content: ContentPack) {
  const terrains = new Map(content.terrains.map((entry) => [entry.id, entry]))
  const maps = new Map(content.maps.map((entry) => [entry.id, entry]))
  const encounters = new Set(content.encounters.map((entry) => entry.id))
  const npcs = new Set(content.npcs.map((entry) => entry.id))
  if (game.startingMap && !maps.has(game.startingMap))
    throw new Error(`Missing starting map ${game.startingMap}`)
  function checkPosition(map: WorldMap, position: Position, label: string) {
    if (!withinMap(map, position))
      throw new Error(`${map.name}: ${label} is outside map bounds`)
    if (
      !terrains.get(map.tiles[position.y * map.width + position.x]!)?.walkable
    )
      throw new Error(`${map.name}: ${label} must be on walkable terrain`)
  }
  for (const map of content.maps) {
    for (const id of map.tiles)
      if (!terrains.has(id))
        throw new Error(`${map.name} references missing terrain ${id}`)
    checkPosition(map, map.spawn, 'spawn')
    for (const trigger of map.encounters) {
      if (!encounters.has(trigger.encounterId))
        throw new Error(
          `${map.name} references missing encounter ${trigger.encounterId}`,
        )
      checkPosition(map, trigger, `encounter ${trigger.id}`)
    }
    for (const placement of map.npcs) {
      if (!npcs.has(placement.npcId))
        throw new Error(`${map.name} references missing NPC ${placement.npcId}`)
      checkPosition(map, placement, `NPC ${placement.id}`)
    }
    for (const portal of map.portals) {
      checkPosition(map, portal, `portal ${portal.id}`)
      const destination = maps.get(portal.targetMapId)
      if (!destination)
        throw new Error(
          `${map.name} references missing map ${portal.targetMapId}`,
        )
      checkPosition(
        destination,
        portal.destination,
        `destination of ${portal.name}`,
      )
      if (
        destination.npcs.some(
          (entry) =>
            entry.x === portal.destination.x &&
            entry.y === portal.destination.y,
        )
      )
        throw new Error(
          `${map.name}: portal ${portal.name} destination is occupied by an NPC`,
        )
    }
  }
}
