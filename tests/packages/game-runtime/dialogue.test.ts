import { describe, expect, it } from 'vitest'
import { gameSchema, starterGame, type Game } from '@ancadeba/schemas'
import {
  BattleRuntime,
  DialogueRuntime,
  WorldRuntime,
  resolveContent,
  type WorldState,
} from '@ancadeba/game-runtime'

describe('dialogue runtime', () => {
  it('treats valid prototype-named flags as unset until explicitly set', () => {
    const dialogue = structuredClone(starterGame.dialogues[0]!)
    dialogue.nodes[0]!.choices[0]!.conditions = [
      { flag: 'constructor', equals: false },
    ]
    const runtime = new DialogueRuntime([dialogue])
    const session = runtime.start(dialogue.id)
    expect(runtime.choices(session, {}).map((entry) => entry.id)).toContain(
      'ask-road',
    )
    expect(
      runtime.choices(session, { constructor: true }).map((entry) => entry.id),
    ).not.toContain('ask-road')
  })
  it('follows branches, permits loops and endings, and leaves inputs unchanged', () => {
    const runtime = new DialogueRuntime(starterGame.dialogues)
    const session = runtime.start('road-warden')
    const flags = {}
    const road = runtime.choose(session, flags, 'ask-road')
    expect(road.session?.nodeId).toBe('road')
    const returned = runtime.choose(road.session!, road.flags, 'understood')
    expect(returned.session).toEqual(session)
    expect(returned.flags).toEqual({ 'road-advice': true })
    expect(flags).toEqual({})
    expect(road.flags).toEqual({})
    expect(
      runtime.choose(returned.session!, returned.flags, 'leave').session,
    ).toBeNull()
  })

  it('filters choices by all boolean conditions, treating missing flags as false', () => {
    const runtime = new DialogueRuntime(starterGame.dialogues)
    const session = runtime.start('road-warden')
    expect(runtime.choices(session, {}).map((entry) => entry.id)).toContain(
      'ask-work',
    )
    expect(runtime.choices(session, {}).map((entry) => entry.id)).not.toContain(
      'share-news',
    )
    expect(
      runtime
        .choices(session, { 'meet-keeper': true, 'grove-blessing': true })
        .map((entry) => entry.id),
    ).toEqual(['ask-road', 'share-news', 'leave'])
    expect(() => runtime.choose(session, {}, 'share-news')).toThrow(
      'unavailable',
    )
    expect(() => runtime.choose(session, {}, 'missing')).toThrow('unavailable')
  })

  it('sets persistent flags and reaches a leaf node', () => {
    const runtime = new DialogueRuntime(starterGame.dialogues)
    const offered = runtime.choose(runtime.start('road-warden'), {}, 'ask-work')
    const accepted = runtime.choose(offered.session!, offered.flags, 'accept')
    expect(accepted.flags['meet-keeper']).toBe(true)
    expect(runtime.node(accepted.session!).choices).toEqual([])
  })

  it('injects condition and effect policies and rolls back failed effects', () => {
    const runtime = new DialogueRuntime(
      starterGame.dialogues,
      { isAvailable: () => true },
      {
        apply: (effects, flags) => {
          flags['custom'] = effects.length === 0
        },
      },
    )
    expect(
      runtime.choose(runtime.start('road-warden'), {}, 'share-news').flags,
    ).toEqual({ custom: true })
    const failed = new DialogueRuntime(starterGame.dialogues, undefined, {
      apply: (_, flags) => {
        flags.changed = true
        throw new Error('Effect failed')
      },
    })
    const flags = { original: true }
    expect(() =>
      failed.choose(failed.start('road-warden'), flags, 'ask-road'),
    ).toThrow('Effect failed')
    expect(flags).toEqual({ original: true })
  })
})

function setup() {
  const game = structuredClone(starterGame)
  const runtime = new WorldRuntime(new BattleRuntime(game), game.startingMap)
  const state = runtime.move(runtime.start(), 'east')
  return { game, runtime, state }
}

describe('world NPC interactions', () => {
  it('requires adjacency, blocks NPC tiles, and pauses movement during a conversation', () => {
    const { runtime, state } = setup()
    expect(runtime.nearbyNpcs(state).map((entry) => entry.npc.name)).toEqual([
      'Mara',
    ])
    expect(() => runtime.interact(runtime.start(), 'mara-road')).toThrow(
      'adjacent',
    )
    expect(() => runtime.move(state, 'south')).toThrow('Mara stands here')
    const active = runtime.interact(state, 'mara-road')
    expect(active.position).toEqual(state.position)
    expect(active.facing).toBe('south')
    expect(active.conversation?.nodeId).toBe('welcome')
    expect(() => runtime.move(active, 'east')).toThrow(
      'Finish the conversation',
    )
    expect(() => runtime.interact(active, 'mara-road')).toThrow(
      'current interaction',
    )
    expect(runtime.endConversation(active).conversation).toBeNull()
    expect(state.conversation).toBeNull()
  })

  it('does not permit talking during a battle or choosing outside a conversation', () => {
    const { runtime, state } = setup()
    const battle = runtime.move(state, 'east')
    expect(() => runtime.interact(battle, 'mara-road')).toThrow(
      'current interaction',
    )
    expect(() => runtime.chooseDialogue(state, 'ask-road')).toThrow(
      'No conversation',
    )
    expect(() => runtime.endConversation(state)).toThrow('No conversation')
  })

  it('persists flags and conversations across saves and later interactions', () => {
    const { runtime, state } = setup()
    const active = runtime.interact(state, 'mara-road')
    const offered = runtime.chooseDialogue(active, 'ask-work')
    const accepted = runtime.chooseDialogue(offered, 'accept')
    expect(accepted.flags['meet-keeper']).toBe(true)
    const restored = runtime.restore(runtime.save(accepted))
    expect(restored).toEqual(accepted)
    const restarted = runtime.interact(
      runtime.endConversation(restored),
      'mara-road',
    )
    expect(
      runtime.dialogues
        .choices(restarted.conversation!, restarted.flags)
        .map((entry) => entry.id),
    ).not.toContain('ask-work')
    expect(state.flags).toEqual({})
    restored.flags['mutated'] = true
    expect(accepted.flags['mutated']).toBeUndefined()
  })

  it('shares flags between NPCs across maps and supports ending through a response', () => {
    const { runtime, state } = setup()
    const grove = {
      ...runtime.start('moss-grove-map'),
      position: { x: 5, y: 3 },
    }
    const blessed = runtime.chooseDialogue(
      runtime.interact(grove, 'elowen-grove'),
      'blessing',
    )
    expect(blessed.flags['grove-blessing']).toBe(true)
    const returned = {
      ...runtime.endConversation(blessed),
      mapId: state.mapId,
      position: state.position,
    }
    const mara = runtime.interact(returned, 'mara-road')
    const thanked = runtime.chooseDialogue(
      runtime.chooseDialogue(mara, 'share-news'),
      'finish',
    )
    expect(thanked.conversation).toBeNull()
    expect(thanked.flags).toEqual({
      'grove-blessing': true,
      'warden-thanks': true,
    })
  })

  it('applies NPC and dialogue mod overrides while preserving base definitions', () => {
    const { game } = setup()
    game.mods.find((entry) => entry.id === 'traveller-tales')!.enabled = true
    const runtime = new WorldRuntime(new BattleRuntime(game), game.startingMap)
    const active = runtime.interact(
      runtime.move(runtime.start(), 'east'),
      'mara-road',
    )
    expect(runtime.nearbyNpcs(active)[0]!.npc.name).toBe('Mara, storyteller')
    expect(runtime.dialogues.node(active.conversation!).text).toContain(
      'Every traveller carries a story',
    )
    expect(runtime.chooseDialogue(active, 'story').conversation?.nodeId).toBe(
      'traveller-story',
    )
    expect(game.npcs[0]!.name).toBe('Mara')
  })

  it('retains NPC-free legacy world snapshots with absent conversation fields', () => {
    const legacy = gameSchema.parse({
      ...starterGame,
      npcs: [],
      dialogues: [],
      quests: [],
      maps: starterGame.maps.map((map) => ({ ...map, npcs: [] })),
      mods: [],
    })
    const runtime = new WorldRuntime(
      new BattleRuntime(legacy),
      legacy.startingMap,
    )
    const snapshot = JSON.parse(runtime.save(runtime.start()))
    const content = resolveContent(legacy)
    const { npcs, dialogues, quests, ...oldContent } = content
    expect(npcs).toEqual([])
    expect(dialogues).toEqual([])
    expect(quests).toEqual([])
    snapshot.content = JSON.stringify({
      ...oldContent,
      maps: oldContent.maps.map(({ npcs: placements, ...map }) => {
        expect(placements).toEqual([])
        return map
      }),
    })
    delete snapshot.state.flags
    delete snapshot.state.conversation
    delete snapshot.state.quests
    expect(runtime.restore(JSON.stringify(snapshot))).toEqual(runtime.start())
  })

  it.each([
    (state: WorldState) => {
      state.position = { x: 2, y: 3 }
    },
    (state: WorldState) => {
      state.conversation!.nodeId = 'missing'
    },
    (state: WorldState) => {
      state.conversation!.dialogueId = 'grove-keeper'
    },
    (state: WorldState) => {
      state.conversation!.placementId = 'missing'
    },
    (state: WorldState) => {
      state.conversation!.mapId = 'moss-grove-map'
    },
    (state: WorldState) => {
      state.position = { x: 5, y: 2 }
    },
    (state: WorldState) => {
      state.encounter = {
        mapId: state.mapId,
        triggerId: 'road-mossling',
        battle: new BattleRuntime(starterGame).start('moss-grove'),
      }
    },
  ])('rejects invalid conversation saves %#', (mutate) => {
    const { runtime, state } = setup()
    const active = runtime.interact(state, 'mara-road')
    mutate(active)
    expect(() => runtime.restore(runtime.save(active))).toThrow()
  })
})

describe('NPC and dialogue validation', () => {
  it.each([
    [
      'NPC dialogue',
      (game: Game) => {
        game.npcs[0]!.dialogueId = 'missing'
      },
      'missing dialogue',
    ],
    [
      'NPC placement',
      (game: Game) => {
        game.maps[0]!.npcs[0]!.npcId = 'missing'
      },
      'missing NPC',
    ],
    [
      'start node',
      (game: Game) => {
        game.dialogues[0]!.startNodeId = 'missing'
      },
      'missing start node',
    ],
    [
      'choice link',
      (game: Game) => {
        game.dialogues[0]!.nodes[0]!.choices[0]!.nextNodeId = 'missing'
      },
      'missing node',
    ],
    [
      'duplicate node',
      (game: Game) =>
        game.dialogues[0]!.nodes.push(game.dialogues[0]!.nodes[0]!),
      'duplicate dialogue node',
    ],
    [
      'duplicate choice',
      (game: Game) =>
        game.dialogues[0]!.nodes[0]!.choices.push(
          game.dialogues[0]!.nodes[0]!.choices[0]!,
        ),
      'duplicate choice',
    ],
    [
      'NPC collision',
      (game: Game) => {
        game.maps[0]!.npcs[0]!.x = 0
        game.maps[0]!.npcs[0]!.y = 0
      },
      'must be on walkable',
    ],
    [
      'NPC on spawn',
      (game: Game) => {
        game.maps[0]!.npcs[0]!.x = 1
        game.maps[0]!.npcs[0]!.y = 2
      },
      'cannot occupy the player spawn',
    ],
    [
      'portal arrival NPC',
      (game: Game) => {
        game.maps[0]!.portals[0]!.destination = { x: 6, y: 3 }
      },
      'occupied by an NPC',
    ],
  ] as const)('rejects invalid %s', (_, mutate, message) => {
    const game = structuredClone(starterGame)
    mutate(game)
    expect(() => resolveContent(game)).toThrow(message)
  })
})
