import { useEffect, useRef } from 'react'
import type { DialogueFlags, DialogueSession, Npc } from '@ancadeba/schemas'
import { DialogueRuntime } from '@ancadeba/game-runtime'

interface Props {
  runtime: DialogueRuntime
  session: DialogueSession
  flags: DialogueFlags
  npc?: Npc
  onChoose: (choiceId: string) => void
  onEnd: () => void
  showFlags?: boolean
  autoFocus?: boolean
}

export function DialogueView({
  runtime,
  session,
  flags,
  npc,
  onChoose,
  onEnd,
  showFlags = false,
  autoFocus = true,
}: Props) {
  const panel = useRef<HTMLElement>(null)
  const node = runtime.node(session)
  const choices = runtime.choices(session, flags)
  useEffect(() => {
    if (autoFocus) panel.current?.focus({ preventScroll: true })
  }, [session.dialogueId, session.nodeId, autoFocus])
  return (
    <section
      ref={panel}
      tabIndex={-1}
      role='dialog'
      aria-label={`Conversation with ${npc?.name ?? runtime.dialogue(session.dialogueId).name}`}
      className='dialogue-view'
    >
      <div className='dialogue-speaker'>
        <span
          className='npc-portrait'
          style={{ color: npc?.color ?? '#d9b47f' }}
          aria-hidden='true'
        >
          {npc?.glyph ?? '♙'}
        </span>
        <div>
          <span className='eyebrow'>CONVERSATION</span>
          <h3>
            {node.speaker ||
              npc?.name ||
              runtime.dialogue(session.dialogueId).name}
          </h3>
          {npc?.description && <p className='hint'>{npc.description}</p>}
        </div>
      </div>
      <p className='dialogue-text'>{node.text}</p>
      <div className='dialogue-choices'>
        {choices.map((choice, index) => (
          <button key={choice.id} onClick={() => onChoose(choice.id)}>
            <span aria-hidden='true'>{index + 1}</span>
            {choice.text}
          </button>
        ))}
      </div>
      {choices.length === 0 && node.choices.length > 0 && (
        <p className='hint'>There are no available responses right now.</p>
      )}
      <button className={choices.length === 0 ? 'primary' : ''} onClick={onEnd}>
        {choices.length === 0 ? 'End conversation' : 'Leave conversation'}
      </button>
      {showFlags && (
        <details className='dialogue-flags' open>
          <summary>Preview flags</summary>
          {Object.keys(flags).length ? (
            <dl>
              {Object.entries(flags).map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className='hint'>No flags set yet.</p>
          )}
        </details>
      )}
    </section>
  )
}
