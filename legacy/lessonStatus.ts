/**
 * Where each loaded lesson stands for a group: Taught, In progress or On deck.
 *
 * A lesson takes about two class days and lessons slip, so a date is a plan,
 * not a fact. An untaught lesson stays On deck even after its date has passed.
 *
 * "Taught" comes from a finished mission (its lessonId is the library lesson's
 * id) or from a mark the teacher set by hand. The hand-set marks live in one
 * small document per group in the `lessons` collection (the current Firestore
 * rules already allow a teacher to read and write their own documents there),
 * separate from the lesson documents so reloading a lesson file never erases
 * them. Nothing here writes to `missions`, `daily_notes` or `group_notes`,
 * which feed the Google Sheets log.
 */
import { LESSON_LIBRARY_COLLECTION, LibraryLessonRecord, TAUGHT_MARKS_KIND, libraryLessonId } from './lessonLibrary';
import type { SpotStorage } from './groupSpots';
import type { SpotRemote } from './spotStore';

export type LessonStatus = 'taught' | 'in-progress' | 'on-deck';

export interface LessonStatusContext {
  /** lessonIds of finished missions. */
  completedLessonIds: ReadonlySet<string>;
  /** Lessons the teacher marked taught by hand, for this group. */
  markedTaughtIds: ReadonlySet<string>;
  /**
   * Lessons the teacher put back on deck, for this group. This beats a mission
   * or history record: an old app wrote a mission when a lesson STARTED, so a
   * record does not always mean the lesson was finished.
   */
  putBackIds?: ReadonlySet<string>;
  /** The lesson this group has a saved spot in (or is running right now). */
  spotLessonId?: string;
}

export const deriveLessonStatus = (record: Pick<LibraryLessonRecord, 'id'>, context: LessonStatusContext): LessonStatus => {
  // The teacher's choice always wins over what the records say.
  if (context.markedTaughtIds.has(record.id)) return 'taught';
  const putBack = Boolean(context.putBackIds?.has(record.id));
  if (!putBack && context.completedLessonIds.has(record.id)) return 'taught';
  if (context.spotLessonId && context.spotLessonId === record.id) return 'in-progress';
  return 'on-deck';
};

export interface LessonStatusEntry {
  record: LibraryLessonRecord;
  status: LessonStatus;
  /** Taught because the teacher marked it (a finished mission may also exist). */
  manuallyTaught: boolean;
  /** A mission or history record says it was taught, but the teacher put it back. */
  putBackByYou: boolean;
  /** The file's date when it has already passed and the lesson is not taught. */
  plannedFor: string;
}

export interface ArrangedByStatus {
  inProgress: LessonStatusEntry[];
  onDeck: LessonStatusEntry[];
  taught: LessonStatusEntry[];
}

const newestSave = (a: LibraryLessonRecord, b: LibraryLessonRecord) => b.savedAt.localeCompare(a.savedAt);

/** Date order, undated last. */
const byDateThenUndated = (a: LibraryLessonRecord, b: LibraryLessonRecord) => {
  if (a.lessonDate && b.lessonDate) return a.lessonDate.localeCompare(b.lessonDate) || newestSave(a, b);
  if (a.lessonDate) return -1;
  if (b.lessonDate) return 1;
  return newestSave(a, b);
};

export const arrangeByStatus = (
  records: LibraryLessonRecord[],
  groupId: string,
  context: LessonStatusContext,
  today: string
): ArrangedByStatus => {
  const arranged: ArrangedByStatus = { inProgress: [], onDeck: [], taught: [] };
  const entries = records
    .filter(record => record.groupId === groupId)
    .sort(byDateThenUndated)
    .map((record): LessonStatusEntry => {
      const status = deriveLessonStatus(record, context);
      return {
        record,
        status,
        manuallyTaught: status === 'taught' && context.markedTaughtIds.has(record.id),
        putBackByYou: status !== 'taught' && Boolean(context.putBackIds?.has(record.id)) && context.completedLessonIds.has(record.id),
        plannedFor: status !== 'taught' && record.lessonDate && record.lessonDate < today ? record.lessonDate : ''
      };
    });
  for (const entry of entries) {
    if (entry.status === 'in-progress') arranged.inProgress.push(entry);
    else if (entry.status === 'on-deck') arranged.onDeck.push(entry);
    else arranged.taught.push(entry);
  }
  // Taught lessons: most recent first, undated last.
  arranged.taught.sort((a, b) => {
    const x = a.record, y = b.record;
    if (x.lessonDate && y.lessonDate) return y.lessonDate.localeCompare(x.lessonDate) || newestSave(x, y);
    if (x.lessonDate) return -1;
    if (y.lessonDate) return 1;
    return newestSave(x, y);
  });
  return arranged;
};

// ---------------------------------------------------------------------------
// Runway: how many lessons are still on deck
// ---------------------------------------------------------------------------

export type RunwayLevel = 'none' | 'last' | 'ok';

export interface Runway {
  level: RunwayLevel;
  /** Lessons On deck. In progress and Taught are never counted. */
  count: number;
  /** "On deck: 3" */
  countLabel: string;
  /** Words that carry the meaning without color; empty when there is nothing to warn about. */
  warning: string;
}

export const runwayFor = (onDeckCount: number): Runway => {
  const count = Math.max(0, Math.floor(onDeckCount) || 0);
  const countLabel = `On deck: ${count}`;
  if (count === 0) return { level: 'none', count, countLabel, warning: 'Nothing on deck' };
  if (count === 1) return { level: 'last', count, countLabel, warning: 'Last one on deck' };
  return { level: 'ok', count, countLabel, warning: '' };
};

/** Runway per group id, counting only that group's On deck lessons. */
export const runwaysByGroup = (
  records: LibraryLessonRecord[],
  groupIds: string[],
  contextFor: (groupId: string) => LessonStatusContext,
  today: string
): Record<string, Runway> => {
  const result: Record<string, Runway> = {};
  for (const groupId of groupIds) {
    result[groupId] = runwayFor(arrangeByStatus(records, groupId, contextFor(groupId), today).onDeck.length);
  }
  return result;
};

export interface RunwayAlert { groupId: string; groupName: string; runway: Runway }

/** Groups at 0 or 1 on deck, fewest first. Empty when every group has 2 or more. */
export const runwayAlerts = (
  groups: Array<{ id: string; name: string }>,
  runways: Record<string, Runway>
): RunwayAlert[] => groups
  .flatMap(group => {
    const runway = runways[group.id];
    return runway && runway.level !== 'ok' ? [{ groupId: group.id, groupName: group.name, runway }] : [];
  })
  .sort((a, b) => a.runway.count - b.runway.count);

// ---------------------------------------------------------------------------
// The teacher's "taught" marks
// ---------------------------------------------------------------------------

export const TAUGHT_MARKS_STORAGE_KEY = 'wrs_dojo_taught_marks_v1';

export interface TaughtMarks {
  groupId: string;
  /** Lessons taught by hand. */
  lessonIds: string[];
  /** Lessons put back on deck by hand although a mission or history record exists. */
  onDeckIds: string[];
  /** ISO time of the last change; the newer copy (device or cloud) wins. */
  savedAt: string;
}
export type TaughtMarksMap = Record<string, TaughtMarks>;

export const taughtMarksId = (teacherId: string, groupId: string) =>
  libraryLessonId(teacherId, groupId, TAUGHT_MARKS_KIND);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const normalizeTaughtMarks = (value: unknown): TaughtMarks | null => {
  if (!isRecord(value) || value.kind !== TAUGHT_MARKS_KIND) return null;
  if (typeof value.groupId !== 'string' || !value.groupId) return null;
  const idList = (list: unknown) => Array.isArray(list)
    ? Array.from(new Set(list.filter((id): id is string => typeof id === 'string' && Boolean(id))))
    : [];
  // Documents saved before onDeckIds existed simply have none.
  const lessonIds = idList(value.lessonIds);
  return { groupId: value.groupId, lessonIds, onDeckIds: idList(value.onDeckIds), savedAt: typeof value.savedAt === 'string' ? value.savedAt : '' };
};

export const buildTaughtMarksDoc = (teacherId: string, marks: TaughtMarks) => ({
  kind: TAUGHT_MARKS_KIND,
  id: taughtMarksId(teacherId, marks.groupId),
  teacherId,
  groupId: marks.groupId,
  lessonIds: marks.lessonIds,
  onDeckIds: marks.onDeckIds,
  savedAt: marks.savedAt
});

/** Per group, the copy saved most recently wins; the cloud wins a tie. */
export const mergeTaughtMarks = (local: TaughtMarksMap, cloud: TaughtMarksMap): TaughtMarksMap => {
  const merged: TaughtMarksMap = { ...local };
  for (const [groupId, marks] of Object.entries(cloud)) {
    const mine = merged[groupId];
    if (!mine || marks.savedAt >= mine.savedAt) merged[groupId] = marks;
  }
  return merged;
};

export const taughtMarksKey = (map: TaughtMarksMap) =>
  Object.keys(map).sort().map(groupId => `${groupId}:${[...map[groupId].lessonIds].sort().join(',')}/${[...map[groupId].onDeckIds].sort().join(',')}`).join('|');

export const readLocalTaughtMarks = (teacherId: string, storage: SpotStorage | null): TaughtMarksMap => {
  try {
    const parsed = JSON.parse(storage?.getItem(TAUGHT_MARKS_STORAGE_KEY) || '{}');
    const mine = isRecord(parsed) ? parsed[teacherId || 'guest'] : null;
    if (!isRecord(mine)) return {};
    const result: TaughtMarksMap = {};
    for (const [groupId, value] of Object.entries(mine)) {
      const marks = normalizeTaughtMarks({ ...(isRecord(value) ? value : {}), kind: TAUGHT_MARKS_KIND, groupId });
      if (marks) result[groupId] = marks;
    }
    return result;
  } catch {
    return {};
  }
};

export const writeLocalTaughtMarks = (teacherId: string, marks: TaughtMarks, storage: SpotStorage | null) => {
  if (!storage) return;
  let all: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(storage.getItem(TAUGHT_MARKS_STORAGE_KEY) || '{}');
    if (isRecord(parsed)) all = parsed;
  } catch { /* start fresh */ }
  const key = teacherId || 'guest';
  const mine = isRecord(all[key]) ? (all[key] as Record<string, unknown>) : {};
  storage.setItem(TAUGHT_MARKS_STORAGE_KEY, JSON.stringify({
    ...all,
    [key]: { ...mine, [marks.groupId]: { lessonIds: marks.lessonIds, onDeckIds: marks.onDeckIds, savedAt: marks.savedAt } }
  }));
};

export interface SetTaughtResult { marks: TaughtMarks; cloud: boolean; message: string }

/**
 * Marks a lesson taught, or puts it back on deck. Writes the device copy first,
 * then one document in the lesson library's collection under the group's own
 * id. It never writes anywhere else, and never creates a mission record.
 *
 * Marking taught removes the lesson from the put-back list. Putting it back
 * removes it from the taught list, and adds it to the put-back list only when
 * a mission or history record says it was taught (`recordSaysTaught`), so the
 * teacher's choice beats that record.
 */
export const setLessonTaught = async (
  teacherId: string,
  groupId: string,
  current: Pick<TaughtMarks, 'lessonIds' | 'onDeckIds'>,
  lessonId: string,
  taught: boolean,
  recordSaysTaught: boolean,
  savedAt: string,
  remote: SpotRemote | null,
  storage: SpotStorage | null
): Promise<SetTaughtResult> => {
  const without = (ids: readonly string[]) => ids.filter(id => id !== lessonId);
  const marks: TaughtMarks = {
    groupId,
    lessonIds: taught ? [...without(current.lessonIds), lessonId] : without(current.lessonIds),
    onDeckIds: taught ? without(current.onDeckIds) : (recordSaysTaught ? [...without(current.onDeckIds), lessonId] : without(current.onDeckIds)),
    savedAt
  };
  try {
    writeLocalTaughtMarks(teacherId, marks, storage);
  } catch (error) {
    console.warn('The taught mark could not be kept on this device', error);
  }
  if (!remote || !teacherId) return { marks, cloud: false, message: 'Kept on this device only.' };
  try {
    await remote.set(LESSON_LIBRARY_COLLECTION, taughtMarksId(teacherId, groupId), buildTaughtMarksDoc(teacherId, marks));
    return { marks, cloud: true, message: 'Saved.' };
  } catch (error) {
    return { marks, cloud: false, message: error instanceof Error ? error.message : String(error) };
  }
};

/**
 * A lesson the teacher put back on deck was then genuinely finished (the Part 10
 * dossier was completed): drop it from the put-back list so its finished record
 * counts again and it becomes Taught. Returns null when there is nothing to
 * change, so no write happens. Only the taught-marks document is ever written.
 */
export const clearLessonPutBack = async (
  teacherId: string,
  groupId: string,
  current: Pick<TaughtMarks, 'lessonIds' | 'onDeckIds'>,
  lessonId: string,
  savedAt: string,
  remote: SpotRemote | null,
  storage: SpotStorage | null
): Promise<SetTaughtResult | null> => {
  if (!current.onDeckIds.includes(lessonId)) return null;
  const marks: TaughtMarks = {
    groupId,
    lessonIds: [...current.lessonIds],
    onDeckIds: current.onDeckIds.filter(id => id !== lessonId),
    savedAt
  };
  try {
    writeLocalTaughtMarks(teacherId, marks, storage);
  } catch (error) {
    console.warn('The put-back could not be cleared on this device', error);
  }
  if (!remote || !teacherId) return { marks, cloud: false, message: 'Kept on this device only.' };
  try {
    await remote.set(LESSON_LIBRARY_COLLECTION, taughtMarksId(teacherId, groupId), buildTaughtMarksDoc(teacherId, marks));
    return { marks, cloud: true, message: 'Saved.' };
  } catch (error) {
    return { marks, cloud: false, message: error instanceof Error ? error.message : String(error) };
  }
};
