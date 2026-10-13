# World maps and exploration

World maps are portable data in the same project and mod packs as actors,
abilities, and encounters. The world runtime has no browser, React, input, or
storage dependencies. The editor and player share its rules and renderer.

## Authoring

1. Open **World maps** and select or add a map. Set its name, description,
   dimensions, and spawn point. Maps range from 1 × 1 to 64 × 64 tiles.
2. Select a terrain brush and click tiles to paint. **Inspect tile** selects a
   tile without painting; the inspector also lets you change its terrain.
3. Use **Place spawn**, **Place encounter**, or **Place portal**, then click a
   walkable tile. Choose the encounter/destination in the inspector before
   placing a marker. Markers replace any previous encounter or portal on a tile.
4. Select a marker to edit its encounter, repeatability, portal name, target map,
   or destination coordinates. **Erase marker** removes an encounter or portal.
5. Expand **Edit terrain definitions** to add/edit colors, glyphs, and collision
   rules. **Undo** / **Redo** cover map and terrain edits as project changes.
6. Click **Playtest map** to explore the draft. Set the root **Starting map** in
   Overview, then **Save project** to persist everything through the existing API.

Resize preserves tile coordinates and fills new space with a walkable terrain.
Shrinking crops markers outside the new bounds, clamps the spawn, and paints a
relocated spawn with the fill terrain. Portal destinations on other maps are not
silently rewritten: validation reports destinations that now need repair.

## Data model

`Terrain` contains `id`, `name`, a six-digit hex `color`, a short `glyph`, and
`walkable`. Maps refer to terrain IDs rather than embedding appearance or
collision in each tile. This lets one mod change an entire terrain category.

```json
{
  "id": "small-clearing",
  "name": "Small clearing",
  "description": "A short training trail.",
  "width": 3,
  "height": 3,
  "tiles": [
    "forest",
    "forest",
    "forest",
    "path",
    "path",
    "path",
    "grass",
    "grass",
    "grass"
  ],
  "spawn": { "x": 0, "y": 1 },
  "encounters": [
    {
      "id": "training",
      "x": 2,
      "y": 1,
      "encounterId": "moss-grove",
      "repeatable": false
    }
  ],
  "portals": []
}
```

Coordinates start at zero. `tiles` is a flat row-major array: index
`y * width + x`. Its length must equal `width * height`. Each marker has a stable
ID unique within its map. An encounter marker references existing combat content.
A portal contains `id`, `name`, `x`, `y`, `targetMapId`, and `destination: { x, y }`.
One encounter, portal, or NPC may occupy a tile. Spawn may share an encounter or
portal tile, but NPCs cannot occupy spawn or portal arrival tiles.

Composition validates terrain and encounter references, map bounds, marker IDs,
overlap, passable spawn/marker tiles, and passable portal destinations. Deleting
referenced maps or terrain leaves an invalid draft until repaired or undone.
Saving and playtesting are blocked while content is invalid.

`game.startingMap` is optional. Without it, exploration starts on the first
resolved map. Games without maps retain the original battle sandbox. Adding
their first map creates the starter terrain palette if none exists. Existing
JSON formats stay at version 1 because world fields are additive and collections
default to empty arrays.

## Runtime API

```ts
import { starterGame } from '@ancadeba/schemas'
import { BattleRuntime, WorldRuntime } from '@ancadeba/game-runtime'

const battles = new BattleRuntime(starterGame)
const world = new WorldRuntime(battles, starterGame.startingMap)
let state = world.start()
state = world.move(state, 'east')
state = world.move(state, 'east')

if (state.encounter) {
  state = world.act(state, battles.chooseAction(state.encounter.battle))
  // Keep taking actions through the existing BattleRuntime until it ends.
  if (state.encounter!.battle.outcome !== 'active')
    state = world.finishBattle(state)
}

const save = world.save(state)
state = world.restore(save)
```

`WorldState` holds `mapId`, `position`, `facing`, `steps`, `clearedEncounters`,
and optional active encounter state. It is plain serializable data. Commands
return new states without mutating their inputs. Blocked movement throws
`MovementBlocked` without changing position or the step count.

`move` accepts north/east/south/west and moves exactly one orthogonal tile.
Movement must remain in bounds and pass the injected collision policy. On entry
to an uncleared encounter tile, it starts the existing battle definition and
blocks further movement. `act` delegates to the injected battle runtime; custom
combat effects and enemy strategies work unchanged. `restartBattle` retries
the current encounter. `finishBattle` requires a completed battle:

- Victory clears a one-time marker and resumes on its tile. Repeatable markers
  remain available when the player leaves and enters their tile again.
- Defeat returns to the current map's spawn and does not clear the marker.
- Each encounter uses its own party definition and starts with full HP/MP,
  matching standalone combat. Persistent party resources/progression are not
  introduced by this module.

Portals move to their explicit destination on another map, or the same map.
Only one tile interaction runs per step: arrival does not immediately trigger
another portal or encounter. This prevents portal loops. Step off and back onto
a destination marker to activate it. Likewise, starting on a marker does not
activate it until a later entry.

## Movement extensions and mods

Movement rules are injected separately from combat:

```ts
import { WorldRuntime, type MovementRules } from '@ancadeba/game-runtime'

const movement: MovementRules = {
  canEnter({ terrain, destination }) {
    return terrain.walkable && destination.x !== 5
  },
}

const world = new WorldRuntime(battles, game.startingMap, movement)
```

Use the same policy in the player and editor preview. Bounds and data-reference
validation remain in the core; a movement policy can add game-specific checks.
`MovementContext` supplies the state, map, terrain, and proposed destination.

JSON mods can contain `terrains` and `maps`. Dependencies and load order follow
the existing rules: later definitions replace earlier definitions **as whole
objects**, and all references are checked after composition. A mod can add new
areas, replace map layouts, change encounter placement, or make water walkable.
The map editor edits base definitions, while its palette and playtest use
resolved content; an enabled override can supersede a base edit.

Portable examples:

- `sample-games/alderfell/project.json`: connected maps and battle content.
- `sample-games/mods/river-crossing.json`: replaces only the water terrain.
- `sample-games/mods/quiet-wildwood.json`: replaces Alderfell's map with a version
  without encounters, preserving its portal to the moss grove.

Import the latter into the starter's Mods tab. River crossing is already
installed and disabled in the starter; enable it there, or import its exported
file into a project without that mod. Use Project JSON to author map packs and
the Mods tab to export them. The root starting map can select maps added by mods.

## World saves and UI

`WorldView` wraps the injected runtime with keyboard/touch controls, a shared
`MapGrid`, and the existing `BattleView`. Battles use controlled session state
so a world snapshot includes their current turn, HP/MP, status effects, and logs.
NPC definitions and placements share this content model. NPCs occupy their
tiles, and the player interacts from an adjacent tile. Conversations pause
exploration and persist their current node and shared flags in world saves.
See [the NPC/dialogue guide](npcs-dialogue.md) for authoring and runtime APIs.
Exploration pauses during a battle. Changing from exploration to battle sandbox
preserves the world session and pauses its enemy timer while hidden.

`save` / `restore` preserve current map, coordinates, facing, step count, cleared
markers, and any active battle. Restoration validates all fields against the
resolved content, including collision, marker identity, and active battle
matching. Duplicate, unknown, or repeatable cleared-marker entries are rejected.
The content fingerprint includes map and terrain data: edited worlds require a
new session. Standalone battle snapshots fingerprint only combat content, so
map-only edits remain compatible with those battle saves.

The player and editor use distinct browser storage keys. Project JSON stores
definitions; world saves store runtime progress. Content saves retain the API's
revision checks and atomic file persistence. `pnpm test:e2e` uses separate ports
and a unique project file per run, leaving the user's saved game intact.
