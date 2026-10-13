import type { EffectContext, EffectHandler } from './types.js'

/** Each runtime receives its own registry. Plugins register handlers before construction. */
export class EffectRegistry {
  private readonly handlers = new Map<string, EffectHandler>()

  register(type: string, handler: EffectHandler): this {
    if (this.handlers.has(type))
      throw new Error(`Effect already registered: ${type}`)
    this.handlers.set(type, handler)
    return this
  }

  replace(type: string, handler: EffectHandler): this {
    if (!this.handlers.has(type))
      throw new Error(`Effect is not registered: ${type}`)
    this.handlers.set(type, handler)
    return this
  }

  has(type: string): boolean {
    return this.handlers.has(type)
  }

  apply(context: EffectContext) {
    const handler = this.handlers.get(context.effect.type)
    if (!handler) throw new Error(`Unknown effect: ${context.effect.type}`)
    handler(context)
  }
}

export function createDefaultEffects(): EffectRegistry {
  return new EffectRegistry()
    .register('damage', ({ sourceActor, targetActor, target, effect, log }) => {
      const damage = Math.max(
        1,
        Math.floor(
          (effect.power + sourceActor.attack - targetActor.defense) *
            (target.guarding ? 0.5 : 1),
        ),
      )
      target.hp = Math.max(0, target.hp - damage)
      log(`${targetActor.name} takes ${damage} damage.`)
    })
    .register('heal', ({ targetActor, target, effect, log }) => {
      const healed = Math.min(effect.power, targetActor.maxHp - target.hp)
      target.hp += healed
      log(`${targetActor.name} recovers ${healed} HP.`)
    })
    .register('guard', ({ targetActor, target, log }) => {
      target.guarding = true
      log(`${targetActor.name} braces for the next attack.`)
    })
    .register('poison', ({ targetActor, target, effect, log }) => {
      target.poison = { power: effect.power, remaining: effect.duration }
      log(`${targetActor.name} is poisoned for ${effect.duration} turns.`)
    })
}
