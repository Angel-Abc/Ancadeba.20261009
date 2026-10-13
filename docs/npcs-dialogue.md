# NPCs and branching dialogue

NPCs and dialogues are shared, validated data. The world runtime handles map
placement and interaction range, while `DialogueRuntime` handles conversation
transitions independently of maps, combat, React, input, or storage.

## Authoring

1. Open **Dialogues** and add a dialogue. Set its name and start node.
2. Select a node to edit its text and optional speaker override. Blank speakers
   use the NPC's name. Use **Add node** for another branch.
3. Add responses, set their next node, or select **End conversation**. Node cards
   list outgoing links so you can follow the graph.
4. Add conditions to hide responses until all named flags match. Unset flags
   count as false. Add flag effects to remember decisions.
5. **Preview dialogue** tries branches and shows flags. Editing definitions
   restarts the preview without stealing input focus. **Restart conversation**
   resets preview flags.
6. In **NPCs**, create a character and assign its dialogue, name, description,
   glyph and color. A definition can be reused on multiple maps.
7. In **World maps**, select **NPC to place**, choose **Place NPC**, and click a
   walkable tile. Inspect a placement to change its character, or erase it with
   **Erase marker**. **Playtest map** uses active mod overrides.

All changes use existing undo/redo, import/export, revision checks, and atomic
project persistence. IDs are stable; use Project JSON to rename IDs and references
together. Deleting referenced content blocks saving/playtesting until links are
repaired or the deletion is undone.

## Data

Game/mod packs gain `npcs` and `dialogues`; maps gain `npcs` placements. Missing
collections default to empty arrays. Existing version 1 games and packs still load.

```json
{
  "id": "keeper",
  "name": "The keeper",
  "startNodeId": "greeting",
  "nodes": [
    {
      "id": "greeting",
      "speaker": "",
      "text": "Have we met before?",
      "choices": [
        {
          "id": "introduce",
          "text": "I am new here.",
          "nextNodeId": "welcome",
          "conditions": [{ "flag": "met-keeper", "equals": false }],
          "effects": [{ "flag": "met-keeper", "value": true }]
        },
        {
          "id": "return",
          "text": "Good to see you again.",
          "nextNodeId": null,
          "conditions": [{ "flag": "met-keeper", "equals": true }],
          "effects": []
        }
      ]
    },
    {
      "id": "welcome",
      "speaker": "",
      "text": "Welcome to our village.",
      "choices": []
    }
  ]
}
```

NPC definitions contain `id`, `name`, `description`, `dialogueId`, `glyph` and
`color`. Map placements contain `id`, `npcId`, `x`, and `y`. IDs are unique
alongside encounters and portals on the map. Only one marker may occupy a tile.
NPCs block movement and cannot occupy player spawns or portal arrival tiles.
Their own tiles must use walkable terrain.

Node IDs are unique within a dialogue; response IDs are unique within a node.
The start node and all next-node links must exist. Cycles and disconnected nodes
are allowed so authors can assemble a graph incrementally. Empty response lists
create end nodes. A conversation always has an exit, including when conditions
hide all responses.

Flags are a shared world dictionary of booleans with content-ID keys. All
conditions must match. Effects apply in listed order, so later writes to the
same flag win. Effects run only when a response is chosen, before transitioning
or ending. Closing without selecting a response applies no effects. Namespaced
keys such as `alderfell.keeper.met` help mods avoid flag collisions.

## Player interaction and saves

Stand orthogonally adjacent to an NPC and click it or its **Talk to…** button.
**E/Space** chooses the NPC directly ahead, falling back to the only adjacent NPC
if there is just one. With multiple adjacent NPCs, face the desired character or
select its talk button. Space on a focused button activates that button normally.
Remote and diagonal NPCs cannot be interacted with.

Conversations pause movement and cannot overlap combat or other conversations.
Responses follow branches. **Leave conversation**, **End conversation**, or
**Escape** restores exploration and keyboard focus. Flags persist across maps,
battles and other NPCs. World saves preserve flags and the active NPC/dialogue/node;
restarting the world resets them.

Mara stands beside Alderfell's starting trail; Elowen lives in the grove.
Accepting Mara's invitation changes later responses. Elowen's blessing unlocks
another response when you return to Mara. Accepting her invitation also starts
a quest; dialogue choices and encounters advance its objectives. Quest completion
can set flags for further branches. See [the quest guide](quests.md).

## Runtime and extensions

```ts
import { starterGame } from '@ancadeba/schemas'
import {
  BattleRuntime,
  WorldRuntime,
  DialogueRuntime,
} from '@ancadeba/game-runtime'

const battles = new BattleRuntime(starterGame)
const conversations = new DialogueRuntime(battles.content.dialogues)
const world = new WorldRuntime(
  battles,
  starterGame.startingMap,
  undefined,
  conversations,
)
let state = world.move(world.start(), 'east')
state = world.interact(state, 'mara-road')
state = world.chooseDialogue(state, 'ask-work')
state = world.chooseDialogue(state, 'accept')
state = world.restore(world.save(state))
state = world.endConversation(state)
```

`DialogueRuntime.start(id)` creates a dialogue/node session. `node(session)` and
`choices(session, flags)` provide rendering data. `choose(session, flags, id)`
returns new flags and a new session, or null. Invalid/hidden choices throw without
changing input data. Effects operate on a copy, so failures preserve input flags.

Inject `DialogueConditions.isAvailable(choice, flags)` and
`DialogueEffects.apply(effects, flags)` to customize policies. Defaults are
`FlagDialogueConditions` and `FlagDialogueEffects`. Inject that runtime into
`WorldRuntime` as its fourth argument using the same resolved definitions. Use
the same policies in the player and editor. Policies operate on boolean flags;
richer state/effects require matching schema and persistence extensions.

`WorldRuntime.nearbyNpcs` returns adjacent definitions and placements. `interact`,
`chooseDialogue` and `endConversation` return new states. There are no global
registries, singleton sessions, or platform services in these runtimes.

## Mods and validation

NPCs and dialogues follow existing dependency/load order. Later definitions
replace earlier ones by ID as whole objects, including full dialogue graphs;
nodes do not merge individually. References are checked after composition, so
a pack can add its NPC and dialogue together. Invalid links, duplicate IDs,
missing references, collision and placement errors fail import, preview and API
save validation.

Enable **Traveller tales** to override Mara's name, appearance, greeting and
responses. Its portable file is `sample-games/mods/traveller-tales.json`.
Mod exports and Project JSON author conversation data without running scripts.

World restoration validates NPC identity, map, proximity, node existence, flags
and interaction exclusivity. Content edits invalidate world saves. NPC-free
legacy snapshots restore with empty flags and no conversation when original
content is unchanged. Standalone battle saves ignore NPC/dialogue-only changes.

Unit and browser tests cover branches, flags, policy injection, failed effects,
proximity, collision, saves, legacy data, mod overrides, and complete authoring
and interaction workflows on desktop and mobile.
