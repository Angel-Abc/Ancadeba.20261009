import { describe, expect, it } from 'vitest'
import { starterGame, type Game } from '@ancadeba/schemas'
import {
  BattleRuntime,
  createDefaultEffects,
  type BattleState,
} from '@ancadeba/game-runtime'

function scenario() {
  const game = structuredClone(starterGame)
  game.encounters[0]!.party = ['rowan']
  game.encounters[0]!.enemies = ['mossling']
  game.actors[0]!.abilities = ['strike', 'guard', 'mend', 'venom']
  game.actors.find((actor) => actor.id === 'mossling')!.abilities.push('guard')
  const runtime = new BattleRuntime(game)
  return { game, runtime, state: runtime.start(game.startingEncounter) }
}

describe('battle runtime', () => {
  it('orders turns by speed and creates independent repeated actors', () => {
    const game = structuredClone(starterGame)
    game.encounters[0]!.enemies.push('mossling')
    const runtime = new BattleRuntime(game)
    const battle = runtime.start(game.startingEncounter)
    expect(runtime.current(battle).actorId).toBe('thorn-wolf')
    expect(new Set(battle.combatants.map((entry) => entry.id)).size).toBe(5)
    expect(
      battle.combatants.filter((entry) => entry.actorId === 'mossling'),
    ).toHaveLength(2)
  })

  it('applies damage, advances turns and rounds, and does not mutate previous states', () => {
    const { runtime, state } = scenario()
    const original = structuredClone(state)
    const next = runtime.act(state, {
      abilityId: 'strike',
      targetId: 'enemy-0',
    })
    expect(next.combatants[1]!.hp).toBe(38)
    expect(runtime.current(next).team).toBe('enemy')
    expect(state).toEqual(original)
    const round = runtime.act(next, runtime.chooseAction(next))
    expect(round.round).toBe(2)
    expect(runtime.current(round).team).toBe('party')
  })

  it('rejects wrong abilities, invalid teams, and insufficient MP atomically', () => {
    const { runtime, state } = scenario()
    const original = structuredClone(state)
    expect(() =>
      runtime.act(state, { abilityId: 'ember', targetId: 'enemy-0' }),
    ).toThrow('does not know')
    expect(() =>
      runtime.act(state, { abilityId: 'strike', targetId: 'party-0' }),
    ).toThrow('Invalid target')
    state.combatants[0]!.mp = 0
    expect(() =>
      runtime.act(state, { abilityId: 'mend', targetId: 'party-0' }),
    ).toThrow('Not enough MP')
    expect(state.combatants[1]).toEqual(original.combatants[1])
  })

  it('guard halves incoming damage and expires at the next turn', () => {
    const { runtime, state } = scenario()
    const guarded = runtime.act(state, {
      abilityId: 'guard',
      targetId: 'party-0',
    })
    expect(guarded.combatants[0]!.guarding).toBe(true)
    const next = runtime.act(guarded, {
      abilityId: 'strike',
      targetId: 'party-0',
    })
    expect(next.combatants[0]!.hp).toBe(105)
    expect(next.combatants[0]!.guarding).toBe(false)
  })

  it('heals up to maximum HP and deducts MP', () => {
    const { runtime, state } = scenario()
    state.combatants[0]!.hp = 100
    const next = runtime.act(state, { abilityId: 'mend', targetId: 'party-0' })
    expect(next.combatants[0]!.hp).toBe(110)
    expect(next.combatants[0]!.mp).toBe(7)
  })

  it('ticks poison at turn start and expires after the configured duration', () => {
    const { runtime, state } = scenario()
    let battle = runtime.act(state, { abilityId: 'venom', targetId: 'enemy-0' })
    expect(battle.combatants[1]!.hp).toBe(53)
    expect(battle.combatants[1]!.poison?.remaining).toBe(2)
    for (let index = 0; index < 2; index++) {
      battle = runtime.act(battle, { abilityId: 'guard', targetId: 'enemy-0' })
      battle = runtime.act(battle, { abilityId: 'guard', targetId: 'party-0' })
    }
    expect(battle.combatants[1]!.hp).toBe(39)
    expect(battle.combatants[1]!.poison).toBeNull()
  })

  it('ends on poison defeat during advancement without selecting a defeated actor', () => {
    const { runtime, state } = scenario()
    state.combatants[1]!.hp = 1
    const next = runtime.act(state, { abilityId: 'venom', targetId: 'enemy-0' })
    expect(next.outcome).toBe('victory')
    expect(() =>
      runtime.act(next, { abilityId: 'strike', targetId: 'enemy-0' }),
    ).toThrow('ended')
  })

  it('can run a full battle with AI choices and reaches an outcome', () => {
    const { runtime, state } = scenario()
    let battle = state
    for (let index = 0; index < 100 && battle.outcome === 'active'; index++)
      battle = runtime.act(battle, runtime.chooseAction(battle))
    expect(battle.outcome).toBe('victory')
    expect(battle.log.length).toBeLessThanOrEqual(200)
  })

  it('supports injected custom effect plugins and rejects unregistered effects', () => {
    const { game } = scenario()
    game.abilities[0]!.effects = [{ type: 'drain-mp', power: 5, duration: 1 }]
    expect(() => new BattleRuntime(game)).toThrow('unknown effect')
    const effects = createDefaultEffects().register(
      'drain-mp',
      ({ target, effect }) => {
        target.mp = Math.max(0, target.mp - effect.power)
      },
    )
    const runtime = new BattleRuntime(game, effects)
    const battle = runtime.act(runtime.start(game.startingEncounter), {
      abilityId: 'strike',
      targetId: 'enemy-0',
    })
    expect(battle.combatants[1]!.mp).toBe(7)
    expect(() => effects.register('damage', () => {})).toThrow(
      'already registered',
    )
  })

  it('requires an affordable fallback action for every actor', () => {
    const game: Game = structuredClone(starterGame)
    game.actors[0]!.abilities = ['ember']
    expect(() => new BattleRuntime(game)).toThrow('zero-cost ability')
  })

  it('can replace a built-in rule and inject a different enemy strategy', () => {
    const { game } = scenario()
    const effects = createDefaultEffects().replace('damage', ({ target }) => {
      target.hp = Math.max(0, target.hp - 1)
    })
    expect(() => effects.replace('missing', () => {})).toThrow('not registered')
    const runtime = new BattleRuntime(game, effects, {
      chooseAction: (state, queries) => ({
        abilityId: 'guard',
        targetId: queries.current(state).id,
      }),
    })
    const state = runtime.start(game.startingEncounter)
    const next = runtime.act(state, {
      abilityId: 'strike',
      targetId: 'enemy-0',
    })
    expect(next.combatants[1]!.hp).toBe(59)
    expect(runtime.chooseAction(next)).toEqual({
      abilityId: 'guard',
      targetId: 'enemy-0',
    })
  })

  it('round-trips saves, isolates restored state, and rejects changed content', () => {
    const { runtime, state, game } = scenario()
    const saved = runtime.save(state)
    const restored = runtime.restore(saved)
    expect(restored).toEqual(state)
    restored.combatants[0]!.hp = 1
    expect(state.combatants[0]!.hp).toBe(110)
    game.actors[0]!.attack++
    expect(() => new BattleRuntime(game).restore(saved)).toThrow('incompatible')
  })

  it.each([
    (state: BattleState) => {
      state.combatants[0]!.hp = -1
    },
    (state: BattleState) => {
      state.combatants[0]!.actorId = 'lyra'
    },
    (state: BattleState) => {
      state.combatants[0]!.poison = { power: 1, remaining: 0 }
    },
    (state: BattleState) => {
      state.turn = 99
    },
    (state: BattleState) => {
      state.order.reverse()
    },
    (state: BattleState) => {
      state.outcome = 'victory'
    },
    (state: BattleState) => {
      state.combatants[0]!.hp = 0
    },
  ])('rejects corrupted battle saves %#', (mutate) => {
    const { runtime, state } = scenario()
    mutate(state)
    expect(() => runtime.restore(runtime.save(state))).toThrow()
  })
})
