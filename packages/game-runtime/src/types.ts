import type { Actor, Effect } from '@ancadeba/schemas'

export interface Combatant {
  id: string
  actorId: string
  team: 'party' | 'enemy'
  hp: number
  mp: number
  guarding: boolean
  poison: { power: number; remaining: number } | null
}

export interface BattleState {
  encounterId: string
  round: number
  turn: number
  order: string[]
  combatants: Combatant[]
  outcome: 'active' | 'victory' | 'defeat'
  log: string[]
}

export interface BattleAction {
  abilityId: string
  targetId: string
}

export interface EffectContext {
  source: Combatant
  target: Combatant
  sourceActor: Actor
  targetActor: Actor
  effect: Effect
  log: (message: string) => void
}

export type EffectHandler = (context: EffectContext) => void
