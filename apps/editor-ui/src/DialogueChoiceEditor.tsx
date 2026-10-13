import type { DialogueChoice, DialogueNode } from '@ancadeba/schemas'

export function DialogueChoiceEditor({
  choice,
  nodes,
  onChange,
  onDelete,
}: {
  choice: DialogueChoice
  nodes: DialogueNode[]
  onChange: (choice: DialogueChoice) => void
  onDelete: () => void
}) {
  return (
    <article className='dialogue-choice-editor'>
      <div className='section-heading'>
        <code>{choice.id}</code>
        <button className='danger' onClick={onDelete}>
          Delete choice
        </button>
      </div>
      <div className='form-grid'>
        <label>
          Choice text
          <input
            value={choice.text}
            onChange={(event) =>
              onChange({ ...choice, text: event.target.value })
            }
          />
        </label>
        <label>
          Next node
          <select
            aria-label='Next node'
            value={choice.nextNodeId ?? ''}
            onChange={(event) =>
              onChange({ ...choice, nextNodeId: event.target.value || null })
            }
          >
            <option value=''>End conversation</option>
            {nodes.map((node) => (
              <option value={node.id} key={node.id}>
                {node.id}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className='flag-rule-columns'>
        <fieldset>
          <legend>Show choice when all conditions match</legend>
          {choice.conditions.map((condition, index) => (
            <div className='flag-rule' key={index}>
              <label>
                Condition flag
                <input
                  value={condition.flag}
                  onChange={(event) =>
                    onChange({
                      ...choice,
                      conditions: choice.conditions.map((entry, position) =>
                        position === index
                          ? { ...entry, flag: event.target.value }
                          : entry,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Equals
                <select
                  aria-label='Condition value'
                  value={String(condition.equals)}
                  onChange={(event) =>
                    onChange({
                      ...choice,
                      conditions: choice.conditions.map((entry, position) =>
                        position === index
                          ? { ...entry, equals: event.target.value === 'true' }
                          : entry,
                      ),
                    })
                  }
                >
                  <option value='true'>True</option>
                  <option value='false'>False / unset</option>
                </select>
              </label>
              <button
                onClick={() =>
                  onChange({
                    ...choice,
                    conditions: choice.conditions.filter(
                      (_, position) => position !== index,
                    ),
                  })
                }
              >
                Remove condition
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              onChange({
                ...choice,
                conditions: [
                  ...choice.conditions,
                  { flag: 'new-flag', equals: true },
                ],
              })
            }
          >
            Add condition
          </button>
        </fieldset>
        <fieldset>
          <legend>Set flags when chosen</legend>
          {choice.effects.map((effect, index) => (
            <div className='flag-rule' key={index}>
              <label>
                Effect flag
                <input
                  value={effect.flag}
                  onChange={(event) =>
                    onChange({
                      ...choice,
                      effects: choice.effects.map((entry, position) =>
                        position === index
                          ? { ...entry, flag: event.target.value }
                          : entry,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Set to
                <select
                  aria-label='Effect value'
                  value={String(effect.value)}
                  onChange={(event) =>
                    onChange({
                      ...choice,
                      effects: choice.effects.map((entry, position) =>
                        position === index
                          ? { ...entry, value: event.target.value === 'true' }
                          : entry,
                      ),
                    })
                  }
                >
                  <option value='true'>True</option>
                  <option value='false'>False</option>
                </select>
              </label>
              <button
                onClick={() =>
                  onChange({
                    ...choice,
                    effects: choice.effects.filter(
                      (_, position) => position !== index,
                    ),
                  })
                }
              >
                Remove effect
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              onChange({
                ...choice,
                effects: [...choice.effects, { flag: 'new-flag', value: true }],
              })
            }
          >
            Add flag effect
          </button>
        </fieldset>
      </div>
    </article>
  )
}
