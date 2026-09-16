import { LessonPart } from './types';

/**
 * Revision 0 is reserved for a brand-new in-memory lesson session. Older saved
 * sessions predate syncRevision, so a missing persisted value is treated as the
 * first cloud revision. That lets the app hydrate legacy state once without
 * making the same legacy frame perpetually authoritative afterward.
 */
export const normalizeLessonSyncRevision = (value: unknown): number => {
  if (value === undefined || value === null) return 1;
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
};

export const nextLessonSyncRevision = (current: unknown): number =>
  normalizeLessonSyncRevision(current) + 1;

/**
 * Cloud state is authoritative only when it is strictly newer. A local screen
 * or mode change must never make an equal or older frame authoritative again.
 * Keep the authority argument for call-site compatibility, but do not let it
 * bypass revision ordering.
 */
export const shouldApplyIncomingLessonState = (
  localRevision: unknown,
  incomingRevision: unknown,
  _hasLocalAuthority: boolean
): boolean =>
  normalizeLessonSyncRevision(incomingRevision) > normalizeLessonSyncRevision(localRevision);

export const shouldResetQuickDrillForPartChange = (
  previousPart: LessonPart,
  nextPart: LessonPart
): boolean => (
  previousPart !== nextPart &&
  (nextPart === LessonPart.Part1 || nextPart === LessonPart.Part6)
);
