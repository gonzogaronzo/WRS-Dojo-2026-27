import {
  DojoMasterData,
  GroupNote,
  GroupProfile,
  GroupInstructionalProfile,
  Lesson,
  StudentProfile
} from './types';
import { normalizeWrsLessonPlan } from './wrsLessonPlan';
import { normalizeRuntimeLessonPlan, runtimeLessonToLegacyLesson } from './runtimeLesson';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : null
);

const nonEmptyString = (value: unknown, fallback = '') => (
  typeof value === 'string' && value.trim() ? value : fallback
);

const stringArray = (value: unknown): string[] => (
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    : []
);

const numberArray = (value: unknown): number[] => (
  Array.isArray(value)
    ? value.filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry))
    : []
);

const recordArray = (value: unknown): UnknownRecord[] => (
  Array.isArray(value)
    ? value.map(asRecord).filter((entry): entry is UnknownRecord => Boolean(entry))
    : []
);

const identifiedRecordArray = (value: unknown): UnknownRecord[] => (
  recordArray(value).filter(entry => Boolean(nonEmptyString(entry.id)))
);

const normalizeSlideElements = (value: unknown): Lesson['slides'][number]['elements'] => (
  identifiedRecordArray(value).map(element => ({
    ...element,
    id: nonEmptyString(element.id),
    type: element.type === 'image' || element.type === 'word' ? element.type : 'text',
    content: typeof element.content === 'string' ? element.content : '',
    x: typeof element.x === 'number' ? element.x : undefined,
    y: typeof element.y === 'number' ? element.y : undefined,
    scale: typeof element.scale === 'number' ? element.scale : undefined
  })) as Lesson['slides'][number]['elements']
);

const normalizeSlides = (value: unknown): Lesson['slides'] => (
  identifiedRecordArray(value).map(slide => ({
    ...slide,
    id: nonEmptyString(slide.id),
    type: slide.type === 'image' || slide.type === 'word' || slide.type === 'mixed' || slide.type === 'template'
      ? slide.type
      : 'text',
    title: typeof slide.title === 'string' ? slide.title : '',
    content: typeof slide.content === 'string' ? slide.content : '',
    elements: normalizeSlideElements(slide.elements),
    notes: typeof slide.notes === 'string' ? slide.notes : undefined
  })) as Lesson['slides']
);

const normalizeWordCards = (value: unknown): Lesson['wordCards'] => (
  identifiedRecordArray(value).map(card => ({
    ...card,
    id: nonEmptyString(card.id),
    text: typeof card.text === 'string' ? card.text : '',
    type: card.type === 'nonsense' || card.type === 'hfw' || card.type === 'oops' ? card.type : 'regular'
  })) as Lesson['wordCards']
);



const normalizeStudentChartingLists = (value: unknown): NonNullable<Lesson['wordListChartingByStudent']> => (
  recordArray(value).flatMap(entry => {
    const studentName = nonEmptyString(entry.studentName);
    const words = stringArray(entry.words);
    return studentName ? [{ studentName, words }] : [];
  })
);

const normalizePassageQuestions = (value: unknown): NonNullable<Lesson['passageQuestions']> => (
  recordArray(value).flatMap(entry => {
    const question = nonEmptyString(entry.question);
    const level = typeof entry.level === 'string' ? entry.level : '';
    return question && level ? [{ question, level: level as NonNullable<Lesson['passageQuestions']>[number]['level'] }] : [];
  })
);

const normalizeAffixes = (value: unknown): Lesson['affixPractice'] => (
  identifiedRecordArray(value).map(affix => ({
    ...affix,
    id: nonEmptyString(affix.id),
    text: typeof affix.text === 'string' ? affix.text : '',
    type: affix.type === 'prefix' || affix.type === 'suffix' ? affix.type : 'root',
    examples: typeof affix.examples === 'string' ? affix.examples : ''
  })) as Lesson['affixPractice']
);

const normalizeDrawingMap = (value: unknown): Record<string, unknown[]> => {
  const drawings = asRecord(value);
  if (!drawings) return {};

  return Object.fromEntries(Object.entries(drawings).map(([surface, strokes]) => [
    surface,
    identifiedRecordArray(strokes).map(stroke => ({
      ...stroke,
      id: nonEmptyString(stroke.id),
      color: typeof stroke.color === 'string' ? stroke.color : '#b91c1c',
      width: typeof stroke.width === 'number' ? stroke.width : 4,
      points: recordArray(stroke.points).filter(point => (
        typeof point.x === 'number' && typeof point.y === 'number'
      ))
    }))
  ]));
};

export const normalizeLesson = (value: unknown): Lesson | null => {
  const data = asRecord(value);
  if (!data) return null;

  const id = nonEmptyString(data.id);
  if (!id) return null;

  const runtimePlan = normalizeRuntimeLessonPlan(
    data.schemaVersion === 'wrs-runtime-v1' ? data : data.runtimePlan
  );
  const projection = runtimePlan ? runtimeLessonToLegacyLesson(runtimePlan) : null;
  const lessonData: UnknownRecord = projection ? { ...data, ...projection, id } : data;
  const dictation = asRecord(lessonData.dictation) || {};

  return {
    ...lessonData,
    schemaVersion: 2,
    id,
    title: nonEmptyString(lessonData.title, 'Untitled Lesson'),
    step: nonEmptyString(lessonData.step),
    substep: nonEmptyString(lessonData.substep),
    conceptNotes: nonEmptyString(lessonData.conceptNotes),
    conceptNotes7: typeof lessonData.conceptNotes7 === 'string' ? lessonData.conceptNotes7 : undefined,
    cipherWords: stringArray(lessonData.cipherWords),
    cipherDistractors: stringArray(lessonData.cipherDistractors),
    slides: normalizeSlides(lessonData.slides),
    quickDrill: stringArray(lessonData.quickDrill),
    quickDrillReverse: stringArray(lessonData.quickDrillReverse),
    wordCards: normalizeWordCards(lessonData.wordCards),
    wordListReading: stringArray(lessonData.wordListReading),
    wordListPractice: stringArray(lessonData.wordListPractice),
    wordListCharting: stringArray(lessonData.wordListCharting),
    wordListChartingByStudent: normalizeStudentChartingLists(lessonData.wordListChartingByStudent),
    sentences: stringArray(lessonData.sentences),
    dictation: {
      sounds: stringArray(dictation.sounds),
      realWords: stringArray(dictation.realWords),
      wordElements: stringArray(dictation.wordElements),
      nonsenseWords: stringArray(dictation.nonsenseWords),
      phrases: stringArray(dictation.phrases),
      sentences: stringArray(dictation.sentences)
    },
    hfwList: stringArray(lessonData.hfwList),
    affixPractice: normalizeAffixes(lessonData.affixPractice),
    passageTitle: typeof lessonData.passageTitle === 'string' ? lessonData.passageTitle : undefined,
    passageStudentReader: typeof lessonData.passageStudentReader === 'string' ? lessonData.passageStudentReader : undefined,
    passagePage: typeof lessonData.passagePage === 'string' ? lessonData.passagePage : undefined,
    passageQuestions: normalizePassageQuestions(lessonData.passageQuestions),
    passageHistoryStatus: lessonData.passageHistoryStatus === 'verified-next-unread' || lessonData.passageHistoryStatus === 'uncertain-flagged'
      ? lessonData.passageHistoryStatus
      : undefined,
    passageHistoryNote: typeof lessonData.passageHistoryNote === 'string' ? lessonData.passageHistoryNote : undefined,
    runtimePlan: runtimePlan || undefined,
    // Preserve the saved compatibility view; runtimePlan remains authoritative.
    wrsPlan: normalizeWrsLessonPlan(data.wrsPlan)
  } as Lesson;
};

export const normalizeStudentProfile = (id: string, value: unknown): StudentProfile => {
  const data = asRecord(value) || {};
  return {
    id,
    name: nonEmptyString(data.name, 'Unnamed Student'),
    active: typeof data.active === 'boolean' ? data.active : undefined,
    schoolYear: typeof data.schoolYear === 'string' ? data.schoolYear : undefined,
    archivedAt: typeof data.archivedAt === 'string' ? data.archivedAt : undefined,
    masteredSounds: stringArray(data.masteredSounds),
    masteredHFW: stringArray(data.masteredHFW),
    attendanceCount: typeof data.attendanceCount === 'number' ? data.attendanceCount : 0,
    lastSeen: typeof data.lastSeen === 'string' ? data.lastSeen : undefined,
    notes: typeof data.notes === 'string' ? data.notes : '',
    history: recordArray(data.history) as unknown as StudentProfile['history']
  };
};

const normalizeGroupInstructionalProfile = (value: unknown): GroupInstructionalProfile => {
  const data = asRecord(value) || {};
  const rawFocus = typeof data.lessonFocus === 'string' ? data.lessonFocus : '';
  const lessonFocus: GroupInstructionalProfile['lessonFocus'] = (
    rawFocus === 'introduction' ||
    rawFocus === 'accuracy' ||
    rawFocus === 'automaticity-fluency' ||
    rawFocus === 'mixed'
  ) ? rawFocus : '';

  return {
    schemaVersion: 1,
    currentSubstep: typeof data.currentSubstep === 'string' ? data.currentSubstep : '',
    lessonFocus,
    currentCardRepository: stringArray(data.currentCardRepository),
    reviewCardRepository: stringArray(data.reviewCardRepository),
    practicedWordElements: stringArray(data.practicedWordElements),
    highFrequencyWords: stringArray(data.highFrequencyWords),
    troubleSpots: stringArray(data.troubleSpots),
    conceptsToWeave: stringArray(data.conceptsToWeave),
    nextLessonNotes: typeof data.nextLessonNotes === 'string' ? data.nextLessonNotes : '',
    ...(data.curriculumScopeVersion === 3 ? { curriculumScopeVersion: 3 as const } :
      data.curriculumScopeVersion === 2 ? { curriculumScopeVersion: 2 as const } : {}),
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined
  };
};

export const normalizeGroupProfile = (id: string, value: unknown): GroupProfile => {
  const data = asRecord(value) || {};
  const inventory = asRecord(data.inventory) || {};
  const jobs = asRecord(data.jobs) || {};

  return {
    id,
    name: nonEmptyString(data.name, 'Unnamed Group'),
    active: typeof data.active === 'boolean' ? data.active : undefined,
    schoolYear: typeof data.schoolYear === 'string' ? data.schoolYear : undefined,
    archivedAt: typeof data.archivedAt === 'string' ? data.archivedAt : undefined,
    schedule: typeof data.schedule === 'string' ? data.schedule : undefined,
    studentIds: stringArray(data.studentIds),
    inventory: {
      learnedSounds: stringArray(inventory.learnedSounds),
      learnedHFW: stringArray(inventory.learnedHFW)
    },
    lastLessonDate: typeof data.lastLessonDate === 'string' ? data.lastLessonDate : undefined,
    jobs: jobs as GroupProfile['jobs'],
    rotationOffset: typeof data.rotationOffset === 'number' ? data.rotationOffset : undefined,
    notes: typeof data.notes === 'string' ? data.notes : '',
    instructionalProfile: normalizeGroupInstructionalProfile(data.instructionalProfile),
    savedLessons: Array.isArray(data.savedLessons)
      ? data.savedLessons.map(normalizeLesson).filter((lesson): lesson is Lesson => Boolean(lesson))
      : [],
    history: recordArray(data.history) as unknown as GroupProfile['history']
  };
};

export const normalizeGroupNote = (id: string, value: unknown): GroupNote => {
  const data = asRecord(value) || {};
  return {
    id,
    teacherId: nonEmptyString(data.teacherId),
    groupId: nonEmptyString(data.groupId),
    groupName: nonEmptyString(data.groupName, 'Unnamed Group'),
    studentIds: stringArray(data.studentIds),
    studentNames: stringArray(data.studentNames),
    content: typeof data.content === 'string' ? data.content : '',
    lessonId: typeof data.lessonId === 'string' ? data.lessonId : undefined,
    lessonTitle: typeof data.lessonTitle === 'string' ? data.lessonTitle : undefined,
    step: typeof data.step === 'string' ? data.step : undefined,
    substep: typeof data.substep === 'string' ? data.substep : undefined,
    lessonPart: typeof data.lessonPart === 'number' ? data.lessonPart : undefined,
    sessionId: typeof data.sessionId === 'string' ? data.sessionId : undefined,
    sessionDate: typeof data.sessionDate === 'string' ? data.sessionDate : undefined,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
    updatedAt: data.updatedAt
  };
};

export const normalizeActiveSession = (
  value: unknown
): NonNullable<DojoMasterData['activeSession']> | null => {
  const data = asRecord(value);
  if (!data) return null;

  const lesson = normalizeLesson(data.lesson);
  if (!lesson) return null;

  return {
    ...data,
    lesson,
    currentPart: typeof data.currentPart === 'number' ? data.currentPart : 0,
    groupId: nonEmptyString(data.groupId),
    sessionId: typeof data.sessionId === 'string' ? data.sessionId : undefined,
    sessionDate: typeof data.sessionDate === 'string' ? data.sessionDate : undefined,
    studentIds: stringArray(data.studentIds),
    scores: recordArray(data.scores) as unknown as NonNullable<DojoMasterData['activeSession']>['scores'],
    quickDrillItems: stringArray(data.quickDrillItems),
    dictationCompletedIds: stringArray(data.dictationCompletedIds),
    wordCardsActiveIds: stringArray(data.wordCardsActiveIds),
    wordCardsActiveCards: normalizeWordCards(data.wordCardsActiveCards),
    wordCardsDeck: normalizeWordCards(data.wordCardsDeck),
    wordCardsScores: numberArray(data.wordCardsScores),
    teachConceptsMarks: identifiedRecordArray(data.teachConceptsMarks),
    spellingMarks: identifiedRecordArray(data.spellingMarks),
    drawings: normalizeDrawingMap(data.drawings)
  } as NonNullable<DojoMasterData['activeSession']>;
};

export const normalizeStoredStudents = (value: unknown, fallback: StudentProfile[]): StudentProfile[] => {
  if (!Array.isArray(value)) return fallback;
  return value.flatMap(entry => {
    const data = asRecord(entry);
    const id = data ? nonEmptyString(data.id) : '';
    return id ? [normalizeStudentProfile(id, data)] : [];
  });
};

export const normalizeStoredGroups = (value: unknown, fallback: GroupProfile[]): GroupProfile[] => {
  if (!Array.isArray(value)) return fallback;
  return value.flatMap(entry => {
    const data = asRecord(entry);
    const id = data ? nonEmptyString(data.id) : '';
    return id ? [normalizeGroupProfile(id, data)] : [];
  });
};

export const normalizeStoredGroupNotes = (value: unknown): GroupNote[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap(entry => {
    const data = asRecord(entry);
    const id = data ? nonEmptyString(data.id) : '';
    return id ? [normalizeGroupNote(id, data)] : [];
  });
};
