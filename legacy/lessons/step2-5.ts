
import { Lesson } from '../types';

export const lesson25: Lesson = {
  id: 'lesson-2-5-master',
  title: 'Step 2.5: Three-Letter Blends & Latin Bases',
  step: '2',
  substep: '5',
  conceptNotes: 'Instructional Focus: Three-letter blends (str, spr, spl, scr) and blending up to six sounds in a closed syllable. Introduction of Latin bases ending in "ct" (e.g., -duct-, -spect-). Target: Tapping all 5-6 sounds separately. Spelling /k/ in 3-letter blends with "c" (e.g., scrap).',
  conceptNotes7: 'Spelling Focus: Dictate words like "strap" and "scrap". Ensure 5-6 separate taps. Remind students that /k/ in a 3-letter blend is spelled with "c". For Latin bases like "lect", the /kt/ sound at the end is always "ct".',
  cipherWords: ['s t r a p', 's c r a p', 's p l i t', 's t r u c t'],
  quickDrill: ['a', 'e', 'i', 'o', 'u', 'sh', 'ch', 'th', 'wh', 'ck', 'all', 'am', 'an', 'ang', 'ing', 'ong', 'ung', 'ank', 'ink', 'onk', 'unk'],
  hfwList: ['too', 'two', 'no', 'go', 'so', 'also', 'very', 'every', 'everywhere', 'everyone', 'everything', 'each', 'work', 'word', 'world'],
  wordCards: [
    { id: '25-r1', text: 'strong', type: 'regular' },
    { id: '25-r2', text: 'splash', type: 'regular' },
    { id: '25-r3', text: 'sprint', type: 'regular' },
    { id: '25-r4', text: 'scrap', type: 'regular' },
    { id: '25-r5', text: 'struck', type: 'regular' },
    { id: '25-r6', text: 'split', type: 'regular' },
    { id: '25-r7', text: 'prompt', type: 'regular' },
    { id: '25-r8', text: 'stress', type: 'regular' },
    { id: '25-r9', text: 'spring', type: 'regular' },
    { id: '25-r10', text: 'scrub', type: 'regular' },
    { id: '25-n1', text: 'scrid', type: 'nonsense' },
    { id: '25-n2', text: 'strang', type: 'nonsense' },
    { id: '25-n3', text: 'sprab', type: 'nonsense' },
    { id: '25-n4', text: 'stren', type: 'nonsense' },
    { id: '25-l1', text: 'struct', type: 'regular' },
    { id: '25-l2', text: 'dict', type: 'regular' },
    { id: '25-l3', text: 'lect', type: 'regular' }
  ],
  wordListReading: [
    'strong', 'splash', 'sprint', 'scrap', 'struck', 'splat', 'strung', 'twelfth', 'split', 'prompt', 
    'stress', 'spring', 'strip', 'sprung', 'scrub', 'strap', 'strict', 'midst', 'sprang', 'scrod', 
    'strum', 'tempt', 'strand', 'sprig', 'strep', 'scram', 'splint', 'strut', 'scruff', 'scrip', 
    'scrag', 'sprat', 'scrim', 'sprit', 'script', 'sculpt', 'scrunch', 'strath', 'strop', 'scrimp', 
    'scrum', 'spritz', 'pact', 'sect', 'duct', 'fect', 'struct', 'ject', 'dict', 'flect', 'lect', 
    'tract', 'tact', 'flict', 'vict', 'spect', 'rect'
  ],
  wordListReadingAuto: false,
  sentences: [
    'Do not scrub if there is no mud.',
    'A bell will go on each string for the cats.',
    'If everyone jumps in the pond, the splash will be very big!',
    'Each spring I get some plants.',
    'Do you want to cut the strap on this bag?',
    'This old dog is so strong!',
    'The kids will split up all the work so that everyone has a job.',
    'Everyone should have scraps for the class pet.',
    'The shrimp is cold so we will put it on the grill.',
    'Where did you find gold string?'
  ],
  dictation: {
    sounds: ['s', 'p', 'l', 't', 'r'],
    realWords: ['strap', 'scrub', 'scrap', 'sprint', 'split'],
    wordElements: ['-struct-', '-lect-', '-es'],
    nonsenseWords: ['scrid', 'strang', 'sprab'],
    phrases: ['strong string', 'big splash', 'spring job', 'split the work'],
    sentences: [
      'Lex will split every log with an ax.',
      'Grab some string so we can bind the two boxes.'
    ]
  },
  affixPractice: [
    { id: '25-a1', text: '-s', type: 'suffix', examples: 'straps, scrubs' },
    { id: '25-a2', text: '-es', type: 'suffix', examples: 'splashes, stresses' }
  ],
  passage: 'The Spring Job\n\nClint is not glad about the gust of hot wind. Spring is coming! Most everyone in the world feels bliss when the sun lasts long into dusk. Yet, Clint could not help but think of all the work. When all the cold and frost ends, the land and grass would be a mess.\n\nEach spring Clint has to trim the shrubs and fix up the mulch bed. Spring has sprung, so his tasks are at hand. Black mold masks the shed. Clint finds sticks and globs of rank sod everywhere. Clint is very strong, but this is too much stress and filth!\n\nIn his mind, Clint tempts himself with a snack and a nap, but he must go on. He scrubs the swing and the two benches by the elm. Then he sets two pots on the front steps. He plants the bulbs one by one, then splashes them with water.\n\nWhen everything is fresh, Clint grasps that he should not be such a grump. He lugs the trash out back and sprints to have a bath and grill some lunch.',
  slides: [
    { id: '25-s1', type: 'text', title: '3-Letter Blends', content: 'Some words have three consonants at the beginning.\nEach letter makes its own sound.\n\nExamples: str, spr, spl, scr' },
    { id: '25-s2', type: 'word', title: 'Tapping 5 Sounds', content: 's t r a p' },
    { id: '25-s3', type: 'word', title: 'Tapping 6 Sounds', content: 's c r i p t' },
    { id: '25-s4', type: 'text', title: 'Latin Bases', content: 'Latin bases are word parts that need another element to form a word.\nMany end in "ct".\n\nExamples: -struct-, -dict-, -lect-' },
    { id: '25-s5', type: 'word', title: 'Spelling /k/ in Blends', content: 'In a 3-letter blend, the /k/ sound is usually spelled with "c".\nExample: s c r a p' }
  ]
};
