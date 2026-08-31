import { Lesson } from '../types';

export const lesson103: Lesson = {
  id: 'lesson-10-3-master',
  title: 'Step 10.3: Doubling Rule Part I (1-1-1)',
  step: '10',
  substep: '3',
  conceptNotes: 'Doubling Rule Part I: When a base word has 1 syllable, 1 vowel, and 1 consonant at the end (1-1-1), double the final consonant before adding a VOWEL suffix. Do not double for consonant suffixes.',
  conceptNotes7: 'Spelling Focus: Identify 1-1-1 words. Check the suffix (vowel vs consonant). Practice: ship -> shipping, ship -> shipment. Decision process over memorization.',
  cipherWords: ['s h i p /p/ <ing>', 'h o t <est>', 'f i t <ed>', 's l i m <er>', 'm a d <ly>'],
  quickDrill: ['a', 'e', 'i', 'o', 'u', 'sh', 'ch', 'th', 'wh', 'ck', 'all', 'am', 'an', 'ang', 'ing', 'ild', 'ind', 'old', 'ost', 'olt'],
  hfwList: ['could', 'should', 'would', 'always', 'once', 'done', 'goes', 'write', 'about', 'friend'],
  wordCards: [
    { id: '103-r1', text: 'shipping', type: 'regular' },
    { id: '103-r2', text: 'hottest', type: 'regular' },
    { id: '103-r3', text: 'fitted', type: 'regular' },
    { id: '103-r4', text: 'slimmer', type: 'regular' },
    { id: '103-r5', text: 'madly', type: 'regular' },
    { id: '103-r6', text: 'sadness', type: 'regular' },
    { id: '103-r7', text: 'running', type: 'regular' },
    { id: '103-r8', text: 'stopped', type: 'regular' },
    { id: '103-r9', text: 'bigger', type: 'regular' },
    { id: '103-r10', text: 'flatness', type: 'regular' }
  ],
  sentences: [
    'The shipping boat was the hottest place on the lake.',
    'He stopped running when he felt the flatness of the path.',
    'The bigger dog was fitted with a red collar.',
    'She was slimmer after a long summer of swimming.',
    'The sadness of the child made the host scold the dog.'
  ],
  dictation: {
    sounds: ['ă', 'ĕ', 'ĭ', 'ŏ', 'ŭ'],
    realWords: ['shipping', 'hottest', 'stopped', 'running', 'bigger'],
    wordElements: ['ing', 'est', 'ed', 'er', 'ness'],
    nonsenseWords: ['zapping', 'glotted', 'brimmer'],
    phrases: ['shipping boat', 'running fast', 'hottest day'],
    sentences: [
      'The bigger dog stopped running.',
      'He was fitted with a new coat.',
      'Shipping the gold was a bold plan.'
    ]
  },
  passage: "The Shipping Trip\n\nIt was the hottest day of the year. Sam was running to the dock to see the big shipping boat. He had stopped at the shop to get a cold drink. The boat was the biggest one he had ever seen. \n\nHe watched as the men fitted a thick rope to the post. The boat was getting closer to the dock. One man had a slim grin as he waved to Sam. Sam felt a bit of sadness when the boat had to leave. He madly waved his hat as the ship went out to the deep blue lake.",
  affixPractice: [
    { id: '103-a1', text: 'ing', type: 'suffix', examples: 'shipping, running, hitting' },
    { id: '103-a2', text: 'ed', type: 'suffix', examples: 'fitted, stopped, hopped' },
    { id: '103-a3', text: 'ness', type: 'suffix', examples: 'madness, sadness, flatness' },
    { id: '103-a4', text: 'ly', type: 'suffix', examples: 'madly, sadly, flatly' }
  ],
  slides: [
    { id: '103-s1', type: 'text', title: 'The 1-1-1 Rule', content: 'Base word must have:\n1. ONE syllable\n2. ONE vowel\n3. ONE consonant at the end\n\nIf it is 1-1-1, DOUBLE the last letter before a VOWEL suffix.' },
    { id: '103-s2', type: 'word', title: 'Vowel Suffix (Double)', content: 's h i p + <ing> = s h i p p <ing>' },
    { id: '103-s3', type: 'word', title: 'Consonant Suffix (No Double)', content: 's h i p + <ment> = s h i p <ment>' },
    { id: '103-s4', type: 'word', title: 'Target Word', content: 's t o p p <ed>' }
  ]
};