import { useState } from 'react'
import {
  questSchema,
  type ContentPack,
  type Game,
  type Quest,
} from '@ancadeba/schemas'
import { QuestTriggerEditor } from './QuestTriggerEditor'
import { QuestObjectiveEditor } from './QuestObjectiveEditor'

export function QuestEditor({
  game,
  catalog,
  onChange,
  onPlay,
  canPlay,
}: {
  game: Game
  catalog: ContentPack
  onChange: (game: Game) => void
  onPlay: () => void
  canPlay: boolean
}) {
  const [selected, setSelected] = useState(game.quests[0]?.id ?? '')
  const quest =
    game.quests.find((entry) => entry.id === selected) ?? game.quests[0]
  function replace(next: Quest) {
    onChange({
      ...game,
      quests: game.quests.map((entry) => (entry.id === next.id ? next : entry)),
    })
  }
  function add() {
    let index = 1
    while (catalog.quests.some((entry) => entry.id === `quest-${index}`))
      index++
    const next = questSchema.parse({
      id: `quest-${index}`,
      name: 'New quest',
      objectives: [
        {
          id: 'objective-1',
          text: 'Win an encounter.',
          trigger: {
            type: 'encounter-victory',
            encounterId: catalog.encounters[0]?.id ?? 'missing-encounter',
          },
        },
      ],
    })
    onChange({ ...game, quests: [...game.quests, next] })
    setSelected(next.id)
  }
  return (
    <div className='content-editor quest-editor'>
      <aside className='entry-list'>
        <div className='section-heading'>
          <span>{game.quests.length} quests</span>
          <button onClick={add}>Add quest</button>
        </div>
        {game.quests.map((entry) => (
          <button
            key={entry.id}
            className={entry.id === quest?.id ? 'selected' : ''}
            onClick={() => setSelected(entry.id)}
          >
            <strong>{entry.name || 'Untitled'}</strong>
            <code>{entry.id}</code>
          </button>
        ))}
        <p className='hint'>
          Mods can add quests or replace complete definitions by ID. Test
          objectives in Explore world.
        </p>
      </aside>
      <section className='inspector'>
        {quest ? (
          <>
            <div className='section-heading'>
              <div>
                <span className='eyebrow'>CAMPAIGN STORY</span>
                <h2>{quest.name || 'Untitled'}</h2>
              </div>
              <div className='toolbar'>
                <button disabled={!canPlay} onClick={onPlay}>
                  Playtest quests
                </button>
                <button
                  className='danger'
                  onClick={() =>
                    onChange({
                      ...game,
                      quests: game.quests.filter(
                        (entry) => entry.id !== quest.id,
                      ),
                    })
                  }
                >
                  Delete quest
                </button>
              </div>
            </div>
            <div className='form-grid'>
              <label>
                Quest name
                <input
                  value={quest.name}
                  onChange={(event) =>
                    replace({ ...quest, name: event.target.value })
                  }
                />
              </label>
              <label>
                Quest ID
                <input readOnly value={quest.id} />
              </label>
            </div>
            <label>
              Quest description
              <textarea
                aria-label='Quest description'
                value={quest.description}
                onChange={(event) =>
                  replace({ ...quest, description: event.target.value })
                }
              />
            </label>
            <label>
              Quest starts
              <select
                value={
                  quest.autoStart
                    ? 'automatic'
                    : quest.start
                      ? 'dialogue'
                      : 'journal'
                }
                onChange={(event) =>
                  replace({
                    ...quest,
                    autoStart: event.target.value === 'automatic',
                    start:
                      event.target.value === 'dialogue'
                        ? {
                            type: 'dialogue-choice',
                            dialogueId:
                              catalog.dialogues[0]?.id ?? 'missing-dialogue',
                            nodeId:
                              catalog.dialogues[0]?.nodes.find(
                                (entry) => entry.choices.length,
                              )?.id ?? 'missing-node',
                            choiceId:
                              catalog.dialogues[0]?.nodes.find(
                                (entry) => entry.choices.length,
                              )?.choices[0]?.id ?? 'missing-choice',
                          }
                        : null,
                  })
                }
              >
                <option value='journal'>Accept from journal</option>
                <option value='dialogue'>NPC dialogue choice</option>
                <option value='automatic'>Automatically when available</option>
              </select>
            </label>
            {quest.start && (
              <fieldset>
                <legend>Acceptance dialogue</legend>
                <QuestTriggerEditor
                  trigger={quest.start}
                  catalog={catalog}
                  dialogueOnly
                  onChange={(trigger) => {
                    if (trigger.type === 'dialogue-choice')
                      replace({ ...quest, start: trigger })
                  }}
                />
              </fieldset>
            )}
            <fieldset>
              <legend>Required completed quests</legend>
              {catalog.quests
                .filter((entry) => entry.id !== quest.id)
                .map((entry) => (
                  <label className='checkbox-label' key={entry.id}>
                    <input
                      type='checkbox'
                      checked={quest.requires.includes(entry.id)}
                      onChange={(event) =>
                        replace({
                          ...quest,
                          requires: event.target.checked
                            ? [...quest.requires, entry.id]
                            : quest.requires.filter((id) => id !== entry.id),
                        })
                      }
                    />
                    {entry.name}
                  </label>
                ))}
              {quest.requires
                .filter(
                  (id) =>
                    !catalog.quests.some((entry) => entry.id === id) ||
                    id === quest.id,
                )
                .map((id) => (
                  <button
                    key={id}
                    onClick={() =>
                      replace({
                        ...quest,
                        requires: quest.requires.filter(
                          (value) => value !== id,
                        ),
                      })
                    }
                  >
                    Remove invalid prerequisite: {id}
                  </button>
                ))}
              {!catalog.quests.some((entry) => entry.id !== quest.id) && (
                <p className='hint'>
                  Create another quest to add prerequisites.
                </p>
              )}
            </fieldset>
            <label className='checkbox-label'>
              <input
                type='checkbox'
                checked={quest.ordered}
                onChange={(event) =>
                  replace({ ...quest, ordered: event.target.checked })
                }
              />
              Complete objectives in order
            </label>
            <QuestObjectiveEditor
              quest={quest}
              catalog={catalog}
              onChange={replace}
            />
            <fieldset>
              <legend>Set dialogue flags on completion</legend>
              {quest.completionEffects.map((effect, index) => (
                <div className='flag-rule' key={index}>
                  <label>
                    Completion flag
                    <input
                      value={effect.flag}
                      onChange={(event) =>
                        replace({
                          ...quest,
                          completionEffects: quest.completionEffects.map(
                            (entry, position) =>
                              position === index
                                ? { ...entry, flag: event.target.value }
                                : entry,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Completion value
                    <select
                      value={String(effect.value)}
                      onChange={(event) =>
                        replace({
                          ...quest,
                          completionEffects: quest.completionEffects.map(
                            (entry, position) =>
                              position === index
                                ? {
                                    ...entry,
                                    value: event.target.value === 'true',
                                  }
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
                      replace({
                        ...quest,
                        completionEffects: quest.completionEffects.filter(
                          (_, position) => position !== index,
                        ),
                      })
                    }
                  >
                    Remove completion flag
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  replace({
                    ...quest,
                    completionEffects: [
                      ...quest.completionEffects,
                      { flag: 'quest-complete', value: true },
                    ],
                  })
                }
              >
                Add completion flag
              </button>
              <p className='hint'>
                Use these flags in dialogue conditions to unlock responses after
                completion.
              </p>
            </fieldset>
          </>
        ) : (
          <div className='empty-state'>
            <h2>No quests yet</h2>
            <p>Add a story driven by dialogue and encounters.</p>
            <button onClick={add}>Create first quest</button>
          </div>
        )}
      </section>
    </div>
  )
}
