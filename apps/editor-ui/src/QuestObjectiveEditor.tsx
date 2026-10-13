import type { Quest, ContentPack } from '@ancadeba/schemas'
import { QuestTriggerEditor } from './QuestTriggerEditor'

export function QuestObjectiveEditor({
  quest,
  catalog,
  onChange: replace,
}: {
  quest: Quest
  catalog: ContentPack
  onChange: (quest: Quest) => void
}) {
  return (
    <>
      <div className='section-heading'>
        <h3>Objectives</h3>
        <button
          onClick={() => {
            let index = 1
            while (
              quest.objectives.some(
                (entry) => entry.id === `objective-${index}`,
              )
            )
              index++
            replace({
              ...quest,
              objectives: [
                ...quest.objectives,
                {
                  id: `objective-${index}`,
                  text: 'Win an encounter.',
                  target: 1,
                  trigger: {
                    type: 'encounter-victory',
                    encounterId:
                      catalog.encounters[0]?.id ?? 'missing-encounter',
                  },
                },
              ],
            })
          }}
        >
          Add objective
        </button>
      </div>
      <div className='quest-objective-editor'>
        {quest.objectives.map((objective, index) => {
          function update(next: typeof objective) {
            replace({
              ...quest,
              objectives: quest.objectives.map((entry, position) =>
                position === index ? next : entry,
              ),
            })
          }
          function reorder(offset: number) {
            const objectives = [...quest.objectives]
            const other = objectives[index + offset]!
            objectives[index + offset] = objective
            objectives[index] = other
            replace({ ...quest, objectives })
          }
          return (
            <fieldset key={objective.id} aria-label={`Objective ${index + 1}`}>
              <legend>
                {index + 1} · {objective.id}
              </legend>
              <div className='form-grid'>
                <label>
                  Objective text
                  <input
                    value={objective.text}
                    onChange={(event) =>
                      update({ ...objective, text: event.target.value })
                    }
                  />
                </label>
                <label>
                  Required count
                  <input
                    type='number'
                    min={1}
                    max={9999}
                    value={objective.target}
                    onChange={(event) =>
                      update({
                        ...objective,
                        target: Number(event.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <QuestTriggerEditor
                trigger={objective.trigger}
                catalog={catalog}
                onChange={(trigger) => update({ ...objective, trigger })}
              />
              <div className='toolbar'>
                <button disabled={index === 0} onClick={() => reorder(-1)}>
                  Move objective up
                </button>
                <button
                  disabled={index === quest.objectives.length - 1}
                  onClick={() => reorder(1)}
                >
                  Move objective down
                </button>
                <button
                  disabled={quest.objectives.length === 1}
                  onClick={() =>
                    replace({
                      ...quest,
                      objectives: quest.objectives.filter(
                        (entry) => entry.id !== objective.id,
                      ),
                    })
                  }
                >
                  Remove objective
                </button>
              </div>
            </fieldset>
          )
        })}
      </div>
    </>
  )
}
