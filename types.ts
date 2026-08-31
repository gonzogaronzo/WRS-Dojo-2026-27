
export interface WordCard {
  id: string;
  text: string;
  type: 'regular' | 'nonsense' | 'hfw' | 'oops';
}

export interface AffixEntry {
  id: string;
  text: string;
  type: 'root' | 'prefix' | 'suffix';
  examples: string;
}

export interface DictationSection {
  sounds: string[];
  realWords: string[];
  wordElements: string[];
  nonsenseWords: string[];
  phrases: string[];
  sentences: string[];
}

export type LessonFocus = 'introduction' | 'accuracy' | 'automaticity-fluency' | 'mixed';

export type LessonSourceKind =
  | 'step-instruction'
  | 'instructor-manual'
  | 'dictation-book'
  | 'student-reader'
  | 'student-notebook'
  | 'teacher-selection';

export interface LessonSourceReference {
  id: string;
  label: string;
  kind: LessonSourceKind;
  edition?: string;
  locator?: string;
  notes?: string;
}

export interface RuntimePlanningContext {
  conceptsToWeave: string;
  troubleSpots: string;
}

export interface ListeningComprehensionPlan {
  mode: 'teacher-selected';
  title: string;
  teacherDirections: string[];
  studentPrompt: string;
  sourceIds: string[];
  workspace?: {
    mode: 'whiteboard';
    tools: Array<'draw' | 'sticky-notes'>;
  };
}

export interface RuntimeLessonPartData {
  quickDrill?: string[];
  conceptNotes?: string;
  slides?: Slide[];
  wordCards?: WordCard[];
  hfwList?: string[];
  practiceWords?: string[];
  chartingWords?: string[];
  chartingType?: 'real' | 'nonsense';
  sentences?: string[];
  quickDrillReverse?: string[];
  wordElements?: string[];
  reviewWords?: string[];
  currentWords?: string[];
  dictation?: DictationSection;
  phraseSelectionNote?: string;
  passage?: string;
  passageTitle?: string;
  studentReader?: string;
  page?: string;
  listeningComprehension?: ListeningComprehensionPlan;
}

export interface RuntimeLessonPart {
  part: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  title: string;
  teacherDirections: string[];
  sourceIds: string[];
  data: RuntimeLessonPartData;
}

export type LessonPath = 'block1+3' | 'block2+3' | 'full';

export interface WRSRuntimeLessonPlan {
  schemaVersion: 'wrs-runtime-v1';
  id: string;
  title: string;
  step: string;
  substep: string;
  focus: LessonFocus;
  lessonPath?: LessonPath;
  plannedParts?: RuntimeLessonPart['part'][];
  planningContext?: RuntimePlanningContext;
  sources: LessonSourceReference[];
  parts: RuntimeLessonPart[];
}

export type WrsLessonFocus = '' | 'introduction' | 'accuracy' | 'fluency';
export type WrsWordType = 'real' | 'nonsense';
export type WrsVerificationStatus = 'draft' | 'partially-verified' | 'source-verified';

export interface WrsSourceReference {
  id: string;
  sourceType: 'step-instruction' | 'instructor-manual' | 'dictation-book' | 'student-reader' | 'notebook-answer-key' | 'inventory' | 'teacher-created';
  title: string;
  edition: string;
  locator: string;
  verification: 'verified' | 'needs-verification' | 'teacher-created';
  notes: string;
}

export interface WrsLessonPlan {
  version: 1;
  date: string;
  lessonNumber: string;
  studentNameOrGroup: string;
  lessonFocus: WrsLessonFocus;
  conceptsToWeave: string;
  wordTypesToChart: WrsWordType[];
  troubleSpots: string;
  verificationStatus: WrsVerificationStatus;
  sources: WrsSourceReference[];
  part1: {
    vowels: string;
    consonants: string;
    welded: string;
    addToNotebook: string;
    drillLeader: string;
  };
  part2: {
    reviewConcepts: string;
    reviewWords: string;
    currentConcepts: string;
    currentWords: string;
    addToNotebook: string;
  };
  part3: {
    substeps: string;
    activity: string;
    vocabularyWords: string;
    addVocabularyToNotebook: boolean;
    addHfwToNotebook: boolean;
  };
  part4: {
    studentReader: '' | 'AB' | 'A' | 'B';
    practicePage: string;
    practiceHalf: '' | 'top' | 'bottom';
    chartingPage: string;
    chartingHalf: '' | 'top' | 'bottom';
    anticipatedErrors: string;
    groupActivity: string;
  };
  part5: {
    studentReader: '' | 'AB' | 'B';
    page: string;
    anticipatedErrors: string;
    notes: string;
  };
  part6: {
    vowels: string;
    consonants: string;
    welded: string;
    wordElements: string;
  };
  part7: {
    reviewConcepts: string;
    reviewWordsAndElements: string;
    currentConcepts: string;
    currentWordsAndElements: string;
    highFrequencyWords: string;
    addToNotebook: string;
  };
  part8: {
    notes: string;
  };
  part9: {
    title: string;
    page: string;
    source: '' | 'student-reader' | 'wilson-fluency-kit' | 'other-wrs-controlled';
    studentReader: '' | 'AB' | 'B';
    comprehensionMode: '' | 'silent' | 'oral';
    repeatedReading: boolean;
    vocabulary: string;
    followUpQuestions: string;
  };
  part10: {
    selectionStatus: 'planned' | 'teacher-selected-at-lesson';
    source: string;
    title: string;
    pages: string;
    tasks: Array<'listening-comprehension' | 'interactive-oral-reading' | 'scaffolded-silent-reading' | 'oral-fluency'>;
    notes: string;
  };
  additionalNotes: string;
}

export interface SlideElement {
  id: string;
  type: 'text' | 'image' | 'word';
  content: string;
  x?: number;
  y?: number;
  scale?: number;
}

export interface Slide {
  id: string;
  type: 'text' | 'image' | 'word' | 'mixed' | 'template'; // 'mixed' is the new default for multi-element
  title: string;
  content: string; // Keep as fallback/legacy
  elements?: SlideElement[]; // New layered architecture
  notes?: string;
}

export interface WordlistScore {
  studentId: string;
  instanceId: string; 
  wordText: string;   
  status: 'correct' | 'error' | 'none';
}

export interface Lesson {
  schemaVersion?: 2;
  id: string;
  title: string; 
  step: string;
  substep: string;
  conceptNotes: string;
  conceptNotes7?: string; 
  cipherWords?: string[]; 
  cipherDistractors?: string[];
  googleSlidesUrl?: string;
  slides: Slide[];
  quickDrill: string[];
  quickDrillReverse?: string[];
  wordCards: WordCard[];
  wordListReading?: string[];
  wordListPractice?: string[];
  wordListCharting?: string[];
  wordListReadingAuto?: boolean;
  sentences: string[];
  dictation: DictationSection;
  hfwList: string[];
  affixPractice: AffixEntry[];
  passage?: string;
  lessonFocus?: LessonFocus;
  sourceMetadata?: LessonSourceReference[];
  runtimePlan?: WRSRuntimeLessonPlan;
  listeningComprehension?: ListeningComprehensionPlan;
  lessonPath?: LessonPath;
  plannedParts?: RuntimeLessonPart['part'][];
  lastUpdated?: string;
  wrsPlan?: WrsLessonPlan;
}

export interface LessonHistoryEntry {
  id: string;
  lessonId: string;
  title: string;
  date: string;
  studentIds: string[];
  absentStudentIds?: string[];
  attendance?: AttendanceRecord[];
  notes?: string;
  results?: StudentMissionResult[];
}

export interface WordAttemptRecord {
  instanceId: string;
  wordText: string;
  status: 'correct' | 'error';
}

export interface StudentMissionResult {
  studentId: string;
  studentName: string;
  correctCount: number;
  errorCount: number;
  totalCount: number;
  accuracy: number;
  attempts: WordAttemptRecord[];
  errors: string[];
}

export interface StudentHistoryEntry {
  id?: string;
  date: string;
  lessonTitle: string;
  step: string;
  substep?: string;
  groupId?: string;
  groupName?: string;
  lessonId?: string;
  correctCount?: number;
  errorCount?: number;
  totalCount?: number;
  accuracy?: number;
  attempts?: WordAttemptRecord[];
  errors?: string[];
  notes?: string;
  attendanceStatus?: AttendanceStatus;
}

export type AttendanceStatus = 'present' | 'absent';

export interface AttendanceRecord {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
}

export interface StudentProfile {
  id: string;
  name: string;
  active?: boolean;
  schoolYear?: string;
  archivedAt?: string;
  masteredSounds: string[];
  masteredHFW: string[];
  attendanceCount: number;
  lastSeen?: string;
  notes: string;
  history: StudentHistoryEntry[];
}

export interface GroupInstructionalProfile {
  schemaVersion: 1;
  currentSubstep: string;
  lessonFocus: LessonFocus | '';
  currentCardRepository: string[];
  reviewCardRepository: string[];
  // The stored repository remains deliberately combined. The profile renders
  // its source-backed Affixes / Base Elements views without changing this
  // durable Firestore shape.
  practicedWordElements: string[];
  highFrequencyWords: string[];
  troubleSpots: string[];
  conceptsToWeave: string[];
  nextLessonNotes: string;
  curriculumScopeVersion?: 2 | 3;
  updatedAt?: string;
}

export const createEmptyGroupInstructionalProfile = (): GroupInstructionalProfile => ({
  schemaVersion: 1,
  currentSubstep: '',
  lessonFocus: '',
  currentCardRepository: [],
  reviewCardRepository: [],
  practicedWordElements: [],
  highFrequencyWords: [],
  troubleSpots: [],
  conceptsToWeave: [],
  nextLessonNotes: ''
});

export interface GroupProfile {
  id: string;
  name: string;
  active?: boolean;
  schoolYear?: string;
  archivedAt?: string;
  schedule?: string;
  studentIds: string[]; 
  inventory: {
    learnedSounds: string[];
    learnedHFW: string[];
  };
  lastLessonDate?: string;
  jobs?: Record<string, string>;
  rotationOffset?: number; 
  notes?: string;
  instructionalProfile?: GroupInstructionalProfile;
  savedLessons: Lesson[];
  history: LessonHistoryEntry[];
}

export interface MissionRecord {
  id: string;
  teacherId: string;
  squadId: string;
  squadName: string;
  lessonId: string;
  date: string;
  step: string;
  substep: string;
  lessonStep: string;
  lessonTitle: string;
  notes: string;
  timestamp: any;
  results: StudentMissionResult[];
  attendance?: AttendanceRecord[];
}

export interface DailyNote {
  id: string;
  date: string;
  content: string;
  lastUpdated: any;
  userId: string;
}

export interface GroupNote {
  id: string;
  teacherId: string;
  groupId: string;
  groupName: string;
  studentIds: string[];
  studentNames: string[];
  content: string;
  lessonId?: string;
  lessonTitle?: string;
  step?: string;
  substep?: string;
  lessonPart?: number;
  sessionId?: string;
  sessionDate?: string;
  createdAt: string;
  updatedAt?: any;
}

export interface DojoMasterData {
  groups: GroupProfile[];
  students: StudentProfile[];
  cipherPresets: any[];
  activeSession?: {
    sessionId?: string;
    sessionDate?: string;
    lesson: Lesson;
    currentPart: number;
    groupId: string;
    studentIds: string[];
    scores?: WordlistScore[];
    notes?: string;
    wordDistribution?: string;
    wordlistPage?: number;
    quickDrillIndex?: number;
    quickDrillRevealed?: number;
    quickDrillHandwriting?: boolean;
    quickDrillItems?: string[];
    sentenceIndex?: number;
    wordCardsMode?: string;
    wordCardsFilter?: string;
    wordCardsVisibleId?: string | null;
    wordCardsActiveIds?: string[];
    wordCardsActiveCards?: WordCard[];
    wordCardsStates?: Record<string, any>;
    wordCardsTatamiGame?: string;
    wordCardsOopsState?: any;
    wordCardsBbState?: any;
    wordCardsDeck?: WordCard[];
    wordCardsCurrentIndex?: number;
    wordCardsScores?: number[];
    wordCardsCurrentPlayerIndex?: number;
    wordCardsTurnScore?: number;
    wordCardsIsBust?: boolean;
    teachConceptsMode?: string;
    teachConceptsBoardText?: string;
    teachConceptsBoardTitle?: string;
    teachConceptsBoardNotes?: string;
    teachConceptsMarks?: any[];
    teachConceptsSlideIndex?: number;
    teachConceptsCipherIdx?: number;
    teachConceptsCipherResults?: Record<string, Record<number, any>>;
    teachConceptsCipherCheckResults?: Record<string, 'correct' | 'incorrect' | null>;
    teachConceptsSyllabicated?: boolean;
    teachConceptsSlideMarks?: Record<string, Record<number, any[]>>;
    teachConceptsSlideObjectStates?: Record<string, Record<number, Record<string, any>>>;
    teachConceptsSlideFullscreen?: Record<string, boolean>;
    dictationCompletedIds?: string[];
    passageIndex?: number;
    passageRulerEnabled?: boolean;
    passageRulerY?: number;
    spellingViewMode?: string;
    spellingActiveTab?: number;
    spellingRevealedItems?: Record<string, boolean>;
    spellingCipherWord?: string | null;
    spellingCipherResults?: Record<number, any>;
    spellingCipherCheckResult?: 'correct' | 'incorrect' | null;
    spellingGridPage?: number;
    spellingIsSyllabicated?: boolean;
    spellingMarks?: any[];
    drawings?: Record<string, any[]>;
  };
}

export enum LessonPart {
  Briefing = 0,
  Part1 = 1,
  Part2 = 2,
  Part3 = 3,
  Part4 = 4,
  Part5 = 5,
  Part6 = 6,
  Part7 = 7,
  Part8 = 8,
  Part9 = 9,
  Part10 = 10
}

export const LESSON_PARTS = [
  { id: LessonPart.Briefing, title: "0. Mission Briefing", icon: "Map" },
  { id: LessonPart.Part1, title: "1. Quick Drill (Sounds)", icon: "Grid" },
  { id: LessonPart.Part2, title: "2. Teach Concepts (Reading)", icon: "BookOpen" },
  { id: LessonPart.Part3, title: "3. Word Cards", icon: "Layers" },
  { id: LessonPart.Part4, title: "4. Wordlist Reading", icon: "List" },
  { id: LessonPart.Part5, title: "5. Sentence Reading", icon: "AlignLeft" },
  { id: LessonPart.Part6, title: "6. Quick Drill (Rev)", icon: "RotateCcw" },
  { id: LessonPart.Part7, title: "7. Teach Concepts (Spelling)", icon: "Edit3" },
  { id: LessonPart.Part8, title: "8. Written Work (Dictation)", icon: "PenTool" },
  { id: LessonPart.Part9, title: "9. Passage Reading", icon: "FileText" },
  { id: LessonPart.Part10, title: "10. Listening Comp", icon: "Headphones" },
];
