import { z } from 'zod'
import { contentIdSchema } from './contentId.js'
import { dialogueEffectSchema } from './dialogue.js'

export const dialogueQuestTriggerSchema = z.object({
  type: z.literal('dialogue-choice'),
  dialogueId: contentIdSchema,
  nodeId: contentIdSchema,
  choiceId: contentIdSchema,
  npcId: contentIdSchema.optional(),
})
export const questTriggerSchema = z.discriminatedUnion('type', [
  dialogueQuestTriggerSchema,
  z.object({
    type: z.literal('encounter-victory'),
    encounterId: contentIdSchema,
  }),
])
export const questObjectiveSchema = z.object({
  id: contentIdSchema,
  text: z.string().trim().min(1).max(500),
  target: z.number().int().min(1).max(9999).default(1),
  trigger: questTriggerSchema,
})
export const questSchema = z.object({
  id: contentIdSchema,
  name: z.string().trim().min(1).max(100),
  description: z.string().max(5000).default(''),
  autoStart: z.boolean().default(false),
  start: dialogueQuestTriggerSchema.nullable().default(null),
  requires: z.array(contentIdSchema).max(100).default([]),
  ordered: z.boolean().default(false),
  objectives: z.array(questObjectiveSchema).min(1).max(100),
  completionEffects: z.array(dialogueEffectSchema).max(50).default([]),
})
export const questProgressSchema = z
  .array(
    z.object({
      questId: contentIdSchema,
      status: z.enum(['active', 'completed']),
      objectives: z
        .array(
          z.object({
            objectiveId: contentIdSchema,
            count: z.number().int().min(0).max(9999),
          }),
        )
        .min(1)
        .max(100),
    }),
  )
  .max(1000)

export type QuestTrigger = z.infer<typeof questTriggerSchema>
export type DialogueQuestTrigger = z.infer<typeof dialogueQuestTriggerSchema>
export type QuestObjective = z.infer<typeof questObjectiveSchema>
export type Quest = z.infer<typeof questSchema>
export type QuestProgress = z.infer<typeof questProgressSchema>
