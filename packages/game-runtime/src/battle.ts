import type { Actor, Ability, ContentPack, Game } from '@ancadeba/schemas'
import { resolveContent } from './content.js'
import type { BattleState, BattleAction, Combatant } from './types.js'
import { createDefaultEffects, EffectRegistry } from './effects.js'
import { TacticalBattleStrategy, type BattleStrategy } from './strategy.js'

function cloneState(state: BattleState): BattleState {
  return {
    ...state,
    order: [...state.order],
    log: [...state.log],
    combatants: state.combatants.map((entry) => ({
      ...entry,
      poison: entry.poison ? { ...entry.poison } : null,
    })),
  }
}

export class BattleRuntime {
  readonly content: ContentPack
  private readonly fingerprint: string

  constructor(
    game: Game,
    private readonly effects: EffectRegistry = createDefaultEffects(),
    private readonly strategy: BattleStrategy = new TacticalBattleStrategy(),
  ) {
    this.content = resolveContent(game)
    const { actors, abilities, encounters } = this.content
    this.fingerprint = JSON.stringify({ actors, abilities, encounters })
    for (const ability of this.content.abilities) {
      for (const effect of ability.effects)
        if (!effects.has(effect.type))
          throw new Error(`${ability.name} uses unknown effect ${effect.type}`)
    }
    for (const actor of this.content.actors) {
      if (
        !actor.abilities.some((id) =>
          this.content.abilities.some(
            (ability) => ability.id === id && ability.cost === 0,
          ),
        )
      )
        throw new Error(
          `${actor.name} needs a zero-cost ability to avoid running out of actions`,
        )
    }
  }

  actor(id: string): Actor {
    const actor = this.content.actors.find((entry) => entry.id === id)
    if (!actor) throw new Error(`Unknown actor: ${id}`)
    return actor
  }

  current(state: BattleState): Combatant {
    const current = state.combatants.find(
      (entry) => entry.id === state.order[state.turn],
    )
    if (!current) throw new Error('Invalid turn')
    return current
  }

  start(encounterId: string): BattleState {
    const encounter = this.content.encounters.find(
      (entry) => entry.id === encounterId,
    )
    if (!encounter) throw new Error(`Unknown encounter: ${encounterId}`)
    const combatants: Combatant[] = []
    for (const team of ['party', 'enemy'] as const) {
      const members = team === 'party' ? encounter.party : encounter.enemies
      members.forEach((actorId, index) => {
        const actor = this.actor(actorId)
        combatants.push({
          id: `${team}-${index}`,
          actorId,
          team,
          hp: actor.maxHp,
          mp: actor.maxMp,
          guarding: false,
          poison: null,
        })
      })
    }
    const order = [...combatants]
      .sort(
        (a, b) =>
          this.actor(b.actorId).speed - this.actor(a.actorId).speed ||
          a.id.localeCompare(b.id),
      )
      .map((entry) => entry.id)
    return {
      encounterId,
      combatants,
      order,
      turn: 0,
      round: 1,
      outcome: 'active',
      log: [`${encounter.name} begins.`],
    }
  }

  targets(state: BattleState, ability: Ability): Combatant[] {
    const source = this.current(state)
    return state.combatants.filter(
      (target) =>
        target.hp > 0 &&
        (ability.target === 'self'
          ? target.id === source.id
          : ability.target === 'ally'
            ? target.team === source.team
            : target.team !== source.team),
    )
  }

  abilities(state: BattleState): Ability[] {
    const source = this.current(state)
    return this.actor(source.actorId).abilities.map((id) =>
      this.content.abilities.find((entry) => entry.id === id)!,
    )
  }

  act(previous: BattleState, action: BattleAction): BattleState {
    if (previous.outcome !== 'active') throw new Error('Battle has ended')
    const state = cloneState(previous)
    const source = this.current(state)
    if (source.hp <= 0) throw new Error('Defeated actors cannot act')
    const ability = this.abilities(state).find(
      (entry) => entry.id === action.abilityId,
    )
    if (!ability) throw new Error('Actor does not know that ability')
    if (source.mp < ability.cost) throw new Error('Not enough MP')
    const target = this.targets(state, ability).find(
      (entry) => entry.id === action.targetId,
    )
    if (!target) throw new Error('Invalid target')
    source.mp -= ability.cost
    const sourceActor = this.actor(source.actorId)
    const targetActor = this.actor(target.actorId)
    state.log.push(`${sourceActor.name} uses ${ability.name}.`)
    for (const effect of ability.effects) {
      if (target.hp === 0) break
      this.effects.apply({
        source,
        target,
        sourceActor,
        targetActor,
        effect,
        log: (message) => state.log.push(message),
      })
    }
    this.finish(state)
    if (state.outcome === 'active') this.advance(state)
    state.log = state.log.slice(-200)
    return state
  }

  private finish(state: BattleState) {
    if (
      !state.combatants.some((entry) => entry.team === 'party' && entry.hp > 0)
    )
      state.outcome = 'defeat'
    else if (
      !state.combatants.some((entry) => entry.team === 'enemy' && entry.hp > 0)
    )
      state.outcome = 'victory'
    if (state.outcome !== 'active')
      state.log.push(
        state.outcome === 'victory'
          ? 'Victory! Your party prevails.'
          : 'Defeat. Your party has fallen.',
      )
  }

  private advance(state: BattleState) {
    // At most one circuit: poison can defeat every remaining actor during advancement.
    for (let attempts = 0; attempts < state.order.length; attempts++) {
      state.turn = (state.turn + 1) % state.order.length
      if (state.turn === 0) state.round++
      const next = this.current(state)
      if (next.hp === 0) continue
      next.guarding = false
      if (next.poison) {
        next.hp = Math.max(0, next.hp - next.poison.power)
        state.log.push(
          `${this.actor(next.actorId).name} takes ${next.poison.power} poison damage.`,
        )
        next.poison.remaining--
        if (next.poison.remaining === 0) next.poison = null
        this.finish(state)
        if (state.outcome !== 'active') return
      }
      if (next.hp > 0) return
    }
  }

  chooseAction(state: BattleState): BattleAction {
    return this.strategy.chooseAction(state, this)
  }

  save(state: BattleState): string {
    return JSON.stringify({
      formatVersion: 1,
      content: this.fingerprint,
      state,
    })
  }

  restore(json: string): BattleState {
    const snapshot: unknown = JSON.parse(json)
    if (
      !snapshot ||
      typeof snapshot !== 'object' ||
      !('formatVersion' in snapshot) ||
      snapshot.formatVersion !== 1 ||
      !('content' in snapshot) ||
      snapshot.content !== this.fingerprint ||
      !('state' in snapshot)
    )
      throw new Error('Save is incompatible with this game content')
    const state = snapshot.state as BattleState
    const initial = this.start(state?.encounterId)
    if (
      !Number.isInteger(state.round) ||
      state.round < 1 ||
      !Number.isInteger(state.turn) ||
      state.turn < 0 ||
      state.turn >= initial.order.length ||
      JSON.stringify(state.order) !== JSON.stringify(initial.order) ||
      !Array.isArray(state.combatants) ||
      state.combatants.length !== initial.combatants.length ||
      !Array.isArray(state.log) ||
      state.log.length > 200 ||
      state.log.some((entry) => typeof entry !== 'string')
    )
      throw new Error('Invalid battle save')
    state.combatants.forEach((entry, index) => {
      const expected = initial.combatants[index]!
      const actor = this.actor(expected.actorId)
      if (
        !entry ||
        entry.id !== expected.id ||
        entry.actorId !== expected.actorId ||
        entry.team !== expected.team ||
        !Number.isInteger(entry.hp) ||
        entry.hp < 0 ||
        entry.hp > actor.maxHp ||
        !Number.isInteger(entry.mp) ||
        entry.mp < 0 ||
        entry.mp > actor.maxMp ||
        typeof entry.guarding !== 'boolean' ||
        (entry.poison !== null &&
          (!entry.poison ||
            !Number.isInteger(entry.poison.power) ||
            entry.poison.power < 0 ||
            entry.poison.power > 9999 ||
            !Number.isInteger(entry.poison.remaining) ||
            entry.poison.remaining < 1 ||
            entry.poison.remaining > 99))
      )
        throw new Error('Invalid combatant in save')
    })
    const partyAlive = state.combatants.some(
      (entry) => entry.team === 'party' && entry.hp > 0,
    )
    const enemyAlive = state.combatants.some(
      (entry) => entry.team === 'enemy' && entry.hp > 0,
    )
    const outcome = !partyAlive ? 'defeat' : !enemyAlive ? 'victory' : 'active'
    if (
      state.outcome !== outcome ||
      (outcome === 'active' && this.current(state).hp === 0)
    )
      throw new Error('Invalid battle outcome in save')
    return cloneState(state)
  }
}
