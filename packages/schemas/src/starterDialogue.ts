import { dialogueSchema, npcSchema } from './dialogue.js'

export const starterNpcs = npcSchema.array().parse([
  {
    id: 'mara',
    name: 'Mara',
    description: 'A road warden who knows the wildwood.',
    dialogueId: 'road-warden',
    glyph: '♙',
    color: '#e6bd84',
  },
  {
    id: 'elowen',
    name: 'Elowen',
    description: 'The keeper of the moss grove.',
    dialogueId: 'grove-keeper',
    glyph: '♙',
    color: '#a7d1b0',
  },
])

export const starterDialogues = dialogueSchema.array().parse([
  {
    id: 'road-warden',
    name: 'The road warden',
    startNodeId: 'welcome',
    nodes: [
      {
        id: 'welcome',
        text: 'The forest remembers every traveller. What brings you to Alderfell?',
        choices: [
          {
            id: 'ask-road',
            text: 'Tell me about the road.',
            nextNodeId: 'road',
          },
          {
            id: 'ask-work',
            text: 'Can I help?',
            nextNodeId: 'offer',
            conditions: [{ flag: 'meet-keeper', equals: false }],
          },
          {
            id: 'share-news',
            text: 'I have spoken with the grove keeper.',
            nextNodeId: 'thanks',
            conditions: [{ flag: 'grove-blessing', equals: true }],
          },
          { id: 'leave', text: 'Farewell.' },
        ],
      },
      {
        id: 'road',
        text: 'Mosslings gather on marked trails. The glowing gate leads to the moss grove. Speak to Elowen when you arrive.',
        choices: [
          {
            id: 'understood',
            text: 'Thank you for the advice.',
            nextNodeId: 'welcome',
            effects: [{ flag: 'road-advice', value: true }],
          },
          { id: 'leave', text: 'I should get going.' },
        ],
      },
      {
        id: 'offer',
        text: 'Visit Elowen in the moss grove, clear a mossling encounter, and bring me her news. A kind word can open more paths than a sword.',
        choices: [
          {
            id: 'accept',
            text: 'I will visit the grove.',
            nextNodeId: 'accepted',
            effects: [{ flag: 'meet-keeper', value: true }],
          },
          {
            id: 'decline',
            text: 'Perhaps another time.',
            nextNodeId: 'welcome',
          },
        ],
      },
      {
        id: 'accepted',
        text: 'Then go with care. I will be here when you return.',
      },
      {
        id: 'thanks',
        text: 'The grove welcomes you. Alderfell is brighter for your kindness.',
        choices: [
          {
            id: 'finish',
            text: 'Until next time.',
            effects: [{ flag: 'warden-thanks', value: true }],
          },
        ],
      },
    ],
  },
  {
    id: 'grove-keeper',
    name: 'A blessing in the grove',
    startNodeId: 'hello',
    nodes: [
      {
        id: 'hello',
        text: 'Welcome, traveller. The grove is quiet today.',
        choices: [
          {
            id: 'blessing',
            text: 'May I receive the grove’s blessing?',
            nextNodeId: 'blessed',
            conditions: [{ flag: 'grove-blessing', equals: false }],
            effects: [{ flag: 'grove-blessing', value: true }],
          },
          {
            id: 'return',
            text: 'It is good to see you again.',
            nextNodeId: 'blessed',
            conditions: [{ flag: 'grove-blessing', equals: true }],
          },
          { id: 'leave', text: 'Farewell.' },
        ],
      },
      {
        id: 'blessed',
        text: 'Carry the peace of this place with you. Tell Mara that the old paths are still watched over.',
        choices: [{ id: 'promise', text: 'I will bring Mara your news.' }],
      },
    ],
  },
])
