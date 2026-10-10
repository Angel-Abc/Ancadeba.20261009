import { describe, expect, it, vi } from 'vitest'
import { Container, type Factories } from '@ancadeba/utilities'

describe('Container', () => {
  it('creates services lazily and shares dependencies and instances', () => {
    interface Services {
      dependency: object
      service: { dependency: object }
    }

    const dependencyFactory = vi.fn(() => ({}))
    const serviceFactory = vi.fn<Factories<Services>['service']>(
      (resolver) => ({
        dependency: resolver.resolve('dependency'),
      }),
    )
    const container = new Container<Services>({
      dependency: dependencyFactory,
      service: serviceFactory,
    })

    expect(dependencyFactory).not.toHaveBeenCalled()
    expect(serviceFactory).not.toHaveBeenCalled()

    const service = container.resolve('service')

    expect(service.dependency).toBe(container.resolve('dependency'))
    expect(container.resolve('service')).toBe(service)
    expect(dependencyFactory).toHaveBeenCalledOnce()
    expect(serviceFactory).toHaveBeenCalledOnce()
  })

  it('rejects circular dependencies', () => {
    const container = new Container<{ first: object; second: object }>({
      first: (resolver) => resolver.resolve('second'),
      second: (resolver) => resolver.resolve('first'),
    })

    expect(() => container.resolve('first')).toThrow(
      'Circular dependency: first',
    )
    expect(() => container.resolve('second')).toThrow(
      'Circular dependency: second',
    )
  })

  it('can retry resolution after a factory fails', () => {
    const instance = {}
    const failure = new Error('Factory failed')
    const factory = vi
      .fn(() => instance)
      .mockImplementationOnce(() => {
        throw failure
      })
    const container = new Container<{ service: object }>({ service: factory })

    expect(() => container.resolve('service')).toThrow(failure)
    expect(container.resolve('service')).toBe(instance)
    expect(container.resolve('service')).toBe(instance)
    expect(factory).toHaveBeenCalledTimes(2)
  })

  it('caches undefined service values', () => {
    const factory = vi.fn(() => undefined)
    const container = new Container<{ service: undefined }>({
      service: factory,
    })

    expect(container.resolve('service')).toBeUndefined()
    expect(container.resolve('service')).toBeUndefined()
    expect(factory).toHaveBeenCalledOnce()
  })

  it('reports missing factories at runtime', () => {
    const container = new Container({})

    expect(() => container.resolve('missing' as never)).toThrow(
      'Missing factory: missing',
    )
  })
})
