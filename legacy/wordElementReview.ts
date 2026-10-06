import {
  WORD_ELEMENT_CARDS,
  WORD_ELEMENT_SUBSTEPS,
  WordElementCard,
  WordElementFamily
} from './wordElementMnemonics';

/**
 * Part 3 "Element Review" tab: pure state helpers. The synced state carries card
 * ids only; both screens resolve ids against the bundled deck, so back-face
 * content never travels through the session document.
 */

export type ReviewTab = 'cards' | 'review';
export type ReviewFamily = 'All' | WordElementFamily;
export type ReviewScope = 'through' | 'all' | 'current';
export type ReviewPromptMode = 'element' | 'meaning' | 'picture';
export type ReviewView = 'study' | 'browse';

export interface ElementReviewSessionState {
  tab: ReviewTab;
  family: ReviewFamily;
  scope: ReviewScope;
  /** null = follow the running lesson's substep. */
  substep: string | null;
  promptMode: ReviewPromptMode;
  /** Card ids in teacher-chosen order. */
  order: string[];
  index: number;
  flipped: boolean;
  view: ReviewView;
}

const FAMILIES: ReviewFamily[] = ['All', 'Latin', 'Greek'];
const SCOPES: ReviewScope[] = ['through', 'all', 'current'];
const PROMPTS: ReviewPromptMode[] = ['element', 'meaning', 'picture'];

const CARD_BY_ID: ReadonlyMap<string, WordElementCard> = new Map(WORD_ELEMENT_CARDS.map(card => [card.id, card]));

export const substepKey = (value: unknown): number | null => {
  if (typeof value !== 'string') return null;
  const match = /^(\d+)\.(\d+)$/.exec(value.trim());
  return match ? Number(match[1]) * 100 + Number(match[2]) : null;
};

/** The running lesson's substep: `step` + `substep` ("2" + "5"), or an already-dotted substep. */
export const runningSubstep = (lesson: { step?: unknown; substep?: unknown } | null | undefined): string | null => {
  if (!lesson) return null;
  const substep = typeof lesson.substep === 'string' ? lesson.substep.trim() : String(lesson.substep ?? '').trim();
  if (substepKey(substep) !== null) return substep;
  const step = typeof lesson.step === 'string' ? lesson.step.trim() : String(lesson.step ?? '').trim();
  const joined = `${step}.${substep}`;
  return substepKey(joined) !== null ? joined : null;
};

export const reviewCardById = (id: string): WordElementCard | undefined => CARD_BY_ID.get(id);

export const reviewCardsForOrder = (order: readonly string[]): WordElementCard[] =>
  order.flatMap(id => {
    const card = CARD_BY_ID.get(id);
    return card ? [card] : [];
  });

export const elementText = (card: WordElementCard) => card.elements.join(' / ');

export const selectReviewCards = (
  family: ReviewFamily,
  scope: ReviewScope,
  substep: string | null
): WordElementCard[] => {
  const target = substepKey(substep);
  return WORD_ELEMENT_CARDS.filter(card => family === 'All' || card.family === family).filter(card => {
    if (scope === 'all' || target === null) return true;
    const taught = substepKey(card.firstTaught);
    if (taught === null) return false;
    return scope === 'current' ? taught === target : taught <= target;
  });
};

export const effectiveSubstep = (state: ElementReviewSessionState, lessonSubstep: string | null) =>
  state.substep ?? lessonSubstep;

const rebuilt = (
  state: ElementReviewSessionState,
  lessonSubstep: string | null,
  keepCurrentId?: string
): ElementReviewSessionState => {
  const order = selectReviewCards(state.family, state.scope, effectiveSubstep(state, lessonSubstep)).map(card => card.id);
  const kept = keepCurrentId ? order.indexOf(keepCurrentId) : -1;
  return { ...state, order, index: kept >= 0 ? kept : 0, flipped: false };
};

export const createReviewState = (lessonSubstep: string | null): ElementReviewSessionState =>
  rebuilt({
    tab: 'cards', family: 'All', scope: lessonSubstep ? 'through' : 'all', substep: null,
    promptMode: 'element', order: [], index: 0, flipped: false, view: 'study'
  }, lessonSubstep);

/** True when the stored order no longer matches the filters (e.g. the lesson changed). */
export const reviewOrderIsStale = (state: ElementReviewSessionState, lessonSubstep: string | null) => {
  const expected = selectReviewCards(state.family, state.scope, effectiveSubstep(state, lessonSubstep));
  if (expected.length !== state.order.length) return true;
  const have = new Set(state.order);
  return expected.some(card => !have.has(card.id));
};

export const syncReviewOrder = rebuilt;

export const setReviewTab = (state: ElementReviewSessionState, tab: ReviewTab): ElementReviewSessionState =>
  ({ ...state, tab });

export const setReviewFamily = (
  state: ElementReviewSessionState, family: ReviewFamily, lessonSubstep: string | null
) => rebuilt({ ...state, family }, lessonSubstep);

export const setReviewScope = (
  state: ElementReviewSessionState, scope: ReviewScope, lessonSubstep: string | null
) => rebuilt({ ...state, scope }, lessonSubstep);

/** Picking a substep switches to cumulative review through it, as in the standalone deck. */
export const setReviewSubstep = (state: ElementReviewSessionState, substep: string) =>
  rebuilt({ ...state, substep, scope: 'through' }, substep);

export const setReviewPromptMode = (state: ElementReviewSessionState, promptMode: ReviewPromptMode): ElementReviewSessionState =>
  ({ ...state, promptMode, flipped: false });

export const setReviewView = (state: ElementReviewSessionState, view: ReviewView): ElementReviewSessionState =>
  ({ ...state, view });

export const flipReviewCard = (state: ElementReviewSessionState): ElementReviewSessionState =>
  state.order.length ? { ...state, flipped: !state.flipped } : state;

export const moveReviewCard = (state: ElementReviewSessionState, delta: number): ElementReviewSessionState => {
  const count = state.order.length;
  if (!count) return state;
  return { ...state, index: (((state.index + delta) % count) + count) % count, flipped: false };
};

export const jumpToReviewCard = (state: ElementReviewSessionState, id: string): ElementReviewSessionState => {
  const index = state.order.indexOf(id);
  return index < 0 ? state : { ...state, index, flipped: false, view: 'study' };
};

export const shuffleReviewCards = (
  state: ElementReviewSessionState, random: () => number = Math.random
): ElementReviewSessionState => {
  const order = [...state.order];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { ...state, order, index: 0, flipped: false };
};

export const randomReviewCard = (
  state: ElementReviewSessionState, random: () => number = Math.random
): ElementReviewSessionState =>
  state.order.length
    ? { ...state, index: Math.min(state.order.length - 1, Math.floor(random() * state.order.length)), flipped: false }
    : state;

export const resetReviewOrder = (
  state: ElementReviewSessionState, lessonSubstep: string | null
): ElementReviewSessionState => rebuilt(state, lessonSubstep, state.order[state.index]);

/** Cloud-safe parse. Missing or malformed values yield undefined so old sessions load unchanged. */
export const normalizeReviewState = (value: unknown): ElementReviewSessionState | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const order = Array.isArray(raw.order)
    ? [...new Set(raw.order.filter((id): id is string => typeof id === 'string' && CARD_BY_ID.has(id)))]
    : [];
  const rawIndex = typeof raw.index === 'number' && Number.isFinite(raw.index) ? Math.trunc(raw.index) : 0;
  const substep = typeof raw.substep === 'string' && WORD_ELEMENT_SUBSTEPS.includes(raw.substep) ? raw.substep : null;
  return {
    tab: raw.tab === 'review' ? 'review' : 'cards',
    family: FAMILIES.includes(raw.family as ReviewFamily) ? raw.family as ReviewFamily : 'All',
    scope: SCOPES.includes(raw.scope as ReviewScope) ? raw.scope as ReviewScope : 'through',
    substep,
    promptMode: PROMPTS.includes(raw.promptMode as ReviewPromptMode) ? raw.promptMode as ReviewPromptMode : 'element',
    order,
    index: order.length ? Math.min(Math.max(0, rawIndex), order.length - 1) : 0,
    flipped: raw.flipped === true && order.length > 0,
    view: raw.view === 'browse' ? 'browse' : 'study'
  };
};
