import {
  dialogueSchema,
  type Dialogue,
  type DialogueChoice,
  type DialogueEffect,
  type DialogueFlags,
  type DialogueNode,
  type DialogueSession,
} from '@ancadeba/schemas'
import { validateDialogues } from './dialogueContent.js'

export interface DialogueConditions {
  isAvailable(choice: DialogueChoice, flags: Readonly<DialogueFlags>): boolean
}
export interface DialogueEffects {
  apply(effects: DialogueEffect[], flags: DialogueFlags): void
}

export class FlagDialogueConditions implements DialogueConditions {
  isAvailable(choice: DialogueChoice, flags: Readonly<DialogueFlags>): boolean {
    return choice.conditions.every(
      (condition) => (flags[condition.flag] === true) === condition.equals,
    )
  }
}

export class FlagDialogueEffects implements DialogueEffects {
  apply(effects: DialogueEffect[], flags: DialogueFlags): void {
    for (const effect of effects) flags[effect.flag] = effect.value
  }
}

/** Pure conversation transitions; the host owns placement, input, and persistence. */
export class DialogueRuntime {
  readonly content: Dialogue[]
  constructor(
    dialogues: Dialogue[],
    private readonly conditions: DialogueConditions = new FlagDialogueConditions(),
    private readonly effects: DialogueEffects = new FlagDialogueEffects(),
  ) {
    this.content = dialogueSchema.array().parse(dialogues)
    validateDialogues(this.content)
  }

  dialogue(id: string): Dialogue {
    const dialogue = this.content.find((entry) => entry.id === id)
    if (!dialogue) throw new Error(`Unknown dialogue: ${id}`)
    return dialogue
  }

  start(dialogueId: string): DialogueSession {
    return { dialogueId, nodeId: this.dialogue(dialogueId).startNodeId }
  }

  node(session: DialogueSession): DialogueNode {
    const node = this.dialogue(session.dialogueId).nodes.find(
      (entry) => entry.id === session.nodeId,
    )
    if (!node) throw new Error(`Unknown dialogue node: ${session.nodeId}`)
    return node
  }

  choices(session: DialogueSession, flags: DialogueFlags): DialogueChoice[] {
    return this.node(session).choices.filter((choice) =>
      this.conditions.isAvailable(choice, flags),
    )
  }

  choose(
    session: DialogueSession,
    flags: DialogueFlags,
    choiceId: string,
  ): { session: DialogueSession | null; flags: DialogueFlags } {
    const choice = this.choices(session, flags).find(
      (entry) => entry.id === choiceId,
    )
    if (!choice) throw new Error('Dialogue choice is unavailable')
    const nextFlags = { ...flags }
    this.effects.apply(choice.effects, nextFlags)
    return {
      session: choice.nextNodeId
        ? { dialogueId: session.dialogueId, nodeId: choice.nextNodeId }
        : null,
      flags: nextFlags,
    }
  }
}
