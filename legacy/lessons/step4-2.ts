
import { Lesson } from '../types';

export const lesson42: Lesson = {
  id: 'lesson-4-2-master',
  title: 'Step 4.2: Vowel-Consonant-E (v-e)',
  step: '4',
  substep: '2',
  conceptNotes: 'Instructional Focus: Final silent "e" changes the vowel sound from short to long. Contrast Closed (hop) vs v-e (hope). Teaching Point: The "e" is a silent helper that tells the first vowel to say its name. Marking: Scoop the syllable, label "v-e", cross out the silent "e", and place a macron over the long vowel.',
  conceptNotes7: 'Spelling Focus: Dictate v-e words. Ask: "Is the vowel long or short?" If long, add the silent "e" at the end. Note: No new sounds, but emphasize naming the letters after tapping (the "e" is never tapped).',
  cipherWords: ['h o p /e/', 'k i t /e/', 'c a p /e/', 'c u t /e/', 't u b /e/'],
  quickDrill: ['a', 'e', 'i', 'o', 'u', 'sh', 'ch', 'th', 'wh', 'ck', 'all', 'am', 'an', 'ang', 'ing', 'ild', 'ind', 'old', 'olt', 'ost'],
  hfwList: ['have', 'give', 'live', 'some', 'come', 'done', 'none', 'move', 'one', 'once'],
  wordCards: [
    { id: '42-r1', text: 'hope', type: 'regular' },
    { id: '42-r2', text: 'kite', type: 'regular' },
    { id: '42-r3', text: 'cape', type: 'regular' },
    { id: '42-r4', text: 'cute', type: 'regular' },
    { id: '42-r5', text: 'tube', type: 'regular' },
    { id: '42-r6', text: 'base', type: 'regular' },
    { id: '42-r7', text: 'bike', type: 'regular' },
    { id: '42-r8', text: 'home', type: 'regular' },
    { id: '42-r9', text: 'mile', type: 'regular' },
    { id: '42-r10', text: 'lake', type: 'regular' },
    { id: '42-n1', text: 'bime', type: 'nonsense' },
    { id: '42-n2', text: 'kote', type: 'nonsense' },
    { id: '42-n3', text: 'vade', type: 'nonsense' }
  ],
  wordListReading: ['hope', 'kite', 'cape', 'cute', 'tube', 'base', 'bike', 'home', 'mile', 'lake', 'ride', 'smile', 'note', 'safe', 'tame'],
  wordListReadingAuto: false,
  sentences: [
    'The cute mule ran home to the lake.',
    'I hope you can ride the bike to the base.',
    'She gave the kite to the child.',
    'Did you see the big wave at the lake?',
    'He will note the time on the white page.',
    'The tame snake was safe in the cage.',
    'I will take a mile walk by the home.',
    'Please smile for the host at the gate.'
  ],
  dictation: {
    sounds: ['ā', 'ē', 'ī', 'ō', 'ū'],
    realWords: ['hope', 'kite', 'save', 'tube', 'mile'],
    wordElements: ['v-e', 'silent e'],
    nonsenseWords: ['pime', 'fote', 'vade', 'kute'],
    phrases: ['cute mule', 'ride the bike', 'at the base', 'safe home'],
    sentences: [
      'The cute mule ran home.',
      'He can ride the bike to the base.',
      'I hope the kite is safe at the lake.'
    ]
  },
  affixPractice: [],
  passage: 'The Bike Ride\n\nIt was a fine day to ride a bike. Mike and Jake went to the base of the hill. They had to be safe on the ride. Mike had a red cape on his back. Jake had a big kite. They went a mile to the lake. The lake was a fine place to rest. They sat on a white bench. Mike gave Jake some of his cake. They had a fine time in the sun. Then they went home before the sun went down.',
  slides: [
    { id: '42-s1', type: 'text', title: 'The v-e Syllable', content: 'In a v-e syllable:\n1. There is one vowel.\n2. There is one consonant after it.\n3. There is a silent "e" at the end.\n\nThe "e" makes the first vowel say its NAME (Long Sound).' },
    { id: '42-s2', type: 'word', title: 'Contrast: Rule vs Exception', content: 'h o p' },
    { id: '42-s3', type: 'word', title: 'The Magic Helper', content: 'h o p /e/' },
    { id: '42-s4', type: 'word', title: 'Marking the v-e', content: '|h[ō]p/e/|' },
    { id: '42-s5', type: 'text', title: 'Tapping v-e', content: '/h/ (1 tap)\n/o/ (1 tap - say name!)\n/p/ (1 tap)\n(e is silent - do NOT tap!)' },
    { id: '42-s6', type: 'word', title: 'Target Word', content: 'b i k e' }
  ]
};
