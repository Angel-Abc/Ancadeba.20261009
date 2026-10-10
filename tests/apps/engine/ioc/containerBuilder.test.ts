import { expect, it } from 'vitest'
import {
  ConsoleLogger,
  Container,
  loggerFactories,
  type LoggerServices,
} from '@ancadeba/utilities'
import type { IContainerBuilder } from '../../../../apps/engine/src/ioc/containerBuilder'

it('builds engine services using the shared utilities package', () => {
  const builder: IContainerBuilder = {
    build: () => new Container<LoggerServices>(loggerFactories),
  }

  expect(builder.build().resolve('logger')).toBeInstanceOf(ConsoleLogger)
})
