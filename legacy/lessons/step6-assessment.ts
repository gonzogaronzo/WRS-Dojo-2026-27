
import { Lesson } from '../types';

export const lesson6Assessment: Lesson = {
  id: 'lesson-6-assessment-master',
  title: 'Step 6 End-of-Step Assessment',
  step: '6',
  substep: 'Assessment',
  conceptNotes: 'Step 6 Assessment: Lesson Plan 1 (Reading & Concepts). 1. Step Concepts (Marking): One Suffix, Two Suffixes, Final Stable Syllable, Consonant-le Exceptions, -ed Suffix Sounds. 2. Phonetic Word Reading Accuracy and Automaticity. 3. Independent Silent Reading: "A Day at the Shore-Part One".',
  conceptNotes7: 'Step 6 Assessment: Lesson Plan 2 (Dictation). 1. Sounds (5). 2. Words (10). 3. Phrases (3). 4. Sentences (3). 5. Additional High Frequency Words (Pretest/Review). 6. Passage Fluency and Comprehension: "A Day at the Shore-Part Two".',
  quickDrill: ['a', 'e', 'i', 'o', 'u', 'sh', 'ch', 'th', 'wh', 'ck', 'ed', 'ing', 'est', 'able', 'less', 'ness', 'ment', 'ly', 'le'],
  hfwList: [
    'minute', 'minutes', 'answer', 'few', 'school', 'love', 'above',
    'earth', 'Earth', 'America', 'American', 'island', 'ocean', 'mountain',
    'eight', 'eighth', 'lose', 'loses', 'losing', 'large', 'follow', 'laugh', 'laughter',
    'double', 'trouble', 'triple', 'though', 'although', 'during', 'ready', 'already'
  ],
  wordCards: [
    { id: '6a-w1', text: 'strictest', type: 'regular' },
    { id: '6a-w2', text: 'respectable', type: 'regular' },
    { id: '6a-w3', text: 'relaxed', type: 'regular' },
    { id: '6a-w4', text: 'linked', type: 'regular' },
    { id: '6a-w5', text: 'endlessly', type: 'regular' },
    { id: '6a-w6', text: 'openings', type: 'regular' },
    { id: '6a-w7', text: 'establishment', type: 'regular' },
    { id: '6a-w8', text: 'mindfully', type: 'regular' },
    { id: '6a-w9', text: 'title', type: 'regular' },
    { id: '6a-w10', text: 'struggle', type: 'regular' }
  ],
  sentences: [
    'If you (lose) the (answers) for (school), you are asking for (double) (trouble).',
    'The new (mountain) bike handles were (already) helpful (during) the ride.',
    'To quickly get to the castle, (follow) the (large) path to the (ocean).'
  ],
  dictation: {
    sounds: ['/ĕ/', '/t/', '/d/', '/īnd/', '/z/'],
    realWords: ['strictest', 'respectable', 'relaxed', 'linked', 'endlessly', 'openings', 'establishment', 'mindfully', 'title', 'struggle'],
    wordElements: ['est', 'able', 'ed', 'ly', 'ness', 'ment', 'le'],
    nonsenseWords: ['clampled', 'stribble', 'glanted', 'frestly', 'blonked'],
    phrases: ['America ready in minutes', 'few islands on earth', 'although laughter is love'],
    sentences: [
      'If you lose the answers for school, you are asking for double trouble.',
      'The new mountain bike handles were already helpful during the ride.',
      'To quickly get to the castle, follow the large path to the ocean.'
    ]
  },
  affixPractice: [
    { id: '6a-a1', text: 'est', type: 'suffix', examples: 'strictest' },
    { id: '6a-a2', text: 'able', type: 'suffix', examples: 'respectable' },
    { id: '6a-a3', text: 'ed', type: 'suffix', examples: 'relaxed, linked' },
    { id: '6a-a4', text: 'ly', type: 'suffix', examples: 'endlessly, mindfully' },
    { id: '6a-a5', text: 'ment', type: 'suffix', examples: 'establishment' },
    { id: '6a-a6', text: 'le', type: 'suffix', examples: 'title, struggle' }
  ],
  passage: 'A Day at the Shore-Part One (Silent Reading)\n\n[Passage content for silent reading and retelling. Focus on Step 6 concepts: suffixes, consonant-le, and -ed sounds.]\n\nA Day at the Shore-Part Two (Oral Reading Fluency)\n\n[Passage content for oral reading fluency. Record WCPM and track errors. Focus on Step 6 concepts and High Frequency Words.]',
  slides: [
    { id: '6a-s1', type: 'text', title: 'Step 6 Assessment', content: 'This assessment evaluates Step 6 concepts:\n- Vowel/Consonant Suffixes\n- Three sounds of -ed\n- Combining two suffixes\n- Final Stable Syllable (consonant-le)\n- stle exception' },
    { id: '6a-s2', type: 'text', title: 'Marking Concepts', content: '1. One Suffix\n2. Two Suffixes\n3. Final Stable Syllable\n4. Consonant-le Exceptions\n5. -ed Suffix Sounds' },
    { id: '6a-s3', type: 'text', title: 'Wordlist Reading', content: 'Accuracy and Automaticity check (50 seconds).' }
  ]
};
