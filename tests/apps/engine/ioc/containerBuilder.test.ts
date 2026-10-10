import { expect, it, vi } from 'vitest'
import { ConsoleLogger } from '@ancadeba/utilities'
import { ContainerBuilder } from '../../../../apps/engine/src/ioc/containerBuilder'

it('builds engine services using the shared utilities package', () => {
  const info = vi.spyOn(console, 'info').mockImplementation(() => {})

  try {
    const container = new ContainerBuilder().build()
    const logger = container.resolve('logger')

    expect(logger).toBeInstanceOf(ConsoleLogger)
    expect(container.resolve('logger')).toBe(logger)
  } finally {
    info.mockRestore()
  }
})
