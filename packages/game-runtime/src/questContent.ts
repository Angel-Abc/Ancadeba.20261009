import type { ContentPack, Quest, QuestTrigger } from '@ancadeba/schemas'

export function validateQuests(quests: Quest[]) {
  const entries = new Map(quests.map((quest) => [quest.id, quest]))
  if (entries.size !== quests.length) throw new Error('Duplicate quest IDs')
  const visited = new Set<string>()
  const visiting = new Set<string>()
  function visit(quest: Quest) {
    if (visited.has(quest.id)) return
    if (visiting.has(quest.id))
      throw new Error(`Quest dependency cycle at ${quest.id}`)
    visiting.add(quest.id)
    if (quest.autoStart && quest.start)
      throw new Error(
        `${quest.name} cannot start automatically and through dialogue`,
      )
    if (
      new Set(quest.objectives.map((entry) => entry.id)).size !==
      quest.objectives.length
    )
      throw new Error(`Duplicate objective IDs in ${quest.name}`)
    if (new Set(quest.requires).size !== quest.requires.length)
      throw new Error(`Duplicate prerequisites in ${quest.name}`)
    for (const id of quest.requires) {
      const required = entries.get(id)
      if (!required)
        throw new Error(`${quest.name} requires missing quest ${id}`)
      visit(required)
    }
    visiting.delete(quest.id)
    visited.add(quest.id)
  }
  quests.forEach(visit)
}

export function validateQuestContent(content: ContentPack) {
  validateQuests(content.quests)
  function validate(trigger: QuestTrigger, name: string) {
    if (trigger.type === 'encounter-victory') {
      if (!content.encounters.some((entry) => entry.id === trigger.encounterId))
        throw new Error(
          `${name} references missing encounter ${trigger.encounterId}`,
        )
      return
    }
    const dialogue = content.dialogues.find(
      (entry) => entry.id === trigger.dialogueId,
    )
    if (
      !dialogue?.nodes
        .find((entry) => entry.id === trigger.nodeId)
        ?.choices.some((entry) => entry.id === trigger.choiceId)
    )
      throw new Error(
        `${name} references missing dialogue choice ${trigger.dialogueId}/${trigger.nodeId}/${trigger.choiceId}`,
      )
    if (
      trigger.npcId &&
      !content.npcs.some(
        (entry) =>
          entry.id === trigger.npcId && entry.dialogueId === trigger.dialogueId,
      )
    )
      throw new Error(
        `${name} references an NPC without the required dialogue: ${trigger.npcId}`,
      )
  }
  for (const quest of content.quests) {
    if (quest.start) validate(quest.start, quest.name)
    for (const objective of quest.objectives)
      validate(objective.trigger, quest.name)
  }
}
