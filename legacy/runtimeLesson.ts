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
  WRSRuntimeLessonPlan
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
    listeningComprehension: part10?.data.listeningComprehension,
    lessonPath: runtime.lessonPath,
    plannedParts: runtime.plannedParts,
    lastUpdated: '2026-09-14'
  };
};
