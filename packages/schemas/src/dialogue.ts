import { z } from 'zod'
import { contentIdSchema } from './contentId.js'

export const dialogueFlagsSchema = z.record(contentIdSchema, z.boolean())
export const dialogueConditionSchema = z.object({
  flag: contentIdSchema,
  equals: z.boolean(),
})
export const dialogueEffectSchema = z.object({
  flag: contentIdSchema,
  value: z.boolean(),
})
export const dialogueChoiceSchema = z.object({
  id: contentIdSchema,
  text: z.string().trim().min(1).max(500),
  nextNodeId: contentIdSchema.nullable().default(null),
  conditions: z.array(dialogueConditionSchema).max(50).default([]),
  effects: z.array(dialogueEffectSchema).max(50).default([]),
})
export const dialogueNodeSchema = z.object({
  id: contentIdSchema,
  speaker: z.string().max(100).default(''),
  text: z.string().trim().min(1).max(5000),
  choices: z.array(dialogueChoiceSchema).max(30).default([]),
})
export const dialogueSchema = z.object({
  id: contentIdSchema,
  name: z.string().trim().min(1).max(100),
  startNodeId: contentIdSchema,
  nodes: z.array(dialogueNodeSchema).min(1).max(500),
})
export const npcSchema = z.object({
  id: contentIdSchema,
  name: z.string().trim().min(1).max(100),
  description: z.string().max(1000).default(''),
  dialogueId: contentIdSchema,
  glyph: z.string().min(1).max(4).default('♙'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#d9b47f'),
})
export const dialogueSessionSchema = z.object({
  dialogueId: contentIdSchema,
  nodeId: contentIdSchema,
})
export type DialogueFlags = z.infer<typeof dialogueFlagsSchema>
export type DialogueCondition = z.infer<typeof dialogueConditionSchema>
export type DialogueEffect = z.infer<typeof dialogueEffectSchema>
export type DialogueChoice = z.infer<typeof dialogueChoiceSchema>
export type DialogueNode = z.infer<typeof dialogueNodeSchema>
export type Dialogue = z.infer<typeof dialogueSchema>
export type Npc = z.infer<typeof npcSchema>
export type DialogueSession = z.infer<typeof dialogueSessionSchema>
