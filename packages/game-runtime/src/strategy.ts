import type { Ability, Actor } from '@ancadeba/schemas'
import type { BattleAction, BattleState, Combatant } from './types.js'

export interface BattleQueries {
  current(state: BattleState): Combatant
  abilities(state: BattleState): Ability[]
  targets(state: BattleState, ability: Ability): Combatant[]
  actor(id: string): Actor
}

export interface BattleStrategy {
  chooseAction(state: BattleState, queries: BattleQueries): BattleAction
}

export class TacticalBattleStrategy implements BattleStrategy {
  chooseAction(state: BattleState, queries: BattleQueries): BattleAction {
    const source = queries.current(state)
    const options = queries
      .abilities(state)
      .filter((entry) => entry.cost <= source.mp)
    for (const ability of options) {
      if (ability.effects.some((effect) => effect.type === 'heal')) {
        const target = queries
          .targets(state, ability)
          .find((entry) => entry.hp < queries.actor(entry.actorId).maxHp / 2)
        if (target) return { abilityId: ability.id, targetId: target.id }
      }
    }
    const ability =
      options.find((entry) =>
        entry.effects.some((effect) => effect.type === 'damage'),
      ) ?? options[0]
    if (!ability)
      throw new Error(
        'No affordable ability. Add a zero-cost ability to this actor.',
      )
    const target = queries
      .targets(state, ability)
      .sort((a, b) => a.hp - b.hp)[0]
    if (!target) throw new Error('No valid target')
    return { abilityId: ability.id, targetId: target.id }
  }
}
