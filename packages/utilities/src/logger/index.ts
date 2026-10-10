export const LogLevel = {
  debug: 0,
  info: 1,
  warning: 2,
  error: 3,
} as const

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel]

export interface ILogger {
  debug(category: string, message: string, ...args: unknown[]): string
  info(category: string, message: string, ...args: unknown[]): string
  warn(category: string, message: string, ...args: unknown[]): string
  error(category: string, message: string, ...args: unknown[]): string
}
