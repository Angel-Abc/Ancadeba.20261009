import { z } from 'zod'

export const contentIdSchema = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9._-]*$/, 'Use a lowercase ID beginning with a letter')
