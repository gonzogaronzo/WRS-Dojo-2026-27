import { Dispatch, SetStateAction, useCallback, useReducer } from 'react';
import { DojoMasterData, Lesson, LessonPart, WordCard, WordlistScore } from './types';
import { DrawingMap } from './drawingSync';
import { normalizeWordDistribution } from './wordDistribution';

export type SpellingViewMode = 'list' | 'cipher' | 'grid';
export type WordCardsMode = 'standard' | 'oops';
export type WordCardsFilter = 'all' | 'regular' | 'hfw';
export type CipherCheckResult = 'correct' | 'incorrect' | null;

export interface WordCardsSessionState {
  deck: WordCard[];
  currentIndex: number;
  filter: WordCardsFilter;
  mode: WordCardsMode;
  scores: number[];
  currentPlayerIndex: number;
  turnScore: number;
  isBust: boolean;
}

export interface LessonSessionState {
  sessionId: string;
  sessionDate: string;
  studentIds: string[];
  scores: WordlistScore[];
  notes: string;
  distribution: any[][];
  wordlistPage: number;
  quickDrillIndex: number;
  quickDrillRevealed: number;
  quickDrillHandwriting: boolean;
  quickDrillItems: string[];
  wordCards: WordCardsSessionState;
  sentenceIndex: number;
  teachConceptsMode: any;
  teachConceptsBoardText: string;
  teachConceptsBoardTitle: string;
  teachConceptsBoardNotes: string;
  teachConceptsMarks: any[];
  teachConceptsSlideIndex: number;
  teachConceptsCipherIdx: number;
  teachConceptsCipherResults: Record<string, Record<number, any>>;
  teachConceptsCipherCheckResults: Record<string, CipherCheckResult>;
  teachConceptsSyllabicated: boolean;
  teachConceptsSlideMarks: Record<string, Record<number, any[]>>;
  teachConceptsSlideObjectStates: Record<string, Record<number, Record<string, any>>>;
  teachConceptsSlideFullscreen: Record<string, boolean>;
  dictationCompletedIds: string[];
  passageIndex: number;
  passageRulerEnabled: boolean;
  passageRulerY: number;
  spellingViewMode: SpellingViewMode;
  spellingActiveTab: number;
  spellingRevealedItems: Record<string, boolean>;
  spellingCipherWord: string | null;
  spellingCipherResults: Record<number, any>;
  spellingCipherCheckResult: CipherCheckResult;
  spellingGridPage: 1 | 2;
  spellingIsSyllabicated: boolean;
  spellingMarks: any[];
  drawings: DrawingMap;
}

export const createInitialLessonSession = (): LessonSessionState => ({
  sessionId: '', sessionDate: '', studentIds: [], scores: [], notes: '', distribution: [], wordlistPage: 0,
  quickDrillIndex: 0, quickDrillRevealed: 0, quickDrillHandwriting: false,
  quickDrillItems: [],
  wordCards: {
    deck: [], currentIndex: -1, filter: 'all', mode: 'standard', scores: [],
    currentPlayerIndex: 0, turnScore: 0, isBust: false
  },
  sentenceIndex: 0, teachConceptsMode: 'slides',
  teachConceptsBoardText: '', teachConceptsBoardTitle: 'Target Word',
  teachConceptsBoardNotes: '', teachConceptsMarks: [], teachConceptsSlideIndex: 0, teachConceptsCipherIdx: 0,
  teachConceptsCipherResults: {}, teachConceptsCipherCheckResults: {},
  teachConceptsSyllabicated: false, teachConceptsSlideMarks: {},
  teachConceptsSlideObjectStates: {}, teachConceptsSlideFullscreen: {},
  dictationCompletedIds: [], passageIndex: 0, passageRulerEnabled: false, passageRulerY: 0,
  spellingViewMode: 'list', spellingActiveTab: 0, spellingRevealedItems: {},
  spellingCipherWord: null, spellingCipherResults: {}, spellingCipherCheckResult: null,
  spellingGridPage: 1, spellingIsSyllabicated: false,
  spellingMarks: [], drawings: {}
});

export type CloudLessonSession = NonNullable<DojoMasterData['activeSession']>;

const parseDistribution = (value: CloudLessonSession['wordDistribution']): any[][] => {
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return normalizeWordDistribution(parsed);
  } catch {
    return [];
  }
};

export const lessonSessionFromCloud = (cloud: CloudLessonSession): LessonSessionState => ({
  ...createInitialLessonSession(),
  sessionId: cloud.sessionId || '', sessionDate: cloud.sessionDate || '',
  studentIds: cloud.studentIds || [], scores: cloud.scores || [], notes: cloud.notes || '',
  distribution: parseDistribution(cloud.wordDistribution), wordlistPage: cloud.wordlistPage || 0,
  quickDrillIndex: cloud.quickDrillIndex || 0, quickDrillRevealed: cloud.quickDrillRevealed || 0,
  quickDrillHandwriting: Boolean(cloud.quickDrillHandwriting), quickDrillItems: cloud.quickDrillItems || [],
  wordCards: {
    deck: cloud.wordCardsDeck || cloud.wordCardsActiveCards || [],
    currentIndex: cloud.wordCardsCurrentIndex ?? -1,
    filter: cloud.wordCardsFilter === 'regular' || cloud.wordCardsFilter === 'hfw' ? cloud.wordCardsFilter : 'all',
    mode: cloud.wordCardsMode === 'oops' ? 'oops' : 'standard',
    scores: cloud.wordCardsScores || [],
    currentPlayerIndex: cloud.wordCardsCurrentPlayerIndex || 0,
    turnScore: cloud.wordCardsTurnScore || 0,
    isBust: Boolean(cloud.wordCardsIsBust)
  },
  sentenceIndex: cloud.sentenceIndex || 0, teachConceptsMode: cloud.teachConceptsMode || 'slides',
  teachConceptsBoardText: cloud.teachConceptsBoardText || '', teachConceptsBoardTitle: cloud.teachConceptsBoardTitle || 'Target Word',
  teachConceptsBoardNotes: cloud.teachConceptsBoardNotes || '', teachConceptsMarks: cloud.teachConceptsMarks || [],
  teachConceptsSlideIndex: cloud.teachConceptsSlideIndex || 0,
  teachConceptsCipherIdx: cloud.teachConceptsCipherIdx || 0,
  teachConceptsCipherResults: cloud.teachConceptsCipherResults || {},
  teachConceptsCipherCheckResults: cloud.teachConceptsCipherCheckResults || {},
  teachConceptsSyllabicated: Boolean(cloud.teachConceptsSyllabicated),
  teachConceptsSlideMarks: cloud.teachConceptsSlideMarks || {},
  teachConceptsSlideObjectStates: cloud.teachConceptsSlideObjectStates || {},
  teachConceptsSlideFullscreen: cloud.teachConceptsSlideFullscreen || {},
  dictationCompletedIds: cloud.dictationCompletedIds || [], passageIndex: cloud.passageIndex || 0,
  passageRulerEnabled: Boolean(cloud.passageRulerEnabled), passageRulerY: cloud.passageRulerY || 0,
  spellingViewMode: cloud.spellingViewMode === 'cipher' || cloud.spellingViewMode === 'grid' ? cloud.spellingViewMode : 'list',
  spellingActiveTab: cloud.spellingActiveTab || 0, spellingRevealedItems: cloud.spellingRevealedItems || {},
  spellingCipherWord: cloud.spellingCipherWord || null,
  spellingCipherResults: cloud.spellingCipherResults || {},
  spellingCipherCheckResult: cloud.spellingCipherCheckResult === 'correct' || cloud.spellingCipherCheckResult === 'incorrect'
    ? cloud.spellingCipherCheckResult
    : null,
  spellingGridPage: cloud.spellingGridPage === 2 ? 2 : 1,
  spellingIsSyllabicated: Boolean(cloud.spellingIsSyllabicated), spellingMarks: cloud.spellingMarks || [],
  drawings: cloud.drawings || {}
});

export const lessonSessionToCloud = (
  session: LessonSessionState,
  lesson: Lesson,
  currentPart: LessonPart,
  groupId: string
): CloudLessonSession => ({
  lesson, currentPart, groupId, sessionId: session.sessionId, sessionDate: session.sessionDate,
  studentIds: session.studentIds, scores: session.scores, notes: session.notes,
  wordDistribution: JSON.stringify(session.distribution), wordlistPage: session.wordlistPage,
  quickDrillIndex: session.quickDrillIndex, quickDrillRevealed: session.quickDrillRevealed,
  quickDrillHandwriting: session.quickDrillHandwriting, quickDrillItems: session.quickDrillItems,
  wordCardsMode: session.wordCards.mode, wordCardsFilter: session.wordCards.filter,
  wordCardsDeck: session.wordCards.deck, wordCardsCurrentIndex: session.wordCards.currentIndex,
  wordCardsScores: session.wordCards.scores, wordCardsCurrentPlayerIndex: session.wordCards.currentPlayerIndex,
  wordCardsTurnScore: session.wordCards.turnScore, wordCardsIsBust: session.wordCards.isBust,
  sentenceIndex: session.sentenceIndex, teachConceptsMode: session.teachConceptsMode,
  teachConceptsBoardText: session.teachConceptsBoardText, teachConceptsBoardTitle: session.teachConceptsBoardTitle,
  teachConceptsBoardNotes: session.teachConceptsBoardNotes, teachConceptsMarks: session.teachConceptsMarks,
  teachConceptsSlideIndex: session.teachConceptsSlideIndex,
  teachConceptsCipherIdx: session.teachConceptsCipherIdx,
  teachConceptsCipherResults: session.teachConceptsCipherResults,
  teachConceptsCipherCheckResults: session.teachConceptsCipherCheckResults,
  teachConceptsSyllabicated: session.teachConceptsSyllabicated,
  teachConceptsSlideMarks: session.teachConceptsSlideMarks,
  teachConceptsSlideObjectStates: session.teachConceptsSlideObjectStates,
  teachConceptsSlideFullscreen: session.teachConceptsSlideFullscreen,
  dictationCompletedIds: session.dictationCompletedIds, passageIndex: session.passageIndex,
  passageRulerEnabled: session.passageRulerEnabled, passageRulerY: session.passageRulerY,
  spellingViewMode: session.spellingViewMode, spellingActiveTab: session.spellingActiveTab,
  spellingRevealedItems: session.spellingRevealedItems, spellingCipherWord: session.spellingCipherWord,
  spellingCipherResults: session.spellingCipherResults,
  spellingCipherCheckResult: session.spellingCipherCheckResult,
  spellingGridPage: session.spellingGridPage, spellingIsSyllabicated: session.spellingIsSyllabicated,
  spellingMarks: session.spellingMarks, drawings: session.drawings
});

export const lessonSessionsMatch = (left: LessonSessionState, right: LessonSessionState) =>
  JSON.stringify(left) === JSON.stringify(right);

type Action =
  | { type: 'set'; key: keyof LessonSessionState; value: SetStateAction<any> }
  | { type: 'replace'; value: LessonSessionState }
  | { type: 'reset'; overrides?: Partial<LessonSessionState> };

const reducer = (state: LessonSessionState, action: Action): LessonSessionState => {
  if (action.type === 'replace') return action.value;
  if (action.type === 'reset') return { ...createInitialLessonSession(), ...action.overrides };
  const previous = state[action.key];
  const value = typeof action.value === 'function' ? action.value(previous) : action.value;
  return { ...state, [action.key]: value };
};

export const useLessonSession = () => {
  const [session, dispatch] = useReducer(reducer, undefined, createInitialLessonSession);
  const setter = useCallback(<K extends keyof LessonSessionState>(key: K) =>
    ((value: SetStateAction<LessonSessionState[K]>) => dispatch({ type: 'set', key, value })) as Dispatch<SetStateAction<LessonSessionState[K]>>, []);

  return {
    session,
    resetLessonSession: useCallback((overrides?: Partial<LessonSessionState>) => dispatch({ type: 'reset', overrides }), []),
    replaceLessonSession: useCallback((value: LessonSessionState) => dispatch({ type: 'replace', value }), []),
    setSessionStudentIds: setter('studentIds'), setSessionScores: setter('scores'),
    setSessionNotes: setter('notes'), setSessionDistribution: setter('distribution'),
    setSessionWordlistPage: setter('wordlistPage'), setSessionQuickDrillIndex: setter('quickDrillIndex'),
    setSessionQuickDrillRevealed: setter('quickDrillRevealed'), setSessionQuickDrillHandwriting: setter('quickDrillHandwriting'),
    setSessionQuickDrillItems: setter('quickDrillItems'), setSessionSentenceIndex: setter('sentenceIndex'),
    setSessionWordCards: setter('wordCards'),
    setSessionTeachConceptsMode: setter('teachConceptsMode'), setSessionTeachConceptsBoardText: setter('teachConceptsBoardText'),
    setSessionTeachConceptsBoardTitle: setter('teachConceptsBoardTitle'), setSessionTeachConceptsBoardNotes: setter('teachConceptsBoardNotes'),
    setSessionTeachConceptsMarks: setter('teachConceptsMarks'), setSessionTeachConceptsSlideIndex: setter('teachConceptsSlideIndex'),
    setSessionTeachConceptsCipherIdx: setter('teachConceptsCipherIdx'),
    setSessionTeachConceptsCipherResults: setter('teachConceptsCipherResults'),
    setSessionTeachConceptsCipherCheckResults: setter('teachConceptsCipherCheckResults'),
    setSessionTeachConceptsSyllabicated: setter('teachConceptsSyllabicated'),
    setSessionTeachConceptsSlideMarks: setter('teachConceptsSlideMarks'),
    setSessionTeachConceptsSlideObjectStates: setter('teachConceptsSlideObjectStates'),
    setSessionTeachConceptsSlideFullscreen: setter('teachConceptsSlideFullscreen'),
    setSessionDictationCompletedIds: setter('dictationCompletedIds'),
    setSessionPassageIndex: setter('passageIndex'), setSessionPassageRulerEnabled: setter('passageRulerEnabled'),
    setSessionPassageRulerY: setter('passageRulerY'), setSessionSpellingViewMode: setter('spellingViewMode'),
    setSessionSpellingActiveTab: setter('spellingActiveTab'), setSessionSpellingRevealedItems: setter('spellingRevealedItems'),
    setSessionSpellingCipherWord: setter('spellingCipherWord'),
    setSessionSpellingCipherResults: setter('spellingCipherResults'),
    setSessionSpellingCipherCheckResult: setter('spellingCipherCheckResult'),
    setSessionSpellingGridPage: setter('spellingGridPage'),
    setSessionSpellingIsSyllabicated: setter('spellingIsSyllabicated'), setSessionSpellingMarks: setter('spellingMarks'),
    setSessionDrawings: setter('drawings')
  };
};
