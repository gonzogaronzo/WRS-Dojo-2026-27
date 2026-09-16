import { GroupProfile, Lesson, LessonPart, RuntimeLessonPartData, StudentProfile, WRSRuntimeLessonPlan } from './types';
import { createInitialLessonSession, LessonSessionState } from './useLessonSession';
import { sanitizePart2PresentationForStudent } from './part2Presentation';
import { sanitizePart7SpellingDataForStudent } from './components/modules/Part7SpellingRunner';

export const PRESENTER_CHANNEL = 'wrs-dojo-presenter-v1';
export const PRESENTER_STATE_KEY = 'wrs_dojo_presenter_state_v1';
export const PRESENTER_EVENT_KEY = 'wrs_dojo_presenter_event_v1';
export const PRESENTER_CODE_LENGTH = 8;
export const PRESENTER_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export type PresenterConnectionStatus = 'closed' | 'connecting' | 'connected' | 'lagging' | 'blocked';

export interface PresenterSnapshot {
  type: 'presenter-state';
  presenterId: string;
  mode: 'dashboard' | 'edit' | 'run' | 'mission';
  lesson: Lesson | null;
  currentPart: LessonPart;
  group: GroupProfile | null;
  session: LessonSessionState;
  students: StudentProfile[];
  drawingsVisible: boolean;
  revision: number;
  updatedAt: number;
}

export type PresenterMessage =
  | PresenterSnapshot
  | { type: 'student-ready'; presenterId: string; sentAt: number; revision?: number }
  | { type: 'resync-request'; presenterId: string; sentAt: number; revision?: number }
  | { type: 'student-closing'; presenterId: string; sentAt: number }
  | { type: 'teacher-closing'; presenterId: string; sentAt: number };

export const isStudentDisplayRequest = (search: string): boolean =>
  new URLSearchParams(search).get('display') === 'student';

export const requestedPresenterId = (search: string): string =>
  new URLSearchParams(search).get('presenter') || '';

export const normalizePresenterCode = (value: string): string => {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (compact.length !== PRESENTER_CODE_LENGTH) return '';
  return `${compact.slice(0, 4)}-${compact.slice(4)}`;
};

export const isPresenterCode = (value: string): boolean =>
  Boolean(normalizePresenterCode(value));

export const createPresenterCode = (
  randomValues?: Uint32Array
): string => {
  const values = randomValues || new Uint32Array(PRESENTER_CODE_LENGTH);
  if (!randomValues) {
    globalThis.crypto.getRandomValues(values);
  }
  const compact = Array.from(values)
    .slice(0, PRESENTER_CODE_LENGTH)
    .map(value => PRESENTER_CODE_ALPHABET[value % PRESENTER_CODE_ALPHABET.length])
    .join('');
  return normalizePresenterCode(compact);
};

export const presenterStateKey = (presenterId: string): string =>
  `${PRESENTER_STATE_KEY}:${presenterId}`;

export const createStudentDisplayUrl = (currentHref: string, presenterId: string): string => {
  const url = new URL(currentHref);
  url.searchParams.set('display', 'student');
  url.searchParams.set('presenter', presenterId);
  url.hash = '';
  return url.toString();
};

export const sanitizePresenterSession = (
  session: LessonSessionState,
  showDrawings = true,
  currentPart?: LessonPart
): LessonSessionState => {
  const drawingSurface = (() => {
    if (currentPart === LessonPart.Part1) return 'quick-visual';
    if (currentPart === LessonPart.Part2) return session.teachConceptsMode === 'slides'
      ? `teach-concepts-slide-${session.teachConceptsSlideIndex}`
      : 'teach-concepts-board';
    if (currentPart === LessonPart.Part5) return 'sentence';
    if (currentPart === LessonPart.Part6) return 'quick-auditory';
    if (currentPart === LessonPart.Part7) return session.teachConceptsMode === 'slides'
      ? `teach-spelling-slide-${session.teachConceptsSlideIndex}`
      : 'teach-spelling-board';
    if (currentPart === LessonPart.Part8) return `spelling-${session.spellingViewMode}-${session.spellingActiveTab}-${session.spellingGridPage}`;
    if (currentPart === LessonPart.Part9) return 'passage';
    return '';
  })();
  const drawings = showDrawings && drawingSurface && session.drawings[drawingSurface]
    ? { [drawingSurface]: session.drawings[drawingSurface] }
    : currentPart === undefined && showDrawings
      ? session.drawings
      : {};

  // Preserve the legacy full-session sanitizer for callers that do not specify a
  // lesson part. Live presenter frames use the compact, part-specific path below.
  if (currentPart === undefined) {
    return {
      ...session,
      scores: [],
      notes: '',
      drawings,
      teachConceptsMarks: showDrawings ? session.teachConceptsMarks : [],
      teachConceptsSlideMarks: showDrawings ? session.teachConceptsSlideMarks : {},
      spellingMarks: showDrawings ? session.spellingMarks : []
    };
  }

  const compact: LessonSessionState = {
    ...createInitialLessonSession(),
    sessionId: session.sessionId,
    sessionDate: session.sessionDate,
    studentIds: session.studentIds,
    drawings
  };

  if (currentPart === LessonPart.Part1 || currentPart === LessonPart.Part6) {
    compact.quickDrillIndex = session.quickDrillIndex;
    compact.quickDrillRevealed = session.quickDrillRevealed;
    compact.quickDrillHandwriting = session.quickDrillHandwriting;
    compact.quickDrillItems = session.quickDrillItems;
  } else if (currentPart === LessonPart.Part2 || currentPart === LessonPart.Part7) {
    const branch = currentPart === LessonPart.Part7 ? 'spelling' : 'reading';
    compact.teachConceptsMode = session.teachConceptsMode;
    compact.teachConceptsBoardText = session.teachConceptsBoardText;
    compact.teachConceptsBoardTitle = session.teachConceptsBoardTitle;
    compact.teachConceptsBoardNotes = session.teachConceptsBoardNotes;
    compact.teachConceptsMarks = showDrawings ? session.teachConceptsMarks : [];
    compact.teachConceptsSlideIndex = session.teachConceptsSlideIndex;
    compact.teachConceptsCipherIdx = session.teachConceptsCipherIdx;
    compact.teachConceptsCipherResults = {
      [branch]: session.teachConceptsCipherResults[branch] || {}
    };
    compact.teachConceptsCipherCheckResults = {
      [branch]: session.teachConceptsCipherCheckResults[branch] || null
    };
    compact.teachConceptsSyllabicated = session.teachConceptsSyllabicated;
    compact.teachConceptsSlideMarks = showDrawings
      ? { [branch]: session.teachConceptsSlideMarks[branch] || {} }
      : {};
    compact.teachConceptsSlideObjectStates = {
      [branch]: session.teachConceptsSlideObjectStates[branch] || {}
    };
    compact.teachConceptsSlideFullscreen = {
      [branch]: Boolean(session.teachConceptsSlideFullscreen[branch])
    };
  } else if (currentPart === LessonPart.Part3) {
    compact.wordCards = session.wordCards;
  } else if (currentPart === LessonPart.Part4) {
    compact.distribution = session.distribution;
    compact.wordlistPage = session.wordlistPage;
  } else if (currentPart === LessonPart.Part5) {
    compact.sentenceIndex = session.sentenceIndex;
  } else if (currentPart === LessonPart.Part8) {
    compact.dictationCompletedIds = session.dictationCompletedIds;
    compact.spellingViewMode = session.spellingViewMode;
    compact.spellingSectionOrderVersion = session.spellingSectionOrderVersion;
    compact.spellingActiveTab = session.spellingActiveTab;
    compact.spellingRevealedItems = session.spellingRevealedItems;
    compact.spellingCipherWord = session.spellingCipherWord;
    compact.spellingCipherResults = session.spellingCipherResults;
    compact.spellingCipherCheckResult = session.spellingCipherCheckResult;
    compact.spellingGridPage = session.spellingGridPage;
    compact.spellingIsSyllabicated = session.spellingIsSyllabicated;
    compact.spellingMarks = showDrawings ? session.spellingMarks : [];
  } else if (currentPart === LessonPart.Part9) {
    compact.passageIndex = session.passageIndex;
    compact.passageRulerEnabled = session.passageRulerEnabled;
    compact.passageRulerY = session.passageRulerY;
    compact.passagePhase = session.passagePhase;
    compact.passageQuestionIndex = session.passageQuestionIndex;
  }

  return compact;
};

const emptyDictation = (): Lesson['dictation'] => ({
  sounds: [], realWords: [], wordElements: [], nonsenseWords: [], phrases: [], sentences: []
});

const studentRuntimeForPart = (
  runtime: WRSRuntimeLessonPlan,
  partNumber: number,
  data: RuntimeLessonPartData
): WRSRuntimeLessonPlan => ({
  schemaVersion: runtime.schemaVersion,
  id: runtime.id,
  title: runtime.title,
  step: runtime.step,
  substep: runtime.substep,
  focus: runtime.focus,
  lessonPath: runtime.lessonPath,
  plannedParts: runtime.plannedParts,
  sources: [],
  parts: runtime.parts.map(part => ({
    part: part.part,
    title: '',
    teacherDirections: [],
    sourceIds: [],
    data: part.part === partNumber ? data : {}
  }))
});

const studentPart9Data = (data: RuntimeLessonPartData): RuntimeLessonPartData => {
  const raw = data as Record<string, unknown>;
  const questions = Array.isArray(raw.questions)
    ? raw.questions.flatMap(candidate => {
        const question = candidate && typeof candidate === 'object' && !Array.isArray(candidate)
          ? (candidate as Record<string, unknown>).question
          : undefined;
        return typeof question === 'string' && question.trim() ? [{ question }] : [];
      })
    : [];
  return {
    passageTitle: typeof data.passageTitle === 'string' ? data.passageTitle : undefined,
    studentReader: typeof data.studentReader === 'string' ? data.studentReader : undefined,
    page: typeof data.page === 'string' ? data.page : undefined,
    questions
  } as RuntimeLessonPartData;
};

const studentListeningPlan = (plan: Lesson['listeningComprehension']) => plan ? ({
  mode: 'teacher-selected' as const,
  title: '',
  teacherDirections: [],
  studentPrompt: plan.studentPrompt,
  sourceIds: [],
  ...(plan.workspace ? { workspace: plan.workspace } : {})
}) : undefined;

export const sanitizePresenterLesson = (
  lesson: Lesson | null,
  currentPart: LessonPart
): Lesson | null => {
  if (!lesson) return null;
  const compact: Lesson = {
    id: lesson.id,
    title: lesson.title,
    step: lesson.step,
    substep: lesson.substep,
    conceptNotes: '',
    slides: [],
    quickDrill: [],
    wordCards: [],
    sentences: [],
    dictation: emptyDictation(),
    hfwList: [],
    affixPractice: [],
    lastUpdated: lesson.lastUpdated
  };

  if (currentPart === LessonPart.Part1) {
    compact.quickDrill = lesson.quickDrill;
  } else if (currentPart === LessonPart.Part2 || currentPart === LessonPart.Part7) {
    compact.slides = (lesson.slides || []).map(slide => ({ ...slide, notes: undefined }));
    compact.googleSlidesUrl = lesson.googleSlidesUrl;
    compact.cipherWords = lesson.cipherWords;
    compact.cipherDistractors = lesson.cipherDistractors;

    // Keep the passive display on the same source-owned Part 2 move while
    // deliberately excluding every private cue, direction, source reference,
    // save hint, and all other runtime lesson content.
    if (currentPart === LessonPart.Part2 && lesson.runtimePlan) {
      const part2 = lesson.runtimePlan.parts.find(part => part.part === 2);
      const studentPart2Presentation = sanitizePart2PresentationForStudent(part2?.data.part2Presentation);
      if (studentPart2Presentation !== undefined) {
        compact.runtimePlan = {
          schemaVersion: lesson.runtimePlan.schemaVersion,
          id: lesson.runtimePlan.id,
          title: lesson.runtimePlan.title,
          step: lesson.runtimePlan.step,
          substep: lesson.runtimePlan.substep,
          focus: lesson.runtimePlan.focus,
          lessonPath: lesson.runtimePlan.lessonPath,
          plannedParts: lesson.runtimePlan.plannedParts,
          sources: [],
          parts: lesson.runtimePlan.parts.map(part => ({
            part: part.part,
            title: '',
            teacherDirections: [],
            sourceIds: [],
            data: part.part === 2 ? { part2Presentation: studentPart2Presentation } : {}
          }))
        };
      }
    }

    // Part 7 carries the exact reveal cards to the passive display, but never
    // the dictated target spelling or teacher cue. Reveal state itself travels
    // in the already-sanitized lesson session.
    if (currentPart === LessonPart.Part7 && lesson.runtimePlan) {
      const part7 = lesson.runtimePlan.parts.find(part => part.part === 7);
      const studentPart7Data = sanitizePart7SpellingDataForStudent(part7?.data);
      if (studentPart7Data !== undefined) {
        compact.runtimePlan = {
          schemaVersion: lesson.runtimePlan.schemaVersion,
          id: lesson.runtimePlan.id,
          title: lesson.runtimePlan.title,
          step: lesson.runtimePlan.step,
          substep: lesson.runtimePlan.substep,
          focus: lesson.runtimePlan.focus,
          lessonPath: lesson.runtimePlan.lessonPath,
          plannedParts: lesson.runtimePlan.plannedParts,
          sources: [],
          parts: lesson.runtimePlan.parts.map(part => ({
            part: part.part,
            title: '',
            teacherDirections: [],
            sourceIds: [],
            data: part.part === 7 ? studentPart7Data : {}
          }))
        };
      }
    }
  } else if (currentPart === LessonPart.Part3 || currentPart === LessonPart.Part4) {
    compact.wordCards = lesson.wordCards;
    compact.wordListReading = lesson.wordListReading;
    compact.wordListReadingAuto = lesson.wordListReadingAuto;
    compact.hfwList = lesson.hfwList;
    compact.dictation = lesson.dictation;
  } else if (currentPart === LessonPart.Part5) {
    compact.sentences = lesson.sentences;
  } else if (currentPart === LessonPart.Part6) {
    compact.quickDrill = lesson.quickDrill;
    compact.quickDrillReverse = lesson.quickDrillReverse;
    const part6 = lesson.runtimePlan?.parts.find(part => part.part === 6);
    if (lesson.runtimePlan && part6) {
      compact.runtimePlan = studentRuntimeForPart(lesson.runtimePlan, 6, {
        wordElements: Array.isArray(part6.data.wordElements)
          ? part6.data.wordElements.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          : []
      });
    }
  } else if (currentPart === LessonPart.Part8) {
    compact.dictation = lesson.dictation;
  } else if (currentPart === LessonPart.Part9) {
    compact.passage = lesson.passage;
    const part9 = lesson.runtimePlan?.parts.find(part => part.part === 9);
    if (lesson.runtimePlan && part9) {
      compact.runtimePlan = studentRuntimeForPart(lesson.runtimePlan, 9, studentPart9Data(part9.data));
    }
  } else if (currentPart === LessonPart.Part10) {
    const part10 = lesson.runtimePlan?.parts.find(part => part.part === 10);
    const plan = lesson.listeningComprehension || part10?.data.listeningComprehension;
    compact.listeningComprehension = studentListeningPlan(plan);
  }

  return {
    ...compact,
    conceptNotes: '',
    conceptNotes7: ''
  };
};

export const sanitizePresenterStudents = (students: StudentProfile[]): StudentProfile[] =>
  students.filter((student): student is StudentProfile => Boolean(student?.id)).map(student => ({
    id: student.id,
    name: student.name,
    masteredSounds: [],
    masteredHFW: [],
    attendanceCount: 0,
    notes: '',
    history: []
  }));

export const sanitizePresenterGroup = (group: GroupProfile | null): GroupProfile | null => group ? ({
  ...group,
  notes: '',
  savedLessons: [],
  history: []
}) : null;

export const createPresenterSnapshot = (
  presenterId: string,
  mode: PresenterSnapshot['mode'],
  lesson: Lesson | null,
  currentPart: LessonPart,
  group: GroupProfile | null,
  session: LessonSessionState,
  students: StudentProfile[],
  showDrawings = true,
  revision = 0
): PresenterSnapshot => ({
  type: 'presenter-state',
  presenterId,
  mode,
  lesson: sanitizePresenterLesson(lesson, currentPart),
  currentPart,
  group: sanitizePresenterGroup(group),
  session: sanitizePresenterSession(session, showDrawings, currentPart),
  students: sanitizePresenterStudents(students),
  drawingsVisible: showDrawings,
  revision,
  updatedAt: Date.now()
});

export const presenterSnapshotOrder = (snapshot: Pick<PresenterSnapshot, 'revision' | 'updatedAt'>) => (
  snapshot.revision > 0 ? snapshot.revision : snapshot.updatedAt
);

export const isNewerPresenterSnapshot = (
  incoming: PresenterSnapshot,
  lastOrder: number
) => presenterSnapshotOrder(incoming) > lastOrder;

export const isPresenterSnapshot = (value: unknown): value is PresenterSnapshot => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PresenterSnapshot>;
  return candidate.type === 'presenter-state' &&
    typeof candidate.presenterId === 'string' && candidate.presenterId.length > 0 &&
    typeof candidate.currentPart === 'number' &&
    (candidate.revision === undefined || typeof candidate.revision === 'number') &&
    Boolean(candidate.session) &&
    Array.isArray(candidate.students);
};

export const serializePresenterSnapshot = (snapshot: PresenterSnapshot): string => JSON.stringify(snapshot);

export const deserializePresenterSnapshot = (value: unknown): PresenterSnapshot | null => {
  if (isPresenterSnapshot(value)) return value;
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return isPresenterSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
};
