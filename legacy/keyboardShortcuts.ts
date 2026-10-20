import { LessonPart } from './types';

/** The slice of a KeyboardEvent the shortcut helpers read, so they run without a DOM. */
export interface ShortcutKeyEvent {
  key: string;
  target?: unknown;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  preventDefault?: () => void;
}

/** True while the teacher is typing in a field; shortcuts must stay out of the way. */
export const isTypingTarget = (event: Pick<ShortcutKeyEvent, 'target'>): boolean => {
  const target = event.target as {
    tagName?: unknown;
    isContentEditable?: unknown;
    getAttribute?: (name: string) => string | null;
  } | null | undefined;
  if (!target || typeof target !== 'object') return false;
  const tag = typeof target.tagName === 'string' ? target.tagName.toUpperCase() : '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable === true) return true;
  const attribute = typeof target.getAttribute === 'function' ? target.getAttribute('contenteditable') : null;
  return attribute !== null && attribute !== undefined && attribute.toLowerCase() !== 'false';
};

/** Ctrl, Cmd and Alt belong to the browser and OS (Cmd/Ctrl+S, etc.); Shift is fine. */
export const hasShortcutModifier = (event: Pick<ShortcutKeyEvent, 'ctrlKey' | 'metaKey' | 'altKey'>): boolean =>
  Boolean(event.ctrlKey || event.metaKey || event.altKey);

/** Shared gate: false means "not ours, leave the key alone". */
export const shortcutsAllowed = (event: ShortcutKeyEvent): boolean =>
  !isTypingTarget(event) && !hasShortcutModifier(event);

export type Part2KeyAction =
  | 'place-next-card'
  | 'next-move'
  | 'return-card'
  | 'previous-move'
  | 'lay-out-all';

export interface Part2KeyState {
  pullStack: boolean;
  unplacedCount: number;
  placedCount: number;
  readOnly: boolean;
}

/** Decides what a key does in the Part 2 runner, or null when the key is not handled. */
export const resolvePart2Key = (key: string, state: Part2KeyState): Part2KeyAction | null => {
  if (state.readOnly) return null;
  const stackHasCards = state.pullStack && state.unplacedCount > 0;
  if (key === ' ' || key === 'ArrowRight') return stackHasCards ? 'place-next-card' : 'next-move';
  if (key === 'ArrowLeft') return state.pullStack && state.placedCount > 0 ? 'return-card' : 'previous-move';
  if (key === 'Enter') return stackHasCards ? 'lay-out-all' : null;
  return null;
};

export interface StagedCardState {
  stagingOrder?: number;
  placed: boolean;
}

/** Index of the unplaced card with the lowest stagingOrder (ties go to the earlier index), or -1. */
export const nextUnplacedCardIndex = (cards: StagedCardState[]): number => {
  let best = -1;
  cards.forEach((card, index) => {
    if (card.placed) return;
    if (best === -1 || (card.stagingOrder || 0) < (cards[best]!.stagingOrder || 0)) best = index;
  });
  return best;
};

/** Index of the placed card with the highest stagingOrder (ties go to the later index), or -1. */
export const lastPlacedCardIndex = (cards: StagedCardState[]): number => {
  let best = -1;
  cards.forEach((card, index) => {
    if (!card.placed) return;
    if (best === -1 || (card.stagingOrder || 0) >= (cards[best]!.stagingOrder || 0)) best = index;
  });
  return best;
};

export const FIRST_LESSON_PART = LessonPart.Part1;
export const LAST_LESSON_PART = LessonPart.Part10;

/**
 * The Part PageDown (+1) or PageUp (-1) moves to. Clamps at Part 1 and Part 10, and
 * returns null from the Briefing (or any value outside Parts 1-10) so shortcuts never
 * enter or leave it.
 */
export const stepLessonPart = (current: LessonPart, delta: 1 | -1): LessonPart | null => {
  if (current < FIRST_LESSON_PART || current > LAST_LESSON_PART) return null;
  const next = Math.max(FIRST_LESSON_PART, Math.min(LAST_LESSON_PART, current + delta));
  return next === current ? null : (next as LessonPart);
};

/** Maps a key to the PageDown/PageUp delta, or null. */
export const lessonPartDelta = (key: string): 1 | -1 | null =>
  key === 'PageDown' ? 1 : key === 'PageUp' ? -1 : null;

export const isCheatSheetToggleKey = (key: string): boolean => key === '?';
export const isCheatSheetCloseKey = (key: string): boolean => key === 'Escape';

/** Passage reading: Space (event.key is ' ', never 'Space') and ArrowRight advance. */
export const resolvePassageKey = (key: string): 'next' | 'previous' | null =>
  key === ' ' || key === 'ArrowRight' ? 'next' : key === 'ArrowLeft' ? 'previous' : null;

/**
 * One key press = one action. A button that kept focus after a mouse click also
 * activates natively on Enter (keydown) and Space (keyup). Enter is stopped by
 * preventDefault on keydown; Space needs its keyup cancelled too, so remember that
 * the shortcut took the Space keydown and swallow the matching keyup.
 */
export const createNativeActivationGuard = () => {
  let spaceHandled = false;
  return {
    /** Call after a shortcut handled a keydown. */
    handled(event: Pick<ShortcutKeyEvent, 'key' | 'preventDefault'>): void {
      event.preventDefault?.();
      if (event.key === ' ') spaceHandled = true;
    },
    /** Call from a keyup listener; true when it cancelled a native activation. */
    onKeyUp(event: Pick<ShortcutKeyEvent, 'key' | 'preventDefault'>): boolean {
      if (event.key !== ' ' || !spaceHandled) return false;
      spaceHandled = false;
      event.preventDefault?.();
      return true;
    }
  };
};
