import type { Project } from '@ancadeba/schemas'

export { formatMessageForConsole } from './formatters/formatMessage.js'
export { Container } from './ioc/container.js'
export { loggerFactories, type LoggerServices } from './ioc/factories/logger.js'
export type { Factories, Resolver } from './ioc/index.js'
export { ConsoleLogger } from './logger/console.js'
export { LogLevel, type ILogger } from './logger/index.js'

export function getProjectLabel(project: Project): string {
  return `${project.name} (${project.id})`
}
