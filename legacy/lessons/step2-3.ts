
import { Lesson } from '../types';

export const lesson23: Lesson = {
  id: 'lesson-2-3-master',
  title: 'Step 2.3: Closed Syllable Exceptions',
  step: '2',
  substep: '3',
  conceptNotes: 'Intro: ild, ind, old, olt, ost. These are "Exceptions" because the vowel is LONG even though the syllable is CLOSED. Tapping: /c/ (1 tap) + /old/ (1 tap, 3 fingers welded). Avoid nonsense words today.',
  conceptNotes7: 'Spelling Logic: Use Green Welded tiles for the exceptions. Contrast "post" (exception) with "lost" (closed syllable rule). Marking: Scoop, C with an X through it, Macron (-) over the vowel.',
  cipherWords: ['c/old/', 'w/ild/', 'f/ind/', 'b/olt/', 'm/ost/'],
  quickDrill: ['a', 'e', 'i', 'o', 'u', 'sh', 'ch', 'th', 'wh', 'ck', 'all', 'am', 'an', 'ang', 'ing', 'ild', 'ind', 'old', 'olt', 'ost'],
  hfwList: ['could', 'should', 'would', 'about', 'done', 'goes', 'write', 'always', 'once', 'drink'],
  wordCards: [
    { id: '23-r1', text: 'wild', type: 'regular' },
    { id: '23-r2', text: 'find', type: 'regular' },
    { id: '23-r3', text: 'cold', type: 'regular' },
    { id: '23-r4', text: 'colt', type: 'regular' },
    { id: '23-r5', text: 'post', type: 'regular' },
    { id: '23-r6', text: 'mild', type: 'regular' },
    { id: '23-r7', text: 'bind', type: 'regular' },
    { id: '23-r8', text: 'told', type: 'regular' },
    { id: '23-r9', text: 'jolt', type: 'regular' },
    { id: '23-r10', text: 'most', type: 'regular' },
    { id: '23-r11', text: 'grind', type: 'regular' },
    { id: '23-r12', text: 'scold', type: 'regular' }
  ],
  wordListReading: ['wild', 'find', 'cold', 'colt', 'post', 'mild', 'kind', 'sold', 'bolt', 'host', 'child', 'mind', 'gold', 'jolt', 'most'],
  wordListReadingAuto: false,
  sentences: [
    'You will find the wild, cold colt on the post.',
    'The child was kind to the old man.',
    'Most of the gold was sold for a jolt of cash.',
    'Do not scold the child for the mild spill.',
    'He will bind the post with a strong bolt.',
    'Will you find the path in the wild woods?',
    'The cold wind made the old host shiver.',
    'The colt ran fast past the post.'
  ],
  dictation: {
    sounds: ['ild', 'ind', 'old', 'olt', 'ost'],
    realWords: ['cold', 'find', 'wild', 'bolt', 'most'],
    wordElements: ['ild', 'ind', 'old'],
    nonsenseWords: [],
    phrases: ['cold colt', 'wild child', 'find the gold'],
    sentences: [
      'You will find the wild, cold colt on the post.',
      'The kind child sold the old host some gold.',
      'Most of the gold was kept in the post.'
    ]
  },
  affixPractice: [],
  passage: 'The Wild Colt\n\nYou will find the wild, cold colt on the post. It was a cold day when the child found the colt. The colt was mild and kind. Most of the men told the child to leave the colt in the wild. But the child was bold. He told the old host that he would find a home for the colt. The host sold the child a bolt to fix the gate. Now the colt is not in the wild. It is safe by the post.',
  slides: [
    { id: '23-s1', type: 'text', title: 'The Exceptions', content: 'Closed Syllables usually have SHORT vowels.\n\nEXCEPTIONS have LONG vowels:\nild (wild)\nind (find)\nold (cold)\nolt (colt)\nost (post)' },
    { id: '23-s2', type: 'word', title: 'Welded Tapping', content: '/c/ + /old/' },
    { id: '23-s3', type: 'word', title: 'Marking the Exception', content: '{t}[ō]/ld/' },
    { id: '23-s4', type: 'word', title: 'Contrast: Rule vs Exception', content: 'l o s t' },
    { id: '23-s5', type: 'word', title: 'Contrast: Rule vs Exception', content: 'p /ost/' },
    { id: '23-s6', type: 'text', title: 'Mastery Sentence', content: 'You will find the wild, cold colt on the post.' }
  ]
};
