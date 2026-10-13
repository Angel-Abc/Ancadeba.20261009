import { useEffect, useState } from 'react'
import { BattleRuntime, type BattleState } from '@ancadeba/game-runtime'

interface BattleViewProps {
  runtime: BattleRuntime
  encounterId: string
  storage?: Pick<Storage, 'getItem' | 'setItem'>
  saveKey?: string
}

export function BattleView({
  runtime,
  encounterId,
  storage,
  saveKey = 'ancadeba-battle',
}: BattleViewProps) {
  const [battle, setBattle] = useState(() => runtime.start(encounterId))
  const [selected, setSelected] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const current = runtime.current(battle)
  const actor = runtime.actor(current.actorId)
  const abilities = runtime.abilities(battle)
  const ability =
    abilities.find((entry) => entry.id === selected) ?? abilities[0]!
  const enemyTurn = current.team === 'enemy' && battle.outcome === 'active'

  useEffect(() => {
    if (!enemyTurn || error) return
    const timer = setTimeout(() => {
      try {
        setBattle(runtime.act(battle, runtime.chooseAction(battle)))
      } catch (failure) {
        setError(
          failure instanceof Error ? failure.message : 'Enemy action failed',
        )
      }
    }, 650)
    return () => clearTimeout(timer)
  }, [battle, runtime, enemyTurn, error])

  function update(next: BattleState) {
    setBattle(next)
    setSelected('')
    setError('')
    setMessage('')
  }

  function save() {
    try {
      storage?.setItem(saveKey, runtime.save(battle))
      setMessage('Battle saved in this browser.')
      setError('')
    } catch {
      setError('Could not save battle in this browser.')
    }
  }

  function load() {
    try {
      const saved = storage?.getItem(saveKey)
      if (!saved) throw new Error('No battle save in this browser yet.')
      const next = runtime.restore(saved)
      if (next.encounterId !== encounterId)
        throw new Error('This save belongs to another encounter.')
      update(next)
      setMessage('Battle restored.')
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Could not load save',
      )
    }
  }

  const encounter = runtime.content.encounters.find(
    (entry) => entry.id === encounterId,
  )!
  return (
    <section className='battle' aria-label='Battle preview'>
      <div className='section-heading'>
        <div>
          <span className='eyebrow'>LIVE ENCOUNTER · ROUND {battle.round}</span>
          <h2>{encounter.name}</h2>
          <p>{encounter.description}</p>
        </div>
        <div className='toolbar'>
          <button onClick={() => update(runtime.start(encounterId))}>
            Restart battle
          </button>
          {storage && (
            <>
              <button onClick={save}>Save battle</button>
              <button onClick={load}>Load battle</button>
            </>
          )}
        </div>
      </div>
      <div className='initiative' aria-label='Turn order'>
        {battle.order.map((id) => {
          const member = battle.combatants.find((entry) => entry.id === id)!
          return (
            <span
              key={id}
              className={`${id === current.id ? 'active' : ''} ${member.hp === 0 ? 'fallen' : ''}`}
            >
              {runtime.actor(member.actorId).name}
            </span>
          )
        })}
      </div>
      <div className='battlefield'>
        {(['party', 'enemy'] as const).map((team) => (
          <div className={`team ${team}`} key={team}>
            <h3>{team === 'party' ? 'Your party' : 'Opponents'}</h3>
            {battle.combatants
              .filter((entry) => entry.team === team)
              .map((member) => {
                const definition = runtime.actor(member.actorId)
                return (
                  <article
                    key={member.id}
                    className={`combatant ${member.id === current.id ? 'current' : ''} ${member.hp === 0 ? 'fallen' : ''}`}
                  >
                    <div className='avatar' aria-hidden='true'>
                      {definition.name.slice(0, 1)}
                    </div>
                    <div className='combatant-info'>
                      <div className='section-heading'>
                        <h4>{definition.name}</h4>
                        <span>
                          {member.hp === 0
                            ? 'Fallen'
                            : member.guarding
                              ? 'Guarding'
                              : member.poison
                                ? `Poison ${member.poison.remaining}`
                                : definition.role}
                        </span>
                      </div>
                      <progress
                        aria-label={`${definition.name} health`}
                        value={member.hp}
                        max={definition.maxHp}
                      />
                      <div className='resources'>
                        <span>
                          HP {member.hp} / {definition.maxHp}
                        </span>
                        <span>
                          MP {member.mp} / {definition.maxMp}
                        </span>
                      </div>
                    </div>
                  </article>
                )
              })}
          </div>
        ))}
      </div>
      {battle.outcome === 'active' ? (
        <div className='command-panel'>
          <div>
            <span className='eyebrow'>
              {enemyTurn ? 'ENEMY TURN' : 'YOUR TURN'}
            </span>
            <h3>
              {actor.name}
              {enemyTurn ? ' is choosing an action…' : ', choose your action'}
            </h3>
          </div>
          <div className='ability-list'>
            {abilities.map((entry) => (
              <button
                key={entry.id}
                className={entry.id === ability.id ? 'selected' : ''}
                disabled={enemyTurn || current.mp < entry.cost}
                onClick={() => setSelected(entry.id)}
                title={entry.description}
              >
                {entry.name}
                <small>
                  {entry.cost === 0 ? 'No MP cost' : `${entry.cost} MP`}
                </small>
              </button>
            ))}
          </div>
          {!enemyTurn && (
            <>
              <p>
                {ability.description}{' '}
                <span className='muted'>Select a target to act.</span>
              </p>
              <div className='toolbar'>
                {runtime.targets(battle, ability).map((target) => (
                  <button
                    className='primary'
                    key={target.id}
                    disabled={current.mp < ability.cost}
                    onClick={() => {
                      try {
                        update(
                          runtime.act(battle, {
                            abilityId: ability.id,
                            targetId: target.id,
                          }),
                        )
                      } catch (failure) {
                        setError(
                          failure instanceof Error
                            ? failure.message
                            : 'Action failed',
                        )
                      }
                    }}
                  >
                    {ability.name} → {runtime.actor(target.actorId).name}
                    {target.team === 'enemy'
                      ? ` (${Number(target.id.split('-')[1]) + 1})`
                      : ''}
                  </button>
                ))}
              </div>
              {abilities.every((entry) => entry.cost > current.mp) && (
                <p role='alert'>
                  No affordable ability. Add a zero-cost ability to this actor.
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <div className={`outcome ${battle.outcome}`} role='status'>
          <h3>{battle.outcome === 'victory' ? 'Victory' : 'Defeat'}</h3>
          <p>
            {battle.outcome === 'victory'
              ? 'Your party survives another journey.'
              : 'Adjust your tactics or tune the encounter in the editor.'}
          </p>
        </div>
      )}
      {error && (
        <p role='alert' className='error'>
          {error}
        </p>
      )}
      {message && <p role='status'>{message}</p>}
      <details className='battle-log' open>
        <summary>
          Combat journal <span>{battle.log.length} events</span>
        </summary>
        <ol aria-label='Combat journal'>
          {battle.log.slice(-12).map((entry, index) => (
            <li key={`${battle.log.length - 12 + index}-${entry}`}>{entry}</li>
          ))}
        </ol>
      </details>
    </section>
  )
}
