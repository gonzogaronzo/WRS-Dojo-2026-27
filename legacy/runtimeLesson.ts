import {
  DictationSection,
  Lesson,
  LessonFocus,
  LessonPath,
  LessonSourceKind,
  LessonSourceReference,
  RuntimeLessonPart,
  RuntimeLessonPartData,
  RuntimePlanningContext,
  WRSRuntimeLessonPlan,
  WrsLessonPlan,
  WrsSourceReference
} from './types';
import { part2PresentationToSlides } from './part2Presentation';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : null
);

const text = (value: unknown) => typeof value === 'string' ? value : '';
const strings = (value: unknown) => Array.isArray(value)
  ? value.filter((entry): entry is string => typeof entry === 'string')
  : [];
const nonEmptyStrings = (value: unknown) => strings(value).map(item => item.trim()).filter(Boolean);

const emptyDictation = (): DictationSection => ({
  sounds: [],
  realWords: [],
  wordElements: [],
  nonsenseWords: [],
  phrases: [],
  sentences: []
});

const focusFrom = (value: unknown): LessonFocus | null => (
  value === 'introduction' || value === 'accuracy' || value === 'automaticity-fluency' || value === 'mixed'
    ? value
    : null
);

const lessonPathFrom = (value: unknown): LessonPath | undefined => (
  value === 'block1+3' || value === 'block2+3' || value === 'full' ? value : undefined
);

const sourceKindFrom = (value: unknown): LessonSourceKind => {
  const allowed: LessonSourceKind[] = [
    'step-instruction', 'instructor-manual', 'dictation-book',
    'student-reader', 'student-notebook', 'teacher-selection'
  ];
  return allowed.includes(value as LessonSourceKind) ? value as LessonSourceKind : 'teacher-selection';
};

const normalizeSource = (value: unknown): LessonSourceReference | null => {
  const source = asRecord(value);
  if (!source || !text(source.id)) return null;
  return {
    id: text(source.id),
    label: text(source.label),
    kind: sourceKindFrom(source.kind),
    edition: text(source.edition) || undefined,
    locator: text(source.locator) || undefined,
    notes: text(source.notes) || undefined
  };
};

const normalizePartData = (value: unknown): RuntimeLessonPartData => {
  const data = asRecord(value) || {};
  return { ...data } as RuntimeLessonPartData;
};

const normalizePart = (value: unknown): RuntimeLessonPart | null => {
  const part = asRecord(value);
  const partNumber = Number(part?.part);
  if (!part || !Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10) return null;
  return {
    part: partNumber as RuntimeLessonPart['part'],
    title: text(part.title),
    teacherDirections: strings(part.teacherDirections),
    sourceIds: strings(part.sourceIds),
    data: normalizePartData(part.data)
  };
};

const normalizePlanningContext = (value: unknown): RuntimePlanningContext | undefined => {
  const context = asRecord(value);
  if (!context) return undefined;
  return {
    conceptsToWeave: text(context.conceptsToWeave),
    troubleSpots: text(context.troubleSpots)
  };
};

export const normalizeRuntimeLessonPlan = (value: unknown): WRSRuntimeLessonPlan | null => {
  const runtime = asRecord(value);
  if (!runtime || runtime.schemaVersion !== 'wrs-runtime-v1') return null;
  const focus = focusFrom(runtime.focus);
  if (!text(runtime.id) || !focus) return null;

  const parts = Array.isArray(runtime.parts)
    ? runtime.parts.map(normalizePart).filter((part): part is RuntimeLessonPart => Boolean(part))
    : [];
  const plannedParts = Array.isArray(runtime.plannedParts)
    ? runtime.plannedParts
        .map(Number)
        .filter((part): part is RuntimeLessonPart['part'] => Number.isInteger(part) && part >= 1 && part <= 10)
    : undefined;

  return {
    schemaVersion: 'wrs-runtime-v1',
    id: text(runtime.id),
    title: text(runtime.title),
    step: text(runtime.step),
    substep: text(runtime.substep),
    focus,
    lessonPath: lessonPathFrom(runtime.lessonPath),
    plannedParts,
    planningContext: normalizePlanningContext(runtime.planningContext),
    sources: Array.isArray(runtime.sources)
      ? runtime.sources.map(normalizeSource).filter((source): source is LessonSourceReference => Boolean(source))
      : [],
    parts
  };
};

export const validateRuntimeLesson = (input: WRSRuntimeLessonPlan): WRSRuntimeLessonPlan => {
  const runtime = normalizeRuntimeLessonPlan(input);
  if (!runtime) throw new Error('The imported runtime lesson is not valid.');
  const orderedParts = [...runtime.parts].sort((a, b) => a.part - b.part);
  const expected = Array.from({ length: 10 }, (_, index) => index + 1);
  const actual = orderedParts.map(part => part.part);
  if (actual.length !== 10 || actual.some((part, index) => part !== expected[index])) {
    throw new Error(`Runtime lesson ${runtime.id} must contain exactly Parts 1-10 once each.`);
  }
  return { ...runtime, parts: orderedParts };
};

const byPart = (runtime: WRSRuntimeLessonPlan, part: RuntimeLessonPart['part']) => (
  runtime.parts.find(candidate => candidate.part === part)
);

const sourceForCompatibilityPlan = (source: LessonSourceReference): WrsSourceReference => ({
  id: source.id,
  sourceType: source.kind === 'student-notebook'
    ? 'notebook-answer-key'
    : source.kind === 'teacher-selection'
      ? 'teacher-created'
      : source.kind,
  title: source.label,
  edition: source.edition || '',
  locator: source.locator || '',
  verification: source.kind === 'teacher-selection' ? 'teacher-created' : 'verified',
  notes: source.notes || ''
});

const readerLevel = (value: string): '' | 'AB' | 'A' | 'B' => {
  if (/\bAB\b/.test(value)) return 'AB';
  if (/\bA\b/.test(value)) return 'A';
  if (/\bB\b/.test(value)) return 'B';
  return '';
};

const readerLevelForPassage = (value: string): '' | 'AB' | 'B' => {
  const level = readerLevel(value);
  return level === 'A' ? '' : level;
};

/**
 * Compatibility-only view for the existing Official WRS Plan Details UI.
 * Runtime remains the sole authored instructional truth.
 */
export const runtimeLessonToCompatibilityWrsPlan = (input: WRSRuntimeLessonPlan): WrsLessonPlan => {
  const runtime = validateRuntimeLesson(input);
  const part1 = byPart(runtime, 1);
  const part2 = byPart(runtime, 2);
  const part3 = byPart(runtime, 3);
  const part4 = byPart(runtime, 4);
  const part5 = byPart(runtime, 5);
  const part6 = byPart(runtime, 6);
  const part7 = byPart(runtime, 7);
  const part8 = byPart(runtime, 8);
  const part9 = byPart(runtime, 9);
  const part10 = byPart(runtime, 10);
  const part10Data = asRecord(part10?.data);
  const p4Reader = text(part4?.data.studentReader);
  const p5Reader = text(part5?.data.studentReader);
  const p9Reader = text(part9?.data.studentReader);
  const dictation = part8?.data.dictation || emptyDictation();
  const questions = Array.isArray((part9?.data as UnknownRecord | undefined)?.questions)
    ? ((part9?.data as UnknownRecord).questions as unknown[]).flatMap(item => {
        const record = asRecord(item);
        const question = text(record?.question).trim();
        return question ? [question] : [];
      })
    : [];

  return {
    version: 1,
    date: '',
    lessonNumber: runtime.id,
    studentNameOrGroup: '',
    lessonFocus: runtime.focus === 'automaticity-fluency'
      ? 'fluency'
      : runtime.focus === 'mixed'
        ? ''
        : runtime.focus,
    conceptsToWeave: runtime.planningContext?.conceptsToWeave || '',
    wordTypesToChart: part4?.data.chartingType ? [part4.data.chartingType] : [],
    troubleSpots: runtime.planningContext?.troubleSpots || '',
    verificationStatus: runtime.sources.length ? 'source-verified' : 'draft',
    sources: runtime.sources.map(sourceForCompatibilityPlan),
    part1: {
      vowels: nonEmptyStrings(part1?.data.quickDrill).join(', '),
      consonants: '',
      welded: '',
      addToNotebook: '',
      drillLeader: part1?.teacherDirections.join(' ') || ''
    },
    part2: {
      reviewConcepts: text(part2?.data.conceptNotes) || part2?.teacherDirections.join(' ') || '',
      reviewWords: nonEmptyStrings(part2?.data.reviewWords).join(', '),
      currentConcepts: text(part2?.data.conceptNotes) || part2?.teacherDirections.join(' ') || '',
      currentWords: nonEmptyStrings(part2?.data.currentWords).join(', '),
      addToNotebook: ''
    },
    part3: {
      substeps: runtime.substep,
      activity: part3?.teacherDirections.join(' ') || '',
      vocabularyWords: (part3?.data.wordCards || []).map(card => card.text).join(', '),
      addVocabularyToNotebook: false,
      addHfwToNotebook: Boolean(part3?.data.hfwList?.length)
    },
    part4: {
      studentReader: readerLevel(p4Reader),
      practicePage: text(part4?.data.page),
      practiceHalf: '',
      chartingPage: text(part4?.data.page),
      chartingHalf: '',
      anticipatedErrors: runtime.planningContext?.troubleSpots || '',
      groupActivity: part4?.teacherDirections.join(' ') || ''
    },
    part5: {
      studentReader: readerLevelForPassage(p5Reader),
      page: text(part5?.data.page),
      anticipatedErrors: runtime.planningContext?.troubleSpots || '',
      notes: part5?.teacherDirections.join(' ') || ''
    },
    part6: {
      vowels: nonEmptyStrings(part6?.data.quickDrillReverse || part6?.data.quickDrill).join(', '),
      consonants: '',
      welded: '',
      wordElements: nonEmptyStrings(part6?.data.wordElements).join(', ')
    },
    part7: {
      reviewConcepts: text(part7?.data.conceptNotes) || part7?.teacherDirections.join(' ') || '',
      reviewWordsAndElements: nonEmptyStrings(part7?.data.reviewWords).join(', '),
      currentConcepts: text(part7?.data.conceptNotes) || part7?.teacherDirections.join(' ') || '',
      currentWordsAndElements: [
        ...nonEmptyStrings(part7?.data.currentWords),
        ...nonEmptyStrings(part7?.data.wordElements)
      ].join(', '),
      highFrequencyWords: nonEmptyStrings(part3?.data.hfwList).join(', '),
      addToNotebook: ''
    },
    part8: {
      notes: [
        ...nonEmptyStrings(dictation.sounds),
        ...nonEmptyStrings(dictation.wordElements),
        ...nonEmptyStrings(dictation.realWords),
        ...nonEmptyStrings(dictation.nonsenseWords),
        ...nonEmptyStrings(dictation.phrases)
      ].join(', ')
    },
    part9: {
      title: text(part9?.data.passageTitle),
      page: text(part9?.data.page),
      source: p9Reader ? 'student-reader' : '',
      studentReader: readerLevelForPassage(p9Reader),
      comprehensionMode: 'oral',
      repeatedReading: true,
      vocabulary: '',
      followUpQuestions: questions.join('\n')
    },
    part10: {
      selectionStatus: part10Data?.teacherPlanStatus === 'PLANNED' ? 'planned' : 'teacher-selected-at-lesson',
      source: '',
      title: text(part10?.data.listeningComprehension && asRecord(part10.data.listeningComprehension)?.title),
      pages: '',
      tasks: [],
      notes: part10?.teacherDirections.join(' ') || ''
    },
    additionalNotes: ''
  };
};

/**
 * The runtime plan remains authoritative. This adapter supplies the existing
 * lesson modules with their current rendering shape without duplicating the
 * planning requirements into wrsPlan.
 */
export const runtimeLessonToLegacyLesson = (input: WRSRuntimeLessonPlan): Lesson => {
  const runtime = validateRuntimeLesson(input);
  const part1 = byPart(runtime, 1);
  const part2 = byPart(runtime, 2);
  const part3 = byPart(runtime, 3);
  const part4 = byPart(runtime, 4);
  const part5 = byPart(runtime, 5);
  const part6 = byPart(runtime, 6);
  const part7 = byPart(runtime, 7);
  const part8 = byPart(runtime, 8);
  const part9 = byPart(runtime, 9);
  const part10 = byPart(runtime, 10);
  const semanticPart2Slides = part2PresentationToSlides(part2?.data);
  const part4Data = asRecord(part4?.data);
  const practiceWords = part4?.data.practiceWords || [];
  const chartingWords = part4?.data.chartingWords || [];
  const chartingPlanned = part4Data?.chartingPlanned === false
    ? false
    : part4Data?.chartingPlanned === true
      ? true
      : chartingWords.length > 0;

  return {
    schemaVersion: 2,
    id: runtime.id,
    title: runtime.title,
    step: runtime.step,
    substep: runtime.substep,
    conceptNotes: part2?.data.conceptNotes || part2?.teacherDirections.join('\n') || '',
    conceptNotes7: part7?.data.conceptNotes || part7?.teacherDirections.join('\n') || '',
    slides: semanticPart2Slides ?? part2?.data.slides ?? [],
    quickDrill: part1?.data.quickDrill || [],
    quickDrillReverse: part6?.data.quickDrillReverse || part6?.data.quickDrill || [],
    wordCards: part3?.data.wordCards || [],
    wordListPractice: practiceWords,
    wordListCharting: chartingPlanned ? chartingWords : [],
    wordListReading: chartingPlanned ? chartingWords : practiceWords,
    wordListReadingAuto: chartingPlanned,
    sentences: part5?.data.sentences || [],
    dictation: part8?.data.dictation || emptyDictation(),
    hfwList: part3?.data.hfwList || [],
    affixPractice: [],
    passage: part9?.data.passage || '',
    lessonFocus: runtime.focus,
    sourceMetadata: runtime.sources,
    runtimePlan: runtime,
    wrsPlan: runtimeLessonToCompatibilityWrsPlan(runtime),
    listeningComprehension: part10?.data.listeningComprehension,
    lessonPath: runtime.lessonPath,
    plannedParts: runtime.plannedParts,
    lastUpdated: '2026-09-14'
  };
};
