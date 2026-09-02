import { WRSRuntimeLessonPlan } from '../types';
import { runtimeLessonToLegacyLesson } from '../runtimeLesson';

/**
 * First WRS Dojo lesson compiled against WRS Curriculum Release 1.0.1.
 *
 * This is intentionally a golden integration fixture, not a claim that every
 * Substep is ready for automatic generation. The release's fail-closed coverage
 * gates still control when additional Substeps can be generated.
 */
export const runtimeLesson82Release101: WRSRuntimeLessonPlan = {
  schemaVersion: 'wrs-runtime-v1',
  id: 'lesson-8-2-release-1-0-1',
  title: 'Step 8.2: ar, or in Multisyllabic Words',
  step: '8',
  substep: '2',
  focus: 'introduction',
  lessonPath: 'full',
  plannedParts: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  planningContext: {
    conceptsToWeave: 'Current 8.2 concepts: multisyllabic words containing ar/or r-controlled syllables; complex words with -form-, -part-, and -port-; taught affixes.',
    troubleSpots: ''
  },
  sources: [
    {
      id: 'SI-08',
      label: 'WRS Step 8 Step Instruction',
      kind: 'step-instruction',
      edition: 'Fourth Edition',
      locator: 'Substep 8.2, Instructor Manual printed pp. 186-195',
      notes: 'WRS Curriculum Release WRS-CURRICULUM-1.0.1-2026-09-02. Governing source for Parts 1-8.'
    },
    {
      id: 'READERS-07-12',
      label: 'WRS Student Reader 8',
      kind: 'student-reader',
      edition: 'Fourth Edition',
      locator: 'Substep 8.2: printed pp. 40-41, 48, 58-59',
      notes: 'WRS Curriculum Release WRS-CURRICULUM-1.0.1-2026-09-02. Controlled Part 4, Part 5, and Part 9 material.'
    },
    {
      id: 'DICT-07-12-4E',
      label: 'WRS Dictation Book Steps 7-12',
      kind: 'dictation-book',
      edition: 'Fourth Edition',
      locator: 'Substep 8.2, printed pp. 33-54',
      notes: 'WRS Curriculum Release WRS-CURRICULUM-1.0.1-2026-09-02. Canonical visual authority for Part 8 selections.'
    },
    {
      id: 'TEACHER-SELECTION',
      label: 'Teacher-selected Part 10 text',
      kind: 'teacher-selection',
      edition: 'Not applicable',
      locator: 'Runtime teacher choice',
      notes: 'Part 10 remains teacher-selected by design; the lesson engine must not fabricate or silently preselect a text.'
    }
  ],
  parts: [
    {
      part: 1,
      title: 'Sounds Quick Drill',
      sourceIds: ['SI-08'],
      teacherDirections: [
        'Be selective with previously taught vowel Letter-Sound Cards.',
        'Drill all r-controlled vowel sounds taught thus far.',
        'Be selective with previously taught consonants and welded letters. There are no new letter-sounds in 8.2.'
      ],
      data: {
        quickDrill: ['a', 'e', 'i', 'o', 'u', 'ar', 'er', 'ir', 'or', 'ur', 'm', 'r', 't', 'sh', 'ang']
      }
    },
    {
      part: 2,
      title: 'Teach & Review Concepts for Reading',
      sourceIds: ['SI-08'],
      teacherDirections: [
        'Build three to four previous-substep words and briefly review learned concepts.',
        'Teach multisyllabic words containing ar/or r-controlled syllables and syllable division using the source demonstrations.',
        'Teach complex words with -form-, -part-, and -port- and words with taught affixes as the lesson progresses.'
      ],
      data: {
        conceptNotes: '8.2 Reading: combine ar/or r-controlled syllables with other syllable types. Source demonstrations include market, hardware, acorn, portion, shortcut, party, restart, inform, depart, export, conform, impart, transport, report, gardener, marketable, portions, disorganize, and misinformed.',
        slides: [
          {
            id: '82-release101-s1',
            type: 'text',
            title: 'R-Controlled + Other Syllable Types',
            content: 'market = r-controlled + closed\nhardware = r-controlled + vowel-consonant-e\nacorn = open + r-controlled\nportion = r-controlled + final stable'
          },
          {
            id: '82-release101-s2',
            type: 'text',
            title: 'Syllable Division',
            content: 'Compound words: shortcut, starfish, backyard\nR-controlled first syllable: party, forty, garlic, orbit\nPrefix: restart'
          },
          {
            id: '82-release101-s3',
            type: 'text',
            title: 'Latin Bases',
            content: '-form-  •  -part-  •  -port-\n\ninform • depart • export\nconform • impart • transport • report'
          },
          {
            id: '82-release101-s4',
            type: 'text',
            title: 'Add Taught Affixes',
            content: 'gardener • marketable • portions • disorganize • misinformed'
          }
        ]
      }
    },
    {
      part: 3,
      title: 'Word Cards',
      sourceIds: ['SI-08', 'READERS-07-12'],
      teacherDirections: [
        'Read a cumulative packet of previously taught Word Cards, then current Substep 8.2 words.',
        'Read the High Frequency Word packet separately and retain previously introduced words until mastered.'
      ],
      data: {
        wordCards: [
          { id: '82-release101-r1', text: 'market', type: 'regular' },
          { id: '82-release101-r2', text: 'carpet', type: 'regular' },
          { id: '82-release101-r3', text: 'backyard', type: 'regular' },
          { id: '82-release101-r4', text: 'report', type: 'regular' },
          { id: '82-release101-r5', text: 'transport', type: 'regular' },
          { id: '82-release101-r6', text: 'depart', type: 'regular' },
          { id: '82-release101-r7', text: 'gardener', type: 'regular' },
          { id: '82-release101-r8', text: 'marketable', type: 'regular' },
          { id: '82-release101-h1', text: 'superior', type: 'hfw' },
          { id: '82-release101-h2', text: 'vary', type: 'hfw' },
          { id: '82-release101-h3', text: 'varies', type: 'hfw' },
          { id: '82-release101-h4', text: 'variety', type: 'hfw' },
          { id: '82-release101-h5', text: 'vocabulary', type: 'hfw' },
          { id: '82-release101-h6', text: 'area', type: 'hfw' },
          { id: '82-release101-h7', text: 'garage', type: 'hfw' }
        ],
        hfwList: ['superior', 'vary', 'varies', 'variety', 'vocabulary', 'area', 'garage']
      }
    },
    {
      part: 4,
      title: 'Wordlist Reading',
      sourceIds: ['SI-08', 'READERS-07-12'],
      teacherDirections: [
        'Practice: read 5-6 words from one current 8.2 wordlist and discuss the current concept and trouble spots.',
        'Charting: read 15 words from a different current 8.2 wordlist. Record and correct errors after the first-response sample.'
      ],
      data: {
        practiceWords: ['garden', 'remark', 'alarm', 'particle', 'marble', 'target'],
        chartingWords: [
          'forest', 'morning', 'information', 'record', 'organize',
          'story', 'portion', 'uniform', 'afford', 'forgot',
          'formation', 'glory', 'absorb', 'origin', 'corporation'
        ],
        chartingType: 'real'
      }
    },
    {
      part: 5,
      title: 'Sentence Reading',
      sourceIds: ['SI-08', 'READERS-07-12'],
      teacherDirections: [
        'Review High Frequency Words and untaught words at the top of the page as needed.',
        'Have the student read each selected sentence silently, then aloud. Focus on accurate word reading, expression, phrasing, and meaning.'
      ],
      data: {
        studentReader: 'Student Reader 8',
        page: '48',
        sentences: [
          'On our last camping trip, we spent the evenings watching the stars sparkle.',
          'The price of a carton of milk will vary from market to market.',
          'Ed put the harmonica in his pocket.',
          'The party had a variety of games.',
          'Which vocabulary words should I target when I study?',
          'The price of that marble will vary from shop to shop.',
          'Did you see all the rusty cars in the junkyard?',
          'The chirp of a fire alarm varies from product to product.',
          'Martha did not want to participate in the contest.',
          'A new fence was installed around the entire ballpark.'
        ]
      }
    },
    {
      part: 6,
      title: 'Quick Drill in Reverse',
      sourceIds: ['SI-08'],
      teacherDirections: [
        'Dictate a selection of previously taught vowel, consonant, and welded phonemes.',
        'Prompt the student to repeat the sound and name the letter(s) while pointing to the appropriate Letter Tile(s).',
        'There are no new sounds in 8.2; dictate selected taught word elements only as needed.'
      ],
      data: {
        quickDrillReverse: ['a', 'e', 'i', 'o', 'u', 'ar', 'er', 'ir', 'or', 'ur'],
        wordElements: ['-form-', '-part-', '-port-']
      }
    },
    {
      part: 7,
      title: 'Teach & Review Concepts for Spelling',
      sourceIds: ['SI-08'],
      teacherDirections: [
        'Begin with three to four previous-substep words.',
        'Use the source demonstrations for multisyllabic ar/or words, complex words with -form-/-part-/-port-, and taught affixes.',
        'For words with a suffix, have the student name the word without the suffix before spelling.'
      ],
      data: {
        conceptNotes: '8.2 Spelling source demonstrations: market; garden, particle, glory; repark; import; reform, apart, export; tornadoes, gardener, reporter.'
      }
    },
    {
      part: 8,
      title: 'Written Work Dictation',
      sourceIds: ['SI-08', 'DICT-07-12-4E'],
      teacherDirections: [
        'Dictate source-controlled sounds, word elements, words, phrases, and sentences from previous/current material.',
        'Have the student repeat each dictated item before spelling.',
        'Guide proofreading and source-specified marking after phrase and sentence dictation.'
      ],
      data: {
        dictation: {
          sounds: ['/ar/'],
          wordElements: ['-form-'],
          realWords: ['market', 'report', 'backyard', 'transform'],
          nonsenseWords: [],
          phrases: ['my area code'],
          sentences: [
            'The crops the farmers harvest vary every year.',
            'We must use our Spanish vocabulary to draft this report.',
            'The rules we must conform to vary from class to class.'
          ]
        }
      }
    },
    {
      part: 9,
      title: 'Controlled Text Passage Reading',
      sourceIds: ['READERS-07-12'],
      teacherDirections: [
        'Use Backyard Visitor from Student Reader 8 printed pages 58-59.',
        'Read silently for a mental model, retell, and then read orally with phrasing and expression as directed.'
      ],
      data: {
        passageTitle: 'Backyard Visitor',
        studentReader: 'Student Reader 8',
        page: '58-59',
        passage: `Backyard Visitor

Martin wakes up each day before sunrise. After he has something good to eat like a cup of pineapple chunks, Martin likes to sit on his deck and watch the sun come up. In Portland, he can only do this a few months a year when it’s not too cold outside.

One day, Martin looks across his backyard through the forest expecting to see the sun start to rise any minute. All of a sudden, Martin hears a strange sound and spots something move near the small shrubs that stretch from his garage to the edge of his garden. Martin thinks that it could be any variety of small animals who call Oregon home. He wants to get a close-up look, but he hesitates. He doesn’t want to end up face to face with an angry skunk.

Martin walks carefully down the steps of the deck and starts to make his way across the small backyard. He is mindful not to startle the animal. Just then, the sun begins to pop up over the horizon, and Martin can now absolutely recognize the wild animal in the area of the shrubs. It’s a porcupine!

He is glad that it’s not a skunk, but Martin knows not to get too close. A porcupine can discharge sharp spines called quills into anything that comes into direct contact with it. Martin makes his way back to the safety of his deck. He is quite sure that he has had plenty of exploration for one morning.`
      }
    },
    {
      part: 10,
      title: 'Listening/Reading Fluency and Comprehension',
      sourceIds: ['TEACHER-SELECTION'],
      teacherDirections: [
        'Teacher selects the text at delivery time and records the choice before use.',
        'Do not fabricate or silently preselect Part 10 text.'
      ],
      data: {
        listeningComprehension: {
          mode: 'teacher-selected',
          title: 'Teacher-selected text',
          teacherDirections: [
            'Select the Part 10 text at delivery time.',
            'Record the selection title before use.',
            'Follow the appropriate WRS Part 10 fluency/comprehension procedure for the student and lesson.'
          ],
          studentPrompt: 'Listen/read for meaning and be ready to discuss or retell.',
          sourceIds: ['TEACHER-SELECTION'],
          workspace: {
            mode: 'whiteboard',
            tools: ['draw', 'sticky-notes']
          }
        }
      }
    }
  ]
};

export const lesson82Release101 = runtimeLessonToLegacyLesson(runtimeLesson82Release101);
