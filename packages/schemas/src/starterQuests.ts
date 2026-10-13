import { questSchema } from './quest.js'

export const starterQuests = questSchema.array().parse([
  {
    id: 'grove-pilgrimage',
    name: 'A kindness for the grove',
    description:
      'Mara asks you to visit Elowen. Clear a mossling encounter, receive the keeper’s message, and bring word back to the warden.',
    start: {
      type: 'dialogue-choice',
      dialogueId: 'road-warden',
      nodeId: 'offer',
      choiceId: 'accept',
      npcId: 'mara',
    },
    objectives: [
      {
        id: 'clear-mosslings',
        text: 'Win a moss grove encounter.',
        trigger: { type: 'encounter-victory', encounterId: 'moss-grove' },
      },
      {
        id: 'keeper-message',
        text: 'Promise Elowen to deliver her message.',
        trigger: {
          type: 'dialogue-choice',
          dialogueId: 'grove-keeper',
          nodeId: 'blessed',
          choiceId: 'promise',
          npcId: 'elowen',
        },
      },
      {
        id: 'return-news',
        text: 'Share the grove’s news with Mara and say goodbye.',
        trigger: {
          type: 'dialogue-choice',
          dialogueId: 'road-warden',
          nodeId: 'thanks',
          choiceId: 'finish',
          npcId: 'mara',
        },
      },
    ],
    completionEffects: [{ flag: 'grove-quest-complete', value: true }],
  },
  {
    id: 'grove-training',
    name: 'Guardians of the trail',
    description:
      'After helping the grove, practice against its mosslings. The encounter in the moss grove can be repeated.',
    requires: ['grove-pilgrimage'],
    objectives: [
      {
        id: 'practice',
        text: 'Win two more moss grove encounters.',
        target: 2,
        trigger: { type: 'encounter-victory', encounterId: 'moss-grove' },
      },
    ],
  },
])
