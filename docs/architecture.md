# Engine architecture and extension guide

Ancadeba v1 focuses on turn-based party combat and game content authoring. It
ships a playable sample, reusable runtime, editor, local storage API, and mod
composition. World maps, dialogue, inventory/equipment, campaign progression,
and multiplayer are future modules; this version does not implement them.

## Package boundaries

| Package                  | Responsibility                                                                    |
| ------------------------ | --------------------------------------------------------------------------------- |
| `@ancadeba/schemas`      | Versioned Zod definitions and inferred public types; starter data                 |
| `@ancadeba/game-runtime` | Content composition, combat state transitions, effects, AI, save validation       |
| `@ancadeba/game-ui`      | React battle rendering, enemy timing, injected browser save storage, shared theme |
| `@ancadeba/utilities`    | Dependency injection, logging, formatting                                         |
| `apps/editor-server`     | HTTP boundary, runtime validation, revision control, injected repository          |
| `apps/editor-ui`         | Authoring forms, draft history, import/export, preview                            |
| `apps/engine`            | Player entry point, encounter selection, game loading                             |

The runtime can execute in Node, the browser, tests, or another renderer. There
are no global runtime registries or singleton game state. Each runtime receives
its own effect registry and enemy strategy, and each action returns a new battle
state. Platform services belong at the application boundary. The React view
receives a runtime and optional storage rather than creating a global session.

## Project data

Projects have `id`, `name`, and optional `game` fields. Metadata-only scaffold
projects still load; the editor gives them a starter draft. Exported playable
projects include `game` with `formatVersion: 1`, `startingEncounter`, `actors`,
`abilities`, `encounters`, and `mods`. Incompatible format versions are rejected.
IDs use lowercase letters, digits, dots, underscores, and hyphens and begin with
a letter. The visual editor creates stable IDs; use project JSON to change IDs
and all corresponding references together.

An actor defines max HP/MP, attack, defense, speed, role, and ability IDs. An
ability defines its MP cost, target (`enemy`, `ally`, `self`), description, and
ordered effects. An encounter defines party and enemy actor IDs. The same actor
can appear repeatedly: the runtime creates independent per-side instances.

The schema bounds numeric stats and collection sizes. Composition rejects
duplicate IDs within a pack, missing references, and missing starting
encounters. The runtime also rejects unknown effect handlers and actors without
a zero-cost action. Drafts may temporarily be invalid while editing; validation
errors block saving and playtesting. Applying/importing full project JSON
requires a valid project before replacing the draft.

## Turn rules

- Combatants act by descending speed. Instance IDs break ties consistently.
- The order is fixed for a battle; defeated members are skipped. A new round
  starts when the order wraps.
- Every ability costs MP and consumes one turn. Targets must be living members
  of the appropriate team, or the source for a self-targeting ability.
- Effects run in their listed order. Later effects stop if the target dies.
- Damage is `max(1, floor((power + attack - defense) * guardMultiplier))`.
  The guard multiplier is `0.5` when guarding, otherwise `1`.
- Healing restores up to max HP. It does not revive defeated combatants.
- Guard clears at the actor's next turn. Poison ticks at turn start, ignores
  defense/guard, and expires after its configured number of ticks.
- A defeated team ends the battle immediately. If an effect defeats both
  teams simultaneously, the outcome is defeat.
- The default enemy strategy heals an ally below half HP if possible; otherwise
  it uses its first affordable damaging ability, targeting the lowest HP,
  then falls back to its first affordable ability. Strategies can be replaced.

## Data mods

A mod has `id`, `name`, `version`, `description`, `enabled`, `requires`, and
optional collections of actors, abilities, and encounters. Versions are labels;
`requires` contains exact mod IDs, not version constraints.

Base content loads first. Enabled mods are traversed in their configured order.
Dependencies load before the requesting mod, once each. A dependency must exist
and be enabled. Cycles and duplicate mod IDs are rejected. Later definitions
with the same ID replace earlier definitions **as a whole**, rather than
merging individual fields. References are validated after all packs load.
Reordering independent mods changes override precedence.

For example, import `sample-games/mods/wildwood-awakened.json` into a project
without the built-in mod, or enable the built-in **Wildwood awakened** pack.
Its `mossling` actor replaces the base actor while reusing existing abilities
and encounters. Disabled packs contribute no content.

To author another mod, add a pack in **Project JSON**, apply it, and export it
from **Mods**. JSON packs use registered effects. Code extensions register
handlers in the host application composition before constructing a runtime.

## Custom effects and AI

```ts
import { BattleRuntime, createDefaultEffects } from '@ancadeba/game-runtime'
import type { BattleStrategy } from '@ancadeba/game-runtime'
import type { Game } from '@ancadeba/schemas'

export function createRuntime(game: Game) {
  const effects = createDefaultEffects()
    .register('drain-mp', ({ target, effect, targetActor, log }) => {
      const amount = Math.min(target.mp, effect.power)
      target.mp -= amount
      log(`${targetActor.name} loses ${amount} MP.`)
    })
    .replace('damage', ({ sourceActor, target, effect, log }) => {
      const amount = Math.max(1, effect.power + sourceActor.attack)
      target.hp = Math.max(0, target.hp - amount)
      log(`${amount} piercing damage.`)
    })

  const strategy: BattleStrategy = {
    chooseAction(state, queries) {
      const current = queries.current(state)
      const ability = queries
        .abilities(state)
        .find((entry) => entry.cost <= current.mp)!
      const target = queries.targets(state, ability)[0]!
      return { abilityId: ability.id, targetId: target.id }
    },
  }

  return new BattleRuntime(game, effects, strategy)
}
```

Then an ability can include `{ type: 'drain-mp', power: 5, duration: 1 }`.
Use the same runtime factory in player loading, editor validation/preview, and
server save validation so custom content behaves consistently. The included
applications use the built-in handlers; custom code must be wired into those
composition points before such content can be imported there. Effect handlers
should keep combatant HP/MP within actor limits and append messages via `log`.
Handler failures leave the previous battle state unchanged. Registering a
duplicate type fails; `.replace` explicitly replaces an existing handler.

The v1 persistent status model contains guard and poison. Adding another
persistent status requires updating combatant types, turn processing, and save
validation together. New immediate effects and damage rules need only handlers.

## Persistence

`runtime.save(state)` creates a versioned JSON snapshot. `restore(json)` checks
the resolved-content fingerprint, encounter membership, order, current turn,
HP/MP ranges, poison duration, logs, and outcome. Changed active content makes a
save incompatible; restart the encounter after balancing changes. Battle saves
live in the browser, using separate keys for editor/player, project, and
encounter. The latest 200 log entries are retained.

`GET /api/project` returns `{ project, revision, label }`. `PUT /api/project`
accepts `{ project, revision }`, validates content, saves, and returns the new
revision. Invalid requests return 400; stale revisions return 409. Project
bodies are limited to 2 MB. The local API is bound to loopback by default.

The injected repository serializes writes, publishes a revision only after
persistence succeeds, and writes a temporary file followed by an atomic rename.
The default path is `data/project.json`; `PROJECT_FILE` can override it. A
corrupted existing file causes startup to fail instead of silently replacing
it. The repository is intended for one API process per file. For multi-process
or hosted editing, implement `ProjectRepository` with transactional storage and
add the deployment's authentication/routing at the HTTP boundary.

## Verification

Run `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm test:e2e`. Unit and
integration tests cover composition, effect/strategy injection, turns, invalid
actions, poison and guard, snapshots, persistence failures, revision conflicts,
and HTTP validation. Browser tests cover the complete authoring and battle
workflows plus responsive layouts and browser errors.
