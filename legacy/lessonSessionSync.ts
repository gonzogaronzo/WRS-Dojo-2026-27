import type { LessonPart } from './types';

export interface PendingLessonNavigation {
  lessonId: string;
  sessionId: string;
  currentPart: LessonPart;
}

interface IncomingLessonPosition {
  lesson?: { id?: string };
  sessionId?: string;
  currentPart?: number;
}

/**
 * Reject only a cloud frame that predates an in-flight local part selection.
 * The matching frame clears the guard, so later remote updates still apply.
 */
export const shouldResetQuickDrillForPartChange = (
  previousPart: LessonPart,
  nextPart: LessonPart
): boolean => (
  previousPart !== nextPart &&
  (nextPart === LessonPart.Part1 || nextPart === LessonPart.Part6)
);

export const pendingNavigationBlocksIncoming = (
  pending: PendingLessonNavigation | null,
  incoming: IncomingLessonPosition
): boolean => Boolean(
  pending &&
  incoming.lesson?.id === pending.lessonId &&
  ((incoming.sessionId || '') !== pending.sessionId || incoming.currentPart !== pending.currentPart)
);
