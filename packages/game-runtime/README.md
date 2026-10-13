# Game runtime

`@ancadeba/game-runtime` executes the same turn-based combat in the player and
editor playtest. It is synchronous, deterministic, and independent of React,
browser APIs, input, timers, HTTP, and persistent storage.
It also exports `WorldRuntime` for tile movement, collision, portals, encounter
handoff, and world snapshots. World execution receives an existing
`BattleRuntime` and optional injected movement rules; combat remains a separate
module. See [the world-map API guide](../../docs/world-maps.md).
`DialogueRuntime` separately handles branching conversations, conditions and
flag effects, with injectable policies. `WorldRuntime` composes it with NPC
placement, adjacency checks, and world persistence. See
[the dialogue guide](../../docs/npcs-dialogue.md).
`QuestRuntime` handles event matching, activation, prerequisites, ordered/countable
objectives and completion flags independently. `WorldRuntime` emits dialogue and
victory events and persists quest progress. Its matcher is injected; data mods
compose whole quest definitions. See [the quest guide](../../docs/quests.md).

```ts
import { starterGame } from '@ancadeba/schemas'
import { BattleRuntime } from '@ancadeba/game-runtime'

const runtime = new BattleRuntime(starterGame)
let battle = runtime.start(starterGame.startingEncounter)
battle = runtime.act(battle, runtime.chooseAction(battle))
const snapshot = runtime.save(battle)
battle = runtime.restore(snapshot)
```

`resolveContent(game)` composes enabled mods and validates references.
`BattleRuntime` validates registered effects and zero-cost fallback abilities.
Actions clone battle state, validate ownership, MP and targets, then apply
effects and advance the turn. Call `abilities`, `targets`, `actor`, and `current`
to render choices. Call `chooseAction` for the injected enemy strategy.

Effect handling and AI are separate modules. Inject an `EffectRegistry` and
`BattleStrategy` to customize rules without changing the battle UI. Use
`createDefaultEffects().register(...)` for new effect types or `.replace(...)`
for an existing rule. JSON mods extend data; they do not execute code.

See [the architecture guide](../../docs/architecture.md) for complete examples,
composition order, persistence boundaries, battle rules, and current scope.

Place implementation modules in `src` and export their public APIs from
`src/index.ts`. The engine and editor UI both declare this package as a
`workspace:*` dependency.

Keep reusable game execution logic here, shared game definitions in
`@ancadeba/schemas`, and general helpers in `@ancadeba/utilities`. Inject rendering,
input, timing, and other platform services so runtime logic can be tested outside
the browser. The TypeScript configuration starts with standard ECMAScript types.

Development uses the `@ancadeba/source` export condition. Production consumers
resolve compiled ESM and TypeScript declarations from `dist`.

```sh
pnpm --filter @ancadeba/game-runtime typecheck
pnpm --filter @ancadeba/game-runtime... build
```

Add runtime tests under the repository's `tests/packages/game-runtime` folder.
The root test suite already has a dependency on this package and discovers
`tests/**/*.test.{ts,tsx}`.
