import { Lesson, WrsLessonPlan, WrsSourceReference } from './types';
import { normalizeRuntimeLessonPlan } from './runtimeLesson';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : {}
);

const text = (value: unknown) => typeof value === 'string' ? value : '';
const bool = (value: unknown) => value === true;
const oneOf = <T extends string>(value: unknown, choices: readonly T[], fallback: T): T => (
  typeof value === 'string' && choices.includes(value as T) ? value as T : fallback
);
const stringsFrom = <T extends string>(value: unknown, choices: readonly T[]): T[] => (
  Array.isArray(value)
    ? value.filter((entry): entry is T => typeof entry === 'string' && choices.includes(entry as T))
    : []
);

export const createEmptyWrsLessonPlan = (): WrsLessonPlan => ({
  version: 1,
  date: '',
  lessonNumber: '',
  studentNameOrGroup: '',
  lessonFocus: '',
  conceptsToWeave: '',
  wordTypesToChart: [],
  troubleSpots: '',
  verificationStatus: 'draft',
  sources: [],
  part1: { vowels: '', consonants: '', welded: '', addToNotebook: '', drillLeader: '' },
  part2: { reviewConcepts: '', reviewWords: '', currentConcepts: '', currentWords: '', addToNotebook: '' },
  part3: { substeps: '', activity: '', vocabularyWords: '', addVocabularyToNotebook: false, addHfwToNotebook: false },
  part4: { studentReader: '', practicePage: '', practiceHalf: '', chartingPage: '', chartingHalf: '', anticipatedErrors: '', groupActivity: '' },
  part5: { studentReader: '', page: '', anticipatedErrors: '', notes: '' },
  part6: { vowels: '', consonants: '', welded: '', wordElements: '' },
  part7: { reviewConcepts: '', reviewWordsAndElements: '', currentConcepts: '', currentWordsAndElements: '', highFrequencyWords: '', addToNotebook: '' },
  part8: { notes: '' },
  part9: { title: '', page: '', source: '', studentReader: '', comprehensionMode: '', repeatedReading: false, vocabulary: '', followUpQuestions: '' },
  part10: { selectionStatus: 'teacher-selected-at-lesson', source: '', title: '', pages: '', tasks: [], notes: '' },
  additionalNotes: ''
});

const normalizeSource = (value: unknown): WrsSourceReference | null => {
  const source = asRecord(value);
  if (!text(source.id)) return null;
  return {
    id: text(source.id),
    sourceType: oneOf(source.sourceType, ['step-instruction', 'instructor-manual', 'dictation-book', 'student-reader', 'notebook-answer-key', 'inventory', 'teacher-created'] as const, 'teacher-created'),
    title: text(source.title),
    edition: text(source.edition),
    locator: text(source.locator),
    verification: oneOf(source.verification, ['verified', 'needs-verification', 'teacher-created'] as const, 'needs-verification'),
    notes: text(source.notes)
  };
};

export const normalizeWrsLessonPlan = (value: unknown): WrsLessonPlan => {
  const data = asRecord(value);
  const empty = createEmptyWrsLessonPlan();
  const p1 = asRecord(data.part1);
  const p2 = asRecord(data.part2);
  const p3 = asRecord(data.part3);
  const p4 = asRecord(data.part4);
  const p5 = asRecord(data.part5);
  const p6 = asRecord(data.part6);
  const p7 = asRecord(data.part7);
  const p8 = asRecord(data.part8);
  const p9 = asRecord(data.part9);
  const p10 = asRecord(data.part10);

  return {
    ...empty,
    date: text(data.date),
    lessonNumber: text(data.lessonNumber),
    studentNameOrGroup: text(data.studentNameOrGroup),
    lessonFocus: oneOf(data.lessonFocus, ['', 'introduction', 'accuracy', 'fluency'] as const, ''),
    conceptsToWeave: text(data.conceptsToWeave),
    wordTypesToChart: stringsFrom(data.wordTypesToChart, ['real', 'nonsense'] as const),
    troubleSpots: text(data.troubleSpots),
    verificationStatus: oneOf(data.verificationStatus, ['draft', 'partially-verified', 'source-verified'] as const, 'draft'),
    sources: Array.isArray(data.sources)
      ? data.sources.map(normalizeSource).filter((source): source is WrsSourceReference => Boolean(source))
      : [],
    part1: { vowels: text(p1.vowels), consonants: text(p1.consonants), welded: text(p1.welded), addToNotebook: text(p1.addToNotebook), drillLeader: text(p1.drillLeader) },
    part2: { reviewConcepts: text(p2.reviewConcepts), reviewWords: text(p2.reviewWords), currentConcepts: text(p2.currentConcepts), currentWords: text(p2.currentWords), addToNotebook: text(p2.addToNotebook) },
    part3: { substeps: text(p3.substeps), activity: text(p3.activity), vocabularyWords: text(p3.vocabularyWords), addVocabularyToNotebook: bool(p3.addVocabularyToNotebook), addHfwToNotebook: bool(p3.addHfwToNotebook) },
    part4: { studentReader: oneOf(p4.studentReader, ['', 'AB', 'A', 'B'] as const, ''), practicePage: text(p4.practicePage), practiceHalf: oneOf(p4.practiceHalf, ['', 'top', 'bottom'] as const, ''), chartingPage: text(p4.chartingPage), chartingHalf: oneOf(p4.chartingHalf, ['', 'top', 'bottom'] as const, ''), anticipatedErrors: text(p4.anticipatedErrors), groupActivity: text(p4.groupActivity) },
    part5: { studentReader: oneOf(p5.studentReader, ['', 'AB', 'B'] as const, ''), page: text(p5.page), anticipatedErrors: text(p5.anticipatedErrors), notes: text(p5.notes) },
    part6: { vowels: text(p6.vowels), consonants: text(p6.consonants), welded: text(p6.welded), wordElements: text(p6.wordElements) },
    part7: { reviewConcepts: text(p7.reviewConcepts), reviewWordsAndElements: text(p7.reviewWordsAndElements), currentConcepts: text(p7.currentConcepts), currentWordsAndElements: text(p7.currentWordsAndElements), highFrequencyWords: text(p7.highFrequencyWords), addToNotebook: text(p7.addToNotebook) },
    part8: { notes: text(p8.notes) },
    part9: { title: text(p9.title), page: text(p9.page), source: oneOf(p9.source, ['', 'student-reader', 'wilson-fluency-kit', 'other-wrs-controlled'] as const, ''), studentReader: oneOf(p9.studentReader, ['', 'AB', 'B'] as const, ''), comprehensionMode: oneOf(p9.comprehensionMode, ['', 'silent', 'oral'] as const, ''), repeatedReading: bool(p9.repeatedReading), vocabulary: text(p9.vocabulary), followUpQuestions: text(p9.followUpQuestions) },
    part10: { selectionStatus: oneOf(p10.selectionStatus, ['planned', 'teacher-selected-at-lesson'] as const, 'teacher-selected-at-lesson'), source: text(p10.source), title: text(p10.title), pages: text(p10.pages), tasks: stringsFrom(p10.tasks, ['listening-comprehension', 'interactive-oral-reading', 'scaffolded-silent-reading', 'oral-fluency'] as const), notes: text(p10.notes) },
    additionalNotes: text(data.additionalNotes)
  };
};

export interface WrsLessonReadiness {
  complete: number;
  total: number;
  missing: string[];
  sourceWarning: string;
}

export const getWrsLessonReadiness = (lesson: Lesson): WrsLessonReadiness => {
  const runtime = normalizeRuntimeLessonPlan(lesson.runtimePlan);
  if (runtime) {
    const byPart = (part: number) => runtime.parts.find(candidate => candidate.part === part);
    const part1 = byPart(1);
    const part2 = byPart(2);
    const part3 = byPart(3);
    const part4 = byPart(4);
    const part5 = byPart(5);
    const part6 = byPart(6);
    const part7 = byPart(7);
    const part8 = byPart(8);
    const part9 = byPart(9);
    const part10 = byPart(10);
    const dictation = part8?.data.dictation;
    const referencedSourceIds = new Set(runtime.sources.map(source => source.id));
    const part9HasSource = Boolean(
      part9?.sourceIds.length && part9.sourceIds.some(sourceId => referencedSourceIds.has(sourceId))
    );
    const checks: Array<[string, boolean]> = [
      ['lesson focus', Boolean(runtime.focus)],
      ['concepts to weave', Boolean(runtime.planningContext?.conceptsToWeave.trim())],
      ['trouble spots', Boolean(runtime.planningContext?.troubleSpots.trim())],
      ['word type to chart', Boolean(part4?.data.chartingType)],
      ['Part 1 sounds', Boolean(part1?.data.quickDrill?.length)],
      ['Part 2 reading concepts', Boolean(part2?.data.conceptNotes?.trim() || part2?.teacherDirections.length)],
      ['Part 3 Word Cards', Boolean(part3?.data.wordCards?.length)],
      ['Part 4 practice and charting selections', Boolean(part4?.data.practiceWords?.length && part4?.data.chartingWords?.length)],
      ['Part 5 sentences', Boolean(part5?.data.sentences?.length)],
      ['Part 6 reverse Quick Drill', Boolean(part6?.data.quickDrillReverse?.length || part6?.data.quickDrill?.length)],
      ['Part 7 spelling concepts', Boolean(part7?.data.conceptNotes?.trim() || part7?.data.currentWords?.length || part7?.teacherDirections.length)],
      ['Part 8 dictation', Boolean(dictation && Object.values(dictation).some(items => items.length > 0))],
      ['Part 9 controlled text and source', Boolean(part9?.data.passage?.trim() && part9HasSource)],
      ['Part 10 selection plan', Boolean(part10?.data.listeningComprehension || part10?.teacherDirections.length)]
    ];
    const missing = checks.filter(([, ready]) => !ready).map(([label]) => label);
    return { complete: checks.length - missing.length, total: checks.length, missing, sourceWarning: '' };
  }

  const plan = normalizeWrsLessonPlan(lesson.wrsPlan);
  const checks: Array<[string, boolean]> = [
    ['lesson focus', Boolean(plan.lessonFocus)],
    ['concepts to weave', Boolean(plan.conceptsToWeave.trim())],
    ['trouble spots', Boolean(plan.troubleSpots.trim())],
    ['word type to chart', plan.wordTypesToChart.length > 0],
    ['Part 1 sounds', lesson.quickDrill.length > 0],
    ['Part 2 reading concepts', Boolean(lesson.conceptNotes.trim() || plan.part2.reviewConcepts.trim() || plan.part2.currentConcepts.trim())],
    ['Part 3 Word Cards', lesson.wordCards.length > 0],
    ['Part 4 practice and charting selections', Boolean(plan.part4.practicePage.trim() && plan.part4.chartingPage.trim())],
    ['Part 5 sentences', lesson.sentences.length > 0],
    ['Part 6 reverse Quick Drill', (lesson.quickDrillReverse || lesson.quickDrill).length > 0],
    ['Part 7 spelling concepts', Boolean((lesson.conceptNotes7 || '').trim() || plan.part7.currentConcepts.trim())],
    ['Part 8 dictation', Object.values(lesson.dictation).some(items => items.length > 0)],
    ['Part 9 controlled text and source', Boolean((lesson.passage || '').trim() && plan.part9.source)],
    ['Part 10 selection plan', plan.part10.selectionStatus === 'teacher-selected-at-lesson' || Boolean(plan.part10.source.trim() && plan.part10.title.trim() && plan.part10.tasks.length)],
  ];
  const missing = checks.filter(([, ready]) => !ready).map(([label]) => label);
  const verifiedSources = plan.sources.filter(source => source.verification === 'verified');
  const sourceWarning = plan.verificationStatus === 'source-verified' && verifiedSources.length === 0
    ? 'Source-verified status requires at least one verified source citation.'
    : plan.sources.some(source => source.verification === 'needs-verification')
      ? 'One or more lesson sources still need verification.'
      : '';
  return { complete: checks.length - missing.length, total: checks.length, missing, sourceWarning };
};
