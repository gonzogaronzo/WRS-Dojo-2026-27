import { LessonPart } from './types';

export const normalizeLessonSyncRevision = (value: unknown): number => (
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0
);

export const nextLessonSyncRevision = (current: unknown): number =>
  normalizeLessonSyncRevision(current) + 1;

/**
 * A running teacher surface owns its newest local revision. Cloud frames may
 * initialize an idle surface, but once a local lesson is active only a strictly
 * newer revision may replace it. Equal revisions are acknowledgements, not a
 * reason to replay an older payload over the UI.
 */
export const shouldApplyIncomingLessonState = (
  localRevision: unknown,
  incomingRevision: unknown,
  hasLocalAuthority: boolean
): boolean => (
  !hasLocalAuthority ||
  normalizeLessonSyncRevision(incomingRevision) > normalizeLessonSyncRevision(localRevision)
);

export const shouldResetQuickDrillForPartChange = (
  previousPart: LessonPart,
  nextPart: LessonPart
): boolean => (
  previousPart !== nextPart &&
  (nextPart === LessonPart.Part1 || nextPart === LessonPart.Part6)
);
