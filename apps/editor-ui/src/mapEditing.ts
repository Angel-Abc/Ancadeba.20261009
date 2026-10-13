import type { Position, WorldMap } from '@ancadeba/schemas'

export function resizeMap(
  map: WorldMap,
  width: number,
  height: number,
  fill: string,
): WorldMap {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 64 ||
    height > 64
  )
    throw new Error('Map dimensions must be integers between 1 and 64')
  const tiles = Array.from({ length: width * height }, (_, index) => {
    const x = index % width
    const y = Math.floor(index / width)
    return x < map.width && y < map.height
      ? map.tiles[y * map.width + x]!
      : fill
  })
  const spawn = {
    x: Math.min(map.spawn.x, width - 1),
    y: Math.min(map.spawn.y, height - 1),
  }
  if (spawn.x !== map.spawn.x || spawn.y !== map.spawn.y)
    tiles[spawn.y * width + spawn.x] = fill
  return {
    ...map,
    width,
    height,
    tiles,
    spawn,
    encounters: map.encounters.filter(
      (entry) => entry.x < width && entry.y < height,
    ),
    portals: map.portals.filter((entry) => entry.x < width && entry.y < height),
    npcs: map.npcs.filter((entry) => entry.x < width && entry.y < height),
  }
}

export function paintTile(
  map: WorldMap,
  position: Position,
  terrainId: string,
): WorldMap {
  if (
    !Number.isInteger(position.x) ||
    !Number.isInteger(position.y) ||
    position.x < 0 ||
    position.y < 0 ||
    position.x >= map.width ||
    position.y >= map.height
  )
    throw new Error('Tile position is outside map bounds')
  return {
    ...map,
    tiles: map.tiles.map((entry, index) =>
      index === position.y * map.width + position.x ? terrainId : entry,
    ),
  }
}

export function clearMarker(map: WorldMap, position: Position): WorldMap {
  return {
    ...map,
    encounters: map.encounters.filter(
      (entry) => entry.x !== position.x || entry.y !== position.y,
    ),
    portals: map.portals.filter(
      (entry) => entry.x !== position.x || entry.y !== position.y,
    ),
    npcs: map.npcs.filter(
      (entry) => entry.x !== position.x || entry.y !== position.y,
    ),
  }
}

export function nextMarkerId(map: WorldMap, prefix: string): string {
  const ids = new Set(
    [...map.encounters, ...map.portals, ...map.npcs].map((entry) => entry.id),
  )
  let index = 1
  while (ids.has(`${prefix}-${index}`)) index++
  return `${prefix}-${index}`
}
