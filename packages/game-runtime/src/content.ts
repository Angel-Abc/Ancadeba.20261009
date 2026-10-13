import {
  gameSchema,
  type ContentPack,
  type Game,
  type Mod,
} from '@ancadeba/schemas'
import { validateWorldContent } from './worldContent.js'
import { validateDialogueContent } from './dialogueContent.js'
import { validateQuestContent } from './questContent.js'

function assertUnique(pack: ContentPack, label: string) {
  for (const key of [
    'actors',
    'abilities',
    'encounters',
    'terrains',
    'maps',
    'npcs',
    'dialogues',
    'quests',
  ] as const) {
    const ids = pack[key].map((entry) => entry.id)
    if (new Set(ids).size !== ids.length)
      throw new Error(`Duplicate ${key} IDs in ${label}`)
  }
}

function mergeEntries<T extends { id: string }>(collections: T[][]): T[] {
  const merged = new Map<string, T>()
  for (const entries of collections)
    for (const entry of entries) merged.set(entry.id, entry)
  return [...merged.values()]
}

/** Dependencies load first. Later packs replace entries with matching IDs. */
export function resolveContent(input: Game): ContentPack {
  const game = gameSchema.parse(input)
  assertUnique(game, 'base game')
  const mods = new Map<string, Mod>()
  for (const mod of game.mods) {
    if (mods.has(mod.id)) throw new Error(`Duplicate mod ID: ${mod.id}`)
    assertUnique(mod, mod.name)
    mods.set(mod.id, mod)
  }
  const visiting = new Set<string>()
  const loaded = new Set<string>()
  const packs: ContentPack[] = [game]
  function visit(mod: Mod) {
    if (loaded.has(mod.id)) return
    if (visiting.has(mod.id))
      throw new Error(`Mod dependency cycle at ${mod.id}`)
    visiting.add(mod.id)
    for (const id of mod.requires) {
      const dependency = mods.get(id)
      if (!dependency?.enabled)
        throw new Error(`${mod.name} requires enabled mod ${id}`)
      visit(dependency)
    }
    visiting.delete(mod.id)
    loaded.add(mod.id)
    packs.push(mod)
  }
  for (const mod of game.mods) if (mod.enabled) visit(mod)
  const content: ContentPack = {
    actors: mergeEntries(packs.map((pack) => pack.actors)),
    abilities: mergeEntries(packs.map((pack) => pack.abilities)),
    encounters: mergeEntries(packs.map((pack) => pack.encounters)),
    terrains: mergeEntries(packs.map((pack) => pack.terrains)),
    maps: mergeEntries(packs.map((pack) => pack.maps)),
    npcs: mergeEntries(packs.map((pack) => pack.npcs)),
    dialogues: mergeEntries(packs.map((pack) => pack.dialogues)),
    quests: mergeEntries(packs.map((pack) => pack.quests)),
  }
  const abilities = new Set(content.abilities.map((entry) => entry.id))
  const actors = new Set(content.actors.map((entry) => entry.id))
  for (const actor of content.actors) {
    for (const id of actor.abilities)
      if (!abilities.has(id))
        throw new Error(`${actor.name} references missing ability ${id}`)
  }
  for (const encounter of content.encounters) {
    for (const id of [...encounter.party, ...encounter.enemies])
      if (!actors.has(id))
        throw new Error(`${encounter.name} references missing actor ${id}`)
  }
  if (!content.encounters.some((entry) => entry.id === game.startingEncounter))
    throw new Error(`Missing starting encounter ${game.startingEncounter}`)
  validateDialogueContent(content)
  validateWorldContent(game, content)
  validateQuestContent(content)
  return content
}
