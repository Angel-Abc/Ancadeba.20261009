import { z } from 'zod'
import { gameSchema } from './game.js'

export * from './game.js'
export * from './world.js'
export * from './dialogue.js'
export * from './quest.js'
export { starterQuests } from './starterQuests.js'
export { starterProject, starterGame } from './starter.js'
export { starterTerrains, starterMaps } from './starterWorld.js'
export { starterNpcs, starterDialogues } from './starterDialogue.js'

export const projectSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  game: gameSchema.optional(),
})

export type Project = z.infer<typeof projectSchema>
