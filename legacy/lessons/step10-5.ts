
import { Lesson } from '../types';

export const lesson105: Lesson = {
  id: 'lesson-10-5-master',
  title: 'Step 10.5: Advanced Suffix Families',
  step: '10',
  substep: '5',
  conceptNotes: 'Instructional Focus: Teaching new suffixes (-ary, -ery, -ory, -ic, -ism, -ist, -ity, -ize, -ant, -ance, -ancy, -ent, -ence, -ency, -able, -ably, -ability, -ible, -ibly, -ibility). Rule: Find the base word first. Apply Silent-e and 1:1:1 Doubling rules when adding vowel suffixes.',
  conceptNotes7: 'Spelling Logic: Find and spell the base word first. If the base ends in silent e, drop it before adding vowel suffixes. Use base words to choose between -ant/-ent families. Build words layer by layer.',
  cipherWords: ['|bound|<ary>', '|brave|<ery>', '|sane|<ity>', '|reside|<ent>', '|critic|<ism>'],
  quickDrill: ['a', 'e', 'i', 'o', 'u', 'y', 'ai', 'ay', 'ee', 'ea', 'ey', 'oa', 'oe', 'igh', 'eigh', 'ar', 'or', 'er', 'ir', 'ur', 'ou', 'ow'],
  hfwList: ['beautiful', 'early', 'country', 'mountain', 'happened', 'everything', 'especially', 'probably', 'finally', 'usually'],
  wordCards: [
    { id: '105-r1', text: 'obtained', type: 'regular' },
    { id: '105-r2', text: 'percentage', type: 'regular' },
    { id: '105-r3', text: 'primary', type: 'regular' },
    { id: '105-r4', text: 'payments', type: 'regular' },
    { id: '105-r5', text: 'sweeteners', type: 'regular' },
    { id: '105-r6', text: 'chargeable', type: 'regular' },
    { id: '105-r7', text: 'transferred', type: 'regular' },
    { id: '105-r8', text: 'enjoyable', type: 'regular' },
    { id: '105-r9', text: 'spreading', type: 'regular' },
    { id: '105-r10', text: 'emerged', type: 'regular' },
    { id: '105-r11', text: 'stirred', type: 'regular' },
    { id: '105-r12', text: 'itemize', type: 'regular' }
  ],
  sentences: [
    'The bravery of the resident was known at the boundary.',
    'The consultant itemized the percentage of payments.',
    'It is respectable to show humanity even in times of severity.',
    'The accessible path led to a cubic room filled with sweeteners.',
    'We need consistency from the consultant on the primary plan.'
  ],
  dictation: {
    sounds: ['-ary', '-ery', '-ory', '-ic', '-ism', '-ist', '-ity', '-ize', '-ant', '-able', '-ible'],
    realWords: ['boundary', 'bravery', 'residence', 'robbery', 'avoidance', 'president'],
    wordElements: ['ary', 'ery', 'ity', 'ent', 'ism', 'ance', 'ency'],
    nonsenseWords: ['glanary', 'vensity', 'trominent'],
    phrases: ['brave resident', 'consistent consultant', 'severe humidity', 'sweetened payments'],
    sentences: [
      'The resident showed great bravery.',
      'Always spell the base word first.',
      'The consultant checked the boundary of the mountain.'
    ]
  },
  passage: "The Consultant's Discovery\n\nThe resident consultant was tasked with checking the boundary of the secondary lot. It required a great deal of bravery to climb the mountain so early in the morning. He noted the severity of the wind, but his consistency was respectable. \n\nAt the base, he found a cubic structure that seemed accessible only by a secret gate. He felt his sanity slip for a moment when he saw the ancient criticism carved into the stone. However, his humanity stayed strong. He finally transmitted the data, and everything happened just as the manual suggested it would.",
  slides: [
    { 
      id: '105-s1', 
      title: 'Intro: Noun Suffixes', 
      type: 'mixed',
      content: '',
      elements: [
        { id: 'e1', type: 'text', content: 'New Suffixes (Noun Forming):', x: 50, y: 50 },
        { id: 'e2', type: 'word', content: '<ary> <ery> <ory>', x: 50, y: 150 },
        { id: 'e3', type: 'text', content: 'Meaning: Quality or place', x: 50, y: 250 }
      ],
      notes: 'Display these one at a time. Have the student repeat each suffix.' 
    },
    { 
      id: '105-s2', 
      title: 'Concept: Adding -ary', 
      type: 'mixed',
      content: '',
      elements: [
        { id: 'e1', type: 'word', content: '|bound|', x: 200, y: 100 },
        { id: 'e2', type: 'text', content: '+', x: 400, y: 120 },
        { id: 'e3', type: 'word', content: '<ary>', x: 450, y: 100 },
        { id: 'e4', type: 'text', content: '→', x: 350, y: 250 },
        { id: 'e5', type: 'word', content: '|bound|<ary>', x: 250, y: 350 }
      ],
      notes: 'Make the word bound with Letter-Sound Cards. Add the Suffix Card -ary. Explain that suffixes change the word part of speech.' 
    },
    { 
      id: '105-s3', 
      title: 'Rule: The E-Drop', 
      type: 'mixed',
      content: '',
      elements: [
        { id: 'e1', type: 'word', content: 'b r a v e', x: 100, y: 100 },
        { id: 'e2', type: 'text', content: 'Drop the "e" before vowel suffix', x: 100, y: 200 },
        { id: 'e3', type: 'word', content: 'b r a v <ery>', x: 100, y: 300 }
      ],
      notes: 'Silent e and Suffix rules apply. Drop the e in brave to make bravery.' 
    },
    { 
      id: '105-s4', 
      title: 'Suffix Stacking', 
      type: 'mixed',
      content: '',
      elements: [
        { id: 'e1', type: 'word', content: '|class|', x: 300, y: 50 },
        { id: 'e2', type: 'word', content: '|class|<ic>', x: 300, y: 150 },
        { id: 'e3', type: 'word', content: '|class|<ic>|<ism>', x: 300, y: 250 }
      ],
      notes: 'Show how one suffix leads to another. Add -ic, then add -ism. Note how the sound of "c" shifts when "i" is added.' 
    },
    { 
      id: '105-s5', 
      title: 'Vowel Shift Visualization', 
      type: 'mixed',
      content: '',
      elements: [
        { id: 'e1', type: 'word', content: 'r e s i d e', x: 200, y: 100 },
        { id: 'e2', type: 'text', content: 'becomes', x: 200, y: 200 },
        { id: 'e3', type: 'word', content: 'r e s i d <ent>', x: 200, y: 300 }
      ],
      notes: 'Identify the vowel shift. Long i in reside becomes short i (or schwa) in resident. The spelling stays connected!' 
    }
  ],
  affixPractice: []
};
