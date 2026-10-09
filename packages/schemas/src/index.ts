import { z } from 'zod'

export const projectSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
})

export type Project = z.infer<typeof projectSchema>
