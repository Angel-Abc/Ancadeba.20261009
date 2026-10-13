# Quests and the journal

Quests are portable content definitions. `QuestRuntime` handles activation,
prerequisites, objective counts and completion independently of maps, combat,
dialogue execution, React and storage. `WorldRuntime` supplies validated player
events and includes progress in world saves. The same journal runs in the engine
and editor world preview.

## Authoring and playing

Open **Quests** to create a quest, write its description and objectives, choose
required counts, and select event references. Each objective listens for either
an NPC dialogue choice or an encounter victory. Dialogue references include the
dialogue, node and choice; an optional NPC restricts attribution to that character.
Encounter objectives match the encounter definition across all map placements.

Choose how a quest starts:

- **Accept from journal**: the player accepts an available quest in the journal.
- **NPC dialogue choice**: selecting the configured response accepts it.
- **Automatically when available**: it begins at world start or when its
  prerequisites finish.

Required quests must be completed before activation. Cycles and missing
prerequisites are rejected. Ordered quests track only the first incomplete
objective; one event cannot advance multiple ordered stages. Unordered quests
can track several matching objectives from the same event. Counts are capped
at their targets. Completed quests remain in the journal and cannot restart.

Completion effects set boolean world flags once. Use those flags in dialogue
conditions to unlock responses or acknowledge the player's work. Later writes
to the same flag win; use namespaced flags for independent mod stories.

Use **Playtest quests** to explore the starting map with the composed draft.
Authoring supports undo/redo, project saves, import/export and mod overrides.
The journal shows active objectives, available quests and completed stories.
Unavailable prerequisite quests stay hidden until unlocked.

In the starter, stand beside Mara, choose **Can I help?**, then **I will visit
the grove.** Win a moss grove encounter, promise Elowen to bring Mara her news,
and share the news with Mara. These three objectives can be completed in any
order after acceptance. Completion unlocks **Guardians of the trail**, accepted
from the journal, which requires two further victories. The grove's repeatable
encounter makes it possible even after one-time encounters have been cleared.

## Definition format

Game and mod packs add a `quests` collection, defaulting to `[]` for older files.
Quest IDs are unique within each pack. Objective IDs are unique within a quest.
This example uses the starter's dialogue and encounter definitions:

```json
{
  "id": "road-duty",
  "name": "Keep the road safe",
  "description": "Mara needs a helping hand.",
  "autoStart": false,
  "start": {
    "type": "dialogue-choice",
    "dialogueId": "road-warden",
    "nodeId": "offer",
    "choiceId": "accept",
    "npcId": "mara"
  },
  "requires": [],
  "ordered": false,
  "objectives": [
    {
      "id": "mosslings",
      "text": "Win two moss grove encounters.",
      "target": 2,
      "trigger": { "type": "encounter-victory", "encounterId": "moss-grove" }
    }
  ],
  "completionEffects": [{ "flag": "road-duty.complete", "value": true }]
}
```

`start: null` and `autoStart: false` selects journal acceptance. A quest cannot
have both a dialogue start and automatic activation. Objective targets default
to 1 and range from 1 to 9999. Quests require at least one objective.

## Event and persistence rules

Only available dialogue responses produce events. The event uses the original
node and selected choice, including responses that end a conversation. Closing
a conversation without choosing produces no event. Standalone dialogue previews
only execute dialogue; use world preview to test quests.

A world victory is credited when **Return to map** consumes the finished battle.
Saving at the victory screen and restoring it preserves that pending credit.
Returning removes the active encounter, so returning twice cannot credit it
again. Defeats, battle restarts and the battle sandbox produce no quest progress.
Repeatable encounters provide one event per completed victory. Dialogue loops
can likewise provide repeated choice events for objectives with larger targets.

Objectives count events after activation; previous conversations and victories
are not backfilled. The acceptance event can advance an objective configured
for that same response. Automatic quests unlocked by completion start at zero
and do not reuse the event that unlocked them. Authors should keep one-time
events reachable after acceptance, or provide repeatable alternatives.

**Save world** persists each started quest's status and objective counts alongside
flags, position, active conversations and battles. **Load world** restores this
snapshot, including after a page reload. Saving is explicit; **Restart world**
resets current progress. Storage is injected by the application, so another
host can store the same JSON in a file or database.

Restore rejects unknown/duplicate quests, missing or reordered objectives,
negative/fractional/excessive counts, inconsistent completion, out-of-order
progress, and incomplete prerequisites. World fingerprints include composed
quest definitions; content changes require starting a new world. Quest-free
legacy saves default to empty progress when their content is unchanged.
Standalone battle saves remain compatible with quest-only changes.

## Runtime and extension points

```ts
import {
  BattleRuntime,
  QuestRuntime,
  WorldRuntime,
} from '@ancadeba/game-runtime'
import { starterGame } from '@ancadeba/schemas'

const battles = new BattleRuntime(starterGame)
const quests = new QuestRuntime(battles.content.quests)
const world = new WorldRuntime(
  battles,
  starterGame.startingMap,
  undefined,
  undefined,
  quests,
)
let state = world.start()
// Journal acceptance is available only for quests without a dialogue start.
// Dialogue acceptance and encounter events are dispatched by world methods.
state = world.restore(world.save(state))
const available = quests.available(state.quests)
```

`QuestRuntime.start()` creates automatic initial progress. `available(progress)`
lists eligible definitions. `accept(progress, id)` accepts a journal quest.
`consume(progress, flags, event)` returns new progress and flags.
`restore(input)` validates serialized progress. `WorldRuntime.acceptQuest`
provides journal acceptance while enforcing interaction exclusivity.

Inject a `QuestEventMatcher` into `QuestRuntime` to customize attribution using
the existing trigger schema. Encounter events include `mapId` and `triggerId`
for host policies; dialogue events include `npcId`, `dialogueId`, `nodeId` and
`choiceId`. Use the same runtime policies in the player and editor. Additional
event kinds require matching schema, validation, authoring and save extensions.
There are no global registries or singleton progress objects.

Mods compose quests using the same dependency order and whole-entry replacement
rules as other content. References are checked after composition, so a mod can
add quests with its own NPCs, dialogues and encounters. If a mod removes a
referenced choice, it must also replace the affected quest. Import
`sample-games/mods/grove-challenge.json` for a quest-only override of the training
objective. Data packs do not execute scripts.
