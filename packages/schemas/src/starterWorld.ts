import { terrainSchema, worldMapSchema } from './world.js'

export const starterTerrains = terrainSchema.array().parse([
  { id: 'grass', name: 'Meadow', color: '#445e3b', glyph: '·', walkable: true },
  { id: 'path', name: 'Trail', color: '#786948', glyph: '·', walkable: true },
  {
    id: 'forest',
    name: 'Dense forest',
    color: '#263f32',
    glyph: '♠',
    walkable: false,
  },
  { id: 'water', name: 'River', color: '#315873', glyph: '≈', walkable: false },
])

function tiles(rows: string[]): string[] {
  const legend: Record<string, string> = {
    g: 'grass',
    p: 'path',
    t: 'forest',
    w: 'water',
  }
  return rows.flatMap((row) => [...row].map((character) => legend[character]!))
}

export const starterMaps = worldMapSchema.array().parse([
  {
    id: 'alderfell',
    name: 'Alderfell wildwood',
    description:
      'Follow the trail into the wildwood. Marked tiles hold encounters; glowing gates lead to other maps.',
    width: 12,
    height: 8,
    tiles: tiles([
      'tttttttttttt',
      'ttttgggggttt',
      'tppppppgggtt',
      'tggggpwwgggt',
      'tggggpppppgt',
      'tggttggggppt',
      'tggggggggggt',
      'tttttttttttt',
    ]),
    spawn: { x: 1, y: 2 },
    npcs: [{ id: 'mara-road', x: 2, y: 3, npcId: 'mara' }],
    encounters: [
      {
        id: 'road-mossling',
        x: 3,
        y: 2,
        encounterId: 'moss-grove',
        repeatable: false,
      },
      {
        id: 'forest-ambush',
        x: 6,
        y: 4,
        encounterId: 'forest-road',
        repeatable: false,
      },
    ],
    portals: [
      {
        id: 'grove-gate',
        name: 'Enter the moss grove',
        x: 10,
        y: 5,
        targetMapId: 'moss-grove-map',
        destination: { x: 1, y: 1 },
      },
    ],
  },
  {
    id: 'moss-grove-map',
    name: 'Moss grove',
    description:
      'A quiet clearing beyond the river. The southern gate returns to Alderfell.',
    width: 8,
    height: 6,
    tiles: tiles([
      'tttttttt',
      'tpppppgt',
      'tggggpgt',
      'tggggpgt',
      'tggggpgt',
      'tttttttt',
    ]),
    spawn: { x: 1, y: 1 },
    npcs: [{ id: 'elowen-grove', x: 6, y: 3, npcId: 'elowen' }],
    encounters: [
      {
        id: 'grove-training',
        x: 3,
        y: 1,
        encounterId: 'moss-grove',
        repeatable: true,
      },
    ],
    portals: [
      {
        id: 'return-gate',
        name: 'Return to Alderfell',
        x: 5,
        y: 4,
        targetMapId: 'alderfell',
        destination: { x: 9, y: 5 },
      },
    ],
  },
])
