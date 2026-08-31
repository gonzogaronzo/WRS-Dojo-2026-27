import { Lesson } from '../types';

export const lesson104: Lesson = {
  id: 'lesson-10-4-master',
  title: 'Step 10.4: Doubling Rule Part II (Multisyllabic)',
  step: '10',
  substep: '4',
  conceptNotes: 'Doubling Rule Part II: Double the final consonant of a multisyllabic word ONLY if:\n1. Final syllable is 1:1:1\n2. Final syllable is ACCENTED\n3. Vowel suffix is added\n\nSpecial Case: Words ending in -ic add "k" (panic -> panicking). Letter "x" never doubles.',
  conceptNotes7: 'Spelling Logic: Identify syllable stress first. Use a sticky-note accent symbol (´, *, ., or ✓) as a scaffold. Distinguish vowel vs consonant suffixes. Apply -ic rule for "picnic" and "panic".',
  cipherWords: ['|ad|mit<ted>', '|be|gin<ning>', '|pan|ic<king>', '|con|trol<ler>', '|pro|fit<ed>'],
  quickDrill: ['a', 'e', 'i', 'o', 'u', 'y', 'ai', 'ay', 'ee', 'ea', 'ey', 'oa', 'oe', 'igh', 'eigh', 'ar', 'or', 'er', 'ir', 'ur'],
  hfwList: ['beautiful', 'happened', 'everything', 'especially', 'probably', 'usually', 'finally', 'mountain', 'country'],
  wordCards: [
    { id: '104-r1', text: 'admitted', type: 'regular' },
    { id: '104-r2', text: 'beginning', type: 'regular' },
    { id: '104-r3', text: 'panicking', type: 'regular' },
    { id: '104-r4', text: 'controller', type: 'regular' },
    { id: '104-r5', text: 'regretted', type: 'regular' },
    { id: '104-r6', text: 'picnicked', type: 'regular' },
    { id: '104-r7', text: 'profited', type: 'regular' },
    { id: '104-r8', text: 'transmitted', type: 'regular' },
    { id: '104-r9', text: 'forgotten', type: 'regular' },
    { id: '104-r10', text: 'equipment', type: 'regular' }
  ],
  sentences: [
    'He admitted that panicking at the beginning was an error.',
    'They picnicked by the mountain and forgot the time.',
    'The controller transmitted the data to the ship.',
    'She regretted that everything happened so fast.',
    'Usually, we have profited from the early start.'
  ],
  dictation: {
    sounds: ['ă', 'ĕ', 'ĭ', 'ŏ', 'ŭ'],
    realWords: ['admitted', 'beginning', 'panicking', 'regretted', 'forgotten'],
    wordElements: ['ed', 'ing', 'er', 'en', 'ment'],
    nonsenseWords: ['remitting', 'befotted', 'distrolling'],
    phrases: ['beginning of time', 'picnicked at noon', 'transmitted signal'],
    sentences: [
      'He admitted that panicking was wrong.',
      'The controller forgot the equipment.',
      'We picnicked on the beautiful mountain.'
    ]
  },
  passage: "The Picnic Panic\n\nAt the beginning of the trip, everything seemed beautiful. The group had picnicked on a flat spot near the mountain. They had forgotten to check the weather, but nobody was panicking yet. \n\nSuddenly, the wind began to howl. One man admitted that they should have brought better equipment. He regretted not listening to the radio controller. They transmitted a signal to the base for help. Finally, they were profited by a break in the storm and were able to walk back to the country road. It was an event they would not soon forget.",
  affixPractice: [
    { id: '104-a1', text: 'ion', type: 'suffix', examples: 'transmission, admission, rebellion' },
    { id: '104-a2', text: 'ive', type: 'suffix', examples: 'active, massive, protective' },
    { id: '104-a3', text: 'able', type: 'suffix', examples: 'profitable, regrettable, predictable' },
    { id: '104-a4', text: 'ment', type: 'suffix', examples: 'equipment, shipment, commitment' }
  ],
  slides: [
    { id: '104-s1', type: 'text', title: 'Doubling Rule Part II', content: 'Double only if ALL conditions are true:\n1. Final syllable is 1:1:1\n2. Final syllable is ACCENTED\n3. Vowel suffix is added\n\nMissing any condition? -> DO NOT DOUBLE.' },
    { id: '104-s2', type: 'text', title: 'The Accent Scaffold', content: 'Teacher places a mark above the accented syllable:\nacute accent (´)\nstar (*)\ndot (.)\ncheck mark (✓)\n\nIdentify stress before deciding to double!' },
    { id: '104-s3', type: 'word', title: 'Multisyllabic Doubling', content: '|ad|mit´ + <ed> = |ad|mit t <ed>' },
    { id: '104-s4', type: 'word', title: 'No Accent = No Double', content: '|pro|fit + <ed> = |pro|fit <ed>' },
    { id: '104-s5', type: 'word', title: 'The -ic Rule', content: '|pan|ic + <ing> = |pan|ic k <ing>' },
    { id: '104-s6', type: 'word', title: 'Letter X Never Doubles', content: '|re|lax + <ed> = |re|lax <ed>' }
  ]
};