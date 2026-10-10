import {
  Container,
  loggerFactories,
  type LoggerServices,
} from '@ancadeba/utilities'

export interface IContainerBuilder {
  build(): Container<AppServices>
}

type AppServices = LoggerServices

const category = 'ContainerBuilder'
export class ContainerBuilder implements IContainerBuilder {
  build(): Container<AppServices> {
    const factories = {
      ...loggerFactories,
    }
    const container = new Container<AppServices>(factories)
    const logger = container.resolve('logger')
    logger.info(category, 'Container built successfully.')
    return container
  }
}
