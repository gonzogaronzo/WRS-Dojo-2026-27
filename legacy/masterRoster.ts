import { GroupInstructionalProfile, GroupProfile, StudentProfile } from './types';
import { ALL_MASTER_LESSONS } from './lessons/index';
import { cumulativeWrsScope } from './cumulativeWrsScope';

export const CURRENT_SCHOOL_YEAR = '2026-27';

// Firestore does not accept `undefined`. An unconfirmed schedule is deliberately
// absent until the teacher enters one, rather than being written as a value.
export const scheduleField = (schedule?: string): Pick<GroupProfile, 'schedule'> =>
  schedule ? { schedule } : {};

export const MASTER_NINJAS: StudentProfile[] = [
  ...[
    ['Oliver', 'student-oliver'], ['Ethan', 'student-ethan'], ['Alex', 'student-alex'], ['Finn', 'student-finn'], ['Maya', 'student-maya'],
    ['Enrique', 'student-enrique'], ['Elise', 'student-elise'], ['Eleanor', 'student-eleanor'], ['Juliana', 'student-juliana'],
    ['Carolyn', 'student-carolyn'], ['Izzy', 'student-izzy'], ['Levi', 'student-levi'], ['Nora', 'student-nora'],
    ['Charlotte', 'student-charlotte'], ['Bennett', 'student-bennett'], ['Ben', 'student-ben'], ['Xavier', 'student-xavier'],
    ['Uffarren', 'student-uffarren']
  ]
    .map(([name, id]) => ({
      id,
      name,
      active: true,
      schoolYear: CURRENT_SCHOOL_YEAR,
      masteredSounds: [],
      masteredHFW: [],
      attendanceCount: 0,
      notes: '',
      history: []
    }))
];

const baselineNote = (substep: string) =>
  `Initial source-based baseline for Substep ${substep}. Confirm lesson focus from current group data; add review selections and trouble spots only after instruction or assessment.`;

const profile = (substep: string, values: Omit<GroupInstructionalProfile,
  'schemaVersion' | 'currentSubstep' | 'lessonFocus' | 'reviewCardRepository' |
  'troubleSpots' | 'nextLessonNotes'
>): GroupInstructionalProfile => ({
  schemaVersion: 1,
  currentSubstep: substep,
  lessonFocus: '',
  currentCardRepository: values.currentCardRepository,
  reviewCardRepository: [],
  practicedWordElements: values.practicedWordElements,
  highFrequencyWords: values.highFrequencyWords,
  troubleSpots: [],
  conceptsToWeave: values.conceptsToWeave,
  nextLessonNotes: baselineNote(substep)
});

const BASELINE_PROFILES = {
  '1.6': profile('1.6', {
    currentCardRepository: ['Suffix -s: /s/ or /z/', 'Suffix -es: /iz/'],
    practicedWordElements: ['-s', '-es'],
    highFrequencyWords: ['both', 'from', 'have', 'one', 'they'],
    conceptsToWeave: ['Adding suffixes -s and -es to unchanging base words', 'Oral Spelling Suffix Procedure']
  }),
  '3.1': profile('3.1', {
    currentCardRepository: [
      'Closed-syllable prefixes: mid-, mis-, non-, trans-, un-',
      'Phoneme–grapheme cards: /ə/ → o; /ĭ/ → e; /z/ → s'
    ],
    practicedWordElements: ['mid-', 'mis-', 'non-', 'trans-', 'un-'],
    highFrequencyWords: ['after', 'another', 'down', 'first', 'full', 'month', 'new', 'number', 'other', 'over', 'pull', 'pulled', 'push', 'pushed', 'under'],
    conceptsToWeave: ['/ik/ at the end of a multisyllabic word', 'Doubling to retain a short vowel sound']
  }),
  '4.1': profile('4.1', {
    currentCardRepository: ['Vowel-Consonant-e cards: a-e, e-e, i-e, o-e, u-e'],
    practicedWordElements: ['-clude- (close)', '-fuse- (pour)', '-pose- (put, set)', '-pute- (think, reckon)', '-quire- (seek, ask)', '-scribe- (write)', '-spire- (breath of life, spirit)', '-sume- (take)', '-vise- (see)', '-voke- (call, voice)'],
    highFrequencyWords: ['done', 'move', 'moved', 'none', 'paste', 'remove', 'removed', 'sure', 'taste', 'use', 'used', 'uses', 'using', 'waste'],
    conceptsToWeave: ['Vowel-Consonant-e syllables', 'Spelling of /k/ in a v-e syllable']
  }),
  '5.3': profile('5.3', {
    currentCardRepository: ['Phoneme–grapheme card: /ē/ → y'],
    practicedWordElements: [],
    highFrequencyWords: ['beautiful', "don't", 'person', 'pretty', 'woman', 'women'],
    conceptsToWeave: ['Doubling rule in multisyllabic words ending in y', 'Open-syllable letter choice: y as /ē/']
  }),
  '7.3': profile('7.3', {
    currentCardRepository: ['Trigraph card: /ch/ → tch', 'Digraph card: /f/ → ph', 'Greek combining form: tele- (afar, distant)'],
    practicedWordElements: ['tele- (afar, distant)'],
    highFrequencyWords: ['college', 'knowledge', 'physical', 'science', 'scientific', 'scientist', 'watch'],
    conceptsToWeave: ['Spelling words with digraph ph', 'Trigraph /ch/ (tch)']
  })
} as const;

const profileFor = (substep: keyof typeof BASELINE_PROFILES): GroupInstructionalProfile => {
  const baseline = BASELINE_PROFILES[substep];
  const scope = cumulativeWrsScope(substep);
  const unique = (items: string[]) => [...new Set(items)];
  return {
    ...baseline,
    currentCardRepository: unique([...baseline.currentCardRepository, ...scope.currentPhonemeCards]),
    reviewCardRepository: scope.reviewCardRepository,
    practicedWordElements: scope.practicedWordElements,
    highFrequencyWords: scope.highFrequencyWords,
    troubleSpots: [...baseline.troubleSpots],
    conceptsToWeave: scope.conceptsToWeave,
    curriculumScopeVersion: 2,
    nextLessonNotes: `${baseline.nextLessonNotes} The curriculum lists scope-and-sequence material introduced through this Substep; it is not a mastery claim.`
  };
};

export const MASTER_SQUADS: GroupProfile[] = [
  {
    id: 'group-2026-27-5b', name: 'Group 5B', schedule: '7:45–8:30', active: true, schoolYear: CURRENT_SCHOOL_YEAR,
    studentIds: ['student-oliver', 'student-ethan'],
    inventory: { learnedSounds: [], learnedHFW: [] }, instructionalProfile: profileFor('5.3'),
    jobs: {}, savedLessons: [...ALL_MASTER_LESSONS], history: []
  },
  {
    id: 'group-2026-27-5a', name: 'Group 5A', schedule: '7:45–8:30', active: true, schoolYear: CURRENT_SCHOOL_YEAR,
    studentIds: ['student-alex', 'student-finn', 'student-maya'],
    inventory: { learnedSounds: [], learnedHFW: [] }, instructionalProfile: profileFor('7.3'),
    jobs: {}, savedLessons: [...ALL_MASTER_LESSONS], history: []
  },
  {
    id: 'group-2026-27-2', name: 'Group 2', schedule: '10:10–10:55', active: true, schoolYear: CURRENT_SCHOOL_YEAR,
    studentIds: ['student-enrique'],
    inventory: { learnedSounds: [], learnedHFW: [] }, instructionalProfile: profileFor('1.6'),
    jobs: {}, savedLessons: [...ALL_MASTER_LESSONS], history: []
  },
  {
    id: 'group-2026-27-3a', name: 'Group 3A', schedule: '11:00–11:45', active: true, schoolYear: CURRENT_SCHOOL_YEAR,
    studentIds: ['student-levi', 'student-nora', 'student-eleanor'],
    inventory: { learnedSounds: [], learnedHFW: [] }, instructionalProfile: profileFor('3.1'),
    jobs: {}, savedLessons: [...ALL_MASTER_LESSONS], history: []
  },
  {
    id: 'group-2026-27-3b', name: 'Group 3B', schedule: '1:15–2:00', active: true, schoolYear: CURRENT_SCHOOL_YEAR,
    studentIds: ['student-izzy', 'student-juliana', 'student-carolyn', 'student-elise'],
    inventory: { learnedSounds: [], learnedHFW: [] }, instructionalProfile: profileFor('3.1'),
    jobs: {}, savedLessons: [...ALL_MASTER_LESSONS], history: []
  },
  {
    id: 'group-2026-27-4', name: 'Group 4A', schedule: '2:05–2:50', active: true, schoolYear: CURRENT_SCHOOL_YEAR,
    studentIds: ['student-charlotte', 'student-bennett', 'student-ben', 'student-xavier', 'student-uffarren'],
    inventory: { learnedSounds: [], learnedHFW: [] }, instructionalProfile: profileFor('4.1'),
    jobs: {}, savedLessons: [...ALL_MASTER_LESSONS], history: []
  }
];
