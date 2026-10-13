import type {
  Ability,
  Actor,
  ContentPack,
  Encounter,
  Game,
} from '@ancadeba/schemas'
import { useState } from 'react'

export type Collection = 'actors' | 'abilities' | 'encounters'

interface Props {
  game: Game
  catalog: ContentPack
  collection: Collection
  onChange: (game: Game) => void
}

function Field({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
}) {
  return (
    <label>
      {label}
      <input
        type='number'
        min={min}
        max={9999}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function References({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: { id: string; name: string }[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  return (
    <fieldset className='reference-picker'>
      <legend>{label}</legend>
      {options.map((entry) => (
        <label key={entry.id}>
          <input
            type='checkbox'
            checked={selected.includes(entry.id)}
            onChange={(event) =>
              onChange(
                event.target.checked
                  ? [...selected, entry.id]
                  : selected.filter((id) => id !== entry.id),
              )
            }
          />
          {entry.name}
          <code>{entry.id}</code>
        </label>
      ))}
    </fieldset>
  )
}

function ActorForm({
  actor,
  game,
  update,
}: {
  actor: Actor
  game: ContentPack
  update: (actor: Actor) => void
}) {
  return (
    <>
      <label>
        Role
        <input
          value={actor.role}
          onChange={(event) => update({ ...actor, role: event.target.value })}
        />
      </label>
      <div className='form-grid'>
        {(['maxHp', 'maxMp', 'attack', 'defense', 'speed'] as const).map(
          (key) => (
            <Field
              key={key}
              label={
                {
                  maxHp: 'Max HP',
                  maxMp: 'Max MP',
                  attack: 'Attack',
                  defense: 'Defense',
                  speed: 'Speed',
                }[key]
              }
              value={actor[key]}
              min={key === 'maxHp' || key === 'speed' ? 1 : 0}
              onChange={(value) => update({ ...actor, [key]: value })}
            />
          ),
        )}
      </div>
      <References
        label='Known abilities'
        options={game.abilities}
        selected={actor.abilities}
        onChange={(abilities) => update({ ...actor, abilities })}
      />
      <p className='hint'>
        Give each actor a zero-cost ability so they can act when MP runs out.
      </p>
    </>
  )
}

function AbilityForm({
  ability,
  update,
}: {
  ability: Ability
  update: (ability: Ability) => void
}) {
  return (
    <>
      <label>
        Description
        <textarea
          value={ability.description}
          onChange={(event) =>
            update({ ...ability, description: event.target.value })
          }
        />
      </label>
      <div className='form-grid'>
        <label>
          Target
          <select
            value={ability.target}
            onChange={(event) =>
              update({
                ...ability,
                target: event.target.value as Ability['target'],
              })
            }
          >
            <option value='enemy'>Enemy</option>
            <option value='ally'>Ally</option>
            <option value='self'>Self</option>
          </select>
        </label>
        <Field
          label='MP cost'
          value={ability.cost}
          onChange={(cost) => update({ ...ability, cost })}
        />
      </div>
      <div className='section-heading'>
        <h3>Effects</h3>
        <button
          onClick={() =>
            update({
              ...ability,
              effects: [
                ...ability.effects,
                { type: 'damage', power: 10, duration: 2 },
              ],
            })
          }
        >
          Add effect
        </button>
      </div>
      {ability.effects.map((effect, index) => (
        <div className='effect-row' key={index}>
          <label>
            Effect type
            <select
              value={effect.type}
              onChange={(event) =>
                update({
                  ...ability,
                  effects: ability.effects.map((entry, position) =>
                    position === index
                      ? { ...entry, type: event.target.value }
                      : entry,
                  ),
                })
              }
            >
              {['damage', 'heal', 'guard', 'poison'].map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <Field
            label='Power'
            value={effect.power}
            onChange={(power) =>
              update({
                ...ability,
                effects: ability.effects.map((entry, position) =>
                  position === index ? { ...entry, power } : entry,
                ),
              })
            }
          />
          <Field
            label='Duration (turns)'
            min={1}
            value={effect.duration}
            onChange={(duration) =>
              update({
                ...ability,
                effects: ability.effects.map((entry, position) =>
                  position === index ? { ...entry, duration } : entry,
                ),
              })
            }
          />
          <button
            className='danger'
            disabled={ability.effects.length === 1}
            onClick={() =>
              update({
                ...ability,
                effects: ability.effects.filter(
                  (_, position) => position !== index,
                ),
              })
            }
          >
            Remove effect
          </button>
        </div>
      ))}
      <p className='hint'>
        Effects run in order. Damage adds the actor’s attack and subtracts the
        target’s defense. Guard halves damage; poison ticks at the start of a
        turn.
      </p>
    </>
  )
}

function EncounterForm({
  encounter,
  game,
  update,
}: {
  encounter: Encounter
  game: ContentPack
  update: (encounter: Encounter) => void
}) {
  function members(team: 'party' | 'enemies') {
    return (
      <fieldset className='reference-picker'>
        <legend>
          {team === 'party' ? 'Party members' : 'Enemies'} (up to 6)
        </legend>
        {encounter[team].map((id, index) => (
          <div className='member-row' key={index}>
            <select
              aria-label={`${team} member ${index + 1}`}
              value={id}
              onChange={(event) =>
                update({
                  ...encounter,
                  [team]: encounter[team].map((entry, position) =>
                    position === index ? event.target.value : entry,
                  ),
                })
              }
            >
              {game.actors.map((actor) => (
                <option key={actor.id} value={actor.id}>
                  {actor.name}
                </option>
              ))}
            </select>
            <button
              className='danger'
              onClick={() =>
                update({
                  ...encounter,
                  [team]: encounter[team].filter(
                    (_, position) => position !== index,
                  ),
                })
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          disabled={encounter[team].length >= 6 || game.actors.length === 0}
          onClick={() =>
            update({
              ...encounter,
              [team]: [...encounter[team], game.actors[0]!.id],
            })
          }
        >
          Add {team === 'party' ? 'party member' : 'enemy'}
        </button>
      </fieldset>
    )
  }
  return (
    <>
      <label>
        Description
        <textarea
          value={encounter.description}
          onChange={(event) =>
            update({ ...encounter, description: event.target.value })
          }
        />
      </label>
      {members('party')}
      {members('enemies')}
      <p className='hint'>
        Repeated actors create separate combatants. Higher speed acts first.
      </p>
    </>
  )
}

export function ContentEditor({ game, catalog, collection, onChange }: Props) {
  const [selected, setSelected] = useState(game[collection][0]?.id ?? '')
  const entries = game[collection]
  const entry = entries.find((item) => item.id === selected) ?? entries[0]
  const singular = {
    actors: 'actor',
    abilities: 'ability',
    encounters: 'encounter',
  }[collection]
  function replace(value: Actor | Ability | Encounter) {
    onChange({
      ...game,
      [collection]: entries.map((item) =>
        item.id === value.id ? value : item,
      ),
    })
  }
  function add() {
    let index = 1
    while (entries.some((item) => item.id === `${singular}-${index}`)) index++
    const id = `${singular}-${index}`
    const defaults = {
      actors: {
        id,
        name: 'New actor',
        role: 'Adventurer',
        maxHp: 100,
        maxMp: 20,
        attack: 15,
        defense: 5,
        speed: 10,
        abilities: game.abilities.slice(0, 1).map((item) => item.id),
      },
      abilities: {
        id,
        name: 'New ability',
        description: '',
        target: 'enemy',
        cost: 0,
        effects: [{ type: 'damage', power: 10, duration: 2 }],
      },
      encounters: {
        id,
        name: 'New encounter',
        description: '',
        party: game.actors.slice(0, 1).map((item) => item.id),
        enemies: game.actors.slice(-1).map((item) => item.id),
      },
    }
    onChange({ ...game, [collection]: [...entries, defaults[collection]] })
    setSelected(id)
  }
  return (
    <div className='content-editor'>
      <aside className='entry-list'>
        <div className='section-heading'>
          <span>
            {entries.length} {collection}
          </span>
          <button onClick={add}>Add {singular}</button>
        </div>
        {entries.map((item) => (
          <button
            className={item.id === entry?.id ? 'selected' : ''}
            key={item.id}
            onClick={() => setSelected(item.id)}
          >
            <strong>{item.name || 'Untitled'}</strong>
            <code>{item.id}</code>
          </button>
        ))}
      </aside>
      <section className='inspector'>
        {entry ? (
          <>
            <div className='section-heading'>
              <div>
                <span className='eyebrow'>
                  {singular.toUpperCase()} DEFINITION
                </span>
                <h2>{entry.name || 'Untitled'}</h2>
              </div>
              <button
                className='danger'
                onClick={() =>
                  onChange({
                    ...game,
                    [collection]: entries.filter(
                      (item) => item.id !== entry.id,
                    ),
                  })
                }
              >
                Delete {singular}
              </button>
            </div>
            <div className='form-grid'>
              <label>
                Name
                <input
                  value={entry.name}
                  onChange={(event) =>
                    replace({ ...entry, name: event.target.value })
                  }
                />
              </label>
              <label>
                Content ID
                <input readOnly value={entry.id} />
              </label>
            </div>
            {collection === 'actors' && (
              <ActorForm
                actor={entry as Actor}
                game={catalog}
                update={replace}
              />
            )}
            {collection === 'abilities' && (
              <AbilityForm ability={entry as Ability} update={replace} />
            )}
            {collection === 'encounters' && (
              <EncounterForm
                encounter={entry as Encounter}
                game={catalog}
                update={replace}
              />
            )}
          </>
        ) : (
          <div className='empty-state'>
            <h2>No {collection} yet</h2>
            <p>Add your first {singular} to begin authoring.</p>
            <button className='primary' onClick={add}>
              Add {singular}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
