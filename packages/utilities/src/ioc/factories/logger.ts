import { ConsoleLogger } from '../../logger/console.js'
import type { ILogger } from '../../logger/index.js'
import type { Factories } from '../index.js'

export interface LoggerServices {
  logger: ILogger
}

export const loggerFactories = {
  logger: () => new ConsoleLogger(),
} satisfies Factories<LoggerServices>
