import { describe, expect, it } from 'vitest'
import {
  gameSchema,
  modSchema,
  questSchema,
  starterGame,
  type Game,
  type QuestProgress,
} from '@ancadeba/schemas'
import {
  BattleRuntime,
  QuestRuntime,
  WorldRuntime,
  createDefaultEffects,
  resolveContent,
  type QuestEvent,
  type WorldState,
} from '@ancadeba/game-runtime'

const victory: QuestEvent = {
  type: 'encounter-victory',
  encounterId: 'moss-grove',
  mapId: 'alderfell',
  triggerId: 'road-mossling',
}
const acceptance: QuestEvent = {
  type: 'dialogue-choice',
  dialogueId: 'road-warden',
  nodeId: 'offer',
  choiceId: 'accept',
  npcId: 'mara',
}
const message: QuestEvent = {
  type: 'dialogue-choice',
  dialogueId: 'grove-keeper',
  nodeId: 'blessed',
  choiceId: 'promise',
  npcId: 'elowen',
}
const thanks: QuestEvent = {
  type: 'dialogue-choice',
  dialogueId: 'road-warden',
  nodeId: 'thanks',
  choiceId: 'finish',
  npcId: 'mara',
}

describe('quest runtime', () => {
  it('accepts an NPC quest only on its precise dialogue event and does not count past events', () => {
    const runtime = new QuestRuntime(starterGame.quests)
    expect(runtime.start()).toEqual([])
    expect(runtime.available([]).map((quest) => quest.id)).toEqual([
      'grove-pilgrimage',
    ])
    expect(runtime.consume([], {}, victory).progress).toEqual([])
    expect(
      runtime.consume([], {}, { ...acceptance, npcId: 'elowen' }).progress,
    ).toEqual([])
    expect(() => runtime.accept([], 'grove-pilgrimage')).toThrow('NPC dialogue')
    const progress = runtime.consume([], {}, acceptance).progress
    expect(progress[0]?.objectives.map((entry) => entry.count)).toEqual([
      0, 0, 0,
    ])
    expect(runtime.consume(progress, {}, acceptance).progress).toHaveLength(1)
  })

  it('advances unordered objectives, completes once, sets flags, and unlocks a counted follow-up', () => {
    const runtime = new QuestRuntime(starterGame.quests)
    const initial = runtime.consume([], {}, acceptance).progress
    const original = structuredClone(initial)
    let result = runtime.consume(initial, {}, thanks)
    result = runtime.consume(result.progress, result.flags, victory)
    result = runtime.consume(result.progress, result.flags, message)
    expect(initial).toEqual(original)
    expect(result.progress[0]?.status).toBe('completed')
    expect(result.flags['grove-quest-complete']).toBe(true)
    // Completed quests never fire their effects again.
    expect(
      runtime.consume(
        result.progress,
        { 'grove-quest-complete': false },
        message,
      ).flags['grove-quest-complete'],
    ).toBe(false)
    expect(runtime.available(result.progress).map((entry) => entry.id)).toEqual(
      ['grove-training'],
    )
    expect(() => runtime.accept(initial, 'grove-training')).toThrow(
      'prerequisites',
    )
    let followup = runtime.accept(result.progress, 'grove-training')
    expect(() => runtime.accept(followup, 'grove-training')).toThrow(
      'already started',
    )
    followup = runtime.consume(followup, {}, victory).progress
    expect(followup[1]?.objectives[0]?.count).toBe(1)
    expect(followup[1]?.status).toBe('active')
    followup = runtime.consume(followup, {}, victory).progress
    expect(followup[1]?.status).toBe('completed')
    expect(
      runtime.consume(followup, {}, victory).progress[1]?.objectives[0]?.count,
    ).toBe(2)
    expect(runtime.restore(followup)).toEqual(followup)
  })

  it('supports automatic starts and orders objectives without giving one event multiple stages', () => {
    const quest = questSchema.parse({
      id: 'ordered',
      name: 'Ordered',
      autoStart: true,
      ordered: true,
      objectives: [
        {
          id: 'first',
          text: 'First victory',
          trigger: { type: 'encounter-victory', encounterId: 'moss-grove' },
        },
        {
          id: 'second',
          text: 'Second victory',
          trigger: { type: 'encounter-victory', encounterId: 'moss-grove' },
        },
      ],
    })
    const sequel = questSchema.parse({
      ...quest,
      id: 'sequel',
      requires: ['ordered'],
    })
    const runtime = new QuestRuntime([sequel, quest])
    let progress = runtime.consume(runtime.start(), {}, victory).progress
    expect(progress[0]?.objectives.map((entry) => entry.count)).toEqual([1, 0])
    progress = runtime.consume(progress, {}, victory).progress
    expect(progress.map((entry) => entry.status)).toEqual([
      'completed',
      'active',
    ])
    expect(progress[1]?.objectives.map((entry) => entry.count)).toEqual([0, 0])
    expect(() =>
      runtime.restore([
        {
          ...progress[1]!,
          objectives: [
            { objectiveId: 'first', count: 0 },
            { objectiveId: 'second', count: 1 },
          ],
        },
      ]),
    ).toThrow('ordered progress')
  })

  it('allows any NPC with a chosen dialogue when no NPC filter is specified and injects event matching', () => {
    const quest = structuredClone(starterGame.quests[0]!)
    delete quest.start!.npcId
    expect(
      new QuestRuntime([quest]).consume(
        [],
        {},
        { ...acceptance, npcId: 'another-npc' },
      ).progress,
    ).toHaveLength(1)
    const runtime = new QuestRuntime([quest], { matches: () => true })
    expect(runtime.consume([], {}, victory).progress[0]?.status).toBe(
      'completed',
    )
  })

  it.each([
    (progress: QuestProgress) => progress.push(structuredClone(progress[0]!)),
    (progress: QuestProgress) => {
      progress[0]!.questId = 'missing'
    },
    (progress: QuestProgress) => {
      progress[0]!.objectives[0]!.count = 2
    },
    (progress: QuestProgress) => {
      progress[0]!.objectives[0]!.count = -1
    },
    (progress: QuestProgress) => {
      progress[0]!.objectives[0]!.count = 0.5
    },
    (progress: QuestProgress) => {
      progress[0]!.objectives[0]!.objectiveId = 'missing'
    },
    (progress: QuestProgress) => {
      progress[0]!.objectives.pop()
    },
    (progress: QuestProgress) => {
      progress[0]!.status = 'completed'
    },
    (progress: QuestProgress) => {
      progress[0]!.objectives.forEach((entry) => {
        entry.count = 1
      })
    },
    (progress: QuestProgress) =>
      progress.push({
        questId: 'grove-training',
        status: 'active',
        objectives: [{ objectiveId: 'practice', count: 0 }],
      }),
  ])('rejects corrupt progress %#', (mutate) => {
    const runtime = new QuestRuntime(starterGame.quests)
    const progress = runtime.consume([], {}, acceptance).progress
    mutate(progress)
    expect(() => runtime.restore(progress)).toThrow()
  })
})

function setup(game: Game = structuredClone(starterGame)) {
  const effects = createDefaultEffects().replace('damage', ({ target }) => {
    target.hp = 0
  })
  const runtime = new WorldRuntime(
    new BattleRuntime(game, effects),
    game.startingMap,
  )
  let state = runtime.interact(
    runtime.move(runtime.start(), 'east'),
    'mara-road',
  )
  state = runtime.chooseDialogue(
    runtime.chooseDialogue(state, 'ask-work'),
    'accept',
  )
  return { runtime, state }
}

function win(runtime: WorldRuntime, state: WorldState) {
  return runtime.act(runtime.move(state, 'east'), {
    abilityId: 'strike',
    targetId: 'enemy-0',
  })
}

describe('world quest integration', () => {
  it('saves accepted, partial and completed quests, and attributes each returned victory once', () => {
    const { runtime, state } = setup()
    const accepted = runtime.restore(runtime.save(state))
    expect(accepted).toEqual(state)
    const won = win(runtime, runtime.endConversation(accepted))
    expect(won.quests[0]?.objectives[0]?.count).toBe(0)
    const restored = runtime.restore(runtime.save(won))
    const cleared = runtime.finishBattle(restored)
    expect(cleared.quests[0]?.objectives[0]?.count).toBe(1)
    expect(() => runtime.finishBattle(cleared)).toThrow('must finish')
    let grove = {
      ...cleared,
      mapId: 'moss-grove-map',
      position: { x: 5, y: 3 },
    }
    grove = runtime.chooseDialogue(
      runtime.interact(grove, 'elowen-grove'),
      'blessing',
    )
    grove = runtime.chooseDialogue(grove, 'promise')
    const partial = runtime.restore(runtime.save(grove))
    expect(partial.quests[0]?.objectives.map((entry) => entry.count)).toEqual([
      1, 1, 0,
    ])
    let returned = { ...partial, mapId: 'alderfell', position: { x: 2, y: 2 } }
    returned = runtime.chooseDialogue(
      runtime.interact(returned, 'mara-road'),
      'share-news',
    )
    returned = runtime.chooseDialogue(returned, 'finish')
    expect(returned.quests[0]?.status).toBe('completed')
    expect(returned.flags['grove-quest-complete']).toBe(true)
    expect(runtime.restore(runtime.save(returned))).toEqual(returned)
    const followup = runtime.acceptQuest(returned, 'grove-training')
    expect(followup.quests).toHaveLength(2)
    const original = structuredClone(followup)
    runtime.restore(runtime.save(followup)).quests[1]!.objectives[0]!.count = 2
    expect(followup).toEqual(original)
  })

  it('does not award progress for defeats, restarts or unavailable dialogue responses', () => {
    const game = structuredClone(starterGame)
    game.encounters.find((entry) => entry.id === 'moss-grove')!.party = [
      'rowan',
    ]
    game.actors.find((entry) => entry.id === 'mossling')!.speed = 99
    const { runtime, state } = setup(game)
    const active = runtime.move(runtime.endConversation(state), 'east')
    const lost = runtime.act(active, {
      abilityId: 'strike',
      targetId: 'party-0',
    })
    expect(lost.encounter?.battle.outcome).toBe('defeat')
    expect(runtime.finishBattle(lost).quests).toEqual(state.quests)
    expect(runtime.restartBattle(lost).quests).toEqual(state.quests)
    expect(() => runtime.acceptQuest(active, 'grove-training')).toThrow(
      'interaction',
    )
    const conversation = runtime.interact(
      runtime.endConversation(state),
      'mara-road',
    )
    expect(() => runtime.chooseDialogue(conversation, 'share-news')).toThrow(
      'unavailable',
    )
    expect(
      conversation.quests[0]?.objectives.map((entry) => entry.count),
    ).toEqual([0, 0, 0])
  })

  it('credits repeatable victories separately, without recounting cleared markers', () => {
    const game = structuredClone(starterGame)
    game.quests = [
      questSchema.parse({ ...game.quests[1]!, requires: [], autoStart: true }),
    ]
    const runtime = new WorldRuntime(
      new BattleRuntime(
        game,
        createDefaultEffects().replace('damage', ({ target }) => {
          target.hp = 0
        }),
      ),
      'moss-grove-map',
    )
    let state = runtime.move(runtime.start(), 'east')
    state = runtime.finishBattle(win(runtime, state))
    expect(state.quests[0]?.objectives[0]?.count).toBe(1)
    state = runtime.move(state, 'west')
    state = runtime.finishBattle(win(runtime, state))
    expect(state.quests[0]?.status).toBe('completed')
  })

  it('restores quest-free legacy saves and rejects progress after quest content changes', () => {
    const legacy = gameSchema.parse({ ...starterGame, quests: [] })
    const runtime = new WorldRuntime(
      new BattleRuntime(legacy),
      legacy.startingMap,
    )
    const snapshot = JSON.parse(runtime.save(runtime.start()))
    delete snapshot.state.quests
    expect(runtime.restore(JSON.stringify(snapshot)).quests).toEqual([])
    const current = setup()
    const changed = structuredClone(starterGame)
    changed.quests[0]!.objectives[0]!.target = 2
    expect(() =>
      new WorldRuntime(new BattleRuntime(changed), changed.startingMap).restore(
        current.runtime.save(current.state),
      ),
    ).toThrow('incompatible')
  })
})

describe('quest content composition and validation', () => {
  it('merges mod quests by ID without mutating base definitions and validates only composed references', () => {
    const game = structuredClone(starterGame)
    const replacement = { ...game.quests[1]!, name: 'Modded training' }
    game.mods.push(
      modSchema.parse({
        id: 'quest-mod',
        name: 'Quest mod',
        version: '1',
        quests: [replacement, { ...replacement, id: 'another-quest' }],
      }),
    )
    expect(resolveContent(game).quests.map((entry) => entry.name)).toContain(
      'Modded training',
    )
    expect(resolveContent(game).quests).toHaveLength(3)
    expect(game.quests[1]?.name).toBe('Guardians of the trail')
  })

  it.each([
    (game: Game) => game.quests.push(game.quests[0]!),
    (game: Game) =>
      game.quests[0]!.objectives.push(game.quests[0]!.objectives[0]!),
    (game: Game) => {
      game.quests[0]!.requires = ['missing']
    },
    (game: Game) => {
      game.quests[0]!.requires = ['grove-training']
    },
    (game: Game) => {
      game.quests[0]!.autoStart = true
    },
    (game: Game) => {
      game.quests[0]!.start!.choiceId = 'missing'
    },
    (game: Game) => {
      game.quests[0]!.start!.npcId = 'elowen'
    },
    (game: Game) => {
      game.quests[0]!.objectives[0]!.trigger = {
        type: 'encounter-victory',
        encounterId: 'missing',
      }
    },
    (game: Game) => {
      game.quests[0]!.objectives[0]!.target = 0
    },
  ])('rejects invalid quest content %#', (mutate) => {
    const game = structuredClone(starterGame)
    mutate(game)
    expect(() => resolveContent(game)).toThrow()
  })
})
