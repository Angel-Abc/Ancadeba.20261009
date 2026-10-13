import { describe, expect, it } from 'vitest'
import { starterGame, type Game } from '@ancadeba/schemas'
import { resolveContent } from '@ancadeba/game-runtime'

describe('content composition', () => {
  it('keeps base data immutable and applies enabled overrides', () => {
    const game = structuredClone(starterGame)
    const original = structuredClone(game)
    expect(
      resolveContent(game).actors.find((actor) => actor.id === 'mossling')
        ?.maxHp,
    ).toBe(60)
    game.mods[0]!.enabled = true
    expect(
      resolveContent(game).actors.find((actor) => actor.id === 'mossling')
        ?.maxHp,
    ).toBe(120)
    expect(original.mods[0]!.enabled).toBe(false)
    expect(game.actors.find((actor) => actor.id === 'mossling')?.maxHp).toBe(60)
  })

  it('loads dependencies before dependents regardless of array order', () => {
    const game = structuredClone(starterGame)
    const actor = game.actors[0]!
    game.mods = [
      {
        id: 'dependent',
        name: 'Dependent',
        version: '1',
        description: '',
        enabled: true,
        requires: ['foundation'],
        actors: [{ ...actor, maxHp: 222 }],
        abilities: [],
        encounters: [],
      },
      {
        id: 'foundation',
        name: 'Foundation',
        version: '1',
        description: '',
        enabled: true,
        requires: [],
        actors: [{ ...actor, maxHp: 111 }],
        abilities: [],
        encounters: [],
      },
    ]
    expect(
      resolveContent(game).actors.find((entry) => entry.id === actor.id)?.maxHp,
    ).toBe(222)
  })

  it.each([
    [
      'duplicate actor',
      (game: Game) => game.actors.push(game.actors[0]!),
      'Duplicate actors',
    ],
    [
      'missing ability',
      (game: Game) => {
        game.actors[0]!.abilities = ['missing']
      },
      'missing ability',
    ],
    [
      'missing actor',
      (game: Game) => {
        game.encounters[0]!.enemies = ['missing']
      },
      'missing actor',
    ],
    [
      'missing encounter',
      (game: Game) => {
        game.startingEncounter = 'missing'
      },
      'Missing starting encounter',
    ],
    [
      'missing dependency',
      (game: Game) => {
        game.mods[0]!.enabled = true
        game.mods[0]!.requires = ['missing']
      },
      'requires enabled mod',
    ],
    [
      'cycle',
      (game: Game) => {
        game.mods[0]!.enabled = true
        game.mods[0]!.requires = [game.mods[0]!.id]
      },
      'cycle',
    ],
    [
      'duplicate mod',
      (game: Game) => game.mods.push(game.mods[0]!),
      'Duplicate mod',
    ],
  ] as const)('rejects %s', (_, mutate, message) => {
    const game = structuredClone(starterGame)
    mutate(game)
    expect(() => resolveContent(game)).toThrow(message)
  })
})
