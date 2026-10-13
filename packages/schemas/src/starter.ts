import { gameSchema } from './game.js'
import { starterMaps, starterTerrains } from './starterWorld.js'
import { starterDialogues, starterNpcs } from './starterDialogue.js'
import { starterQuests } from './starterQuests.js'

export const starterGame = gameSchema.parse({
  formatVersion: 1,
  startingEncounter: 'forest-road',
  startingMap: 'alderfell',
  terrains: starterTerrains,
  maps: starterMaps,
  npcs: starterNpcs,
  dialogues: starterDialogues,
  quests: starterQuests,
  abilities: [
    {
      id: 'strike',
      name: 'Strike',
      description: 'A reliable physical attack.',
      target: 'enemy',
      cost: 0,
      effects: [{ type: 'damage', power: 8 }],
    },
    {
      id: 'ember',
      name: 'Ember',
      description: 'A focused burst of fire.',
      target: 'enemy',
      cost: 6,
      effects: [{ type: 'damage', power: 25 }],
    },
    {
      id: 'mend',
      name: 'Mend',
      description: 'Restore an ally’s health.',
      target: 'ally',
      cost: 5,
      effects: [{ type: 'heal', power: 30 }],
    },
    {
      id: 'guard',
      name: 'Guard',
      description: 'Halve incoming damage until your next turn.',
      target: 'self',
      cost: 0,
      effects: [{ type: 'guard', power: 0 }],
    },
    {
      id: 'venom',
      name: 'Venom',
      description: 'Poison an enemy for three turns.',
      target: 'enemy',
      cost: 4,
      effects: [{ type: 'poison', power: 7, duration: 3 }],
    },
  ],
  actors: [
    {
      id: 'rowan',
      name: 'Rowan',
      role: 'Vanguard',
      maxHp: 110,
      maxMp: 12,
      attack: 18,
      defense: 10,
      speed: 14,
      abilities: ['strike', 'guard'],
    },
    {
      id: 'lyra',
      name: 'Lyra',
      role: 'Arcanist',
      maxHp: 75,
      maxMp: 30,
      attack: 10,
      defense: 5,
      speed: 12,
      abilities: ['ember', 'mend', 'strike', 'guard'],
    },
    {
      id: 'mossling',
      name: 'Mossling',
      role: 'Forest creature',
      maxHp: 60,
      maxMp: 12,
      attack: 12,
      defense: 4,
      speed: 9,
      abilities: ['strike', 'venom'],
    },
    {
      id: 'thorn-wolf',
      name: 'Thorn Wolf',
      role: 'Wild beast',
      maxHp: 85,
      maxMp: 0,
      attack: 16,
      defense: 6,
      speed: 16,
      abilities: ['strike', 'guard'],
    },
  ],
  encounters: [
    {
      id: 'forest-road',
      name: 'The forest road',
      description:
        'Beneath the old canopy, something stirs. Protect the road to Alderfell.',
      party: ['rowan', 'lyra'],
      enemies: ['mossling', 'thorn-wolf'],
    },
    {
      id: 'moss-grove',
      name: 'The moss grove',
      description: 'A small encounter for trying new skills.',
      party: ['rowan', 'lyra'],
      enemies: ['mossling'],
    },
  ],
  mods: [
    {
      id: 'hard-mode',
      name: 'Wildwood awakened',
      version: '1.0.0',
      description:
        'A sample content override: stronger mosslings. Enable it to try mod composition.',
      enabled: false,
      actors: [
        {
          id: 'mossling',
          name: 'Ancient Mossling',
          role: 'Forest guardian',
          maxHp: 120,
          maxMp: 20,
          attack: 20,
          defense: 8,
          speed: 13,
          abilities: ['strike', 'venom'],
        },
      ],
    },
    {
      id: 'open-river',
      name: 'River crossing',
      version: '1.0.0',
      description: 'A terrain-only mod that makes river tiles walkable.',
      enabled: false,
      terrains: [
        {
          id: 'water',
          name: 'Shallow river',
          color: '#467d97',
          glyph: '≈',
          walkable: true,
        },
      ],
    },
    {
      id: 'traveller-tales',
      name: 'Traveller tales',
      version: '1.0.0',
      description:
        'An NPC and dialogue override that adds a traveller’s story to Mara’s conversation.',
      enabled: false,
      npcs: [
        { ...starterNpcs[0]!, name: 'Mara, storyteller', color: '#d4b1ee' },
      ],
      dialogues: [
        {
          ...starterDialogues[0]!,
          nodes: starterDialogues[0]!.nodes
            .map((node) =>
              node.id === 'welcome'
                ? {
                    ...node,
                    text: 'Every traveller carries a story. Shall we share one?',
                    choices: [
                      ...node.choices,
                      {
                        id: 'story',
                        text: 'Tell me a traveller’s story.',
                        nextNodeId: 'traveller-story',
                        conditions: [],
                        effects: [],
                      },
                    ],
                  }
                : node,
            )
            .concat([
              {
                id: 'traveller-story',
                speaker: '',
                text: 'A wanderer once crossed the river by listening to the stones. Some paths begin with a question.',
                choices: [],
              },
            ]),
        },
      ],
    },
  ],
})

export const starterProject = {
  id: 'basic-game',
  name: 'Basic Game',
  game: starterGame,
}
