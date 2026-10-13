import { z } from 'zod'
import { contentIdSchema } from './contentId.js'
import { dialogueFlagsSchema, dialogueSessionSchema } from './dialogue.js'
import { questProgressSchema } from './quest.js'

export const positionSchema = z.object({
  x: z.number().int().min(0).max(63),
  y: z.number().int().min(0).max(63),
})

export const terrainSchema = z.object({
  id: contentIdSchema,
  name: z.string().trim().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a six-digit hex color'),
  glyph: z.string().max(4).default(''),
  walkable: z.boolean(),
})

export const mapEncounterSchema = positionSchema.extend({
  id: contentIdSchema,
  encounterId: contentIdSchema,
  repeatable: z.boolean().default(false),
})

export const portalSchema = positionSchema.extend({
  id: contentIdSchema,
  name: z.string().trim().min(1).max(100),
  targetMapId: contentIdSchema,
  destination: positionSchema,
})

export const mapNpcSchema = positionSchema.extend({
  id: contentIdSchema,
  npcId: contentIdSchema,
})

export const worldMapSchema = z
  .object({
    id: contentIdSchema,
    name: z.string().trim().min(1).max(100),
    description: z.string().max(1000).default(''),
    width: z.number().int().min(1).max(64),
    height: z.number().int().min(1).max(64),
    tiles: z.array(contentIdSchema).min(1).max(4096),
    spawn: positionSchema,
    encounters: z.array(mapEncounterSchema).max(4096).default([]),
    portals: z.array(portalSchema).max(4096).default([]),
    npcs: z.array(mapNpcSchema).max(4096).default([]),
  })
  .superRefine((map, context) => {
    if (map.tiles.length !== map.width * map.height)
      context.addIssue({
        code: 'custom',
        message: 'Map tile count must match width × height',
        path: ['tiles'],
      })
    const markers = [...map.encounters, ...map.portals, ...map.npcs]
    if (new Set(markers.map((entry) => entry.id)).size !== markers.length)
      context.addIssue({
        code: 'custom',
        message: 'Map marker IDs must be unique',
        path: ['encounters'],
      })
    if (
      new Set(markers.map((entry) => `${entry.x},${entry.y}`)).size !==
      markers.length
    )
      context.addIssue({
        code: 'custom',
        message: 'Only one encounter, portal, or NPC can occupy a tile',
        path: ['encounters'],
      })
    for (const entry of [map.spawn, ...markers]) {
      if (entry.x >= map.width || entry.y >= map.height)
        context.addIssue({
          code: 'custom',
          message: 'Spawn and markers must be inside map bounds',
        })
    }
    if (
      map.npcs.some(
        (entry) => entry.x === map.spawn.x && entry.y === map.spawn.y,
      )
    )
      context.addIssue({
        code: 'custom',
        message: 'An NPC cannot occupy the player spawn',
      })
  })

export const worldSaveSchema = z.object({
  formatVersion: z.literal(1),
  content: z.string(),
  state: z.object({
    mapId: contentIdSchema,
    position: positionSchema,
    facing: z.enum(['north', 'east', 'south', 'west']),
    steps: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    clearedEncounters: z.array(z.string()).max(10000),
    flags: dialogueFlagsSchema.default({}),
    quests: questProgressSchema.default([]),
    conversation: dialogueSessionSchema
      .extend({ mapId: contentIdSchema, placementId: contentIdSchema })
      .nullable()
      .default(null),
    encounter: z
      .object({
        mapId: contentIdSchema,
        triggerId: contentIdSchema,
        battle: z.string(),
      })
      .nullable(),
  }),
})

export type Position = z.infer<typeof positionSchema>
export type Terrain = z.infer<typeof terrainSchema>
export type MapEncounter = z.infer<typeof mapEncounterSchema>
export type MapPortal = z.infer<typeof portalSchema>
export type WorldMap = z.infer<typeof worldMapSchema>
export type MapNpc = z.infer<typeof mapNpcSchema>
