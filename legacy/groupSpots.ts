/**
 * A group's saved spot in an unfinished lesson.
 *
 * A full lesson takes about two class periods, so a teacher pauses a group's
 * lesson and comes back to it on a later day, often after teaching other
 * groups. Every group therefore keeps its own spot. Starting or saving one
 * group's lesson never touches another group's spot.
 *
 * A spot lives in the `lessons` collection (the current Firestore rules already
 * allow a teacher to read and write their own documents there) with
 * `kind: 'paused-spot'`, plus a copy on the device for when the cloud is
 * unreachable. It stores the lesson's id, not the lesson, so it stays small.
 *
 * Nothing here deletes a spot on a timer. A spot is cleared only when the
 * lesson is completed or the teacher discards it and confirms.
 */
import type { GroupProfile, Lesson } from './types';
import { LessonPart } from './types';
import { CloudLessonSession, lessonSessionFromCloud, LessonSessionState, lessonSessionToCloud } from './useLessonSession';
import { normalizeLessonSyncRevision } from './lessonSessionSync';
import {
  LESSON_DOCUMENT_BYTE_LIMIT, LibraryLessonRecord, PAUSED_SPOT_KIND, libraryLessonId
} from './lessonLibrary';

export const GROUP_SPOTS_STORAGE_KEY = 'wrs_dojo_group_spots_v1';
export const MIGRATED_SESSIONS_STORAGE_KEY = 'wrs_dojo_group_spots_migrated_v1';
/** A spot untouched for longer than this is shown in amber. It is never removed. */
export const STALE_AFTER_DAYS = 7;
export const GROUP_SPOT_BYTE_LIMIT = LESSON_DOCUMENT_BYTE_LIMIT;

export type SpotLessonSource = 'library' | 'group' | 'embedded';

/** The session as `active_sessions` stores it, without the lesson itself. */
export type SpotSession = Omit<CloudLessonSession, 'lesson'>;

export interface GroupSpot {
  kind: typeof PAUSED_SPOT_KIND;
  id: string;
  teacherId: string;
  groupId: string;
  groupName: string;
  lessonId: string;
  lessonTitle: string;
  lessonSource: SpotLessonSource;
  /** Only when the lesson cannot be looked up by id (for example a built-in lesson). */
  embeddedLesson?: Lesson;
  currentPart: number;
  syncRevision: number;
  session: SpotSession;
  /** YYYY-MM-DD: the day the lesson was first launched for this group. */
  dateStarted: string;
  /** YYYY-MM-DD: the last day the lesson was worked on. */
  lastWorkedOn: string;
  /** ISO time of the most recent save. */
  savedAt: string;
}

export const groupSpotId = (teacherId: string, groupId: string) =>
  libraryLessonId(teacherId, groupId, PAUSED_SPOT_KIND);

const text = (value: unknown) => typeof value === 'string' ? value : '';
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export interface BuildSpotInput {
  teacherId: string;
  group: Pick<GroupProfile, 'id' | 'name'>;
  lesson: Lesson;
  lessonSource: SpotLessonSource;
  currentPart: number;
  session: LessonSessionState;
  dateStarted: string;
  today: string;
  now: string;
}

export const buildSpot = ({
  teacherId, group, lesson, lessonSource, currentPart, session, dateStarted, today, now
}: BuildSpotInput): GroupSpot => {
  const sessionWithoutLesson: SpotSession = { ...lessonSessionToCloud(session, lesson, currentPart as LessonPart, group.id) } as SpotSession & { lesson?: Lesson };
  delete (sessionWithoutLesson as { lesson?: Lesson }).lesson;
  return {
    kind: PAUSED_SPOT_KIND,
    id: groupSpotId(teacherId, group.id),
    teacherId,
    groupId: group.id,
    groupName: group.name,
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    lessonSource,
    ...(lessonSource === 'embedded' ? { embeddedLesson: lesson } : {}),
    currentPart,
    syncRevision: session.syncRevision,
    session: sessionWithoutLesson,
    dateStarted: dateStarted || today,
    lastWorkedOn: today,
    savedAt: now
  };
};

/** Reads a stored spot (cloud document or device copy), or null if it isn't usable. */
export const normalizeSpot = (id: string, value: unknown): GroupSpot | null => {
  if (!isRecord(value) || value.kind !== PAUSED_SPOT_KIND) return null;
  if (!text(value.teacherId) || !text(value.groupId) || !text(value.lessonId) || !isRecord(value.session)) return null;
  if (typeof value.currentPart !== 'number') return null;
  return {
    kind: PAUSED_SPOT_KIND,
    id,
    teacherId: text(value.teacherId),
    groupId: text(value.groupId),
    groupName: text(value.groupName),
    lessonId: text(value.lessonId),
    lessonTitle: text(value.lessonTitle),
    lessonSource: value.lessonSource === 'library' || value.lessonSource === 'group' ? value.lessonSource : 'embedded',
    ...(isRecord(value.embeddedLesson) ? { embeddedLesson: value.embeddedLesson as unknown as Lesson } : {}),
    currentPart: value.currentPart,
    syncRevision: normalizeLessonSyncRevision(value.syncRevision),
    session: value.session as unknown as SpotSession,
    dateStarted: text(value.dateStarted),
    lastWorkedOn: text(value.lastWorkedOn) || text(value.dateStarted),
    savedAt: text(value.savedAt)
  };
};

export const spotBytes = (spot: GroupSpot) => new TextEncoder().encode(JSON.stringify(spot)).length;

/** Plain-language reason a spot can't be saved to the cloud, or null. */
export const spotStorageProblem = (spot: GroupSpot): string | null => {
  const bytes = spotBytes(spot);
  return bytes > GROUP_SPOT_BYTE_LIMIT
    ? `This lesson's saved spot is ${Math.round(bytes / 1024)} KB, over the ${Math.round(GROUP_SPOT_BYTE_LIMIT / 1024)} KB the cloud can hold. It is kept on this computer only.`
    : null;
};

export type GroupSpotMap = Record<string, GroupSpot>;

/**
 * Picks between two copies of the same group's spot. The same running lesson
 * compares by revision (then time). Different lessons or sessions compare by
 * time, because their revisions are not comparable.
 */
export const newerSpot = (a: GroupSpot | null | undefined, b: GroupSpot | null | undefined): GroupSpot | null => {
  if (!a) return b || null;
  if (!b) return a;
  const sameRun = a.lessonId === b.lessonId && (a.session.sessionId || '') === (b.session.sessionId || '');
  if (sameRun && a.syncRevision !== b.syncRevision) return a.syncRevision > b.syncRevision ? a : b;
  return a.savedAt >= b.savedAt ? a : b;
};

export const mergeSpotMaps = (local: GroupSpotMap, cloud: GroupSpotMap): GroupSpotMap => {
  const merged: GroupSpotMap = {};
  for (const groupId of new Set([...Object.keys(local), ...Object.keys(cloud)])) {
    const winner = newerSpot(local[groupId], cloud[groupId]);
    if (winner) merged[groupId] = winner;
  }
  return merged;
};

/** Finds the lesson a spot belongs to: the library, then the group's saved lessons, then the embedded copy. */
export const resolveSpotLesson = (
  spot: GroupSpot,
  libraryRecords: LibraryLessonRecord[],
  group: Pick<GroupProfile, 'savedLessons'> | null | undefined
): Lesson | null => {
  const fromLibrary = libraryRecords.find(record => record.id === spot.lessonId)?.lesson;
  if (fromLibrary) return fromLibrary;
  const fromGroup = (group?.savedLessons || []).find(lesson => lesson?.id === spot.lessonId);
  if (fromGroup) return fromGroup;
  return spot.embeddedLesson || null;
};

/**
 * What launching a lesson for a group should do.
 * - no saved spot: start it
 * - the same lesson: pick up where it stopped
 * - another lesson: ask first; never silently discard
 */
export const launchDecision = (lessonId: string, spot: GroupSpot | null | undefined): 'start' | 'resume' | 'ask' => {
  if (!spot) return 'start';
  return spot.lessonId === lessonId ? 'resume' : 'ask';
};

/**
 * The session to restore. Everything the teacher had is kept, including the
 * session id (so the finished mission lands on one record) and the Part 4
 * lists. The session date becomes `today`, so notes written now carry today's
 * date; the spot itself keeps `dateStarted`.
 */
export const resumeSession = (
  spot: GroupSpot,
  lesson: Lesson,
  today: string,
  atLeastRevision = 0
): LessonSessionState => {
  const restored = lessonSessionFromCloud({
    ...spot.session,
    lesson,
    currentPart: spot.currentPart,
    groupId: spot.groupId
  });
  return {
    ...restored,
    sessionDate: today,
    syncRevision: Math.max(restored.syncRevision, spot.syncRevision, atLeastRevision) + 1
  };
};

const DAY_MS = 86_400_000;
const dayNumber = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / DAY_MS : NaN;
};

export const daysSince = (from: string, today: string) => dayNumber(today) - dayNumber(from);

/** True when the spot has not been worked on for more than a week. Only ever a reminder. */
export const isStale = (spot: GroupSpot, today: string) => daysSince(spot.lastWorkedOn, today) > STALE_AFTER_DAYS;

export const discardPrompt = (groupName: string) =>
  `Discard ${groupName}'s unfinished lesson? This can't be undone.`;

export const formatSpotDate = (value: string) => {
  const day = dayNumber(value);
  if (Number.isNaN(day)) return 'unknown date';
  const [year, month, date] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(year, month - 1, date));
};

export const conflictPrompt = (spot: GroupSpot) =>
  `${spot.groupName} has an unfinished lesson: ${spot.lessonTitle}, Part ${spot.currentPart}, started ${formatSpotDate(spot.dateStarted)}. Resume it, or start the new lesson?`;

/** Rows for the dashboard's "Unfinished lessons" list: the group's name order, stale ones flagged. */
export const spotRows = (spots: GroupSpotMap, today: string) =>
  Object.values(spots)
    .sort((a, b) => a.groupName.localeCompare(b.groupName, undefined, { numeric: true }))
    .map(spot => ({ spot, stale: isStale(spot, today) }));

// ---------------------------------------------------------------------------
// Device copy
// ---------------------------------------------------------------------------

export interface SpotStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const browserStorage = (): SpotStorage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

export const readLocalSpots = (teacherId: string, storage: SpotStorage | null = browserStorage()): GroupSpotMap => {
  const stored = storage?.getItem(GROUP_SPOTS_STORAGE_KEY);
  if (!stored) return {};
  try {
    const parsed = JSON.parse(stored);
    if (!isRecord(parsed)) return {};
    const spots: GroupSpotMap = {};
    for (const [groupId, value] of Object.entries(parsed)) {
      const spot = normalizeSpot(groupSpotId(teacherId, groupId), value);
      // A different teacher's spots on a shared computer are not this teacher's.
      if (spot && (!teacherId || spot.teacherId === teacherId)) spots[groupId] = spot;
    }
    return spots;
  } catch {
    return {};
  }
};

/** Replaces one group's spot on this device without touching any other group's. */
export const writeLocalSpot = (spot: GroupSpot, storage: SpotStorage | null = browserStorage()) => {
  if (!storage) return;
  const current = (() => {
    try {
      const parsed = JSON.parse(storage.getItem(GROUP_SPOTS_STORAGE_KEY) || '{}');
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  })();
  storage.setItem(GROUP_SPOTS_STORAGE_KEY, JSON.stringify({ ...current, [spot.groupId]: spot }));
};

export const removeLocalSpot = (groupId: string, storage: SpotStorage | null = browserStorage()) => {
  if (!storage) return;
  try {
    const parsed = JSON.parse(storage.getItem(GROUP_SPOTS_STORAGE_KEY) || '{}');
    if (!isRecord(parsed) || !(groupId in parsed)) return;
    const rest = { ...parsed };
    delete rest[groupId];
    storage.setItem(GROUP_SPOTS_STORAGE_KEY, JSON.stringify(rest));
  } catch {
    /* an unreadable copy has nothing to remove */
  }
};

// ---------------------------------------------------------------------------
// The old single unfinished-lesson slot
// ---------------------------------------------------------------------------

export interface LegacySession {
  lesson: Lesson;
  currentPart: number;
  groupId: string;
  sessionId?: string;
  sessionDate?: string;
  savedAt?: string;
}

export const readMigratedSessionIds = (storage: SpotStorage | null = browserStorage()): string[] => {
  try {
    const parsed = JSON.parse(storage?.getItem(MIGRATED_SESSIONS_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

export const writeMigratedSessionIds = (ids: string[], storage: SpotStorage | null = browserStorage()) => {
  storage?.setItem(MIGRATED_SESSIONS_STORAGE_KEY, JSON.stringify(ids.slice(-50)));
};

export interface LegacyMigrationInput {
  teacherId: string;
  /** The device's old recovery slot and the cloud's `active_sessions` document. */
  candidates: Array<{ session: CloudLessonSession & { savedAt?: string } | null | undefined; lessonSource: SpotLessonSource }>;
  groups: Array<Pick<GroupProfile, 'id' | 'name'>>;
  existing: GroupSpotMap;
  /** Session ids already turned into spots on this device, so a discarded spot stays discarded. */
  migratedSessionIds: string[];
  today: string;
  now: string;
}

/** Where a running lesson can be found again: the library, the group's own list, or only in the spot. */
export const spotLessonSourceOf = (
  isLibraryLesson: boolean,
  lesson: Pick<Lesson, 'id'>,
  group: Pick<GroupProfile, 'savedLessons'>
): SpotLessonSource => (
  isLibraryLesson
    ? 'library'
    : (group.savedLessons || []).some(saved => saved?.id === lesson.id) ? 'group' : 'embedded'
);

/**
 * Turns an unfinished lesson saved the old way into that group's spot so it is
 * still offered for resume. It never overwrites an existing spot, skips a
 * lesson that hasn't left the Briefing, and never deletes the old copy.
 */
export const migrateLegacySpots = ({
  teacherId, candidates, groups, existing, migratedSessionIds, today, now
}: LegacyMigrationInput): GroupSpot[] => {
  const taken = new Set(Object.keys(existing));
  const seenSessions = new Set(migratedSessionIds);
  const created: GroupSpot[] = [];
  for (const { session, lessonSource } of candidates) {
    if (!session?.lesson?.id || !session.groupId || typeof session.currentPart !== 'number') continue;
    if (session.currentPart <= LessonPart.Briefing) continue;
    if (session.sessionId && seenSessions.has(session.sessionId)) continue;
    if (taken.has(session.groupId)) continue;
    const group = groups.find(candidate => candidate.id === session.groupId);
    if (!group) continue;
    const state = lessonSessionFromCloud(session);
    const started = session.sessionDate || today;
    const savedAt = session.savedAt || now;
    created.push({
      ...buildSpot({
        teacherId,
        group,
        lesson: session.lesson,
        lessonSource: lessonSource === 'library' ? 'library' : 'embedded',
        currentPart: session.currentPart,
        session: state,
        dateStarted: started,
        today,
        now: savedAt
      }),
      lastWorkedOn: /^\d{4}-\d{2}-\d{2}/.test(savedAt) ? savedAt.slice(0, 10) : today
    });
    taken.add(session.groupId);
    if (session.sessionId) seenSessions.add(session.sessionId);
  }
  return created;
};

/**
 * The day a lesson was first launched for a group. A resumed lesson keeps the
 * saved spot's date; a lesson that is starting now uses its Briefing date.
 */
export const spotDateStarted = (
  existing: GroupSpot | null | undefined,
  lessonId: string,
  sessionId: string,
  sessionDate: string,
  today: string
): string => (
  existing && existing.lessonId === lessonId && (existing.session.sessionId || '') === (sessionId || '') && existing.dateStarted
    ? existing.dateStarted
    : sessionDate || today
);

// ---------------------------------------------------------------------------
// Discarding needs a confirmation. These are the only steps that can clear a
// spot from the dashboard; the list's Discard button just opens the question.
// ---------------------------------------------------------------------------

export interface DiscardState { pending: GroupSpot | null }
export const noDiscardPending: DiscardState = { pending: null };
export const discardRequested = (spot: GroupSpot): DiscardState => ({ pending: spot });
export const discardCancelled = (): DiscardState => noDiscardPending;
export const discardConfirmed = (state: DiscardState, clear: (spot: GroupSpot) => void): DiscardState => {
  if (state.pending) clear(state.pending);
  return noDiscardPending;
};

/**
 * What the dashboard's list shows. A spot is saved about once a second during a
 * lesson; the app re-renders only when this key changes (a new part, a new day,
 * a new lesson), not on every save.
 */
export const spotListKey = (spots: GroupSpotMap) => JSON.stringify(
  Object.values(spots)
    .map(spot => [
      spot.groupId, spot.groupName, spot.lessonId, spot.lessonTitle, spot.currentPart,
      spot.session.sessionId || '', spot.dateStarted, spot.lastWorkedOn
    ])
    .sort()
);
