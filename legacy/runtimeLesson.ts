import {
  DictationSection,
  Lesson,
  LessonFocus,
  LessonPath,
  LessonSourceKind,
  LessonSourceReference,
  RuntimeLessonPart,
  RuntimeLessonPartData,
  RuntimePassageHistoryStatus,
  RuntimePassageQuestion,
  RuntimePlanningContext,
  RuntimeStudentChartingList,
  WRSRuntimeLessonPlan,
  WrsLessonPlan,
  WrsSourceReference
} from './types';
import {
  normalizePart2Presentation,
  part2InteractivePresentationFromData,
  part2PresentationToSlides
} from './part2Presentation';
import { validateInstructionalLessonContract } from './instructionalLessonContract';

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

const nonEmptyStrings = (value: unknown): string[] => strings(value).map(entry => entry.trim()).filter(Boolean);
const hasOwn = (record: UnknownRecord | null | undefined, key: string) => Boolean(record && Object.prototype.hasOwnProperty.call(record, key));
const uniqueStrings = (values: string[]) => Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));

const studentChartingListsFrom = (value: unknown): RuntimeStudentChartingList[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap(candidate => {
    const record = asRecord(candidate);
    const studentName = text(record?.studentName).trim();
    const words = nonEmptyStrings(record?.words);
    return studentName ? [{ studentName, words }] : [];
  });
};

const passageQuestionsFrom = (value: unknown): RuntimePassageQuestion[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap(candidate => {
    const record = asRecord(candidate);
    const question = text(record?.question).trim();
    const level = text(record?.level).trim();
    return question && level
      ? [{ question, level: level as RuntimePassageQuestion['level'] }]
      : [];
  });
};

const passageHistoryStatusFrom = (value: unknown): RuntimePassageHistoryStatus | undefined => (
  value === 'verified-next-unread' || value === 'uncertain-flagged'
    ? value
    : undefined
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
  verification: source.verification === 'needs-verification'
    ? 'needs-verification'
    : source.kind === 'teacher-selection'
      ? 'teacher-created'
      : 'verified',
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

const partText = (part: RuntimeLessonPart | undefined): string => (
  text(part?.data.conceptNotes) || part?.teacherDirections.join('\n') || ''
);

const runtimeLessonToCompatibilityWrsPlan = (runtime: WRSRuntimeLessonPlan): WrsLessonPlan => {
  const part = (number: RuntimeLessonPart['part']) => runtime.parts.find(candidate => candidate.part === number);
  const part1 = part(1);
  const part2 = part(2);
  const part3 = part(3);
  const part4 = part(4);
  const part5 = part(5);
  const part6 = part(6);
  const part7 = part(7);
  const part8 = part(8);
  const part9 = part(9);
  const part10 = part(10);
  const p4Reader = text(part4?.data.studentReader);
  const p5Reader = text(part5?.data.studentReader);
  const p9Reader = text(part9?.data.studentReader);
  const dictation = part8?.data.dictation || emptyDictation();
  const part10Data = asRecord(part10?.data);

  return {
    version: 1,
    date: '',
    lessonNumber: runtime.id,
    studentNameOrGroup: '',
    lessonFocus: runtime.focus === 'automaticity-fluency' ? 'fluency' : runtime.focus,
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
      reviewConcepts: partText(part2),
      reviewWords: nonEmptyStrings(part2?.data.reviewWords).join(', '),
      currentConcepts: partText(part2),
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
      reviewConcepts: partText(part7),
      reviewWordsAndElements: nonEmptyStrings(part7?.data.reviewWords).join(', '),
      currentConcepts: partText(part7),
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
        ...nonEmptyStrings(dictation.realWords)
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
      followUpQuestions: passageQuestionsFrom(part9?.data.questions).map(item => item.question).join('\n')
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

const sourceKindFrom = (value: unknown): LessonSourceKind | null => {
  const allowed: LessonSourceKind[] = [
    'step-instruction', 'instructor-manual', 'dictation-book',
    'student-reader', 'student-notebook', 'teacher-selection'
  ];
  return allowed.includes(value as LessonSourceKind) ? value as LessonSourceKind : null;
};

const normalizeSource = (value: unknown): LessonSourceReference | null => {
  const source = asRecord(value);
  const kind = sourceKindFrom(source?.kind);
  if (!source || !text(source.id) || !kind) return null;
  return {
    id: text(source.id),
    label: text(source.label),
    kind,
    edition: text(source.edition) || undefined,
    locator: text(source.locator) || undefined,
    notes: text(source.notes) || undefined,
    verification: source.verification === 'needs-verification' ? 'needs-verification' : 'verified'
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
  const part2Presentation = asRecord(part2?.data.part2Presentation);
  const semanticPart2Slides = hasOwn(part2Presentation, 'frames')
    ? part2PresentationToSlides(part2?.data) || []
    : part2?.data.slides || [];
  const practiceWords = nonEmptyStrings(part4?.data.practiceWords);
  const chartingPlanned = part4?.data.chartingPlanned === true;
  const studentChartingLists = chartingPlanned
    ? studentChartingListsFrom(part4?.data.studentChartingLists)
    : [];
  const chartingPool = uniqueStrings([
    ...nonEmptyStrings(part4?.data.chartingWords),
    ...studentChartingLists.flatMap(list => list.words)
  ]);
  const passageQuestions = passageQuestionsFrom(part9?.data.questions);
  const passageHistoryStatus = passageHistoryStatusFrom(part9?.data.historyStatus);

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
    wordListCharting: chartingPlanned ? chartingPool : [],
    wordListReading: chartingPlanned ? chartingPool : practiceWords,
    wordListChartingByStudent: studentChartingLists,
    wordListMode: chartingPlanned ? 'charting' : 'practice',
    wordListTargetCount: chartingPlanned ? 15 : practiceWords.length,
    wordListReadingAuto: chartingPlanned,
    sentences: part5?.data.sentences || [],
    dictation: part8?.data.dictation || emptyDictation(),
    hfwList: part3?.data.hfwList || [],
    affixPractice: [],
    passage: text(part9?.data.passage),
    passageTitle: text(part9?.data.passageTitle),
    passageStudentReader: text(part9?.data.studentReader),
    passagePage: text(part9?.data.page),
    passageQuestions,
    passageHistoryStatus,
    passageHistoryNote: passageHistoryStatus === 'uncertain-flagged' ? text(part9?.data.historyNote) : undefined,
    lessonFocus: runtime.focus,
    sourceMetadata: runtime.sources,
    runtimePlan: runtime,
    listeningComprehension: part10?.data.listeningComprehension,
    lessonPath: runtime.lessonPath,
    plannedParts: runtime.plannedParts,
    lastUpdated: '2026-09-13'
  };
};

export const validatePart2RuntimePresentation = (partData: unknown): string[] => {
  const data = asRecord(partData);
  const presentation = asRecord(data?.part2Presentation);
  if (!presentation) return ['Part 2 interactive presentation is missing.'];

  const interactive = part2InteractivePresentationFromData(data);
  if (!interactive) return ['Part 2 interactive presentation is missing interactiveSteps.'];

  const errors = interactive.steps.flatMap(step => (
    step.kind === 'invalid'
      ? ['Part 2 interactive presentation invalid at ' + step.id + ': ' + step.reason]
      : []
  ));

  if (hasOwn(presentation, 'frames')) {
    const semantic = normalizePart2Presentation(presentation);
    for (const frame of semantic.frames) {
      if (frame.kind === 'invalid') {
        errors.push('Part 2 semantic presentation invalid at ' + frame.id + ': ' + frame.reason);
      }
    }
  }

  return errors;
};

export const validateLessonModuleReadiness = (
  lesson: Lesson,
  runtime?: WRSRuntimeLessonPlan
): string[] => {
  const planned = runtime?.plannedParts || lesson.plannedParts || Array.from({ length: 10 }, (_, index) => index + 1) as RuntimeLessonPart['part'][];
  const includes = (part: RuntimeLessonPart['part']) => planned.includes(part);
  const errors: string[] = [];

  if (includes(1) && !lesson.quickDrill.length) errors.push('Part 1 Quick Drill missing.');
  if (includes(2) && !lesson.slides.length && !runtime) errors.push('Part 2 interactive presentation invalid or unavailable.');
  if (includes(3) && !lesson.wordCards.length) errors.push('Part 3 Word Cards unavailable.');
  const plannedPart4 = runtime?.parts.find(part => part.part === 4);
  const chartingRequired = plannedPart4?.data.chartingPlanned === true || lesson.wordListMode === 'charting';
  if (includes(4) && (
    !lesson.wordListPractice?.length ||
    !lesson.wordListReading?.length ||
    (chartingRequired && !lesson.wordListCharting?.length)
  )) {
    errors.push(chartingRequired
      ? 'Part 4 practice/charting missing or incompatible with legacy Wordlist Reading.'
      : 'Part 4 targeted practice missing or incompatible with legacy Wordlist Reading.');
  }
  if (includes(5) && lesson.sentences.length !== 10) errors.push('Part 5 needs exactly 10 sentences.');
  if (includes(6) && !(lesson.quickDrillReverse || []).length) errors.push('Part 6 reverse Quick Drill missing.');
  if (includes(7) && !(lesson.conceptNotes7 || '').trim()) errors.push('Part 7 spelling projection missing.');
  if (includes(8) && !Object.values(lesson.dictation).some(items => items.length)) errors.push('Part 8 dictation category missing.');
  if (includes(9) && (!(lesson.passage || '').trim() || !lesson.passageTitle || !lesson.passageQuestions?.length)) {
    errors.push('Part 9 passage/questions missing or unsupported.');
  }

  return errors;
};

const sourceManifestErrors = (runtime: WRSRuntimeLessonPlan): string[] => {
  const sourceIds = new Set(runtime.sources.map(source => source.id));
  const errors: string[] = [];
  if (!sourceIds.size) errors.push('Source manifest missing.');

  for (const part of runtime.parts.filter(candidate => candidate.part < 10)) {
    if (!part.sourceIds.length) {
      errors.push('Part ' + part.part + ' has no source reference.');
      continue;
    }
    const unknown = part.sourceIds.filter(sourceId => !sourceIds.has(sourceId));
    if (unknown.length) {
      errors.push('Part ' + part.part + ' cites unregistered source IDs: ' + unknown.join(', ') + '.');
    }
  }

  return errors;
};

const expectedReversePrompt = (value: string) => {
  const segments = value.split('→');
  if (segments.length !== 2 || !segments[0].trim() || !segments[1].trim()) return false;
  const response = segments[1].split('-').map(segment => segment.trim()).filter(Boolean);
  return response.length >= 2 && /^\/.+\/$/.test(response[response.length - 1]);
};

const questionLevels = new Set<RuntimePassageQuestion['level']>([
  'direct-recall', 'sequence', 'cause-effect', 'important-detail', 'vocabulary-in-context',
  'relationship', 'reasoning', 'explanation', 'inference', 'evidence-based-interpretation', 'synthesis'
]);

export interface RuntimeCompatibilityResult {
  runtime: WRSRuntimeLessonPlan;
  lesson: Lesson;
}

/**
 * Fail-closed import/export gate. runtimePlan remains authoritative; the
 * legacy Lesson shape is a deterministic compatibility projection only.
 */
export const validateRuntimeLessonCompatibility = (
  input: WRSRuntimeLessonPlan
): RuntimeCompatibilityResult => {
  const runtime = validateRuntimeLesson(input);
  const instructional = validateInstructionalLessonContract(runtime);
  if (!instructional.ok) {
    throw new Error(instructional.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  }

  const byPart = (number: RuntimeLessonPart['part']) => runtime.parts.find(part => part.part === number)!;
  const errors = sourceManifestErrors(runtime);
  const expectedParts = Array.from({ length: 10 }, (_, index) => index + 1) as RuntimeLessonPart['part'][];
  const planned = [...(runtime.plannedParts || [])].sort((left, right) => left - right);

  if (runtime.lessonPath !== 'full' || planned.length !== expectedParts.length || planned.some((part, index) => part !== expectedParts[index])) {
    errors.push('Compatibility projection incomplete: lessonPath and plannedParts must make Parts 1-10 available.');
  }

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

  if (!nonEmptyStrings(part1.data.quickDrill).length) errors.push('Part 1 Quick Drill missing.');

  errors.push(...validatePart2RuntimePresentation(part2.data));
  const interactive = part2InteractivePresentationFromData(part2.data);
  const manifest = new Set(runtime.sources.map(source => source.id));
  if (interactive) {
    for (const step of interactive.steps) {
      if (step.kind === 'step') {
        const unknown = step.sourceRef.sourceIds.filter(sourceId => !manifest.has(sourceId));
        if (unknown.length) {
          errors.push('Part 2 interactive step ' + step.id + ' cites unregistered source IDs: ' + unknown.join(', ') + '.');
        }
      }
    }
  }
  const semanticPresentation = asRecord(part2.data.part2Presentation);
  const semanticFrames = Array.isArray(semanticPresentation?.frames) ? semanticPresentation.frames : [];
  for (const frame of semanticFrames) {
    const sourceIds = strings(asRecord(frame)?.sourceIds);
    const unknown = sourceIds.filter(sourceId => !manifest.has(sourceId));
    if (unknown.length) {
      errors.push('Part 2 semantic frame cites unregistered source IDs: ' + unknown.join(', ') + '.');
    }
  }

  if (!(part3.data.wordCards || []).length) errors.push('Part 3 Word Cards unavailable.');

  const practiceWords = nonEmptyStrings(part4.data.practiceWords);
  const chartingWords = nonEmptyStrings(part4.data.chartingWords);
  const chartingLists = studentChartingListsFrom(part4.data.studentChartingLists);
  const chartingPlanned = part4.data.chartingPlanned === true;
  if (!practiceWords.length || (chartingPlanned && !chartingWords.length && !chartingLists.length)) {
    errors.push(chartingPlanned
      ? 'Part 4 practice/charting missing or incompatible.'
      : 'Part 4 targeted practice missing or incompatible.');
  }
  if (!chartingPlanned && (chartingWords.length || chartingLists.length)) {
    errors.push('Part 4 marks charting as unplanned but carries a formal charting payload.');
  }
  if (chartingLists.length) {
    const names = new Set<string>();
    for (const list of chartingLists) {
      if (names.has(list.studentName) || list.words.length !== 15) {
        errors.push('Part 4 charting list for ' + list.studentName + ' must contain exactly 15 usable words.');
      }
      names.add(list.studentName);
    }
  }

  if (nonEmptyStrings(part5.data.sentences).length !== 10) errors.push('Part 5 needs exactly 10 sentences.');

  const reversePrompts = nonEmptyStrings(part6.data.quickDrillReverse || part6.data.quickDrill);
  if (!reversePrompts.length) {
    errors.push('Part 6 reverse Quick Drill missing.');
  } else if (reversePrompts.some(prompt => !expectedReversePrompt(prompt))) {
    errors.push('Part 6 invalid or ambiguous vowel/response prompt; use a full expected-response prompt such as /a/ → a-apple-/ă/.');
  }

  if (!nonEmptyStrings(part7.data.reviewWords).length || !nonEmptyStrings(part7.data.currentWords).length) {
    errors.push('Part 7 reviewWords/currentWords missing.');
  }

  const dictation = asRecord(part8.data.dictation);
  const dictationCategories = ['sounds', 'realWords', 'wordElements', 'nonsenseWords', 'phrases', 'sentences'];
  if (!dictation || dictationCategories.some(category => !Array.isArray(dictation[category]))) {
    errors.push('Part 8 dictation category missing.');
  }

  const questions = Array.isArray(part9.data.questions) ? part9.data.questions : [];
  if (!text(part9.data.passage).trim() || !text(part9.data.passageTitle).trim() || !text(part9.data.studentReader).trim() || !text(part9.data.page).trim()) {
    errors.push('Part 9 passage/questions missing or unsupported.');
  }
  if (questions.length !== 10 || questions.some(question => {
    const record = asRecord(question);
    return !text(record?.question).trim() || !questionLevels.has(text(record?.level) as RuntimePassageQuestion['level']);
  })) {
    errors.push('Part 9 passage/questions missing or unsupported: exactly 10 structured questions are required.');
  }
  const historyStatus = passageHistoryStatusFrom(part9.data.historyStatus);
  if (!historyStatus || (historyStatus === 'uncertain-flagged' && !text(part9.data.historyNote).trim())) {
    errors.push('Part 9 passage history is unverified; provide a verified status or an explicit uncertainty flag.');
  }

  const part10Data = asRecord(part10.data);
  if (!part10.data.listeningComprehension && part10Data?.teacherPlanStatus !== 'TBD') {
    errors.push('Part 10 must remain TBD unless a supported listening-comprehension payload is supplied.');
  }

  const legacyLesson = runtimeLessonToLegacyLesson(runtime);
  const lesson: Lesson = {
    ...legacyLesson,
    wrsPlan: runtimeLessonToCompatibilityWrsPlan(runtime)
  };
  errors.push(...validateLessonModuleReadiness(lesson, runtime));

  if (errors.length) throw new Error(Array.from(new Set(errors)).join('\n'));
  return { runtime, lesson };
};
