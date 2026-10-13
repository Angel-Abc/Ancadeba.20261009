import { z } from 'zod'

export const contentIdSchema = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9._-]*$/, 'Use a lowercase ID beginning with a letter')
const name = z.string().trim().min(1).max(100)
const stat = z.number().int().min(0).max(9999)

export const effectSchema = z.object({
  type: contentIdSchema,
  power: stat,
  duration: z.number().int().min(1).max(99).default(2),
})

export const abilitySchema = z.object({
  id: contentIdSchema,
  name,
  description: z.string().max(1000).default(''),
  target: z.enum(['enemy', 'ally', 'self']),
  cost: stat,
  effects: z.array(effectSchema).min(1).max(20),
})

export const actorSchema = z.object({
  id: contentIdSchema,
  name,
  role: z.string().max(100).default('Adventurer'),
  maxHp: stat.min(1),
  maxMp: stat,
  attack: stat,
  defense: stat,
  speed: stat.min(1),
  abilities: z.array(contentIdSchema).min(1).max(30),
})

export const encounterSchema = z.object({
  id: contentIdSchema,
  name,
  description: z.string().max(1000).default(''),
  party: z.array(contentIdSchema).min(1).max(6),
  enemies: z.array(contentIdSchema).min(1).max(6),
})

export const contentPackSchema = z.object({
  actors: z.array(actorSchema).max(1000).default([]),
  abilities: z.array(abilitySchema).max(1000).default([]),
  encounters: z.array(encounterSchema).max(1000).default([]),
})

export const modSchema = contentPackSchema.extend({
  id: contentIdSchema,
  name,
  version: z.string().trim().min(1).max(50),
  description: z.string().max(1000).default(''),
  enabled: z.boolean().default(true),
  requires: z.array(contentIdSchema).max(100).default([]),
})

export const gameSchema = contentPackSchema.extend({
  formatVersion: z.literal(1),
  startingEncounter: contentIdSchema,
  mods: z.array(modSchema).max(100).default([]),
})

export type Effect = z.infer<typeof effectSchema>
export type Ability = z.infer<typeof abilitySchema>
export type Actor = z.infer<typeof actorSchema>
export type Encounter = z.infer<typeof encounterSchema>
export type ContentPack = z.infer<typeof contentPackSchema>
export type Mod = z.infer<typeof modSchema>
export type Game = z.infer<typeof gameSchema>
