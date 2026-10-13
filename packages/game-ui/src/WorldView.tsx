import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import {
  MovementBlocked,
  WorldRuntime,
  type Direction,
  type WorldState,
} from '@ancadeba/game-runtime'
import type { Position } from '@ancadeba/schemas'
import { MapGrid } from './MapGrid.js'
import { BattleView } from './BattleView.js'
import { DialogueView } from './DialogueView.js'
import { QuestJournal } from './QuestJournal.js'

interface Props {
  runtime: WorldRuntime
  mapId: string
  storage?: Pick<Storage, 'getItem' | 'setItem'>
  saveKey?: string
  active?: boolean
}

const directions: { id: Direction; label: string; symbol: string }[] = [
  { id: 'north', label: 'Move north', symbol: '↑' },
  { id: 'west', label: 'Move west', symbol: '←' },
  { id: 'south', label: 'Move south', symbol: '↓' },
  { id: 'east', label: 'Move east', symbol: '→' },
]

export function WorldView({
  runtime,
  mapId,
  storage,
  saveKey = 'ancadeba-world',
  active = true,
}: Props) {
  const [world, setWorld] = useState(() => runtime.start(mapId))
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [tileSize, setTileSize] = useState(40)
  const root = useRef<HTMLElement>(null)
  const battlePanel = useRef<HTMLDivElement>(null)
  const conversationPanel = useRef<HTMLDivElement>(null)
  const journalPanel = useRef<HTMLDivElement>(null)
  const conversationId = world.conversation
    ? `${world.conversation.mapId}:${world.conversation.placementId}`
    : undefined
  useEffect(() => {
    if (conversationId)
      conversationPanel.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
  }, [conversationId])
  const triggerId = world.encounter
    ? `${world.encounter.mapId}:${world.encounter.triggerId}`
    : undefined
  useEffect(() => {
    if (triggerId)
      battlePanel.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
  }, [triggerId])
  const map = runtime.map(world.mapId)
  const nearby = runtime.nearbyNpcs(world)
  const speakingNpc = runtime.content.npcs.find(
    (entry) =>
      entry.id ===
      map.npcs.find(
        (placement) => placement.id === world.conversation?.placementId,
      )?.npcId,
  )
  const interacting = !!world.encounter || !!world.conversation
  function update(operation: (state: WorldState) => WorldState) {
    try {
      setWorld(operation(world))
      setError('')
      setMessage('')
    } catch (failure) {
      if (failure instanceof MovementBlocked) {
        setMessage(failure.message)
        setError('')
      } else
        setError(
          failure instanceof Error ? failure.message : 'World action failed',
        )
    }
  }
  function move(direction: Direction) {
    update((state) => runtime.move(state, direction))
  }
  function select(position: Position) {
    const dx = position.x - world.position.x
    const dy = position.y - world.position.y
    if (Math.abs(dx) + Math.abs(dy) !== 1) {
      setMessage('Choose an adjacent tile, or use the movement controls.')
      return
    }
    const npc = nearby.find(
      (entry) =>
        entry.placement.x === position.x && entry.placement.y === position.y,
    )
    if (npc) {
      update((state) => runtime.interact(state, npc.placement.id))
      return
    }
    move(dx === 1 ? 'east' : dx === -1 ? 'west' : dy === 1 ? 'south' : 'north')
  }
  function keyboard(event: KeyboardEvent) {
    if (active && world.conversation && event.key === 'Escape') {
      event.preventDefault()
      endConversation()
      return
    }
    if (
      !active ||
      interacting ||
      (event.target instanceof HTMLElement &&
        event.target.closest('input,textarea,select'))
    )
      return
    if (
      event.key.toLowerCase() === 'e' ||
      (event.key === ' ' &&
        !(
          event.target instanceof HTMLElement && event.target.closest('button')
        ))
    ) {
      event.preventDefault()
      const offsets: Record<Direction, Position> = {
        north: { x: 0, y: -1 },
        south: { x: 0, y: 1 },
        east: { x: 1, y: 0 },
        west: { x: -1, y: 0 },
      }
      const offset = offsets[world.facing]
      const target =
        nearby.find(
          (entry) =>
            entry.placement.x === world.position.x + offset.x &&
            entry.placement.y === world.position.y + offset.y,
        ) ?? (nearby.length === 1 ? nearby[0] : undefined)
      if (target)
        update((state) => runtime.interact(state, target.placement.id))
      else
        setMessage(
          'Move next to an NPC and face them, or choose a talk button.',
        )
      return
    }
    const keys: Record<string, Direction> = {
      ArrowUp: 'north',
      ArrowDown: 'south',
      ArrowLeft: 'west',
      ArrowRight: 'east',
      w: 'north',
      s: 'south',
      a: 'west',
      d: 'east',
    }
    const direction = keys[event.key] ?? keys[event.key.toLowerCase()]
    if (direction) {
      event.preventDefault()
      move(direction)
    }
  }
  function endConversation() {
    update((state) => runtime.endConversation(state))
    root.current?.focus({ preventScroll: true })
  }
  return (
    <section
      ref={root}
      className='world-view'
      tabIndex={0}
      onKeyDown={keyboard}
      aria-label='World exploration'
    >
      <div className='section-heading'>
        <div>
          <span className='eyebrow'>
            EXPLORE THE WORLD · {world.steps} STEPS
          </span>
          <h2>{map.name}</h2>
          <p>{map.description}</p>
        </div>
        <div className='toolbar'>
          <button
            onClick={() => {
              journalPanel.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              })
              journalPanel.current?.focus({ preventScroll: true })
            }}
          >
            Quest journal
          </button>
          <button
            onClick={() => {
              setWorld(runtime.start(mapId))
              setMessage('World restarted.')
              setError('')
            }}
          >
            Restart world
          </button>
          {storage && (
            <>
              <button
                onClick={() => {
                  try {
                    storage.setItem(saveKey, runtime.save(world))
                    setMessage('World saved in this browser.')
                    setError('')
                  } catch {
                    setError('Could not save the world.')
                  }
                }}
              >
                Save world
              </button>
              <button
                onClick={() => {
                  try {
                    const saved = storage.getItem(saveKey)
                    if (!saved)
                      throw new Error('No world save in this browser yet.')
                    setWorld(runtime.restore(saved))
                    setMessage('World restored.')
                    setError('')
                  } catch (failure) {
                    setError(
                      failure instanceof Error
                        ? failure.message
                        : 'Could not restore world',
                    )
                  }
                }}
              >
                Load world
              </button>
            </>
          )}
        </div>
      </div>
      <div className='world-layout'>
        <div>
          <MapGrid
            map={map}
            terrains={runtime.content.terrains}
            npcs={runtime.content.npcs}
            player={world.position}
            cleared={world.clearedEncounters}
            tileSize={tileSize}
            onSelect={select}
          />
          <div className='map-legend'>
            <span>♟ Player</span>
            <span>⌂ Spawn</span>
            <span>⚔ Encounter</span>
            <span>◇ Portal</span>
            <span>✓ Cleared</span>
            <span>♙ NPC</span>
          </div>
        </div>
        <aside className='world-controls'>
          <span className='eyebrow'>YOUR JOURNEY</span>
          <p className='player-position' aria-label='Player position'>
            Position: {world.position.x}, {world.position.y}
          </p>
          <p>{world.clearedEncounters.length} encounters cleared</p>
          <div className='movement-pad'>
            {directions.map((direction) => (
              <button
                key={direction.id}
                aria-label={direction.label}
                className={`move-${direction.id}`}
                disabled={interacting}
                onClick={() => move(direction.id)}
              >
                {direction.symbol}
              </button>
            ))}
          </div>
          <div className='nearby-npcs'>
            {nearby.map(({ placement, npc }) => (
              <button
                disabled={interacting}
                key={placement.id}
                onClick={() =>
                  update((state) => runtime.interact(state, placement.id))
                }
              >
                Talk to {npc.name}
              </button>
            ))}
          </div>
          <p className='hint'>
            Focus the map and use arrow keys or WASD. Click adjacent tiles to
            move. Press E/Space near an NPC to talk. Battles and conversations
            pause exploration.
          </p>
          <label>
            Map zoom
            <input
              type='range'
              min={24}
              max={64}
              step={4}
              value={tileSize}
              onChange={(event) => setTileSize(Number(event.target.value))}
            />
          </label>
        </aside>
      </div>
      {message && (
        <p className='notice' role='status'>
          {message}
        </p>
      )}
      {error && (
        <p className='error' role='alert'>
          {error}
        </p>
      )}
      {world.conversation && (
        <div ref={conversationPanel} className='world-conversation'>
          <DialogueView
            runtime={runtime.dialogues}
            session={world.conversation}
            flags={world.flags}
            {...(speakingNpc ? { npc: speakingNpc } : {})}
            onChoose={(id) => {
              let ended = false
              update((state) => {
                const next = runtime.chooseDialogue(state, id)
                ended = !next.conversation
                return next
              })
              if (ended) root.current?.focus({ preventScroll: true })
            }}
            onEnd={endConversation}
          />
        </div>
      )}
      {world.encounter && (
        <div ref={battlePanel} className='world-encounter'>
          <BattleView
            paused={!active}
            key={`${world.encounter.mapId}:${world.encounter.triggerId}`}
            runtime={runtime.battles}
            encounterId={world.encounter.battle.encounterId}
            session={{
              state: world.encounter.battle,
              act: (action) => {
                setWorld(runtime.act(world, action))
                setError('')
                setMessage('')
              },
              restart: () => update((state) => runtime.restartBattle(state)),
            }}
          />
          {world.encounter.battle.outcome !== 'active' && (
            <button
              className='primary return-to-map'
              onClick={() => {
                const outcome = world.encounter!.battle.outcome
                update((state) => runtime.finishBattle(state))
                setMessage(
                  outcome === 'victory'
                    ? 'Encounter complete. Continue exploring.'
                    : 'Your party returned to the map spawn. Try again when ready.',
                )
                root.current?.focus({ preventScroll: true })
                root.current?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                })
              }}
            >
              Return to map
            </button>
          )}
        </div>
      )}
      <div ref={journalPanel} tabIndex={-1}>
        <QuestJournal
          runtime={runtime.quests}
          progress={world.quests}
          catalog={runtime.content}
          disabled={interacting}
          onAccept={(id) => update((state) => runtime.acceptQuest(state, id))}
        />
      </div>
    </section>
  )
}
