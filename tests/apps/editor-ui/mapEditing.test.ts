import { describe, expect, it } from 'vitest'
import { starterMaps } from '@ancadeba/schemas'
import {
  clearMarker,
  nextMarkerId,
  paintTile,
  resizeMap,
} from '../../../apps/editor-ui/src/mapEditing'

describe('map editing operations', () => {
  it('resizes in row-major order, preserving coordinates and filling new space', () => {
    const map = starterMaps[0]!
    const larger = resizeMap(map, 14, 10, 'grass')
    expect(larger.tiles[2 * 14 + 3]).toBe(map.tiles[2 * 12 + 3])
    expect(larger.tiles[9 * 14 + 13]).toBe('grass')
    expect(larger.spawn).toEqual(map.spawn)
    expect(larger.tiles).toHaveLength(140)
    expect(map.tiles).toHaveLength(96)
  })

  it('crops markers and makes a relocated spawn passable when shrinking', () => {
    const map = { ...starterMaps[0]!, spawn: { x: 9, y: 6 } }
    const smaller = resizeMap(map, 3, 2, 'path')
    expect(smaller.spawn).toEqual({ x: 2, y: 1 })
    expect(smaller.tiles[5]).toBe('path')
    expect(smaller.encounters).toHaveLength(0)
    expect(smaller.portals).toHaveLength(0)
    expect(() => resizeMap(map, 0, 2, 'grass')).toThrow('dimensions')
  })

  it('paints and erases markers without changing the source map', () => {
    const map = starterMaps[0]!
    const painted = paintTile(map, { x: 2, y: 2 }, 'water')
    expect(painted.tiles[26]).toBe('water')
    expect(map.tiles[26]).toBe('path')
    const cleared = clearMarker(map, { x: 3, y: 2 })
    expect(cleared.encounters).toHaveLength(1)
    expect(map.encounters).toHaveLength(2)
    expect(() => paintTile(map, { x: 12, y: 2 }, 'grass')).toThrow('outside')
  })

  it('creates unique marker IDs across portals and encounters', () => {
    const map = {
      ...starterMaps[0]!,
      encounters: [{ ...starterMaps[0]!.encounters[0]!, id: 'marker-1' }],
      portals: [{ ...starterMaps[0]!.portals[0]!, id: 'marker-2' }],
    }
    expect(nextMarkerId(map, 'marker')).toBe('marker-3')
  })
})
