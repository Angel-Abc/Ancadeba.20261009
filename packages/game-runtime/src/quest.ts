import {
  questSchema,
  questProgressSchema,
  type Quest,
  type QuestProgress,
  type QuestTrigger,
  type DialogueFlags,
} from '@ancadeba/schemas'
import { validateQuests } from './questContent.js'

export type QuestEvent =
  | {
      type: 'dialogue-choice'
      dialogueId: string
      nodeId: string
      choiceId: string
      npcId: string
    }
  | {
      type: 'encounter-victory'
      encounterId: string
      mapId: string
      triggerId: string
    }

export interface QuestEventMatcher {
  matches(trigger: QuestTrigger, event: QuestEvent): boolean
}

export class DefaultQuestEventMatcher implements QuestEventMatcher {
  matches(trigger: QuestTrigger, event: QuestEvent): boolean {
    if (trigger.type === 'encounter-victory')
      return (
        event.type === trigger.type && event.encounterId === trigger.encounterId
      )
    return (
      event.type === trigger.type &&
      event.dialogueId === trigger.dialogueId &&
      event.nodeId === trigger.nodeId &&
      event.choiceId === trigger.choiceId &&
      (!trigger.npcId || event.npcId === trigger.npcId)
    )
  }
}

/** Pure event-driven progress. WorldRuntime supplies only validated player events. */
export class QuestRuntime {
  readonly content: Quest[]
  constructor(
    quests: Quest[],
    private readonly matcher: QuestEventMatcher = new DefaultQuestEventMatcher(),
  ) {
    this.content = questSchema.array().parse(quests)
    validateQuests(this.content)
  }

  quest(id: string): Quest {
    const quest = this.content.find((entry) => entry.id === id)
    if (!quest) throw new Error(`Unknown quest: ${id}`)
    return quest
  }

  available(progress: QuestProgress): Quest[] {
    return this.content.filter(
      (quest) =>
        !progress.some((entry) => entry.questId === quest.id) &&
        quest.requires.every((id) =>
          progress.some(
            (entry) => entry.questId === id && entry.status === 'completed',
          ),
        ),
    )
  }

  private begin(progress: QuestProgress, quest: Quest): QuestProgress {
    return [
      ...progress,
      {
        questId: quest.id,
        status: 'active',
        objectives: quest.objectives.map((entry) => ({
          objectiveId: entry.id,
          count: 0,
        })),
      },
    ]
  }

  private unlock(progress: QuestProgress): QuestProgress {
    let next = progress
    for (const quest of this.available(next).filter((entry) => entry.autoStart))
      next = this.begin(next, quest)
    return next
  }

  start(): QuestProgress {
    return this.unlock([])
  }

  accept(progress: QuestProgress, id: string): QuestProgress {
    const quest = this.quest(id)
    if (quest.start)
      throw new Error('This quest must be accepted through NPC dialogue')
    if (!this.available(progress).some((entry) => entry.id === id))
      throw new Error(
        'Quest is already started or prerequisites are incomplete',
      )
    return this.begin(progress, quest)
  }

  consume(
    progress: QuestProgress,
    flags: DialogueFlags,
    event: QuestEvent,
  ): { progress: QuestProgress; flags: DialogueFlags } {
    let next = progress
    for (const quest of this.available(next))
      if (quest.start && this.matcher.matches(quest.start, event))
        next = this.begin(next, quest)
    const nextFlags = { ...flags }
    next = next.map((entry) => {
      if (entry.status === 'completed') return entry
      const quest = this.quest(entry.questId)
      const first = entry.objectives.findIndex(
        (value, index) => value.count < quest.objectives[index]!.target,
      )
      const objectives = entry.objectives.map((value, index) => {
        const objective = quest.objectives[index]!
        return {
          ...value,
          count:
            value.count < objective.target &&
            (!quest.ordered || index === first) &&
            this.matcher.matches(objective.trigger, event)
              ? value.count + 1
              : value.count,
        }
      })
      const completed = objectives.every(
        (value, index) => value.count === quest.objectives[index]!.target,
      )
      if (completed)
        for (const effect of quest.completionEffects)
          nextFlags[effect.flag] = effect.value
      return {
        ...entry,
        objectives,
        status: completed ? ('completed' as const) : ('active' as const),
      }
    })
    return { progress: this.unlock(next), flags: nextFlags }
  }

  restore(input: unknown): QuestProgress {
    const progress = questProgressSchema.parse(input)
    if (
      new Set(progress.map((entry) => entry.questId)).size !== progress.length
    )
      throw new Error('Duplicate quest progress')
    for (const entry of progress) {
      const quest = this.quest(entry.questId)
      if (
        entry.objectives.length !== quest.objectives.length ||
        entry.objectives.some(
          (value, index) =>
            value.objectiveId !== quest.objectives[index]!.id ||
            value.count > quest.objectives[index]!.target,
        )
      )
        throw new Error(`Invalid objective progress for ${quest.id}`)
      const complete = entry.objectives.every(
        (value, index) => value.count === quest.objectives[index]!.target,
      )
      if ((entry.status === 'completed') !== complete)
        throw new Error(`Invalid completion status for ${quest.id}`)
      if (quest.ordered) {
        const first = entry.objectives.findIndex(
          (value, index) => value.count < quest.objectives[index]!.target,
        )
        if (
          first >= 0 &&
          entry.objectives.slice(first + 1).some((value) => value.count !== 0)
        )
          throw new Error(`Invalid ordered progress for ${quest.id}`)
      }
      if (
        quest.requires.some(
          (id) =>
            !progress.some(
              (value) => value.questId === id && value.status === 'completed',
            ),
        )
      )
        throw new Error(`Incomplete prerequisites for ${quest.id}`)
    }
    return progress
  }
}
