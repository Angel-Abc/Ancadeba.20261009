import {
  worldSaveSchema,
  type Position,
  type Terrain,
  type WorldMap,
  type DialogueFlags,
  type DialogueSession,
  type MapNpc,
  type Npc,
  type QuestProgress,
} from '@ancadeba/schemas'
import { BattleRuntime } from './battle.js'
import type { BattleAction, BattleState } from './types.js'
import { withinMap } from './worldContent.js'
import { DialogueRuntime } from './dialogue.js'
import { QuestRuntime, type QuestEvent } from './quest.js'

export type Direction = 'north' | 'east' | 'south' | 'west'

export interface WorldState {
  mapId: string
  position: Position
  facing: Direction
  steps: number
  clearedEncounters: string[]
  encounter: { mapId: string; triggerId: string; battle: BattleState } | null
  flags: DialogueFlags
  quests: QuestProgress
  conversation:
    (DialogueSession & { mapId: string; placementId: string }) | null
}

export interface MovementContext {
  state: WorldState
  map: WorldMap
  terrain: Terrain
  destination: Position
}
export interface MovementRules {
  canEnter(context: MovementContext): boolean
}

export class TerrainMovementRules implements MovementRules {
  canEnter({ terrain }: MovementContext): boolean {
    return terrain.walkable
  }
}

export class MovementBlocked extends Error {}

export function encounterKey(mapId: string, triggerId: string): string {
  return `${mapId}:${triggerId}`
}

export class WorldRuntime {
  readonly content
  private readonly fingerprint: string

  constructor(
    readonly battles: BattleRuntime,
    private readonly startingMapId: string = battles.content.maps[0]?.id ?? '',
    private readonly movement: MovementRules = new TerrainMovementRules(),
    readonly dialogues: DialogueRuntime = new DialogueRuntime(
      battles.content.dialogues,
    ),
    readonly quests: QuestRuntime = new QuestRuntime(battles.content.quests),
  ) {
    this.content = battles.content
    const {
      npcs,
      dialogues: conversations,
      quests: definitions,
      ...existing
    } = this.content
    // Keep fingerprints of NPC-free legacy worlds compatible with their existing saves.
    this.fingerprint = JSON.stringify({
      ...existing,
      maps: existing.maps.map(({ npcs: placements, ...map }) =>
        placements.length ? { ...map, npcs: placements } : map,
      ),
      ...(npcs.length ? { npcs } : {}),
      ...(conversations.length ? { dialogues: conversations } : {}),
      ...(definitions.length ? { quests: definitions } : {}),
    })
  }

  map(id: string): WorldMap {
    const map = this.content.maps.find((entry) => entry.id === id)
    if (!map) throw new Error(`Unknown world map: ${id}`)
    return map
  }

  terrain(map: WorldMap, position: Position): Terrain {
    if (!withinMap(map, position))
      throw new MovementBlocked('The edge of the map blocks your path.')
    const terrain = this.content.terrains.find(
      (entry) => entry.id === map.tiles[position.y * map.width + position.x],
    )
    if (!terrain) throw new Error('Unknown terrain')
    return terrain
  }

  start(mapId = this.startingMapId): WorldState {
    const map = this.map(mapId)
    return {
      mapId,
      position: { ...map.spawn },
      facing: 'south',
      steps: 0,
      clearedEncounters: [],
      encounter: null,
      flags: {},
      quests: this.quests.start(),
      conversation: null,
    }
  }

  move(state: WorldState, direction: Direction): WorldState {
    if (state.encounter)
      throw new MovementBlocked('Finish the encounter before moving.')
    if (state.conversation)
      throw new MovementBlocked('Finish the conversation before moving.')
    const offsets: Record<Direction, Position> = {
      north: { x: 0, y: -1 },
      east: { x: 1, y: 0 },
      south: { x: 0, y: 1 },
      west: { x: -1, y: 0 },
    }
    const offset = offsets[direction]
    if (!offset) throw new Error('Unknown direction')
    const destination = {
      x: state.position.x + offset.x,
      y: state.position.y + offset.y,
    }
    const map = this.map(state.mapId)
    const terrain = this.terrain(map, destination)
    const occupant = map.npcs.find(
      (entry) => entry.x === destination.x && entry.y === destination.y,
    )
    if (occupant)
      throw new MovementBlocked(
        `${this.content.npcs.find((entry) => entry.id === occupant.npcId)!.name} stands here. Talk from an adjacent tile.`,
      )
    if (!this.movement.canEnter({ state, map, terrain, destination }))
      throw new MovementBlocked(`${terrain.name} blocks your path.`)
    const next: WorldState = {
      ...state,
      position: destination,
      facing: direction,
      steps: state.steps + 1,
      clearedEncounters: [...state.clearedEncounters],
      flags: { ...state.flags },
    }
    const portal = map.portals.find(
      (entry) => entry.x === destination.x && entry.y === destination.y,
    )
    if (portal) {
      const targetMap = this.map(portal.targetMapId)
      const targetTerrain = this.terrain(targetMap, portal.destination)
      if (
        !this.movement.canEnter({
          state: next,
          map: targetMap,
          terrain: targetTerrain,
          destination: portal.destination,
        })
      )
        throw new MovementBlocked('The portal destination is blocked.')
      return {
        ...next,
        mapId: targetMap.id,
        position: { ...portal.destination },
      }
    }
    const trigger = map.encounters.find(
      (entry) => entry.x === destination.x && entry.y === destination.y,
    )
    if (
      trigger &&
      (trigger.repeatable ||
        !next.clearedEncounters.includes(encounterKey(map.id, trigger.id)))
    )
      next.encounter = {
        mapId: map.id,
        triggerId: trigger.id,
        battle: this.battles.start(trigger.encounterId),
      }
    return next
  }

  act(state: WorldState, action: BattleAction): WorldState {
    if (!state.encounter) throw new Error('No world encounter is active')
    return {
      ...state,
      encounter: {
        ...state.encounter,
        battle: this.battles.act(state.encounter.battle, action),
      },
    }
  }

  nearbyNpcs(state: WorldState): { placement: MapNpc; npc: Npc }[] {
    return this.map(state.mapId)
      .npcs.filter(
        (entry) =>
          Math.abs(entry.x - state.position.x) +
            Math.abs(entry.y - state.position.y) ===
          1,
      )
      .map((placement) => ({
        placement,
        npc: this.content.npcs.find((entry) => entry.id === placement.npcId)!,
      }))
  }

  interact(state: WorldState, placementId: string): WorldState {
    if (state.encounter || state.conversation)
      throw new MovementBlocked('Finish the current interaction first.')
    const nearby = this.nearbyNpcs(state).find(
      (entry) => entry.placement.id === placementId,
    )
    if (!nearby) throw new Error('NPC must be on an adjacent tile to interact')
    const dx = nearby.placement.x - state.position.x
    const dy = nearby.placement.y - state.position.y
    return {
      ...state,
      facing:
        dx === 1 ? 'east' : dx === -1 ? 'west' : dy === 1 ? 'south' : 'north',
      flags: { ...state.flags },
      conversation: {
        ...this.dialogues.start(nearby.npc.dialogueId),
        mapId: state.mapId,
        placementId,
      },
    }
  }

  chooseDialogue(state: WorldState, choiceId: string): WorldState {
    if (!state.conversation) throw new Error('No conversation is active')
    const result = this.dialogues.choose(
      state.conversation,
      state.flags,
      choiceId,
    )
    const placement = this.map(state.mapId).npcs.find(
      (entry) => entry.id === state.conversation!.placementId,
    )!
    const questResult = this.quests.consume(state.quests, result.flags, {
      type: 'dialogue-choice',
      dialogueId: state.conversation.dialogueId,
      nodeId: state.conversation.nodeId,
      choiceId,
      npcId: placement.npcId,
    })
    return {
      ...state,
      flags: questResult.flags,
      quests: questResult.progress,
      conversation: result.session
        ? { ...state.conversation, ...result.session }
        : null,
    }
  }

  endConversation(state: WorldState): WorldState {
    if (!state.conversation) throw new Error('No conversation is active')
    return { ...state, flags: { ...state.flags }, conversation: null }
  }

  acceptQuest(state: WorldState, questId: string): WorldState {
    if (state.encounter || state.conversation)
      throw new MovementBlocked('Finish the current interaction first.')
    return { ...state, quests: this.quests.accept(state.quests, questId) }
  }

  private questEvent(state: WorldState, event: QuestEvent): WorldState {
    const result = this.quests.consume(state.quests, state.flags, event)
    return { ...state, quests: result.progress, flags: result.flags }
  }

  restartBattle(state: WorldState): WorldState {
    if (!state.encounter) throw new Error('No world encounter is active')
    return {
      ...state,
      encounter: {
        ...state.encounter,
        battle: this.battles.start(state.encounter.battle.encounterId),
      },
    }
  }

  finishBattle(state: WorldState): WorldState {
    const active = state.encounter
    if (!active || active.battle.outcome === 'active')
      throw new Error('The battle must finish before returning to the map')
    if (active.battle.outcome === 'defeat')
      return {
        ...state,
        position: { ...this.map(state.mapId).spawn },
        encounter: null,
        clearedEncounters: [...state.clearedEncounters],
      }
    const trigger = this.map(active.mapId).encounters.find(
      (entry) => entry.id === active.triggerId,
    )!
    const key = encounterKey(active.mapId, trigger.id)
    const next = this.questEvent(state, {
      type: 'encounter-victory',
      encounterId: trigger.encounterId,
      mapId: active.mapId,
      triggerId: trigger.id,
    })
    return {
      ...next,
      encounter: null,
      clearedEncounters:
        trigger.repeatable || state.clearedEncounters.includes(key)
          ? [...state.clearedEncounters]
          : [...state.clearedEncounters, key],
    }
  }

  save(state: WorldState): string {
    return JSON.stringify({
      formatVersion: 1,
      content: this.fingerprint,
      state: {
        ...state,
        encounter: state.encounter
          ? {
              ...state.encounter,
              battle: this.battles.save(state.encounter.battle),
            }
          : null,
      },
    })
  }

  restore(json: string): WorldState {
    const snapshot = worldSaveSchema.parse(JSON.parse(json))
    if (snapshot.content !== this.fingerprint)
      throw new Error('World save is incompatible with this game content')
    const state = snapshot.state
    const map = this.map(state.mapId)
    if (!withinMap(map, state.position))
      throw new Error('Invalid player position in world save')
    if (
      map.npcs.some(
        (entry) => entry.x === state.position.x && entry.y === state.position.y,
      )
    )
      throw new Error('Player position is occupied by an NPC')
    if (state.conversation && state.encounter)
      throw new Error(
        'World save cannot contain a battle and conversation together',
      )
    if (state.conversation) {
      const placement = map.npcs.find(
        (entry) => entry.id === state.conversation!.placementId,
      )
      const npc = this.content.npcs.find(
        (entry) => entry.id === placement?.npcId,
      )
      if (
        state.conversation.mapId !== map.id ||
        !placement ||
        !npc ||
        npc.dialogueId !== state.conversation.dialogueId ||
        Math.abs(placement.x - state.position.x) +
          Math.abs(placement.y - state.position.y) !==
          1
      )
        throw new Error('Invalid conversation placement in world save')
      this.dialogues.node(state.conversation)
    }
    const validCleared = new Set(
      this.content.maps.flatMap((entry) =>
        entry.encounters
          .filter((trigger) => !trigger.repeatable)
          .map((trigger) => encounterKey(entry.id, trigger.id)),
      ),
    )
    if (
      new Set(state.clearedEncounters).size !==
        state.clearedEncounters.length ||
      state.clearedEncounters.some((key) => !validCleared.has(key))
    )
      throw new Error('Invalid cleared encounters in world save')
    let encounter: WorldState['encounter'] = null
    if (state.encounter) {
      const trigger = map.encounters.find(
        (entry) => entry.id === state.encounter!.triggerId,
      )
      if (
        state.encounter.mapId !== map.id ||
        !trigger ||
        trigger.x !== state.position.x ||
        trigger.y !== state.position.y ||
        state.clearedEncounters.includes(encounterKey(map.id, trigger.id))
      )
        throw new Error('Invalid active encounter in world save')
      const battle = this.battles.restore(state.encounter.battle)
      if (battle.encounterId !== trigger.encounterId)
        throw new Error('World battle does not match its encounter marker')
      encounter = { mapId: map.id, triggerId: trigger.id, battle }
    }
    const restored: WorldState = {
      ...state,
      position: { ...state.position },
      clearedEncounters: [...state.clearedEncounters],
      encounter,
      flags: { ...state.flags },
      conversation: state.conversation ? { ...state.conversation } : null,
      quests: this.quests.restore(state.quests),
    }
    if (
      !this.movement.canEnter({
        state: restored,
        map,
        terrain: this.terrain(map, restored.position),
        destination: restored.position,
      })
    )
      throw new Error('Invalid player position in world save')
    return restored
  }
}
