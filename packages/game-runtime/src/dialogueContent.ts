import type { ContentPack, Dialogue } from '@ancadeba/schemas'

export function validateDialogues(dialogues: Dialogue[]) {
  const ids = dialogues.map((entry) => entry.id)
  if (new Set(ids).size !== ids.length)
    throw new Error('Duplicate dialogue IDs')
  for (const dialogue of dialogues) {
    const nodes = new Set(dialogue.nodes.map((entry) => entry.id))
    if (nodes.size !== dialogue.nodes.length)
      throw new Error(`${dialogue.name}: duplicate dialogue node IDs`)
    if (!nodes.has(dialogue.startNodeId))
      throw new Error(
        `${dialogue.name}: missing start node ${dialogue.startNodeId}`,
      )
    for (const node of dialogue.nodes) {
      if (
        new Set(node.choices.map((entry) => entry.id)).size !==
        node.choices.length
      )
        throw new Error(`${dialogue.name}: duplicate choice IDs in ${node.id}`)
      for (const choice of node.choices) {
        if (choice.nextNodeId && !nodes.has(choice.nextNodeId))
          throw new Error(
            `${dialogue.name}: choice ${choice.id} references missing node ${choice.nextNodeId}`,
          )
      }
    }
  }
}

export function validateDialogueContent(content: ContentPack) {
  validateDialogues(content.dialogues)
  const dialogues = new Set(content.dialogues.map((entry) => entry.id))
  for (const npc of content.npcs)
    if (!dialogues.has(npc.dialogueId))
      throw new Error(
        `${npc.name} references missing dialogue ${npc.dialogueId}`,
      )
}
