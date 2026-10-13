import { describe, expect, it } from 'vitest'
import { starterGame, type Game } from '@ancadeba/schemas'
import {
  BattleRuntime,
  WorldRuntime,
  createDefaultEffects,
  resolveContent,
  type WorldState,
} from '@ancadeba/game-runtime'

function setup(game: Game = structuredClone(starterGame)) {
  const effects = createDefaultEffects().replace('damage', ({ target }) => {
    target.hp = 0
  })
  const battles = new BattleRuntime(game, effects)
  const runtime = new WorldRuntime(battles, game.startingMap)
  return { game, runtime, state: runtime.start() }
}

function enterEncounter(runtime: WorldRuntime, state: WorldState): WorldState {
  return runtime.move(runtime.move(state, 'east'), 'east')
}

describe('world runtime', () => {
  it('starts at the configured map spawn and moves one tile without mutating state', () => {
    const { runtime, state } = setup()
    const original = structuredClone(state)
    const moved = runtime.move(state, 'east')
    expect(moved.position).toEqual({ x: 2, y: 2 })
    expect(moved.facing).toBe('east')
    expect(moved.steps).toBe(1)
    expect(state).toEqual(original)
  })

  it('blocks impassable terrain and bounds, with no state change', () => {
    const { runtime, state } = setup()
    expect(() => runtime.move(state, 'north')).toThrow('Dense forest blocks')
    expect(() =>
      runtime.move({ ...state, position: { x: 0, y: 2 } }, 'west'),
    ).toThrow('edge of the map')
    expect(state.steps).toBe(0)
  })

  it('supports injected movement rules', () => {
    const { runtime: original } = setup()
    const runtime = new WorldRuntime(original.battles, 'alderfell', {
      canEnter: () => false,
    })
    expect(() => runtime.move(runtime.start(), 'east')).toThrow('Trail blocks')
  })

  it('restores positions using the same injected movement policy as exploration', () => {
    const { runtime: original } = setup()
    const unrestricted = new WorldRuntime(original.battles, 'alderfell', {
      canEnter: () => true,
    })
    const moved = unrestricted.move(unrestricted.start(), 'north')
    const saved = unrestricted.save(moved)
    expect(unrestricted.restore(saved)).toEqual(moved)
    expect(() => original.restore(saved)).toThrow('Invalid player position')
  })

  it('starts an existing battle, pauses movement, and clears a one-time marker after victory', () => {
    const { runtime, state } = setup()
    const active = enterEncounter(runtime, state)
    expect(active.encounter?.battle).toEqual(
      runtime.battles.start('moss-grove'),
    )
    expect(() => runtime.move(active, 'west')).toThrow('Finish the encounter')
    expect(() => runtime.finishBattle(active)).toThrow('must finish')
    const won = runtime.act(active, {
      abilityId: 'strike',
      targetId: 'enemy-0',
    })
    expect(won.encounter?.battle.outcome).toBe('victory')
    const cleared = runtime.finishBattle(won)
    expect(cleared.clearedEncounters).toEqual(['alderfell:road-mossling'])
    expect(cleared.position).toEqual({ x: 3, y: 2 })
    expect(
      enterEncounter(runtime, { ...cleared, position: { x: 1, y: 2 } })
        .encounter,
    ).toBeNull()
    expect(state.clearedEncounters).toEqual([])
  })

  it('keeps repeatable encounters active on future visits', () => {
    const { runtime } = setup()
    const active = enterEncounter(runtime, runtime.start('moss-grove-map'))
    const cleared = runtime.finishBattle(
      runtime.act(active, { abilityId: 'strike', targetId: 'enemy-0' }),
    )
    expect(cleared.clearedEncounters).toEqual([])
    expect(
      runtime.move(runtime.move(cleared, 'west'), 'east').encounter,
    ).not.toBeNull()
  })

  it('respawns after defeat without clearing the encounter', () => {
    const game = structuredClone(starterGame)
    game.encounters.find((entry) => entry.id === 'moss-grove')!.party = [
      'rowan',
    ]
    game.actors.find((entry) => entry.id === 'mossling')!.speed = 99
    const { runtime, state } = setup(game)
    const active = enterEncounter(runtime, state)
    const lost = runtime.act(active, {
      abilityId: 'strike',
      targetId: 'party-0',
    })
    expect(lost.encounter?.battle.outcome).toBe('defeat')
    const returned = runtime.finishBattle(lost)
    expect(returned.position).toEqual(state.position)
    expect(returned.encounter).toBeNull()
    expect(returned.clearedEncounters).toEqual([])
    expect(enterEncounter(runtime, returned).encounter).not.toBeNull()
  })

  it('restarts a world battle and rejects battle actions outside encounters', () => {
    const { runtime, state } = setup()
    expect(() =>
      runtime.act(state, { abilityId: 'strike', targetId: 'enemy-0' }),
    ).toThrow('No world encounter')
    const won = runtime.act(enterEncounter(runtime, state), {
      abilityId: 'strike',
      targetId: 'enemy-0',
    })
    expect(runtime.restartBattle(won).encounter?.battle.outcome).toBe('active')
    expect(won.encounter?.battle.outcome).toBe('victory')
  })

  it('travels through portals once per movement and can return through another map', () => {
    const { runtime, state } = setup()
    const arrived = runtime.move({ ...state, position: { x: 9, y: 5 } }, 'east')
    expect(arrived.mapId).toBe('moss-grove-map')
    expect(arrived.position).toEqual({ x: 1, y: 1 })
    expect(arrived.steps).toBe(1)
    expect(arrived.encounter).toBeNull()
    const returned = runtime.move(
      { ...arrived, position: { x: 5, y: 3 } },
      'south',
    )
    expect(returned.mapId).toBe('alderfell')
    expect(returned.position).toEqual({ x: 9, y: 5 })
  })

  it('composes terrain and map mods for appearance, collision, and encounters', () => {
    const game = structuredClone(starterGame)
    const { runtime: original } = setup(game)
    const state = { ...original.start(), position: { x: 5, y: 3 } }
    expect(() => original.move(state, 'east')).toThrow('River blocks')
    game.mods.find((entry) => entry.id === 'open-river')!.enabled = true
    game.mods.push({
      id: 'map-override',
      name: 'Map Override',
      version: '1',
      description: '',
      requires: [],
      enabled: true,
      actors: [],
      abilities: [],
      encounters: [],
      terrains: [],
      npcs: [],
      dialogues: [],
      quests: [],
      maps: [{ ...game.maps[0]!, name: 'Modded wildwood', encounters: [] }],
    })
    const { runtime } = setup(game)
    expect(runtime.move(state, 'east').position).toEqual({ x: 6, y: 3 })
    expect(runtime.map('alderfell').name).toBe('Modded wildwood')
    expect(enterEncounter(runtime, runtime.start()).encounter).toBeNull()
    expect(game.maps[0]!.encounters).toHaveLength(2)
  })

  it('saves exploration, cleared markers, and active battles without losing progress', () => {
    const { runtime, state } = setup()
    const moved = runtime.move(state, 'east')
    expect(runtime.restore(runtime.save(moved))).toEqual(moved)
    const active = runtime.move(moved, 'east')
    expect(runtime.restore(runtime.save(active))).toEqual(active)
    const won = runtime.act(active, {
      abilityId: 'strike',
      targetId: 'enemy-0',
    })
    expect(runtime.restore(runtime.save(won))).toEqual(won)
    const cleared = runtime.finishBattle(won)
    expect(runtime.restore(runtime.save(cleared))).toEqual(cleared)
    const restored = runtime.restore(runtime.save(cleared))
    restored.clearedEncounters.push('test')
    expect(cleared.clearedEncounters).toHaveLength(1)
  })

  it('rejects world saves after content changes but keeps standalone battle saves compatible with map edits', () => {
    const { runtime, state, game } = setup()
    const worldSave = runtime.save(state)
    const battleSave = runtime.battles.save(runtime.battles.start('moss-grove'))
    game.maps[0]!.tiles[0] = 'grass'
    const changed = setup(game).runtime
    expect(() => changed.restore(worldSave)).toThrow('incompatible')
    expect(changed.battles.restore(battleSave).encounterId).toBe('moss-grove')
  })

  it.each([
    (state: WorldState) => {
      state.position.x = -1
    },
    (state: WorldState) => {
      state.position = { x: 0, y: 0 }
    },
    (state: WorldState) => {
      state.steps = -1
    },
    (state: WorldState) => {
      state.mapId = 'missing'
    },
    (state: WorldState) => {
      state.clearedEncounters = ['missing:marker']
    },
    (state: WorldState) => {
      state.clearedEncounters = ['moss-grove-map:grove-training']
    },
    (state: WorldState) => {
      state.clearedEncounters = [
        'alderfell:road-mossling',
        'alderfell:road-mossling',
      ]
    },
  ])('rejects invalid world snapshots %#', (mutate) => {
    const { runtime, state } = setup()
    mutate(state)
    expect(() => runtime.restore(runtime.save(state))).toThrow()
  })

  it('rejects a mismatched active battle or active encounter position', () => {
    const { runtime, state } = setup()
    const active = enterEncounter(runtime, state)
    active.encounter!.battle = runtime.battles.start('forest-road')
    expect(() => runtime.restore(runtime.save(active))).toThrow(
      'does not match',
    )
    active.encounter!.battle = runtime.battles.start('moss-grove')
    active.position.x = 2
    expect(() => runtime.restore(runtime.save(active))).toThrow(
      'Invalid active encounter',
    )
  })
})

describe('world content validation', () => {
  it('accepts legacy games without world data', () => {
    const game = {
      ...starterGame,
      maps: [],
      terrains: [],
      startingMap: undefined,
    }
    expect(resolveContent(game).maps).toEqual([])
    expect(new BattleRuntime(game).start(game.startingEncounter).outcome).toBe(
      'active',
    )
  })

  it.each([
    [
      'starting map',
      (game: Game) => {
        game.startingMap = 'missing'
      },
      'Missing starting map',
    ],
    [
      'terrain reference',
      (game: Game) => {
        game.maps[0]!.tiles[0] = 'missing'
      },
      'missing terrain',
    ],
    [
      'spawn terrain',
      (game: Game) => {
        game.maps[0]!.spawn = { x: 0, y: 0 }
      },
      'spawn must be on walkable',
    ],
    [
      'encounter reference',
      (game: Game) => {
        game.maps[0]!.encounters[0]!.encounterId = 'missing'
      },
      'missing encounter',
    ],
    [
      'portal reference',
      (game: Game) => {
        game.maps[0]!.portals[0]!.targetMapId = 'missing'
      },
      'missing map',
    ],
    [
      'portal bounds',
      (game: Game) => {
        game.maps[0]!.portals[0]!.destination.x = 63
      },
      'outside map bounds',
    ],
    [
      'portal collision',
      (game: Game) => {
        game.maps[0]!.portals[0]!.destination = { x: 0, y: 0 }
      },
      'must be on walkable',
    ],
    [
      'duplicate map',
      (game: Game) => game.maps.push(game.maps[0]!),
      'Duplicate maps',
    ],
    ['tile count', (game: Game) => game.maps[0]!.tiles.pop(), 'tile count'],
    [
      'marker overlap',
      (game: Game) =>
        game.maps[0]!.encounters.push({
          ...game.maps[0]!.encounters[0]!,
          id: 'overlap',
        }),
      'Only one encounter',
    ],
  ] as const)('rejects invalid %s', (_, mutate, message) => {
    const game = structuredClone(starterGame)
    mutate(game)
    expect(() => resolveContent(game)).toThrow(message)
  })
})
