import type { ContentPack, QuestTrigger } from '@ancadeba/schemas'

export function QuestTriggerEditor({
  trigger,
  catalog,
  onChange,
  dialogueOnly = false,
}: {
  trigger: QuestTrigger
  catalog: ContentPack
  onChange: (trigger: QuestTrigger) => void
  dialogueOnly?: boolean
}) {
  const dialogue =
    trigger.type === 'dialogue-choice'
      ? catalog.dialogues.find((entry) => entry.id === trigger.dialogueId)
      : undefined
  const node =
    trigger.type === 'dialogue-choice'
      ? dialogue?.nodes.find((entry) => entry.id === trigger.nodeId)
      : undefined
  function chooseDialogue(id: string) {
    const entry = catalog.dialogues.find((value) => value.id === id)
    const first = entry?.nodes.find((value) => value.choices.length)
    onChange({
      type: 'dialogue-choice',
      dialogueId: id,
      nodeId: first?.id ?? 'missing-node',
      choiceId: first?.choices[0]?.id ?? 'missing-choice',
    })
  }
  return (
    <div className='form-grid'>
      {!dialogueOnly && (
        <label>
          Event type
          <select
            value={trigger.type}
            onChange={(event) => {
              if (event.target.value === 'dialogue-choice')
                chooseDialogue(catalog.dialogues[0]?.id ?? 'missing-dialogue')
              else
                onChange({
                  type: 'encounter-victory',
                  encounterId: catalog.encounters[0]?.id ?? 'missing-encounter',
                })
            }}
          >
            <option value='encounter-victory'>Encounter victory</option>
            <option value='dialogue-choice'>NPC dialogue choice</option>
          </select>
        </label>
      )}
      {trigger.type === 'encounter-victory' ? (
        <label>
          Objective encounter
          <select
            value={trigger.encounterId}
            onChange={(event) =>
              onChange({ ...trigger, encounterId: event.target.value })
            }
          >
            {!catalog.encounters.some(
              (entry) => entry.id === trigger.encounterId,
            ) && (
              <option value={trigger.encounterId}>
                Missing: {trigger.encounterId}
              </option>
            )}
            {catalog.encounters.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <>
          <label>
            Trigger dialogue
            <select
              value={trigger.dialogueId}
              onChange={(event) => chooseDialogue(event.target.value)}
            >
              {!dialogue && (
                <option value={trigger.dialogueId}>
                  Missing: {trigger.dialogueId}
                </option>
              )}
              {catalog.dialogues.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Trigger node
            <select
              value={trigger.nodeId}
              onChange={(event) =>
                onChange({
                  ...trigger,
                  nodeId: event.target.value,
                  choiceId:
                    dialogue?.nodes.find(
                      (entry) => entry.id === event.target.value,
                    )?.choices[0]?.id ?? 'missing-choice',
                })
              }
            >
              {!node && (
                <option value={trigger.nodeId}>
                  Missing: {trigger.nodeId}
                </option>
              )}
              {dialogue?.nodes
                .filter((entry) => entry.choices.length)
                .map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.id}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Trigger choice
            <select
              value={trigger.choiceId}
              onChange={(event) =>
                onChange({ ...trigger, choiceId: event.target.value })
              }
            >
              {!node?.choices.some(
                (entry) => entry.id === trigger.choiceId,
              ) && (
                <option value={trigger.choiceId}>
                  Missing: {trigger.choiceId}
                </option>
              )}
              {node?.choices.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.text}
                </option>
              ))}
            </select>
          </label>
          <label>
            Trigger NPC
            <select
              value={trigger.npcId ?? ''}
              onChange={(event) =>
                onChange({ ...trigger, npcId: event.target.value || undefined })
              }
            >
              <option value=''>Any NPC with this dialogue</option>
              {trigger.npcId &&
                !catalog.npcs.some(
                  (entry) =>
                    entry.id === trigger.npcId &&
                    entry.dialogueId === trigger.dialogueId,
                ) && (
                  <option value={trigger.npcId}>
                    Missing or incompatible: {trigger.npcId}
                  </option>
                )}
              {catalog.npcs
                .filter((entry) => entry.dialogueId === trigger.dialogueId)
                .map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
            </select>
          </label>
        </>
      )}
    </div>
  )
}
