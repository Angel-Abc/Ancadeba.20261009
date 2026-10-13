import { useState } from 'react'
import type { ContentPack, QuestProgress } from '@ancadeba/schemas'
import type { QuestRuntime } from '@ancadeba/game-runtime'

export function QuestJournal({
  runtime,
  progress,
  catalog,
  onAccept,
  disabled = false,
}: {
  runtime: QuestRuntime
  progress: QuestProgress
  catalog: ContentPack
  onAccept: (id: string) => void
  disabled?: boolean
}) {
  const [filter, setFilter] = useState<'active' | 'available' | 'completed'>(
    'active',
  )
  const available = runtime.available(progress)
  const quests =
    filter === 'available'
      ? available
      : runtime.content.filter((quest) =>
          progress.some(
            (entry) => entry.questId === quest.id && entry.status === filter,
          ),
        )
  return (
    <section className='quest-journal panel' aria-label='Quest journal'>
      <div className='section-heading'>
        <div>
          <span className='eyebrow'>STORIES IN PROGRESS</span>
          <h2>Quest journal</h2>
          <p>
            Objectives advance through conversations and world victories. Save
            world keeps your journal.
          </p>
        </div>
        <div className='toolbar' role='group' aria-label='Journal filters'>
          {(['active', 'available', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              aria-pressed={filter === tab}
              className={filter === tab ? 'primary' : ''}
              onClick={() => setFilter(tab)}
            >
              {tab[0]!.toUpperCase() + tab.slice(1)} (
              {tab === 'available'
                ? available.length
                : progress.filter((entry) => entry.status === tab).length}
              )
            </button>
          ))}
        </div>
      </div>
      {!quests.length && (
        <p className='hint'>
          {filter === 'active'
            ? 'No active quests. Check available quests or speak with an NPC.'
            : filter === 'completed'
              ? 'Your completed adventures will appear here.'
              : 'No quests available. Complete earlier quests to unlock more.'}
        </p>
      )}
      <div className='quest-cards'>
        {quests.map((quest) => {
          const entry = progress.find((value) => value.questId === quest.id)
          const first = entry?.objectives.findIndex(
            (value, index) => value.count < quest.objectives[index]!.target,
          )
          const npc = quest.start?.npcId
            ? catalog.npcs.find((value) => value.id === quest.start!.npcId)
            : undefined
          const choice = quest.start
            ? catalog.dialogues
                .find((value) => value.id === quest.start!.dialogueId)
                ?.nodes.find((value) => value.id === quest.start!.nodeId)
                ?.choices.find((value) => value.id === quest.start!.choiceId)
            : undefined
          return (
            <article
              key={quest.id}
              aria-label={quest.name}
              className='quest-card'
            >
              <div className='section-heading'>
                <h3>{quest.name}</h3>
                <span className='eyebrow'>{entry?.status ?? 'available'}</span>
              </div>
              <p>{quest.description}</p>
              <ol className='quest-objectives'>
                {quest.objectives.map((objective, index) => {
                  const count = entry?.objectives[index]?.count ?? 0
                  return (
                    <li
                      key={objective.id}
                      className={
                        count === objective.target ? 'objective-complete' : ''
                      }
                    >
                      <span aria-hidden='true'>
                        {count === objective.target ? '✓' : '○'}
                      </span>
                      <span>
                        {objective.text}
                        {quest.ordered &&
                          entry?.status === 'active' &&
                          first !== undefined &&
                          index > first && (
                            <small>Waiting for earlier objectives</small>
                          )}
                      </span>
                      <strong aria-label={`${objective.text} Progress`}>
                        {count} / {objective.target}
                      </strong>
                    </li>
                  )
                })}
              </ol>
              {!entry &&
                (quest.start ? (
                  <p className='hint'>
                    Speak with{' '}
                    {npc?.name ??
                      catalog.dialogues.find(
                        (value) => value.id === quest.start!.dialogueId,
                      )?.name}
                    : “{choice?.text}”
                  </p>
                ) : (
                  <button
                    className='primary'
                    disabled={disabled}
                    onClick={() => onAccept(quest.id)}
                  >
                    Accept {quest.name}
                  </button>
                ))}
            </article>
          )
        })}
      </div>
    </section>
  )
}
