/**
 * Loaded lesson library.
 *
 * Generated wrs-runtime-v1 lesson files are stored one per Firestore document
 * in the `lessons` collection. They used to live inside the group record's
 * `savedLessons` array, and that single document is capped at 1 MB: at a
 * lesson a day it fills within weeks, after which every save for that group
 * fails.
 *
 * The group and date come from the generator's file name,
 * WRS_<YYYY-MM-DD>_<Group>_Substep<X-X>.json, because the frozen lesson schema
 * (validate_lesson.py) has no fields for them.
 */
import type { GroupProfile, Lesson, StudentProfile } from './types';
import { normalizeRuntimeLessonPlan, runtimeLessonToLegacyLesson } from './runtimeLesson';
import { createEmptyWrsLessonPlan, normalizeWrsLessonPlan } from './wrsLessonPlan';

export const LESSON_LIBRARY_COLLECTION = 'lessons';
/**
 * A group's paused lesson is stored in this same collection (the current
 * Firestore rules already let a teacher read and write their own documents
 * there) but is not a lesson. Everything that reads the library must skip it.
 */
export const PAUSED_SPOT_KIND = 'paused-spot';
/** One small document per group holding the lessons the teacher marked taught by hand. */
export const TAUGHT_MARKS_KIND = 'taught-marks';
/** Firestore's hard limit is 1 MiB per document; stay clearly under it. */
export const LESSON_DOCUMENT_BYTE_LIMIT = 900_000;

export interface LibraryLessonRecord {
  id: string;
  teacherId: string;
  groupId: string;
  groupName: string;
  /** YYYY-MM-DD from the file name, or '' when the name did not follow the convention. */
  lessonDate: string;
  sourceFileName: string;
  runtimeId: string;
  title: string;
  step: string;
  substep: string;
  /** ISO time of the most recent write. Doubles as the read-back token. */
  savedAt: string;
  lesson: Lesson;
}

type LooseRecord = Record<string, any>;

const asRecord = (value: unknown): LooseRecord | null => (
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as LooseRecord : null
);
const text = (value: unknown) => typeof value === 'string' ? value : '';

// ---------------------------------------------------------------------------
// File names
// ---------------------------------------------------------------------------

export interface LessonFileName {
  /** File name without folder, extension, or a browser " (1)" duplicate suffix. */
  stem: string;
  date: string;
  groupLabel: string;
  substep: string;
  followsConvention: boolean;
}

const FILE_NAME_CONVENTION = /^WRS_(\d{4}-\d{2}-\d{2})_(.+?)_Substep(\d+)-([0-9A-Za-z]+)$/i;

export const parseLessonFileName = (fileName: string): LessonFileName => {
  const base = fileName.split(/[\\/]/).pop() || fileName;
  // Browsers add " (1)" when the same file is downloaded twice.
  const stem = base.replace(/\.json$/i, '').replace(/\s*\(\d+\)$/, '').trim();
  const match = FILE_NAME_CONVENTION.exec(stem);
  return match
    ? { stem, date: match[1], groupLabel: match[2], substep: `${match[3]}.${match[4]}`, followsConvention: true }
    : { stem, date: '', groupLabel: '', substep: '', followsConvention: false };
};

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

/** "Group 5A", "group-5a" and "5A" all compare as "5a". */
const groupKey = (value: string) => value.toLowerCase().replace(/\bgroup\b/g, '').replace(/[^a-z0-9]/g, '');

/**
 * Finds the group a file-name label means: the group whose name matches
 * ("5A" → "Group 5A"), otherwise the one group containing a student of that
 * name ("Enrique" → the group Enrique is in). Returns null rather than guess.
 */
export const matchGroupForLabel = (
  label: string,
  groups: GroupProfile[],
  students: StudentProfile[]
): GroupProfile | null => {
  const key = groupKey(label);
  if (!key) return null;
  const byName = groups.filter(group => groupKey(group.name) === key);
  if (byName.length === 1) return byName[0];
  if (byName.length > 1) return null;
  const studentIds = new Set(students.filter(student => groupKey(student.name) === key).map(student => student.id));
  if (!studentIds.size) return null;
  const byStudent = groups.filter(group => group.studentIds.some(id => studentIds.has(id)));
  return byStudent.length === 1 ? byStudent[0] : null;
};

// ---------------------------------------------------------------------------
// Ids and labels
// ---------------------------------------------------------------------------

const idSegment = (value: string) => (
  value.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 120) || 'lesson'
);

/**
 * Deterministic, so loading the same file for the same group again replaces
 * the earlier copy instead of adding a duplicate.
 */
export const libraryLessonId = (teacherId: string, groupId: string, lessonKey: string) => (
  [teacherId, groupId, lessonKey].map(idSegment).join('__')
);

/** "7" + "5" → "7.5"; a substep that already carries its step is kept as is. */
export const substepLabel = (step: string, substep: string) => (
  !substep ? step : substep.includes('.') || !step ? substep : `${step}.${substep}`
);

// ---------------------------------------------------------------------------
// Conversion (mirrors the lesson editor's Import button)
// ---------------------------------------------------------------------------

/** Same defaults as `emptyLesson` in components/LessonForm.tsx. */
const emptyLesson = (): Lesson => ({
  schemaVersion: 2,
  id: '',
  title: '',
  step: '1',
  substep: '1',
  conceptNotes: '',
  conceptNotes7: '',
  cipherWords: [],
  cipherDistractors: [],
  googleSlidesUrl: '',
  slides: [],
  quickDrill: [],
  quickDrillReverse: [],
  wordCards: [],
  wordListReading: [],
  wordListReadingAuto: true,
  sentences: [],
  dictation: { sounds: [], realWords: [], wordElements: [], nonsenseWords: [], phrases: [], sentences: [] },
  hfwList: [],
  affixPractice: [],
  passage: '',
  wrsPlan: createEmptyWrsLessonPlan()
});

/**
 * Converts a lesson file exactly the way LessonForm.handleImport + Save does,
 * so a loaded lesson and a hand-imported lesson run identically. If the
 * editor's import changes, change this with it.
 */
export const lessonFromRuntimeJson = (data: unknown, id: string): Lesson => {
  const record = asRecord(data);
  const candidate = record?.schemaVersion === 'wrs-runtime-v1' ? record : record?.runtimePlan;
  const runtimePlan = normalizeRuntimeLessonPlan(candidate);
  if (!runtimePlan) {
    throw new Error('This is not a wrs-runtime-v1 lesson. It needs schemaVersion "wrs-runtime-v1", an id, and a valid focus.');
  }
  const importedData: LooseRecord = { ...record, ...runtimeLessonToLegacyLesson(runtimePlan), runtimePlan };
  const empty = emptyLesson();
  const lesson: Lesson = {
    ...empty,
    ...importedData,
    schemaVersion: 2,
    wrsPlan: normalizeWrsLessonPlan(importedData.wrsPlan),
    id,
    step: String(importedData.step || empty.step),
    substep: String(importedData.substep || empty.substep)
  };
  if (importedData.dictation) lesson.dictation = { ...empty.dictation, ...importedData.dictation };
  // The editor's Save fills an empty title the same way.
  lesson.title = lesson.title || `Step ${lesson.step}.${lesson.substep} Lesson`;
  return lesson;
};

// ---------------------------------------------------------------------------
// Firestore storage checks
// ---------------------------------------------------------------------------

const findNestedArray = (value: unknown, path: string, insideArray: boolean): string | null => {
  if (Array.isArray(value)) {
    if (insideArray) return path;
    for (let index = 0; index < value.length; index += 1) {
      const hit = findNestedArray(value[index], `${path}[${index}]`, true);
      if (hit) return hit;
    }
    return null;
  }
  const record = asRecord(value);
  if (!record) return null;
  for (const [key, child] of Object.entries(record)) {
    const hit = findNestedArray(child, path ? `${path}.${key}` : key, false);
    if (hit) return hit;
  }
  return null;
};

export const lessonStorageBytes = (lesson: Lesson) => new TextEncoder().encode(JSON.stringify(lesson)).length;

/** Plain-language reason Firestore would reject this lesson, or null. */
export const lessonStorageProblem = (lesson: Lesson): string | null => {
  const nested = findNestedArray(lesson, '', false);
  if (nested) {
    return `Firestore can't store a list directly inside another list (found at ${nested}). The lesson file needs that inner list wrapped in an object.`;
  }
  const bytes = lessonStorageBytes(lesson);
  if (bytes > LESSON_DOCUMENT_BYTE_LIMIT) {
    return `This lesson is ${Math.round(bytes / 1024)} KB, over the ${Math.round(LESSON_DOCUMENT_BYTE_LIMIT / 1024)} KB one lesson can hold.`;
  }
  return null;
};

// ---------------------------------------------------------------------------
// Reading files and planning writes
// ---------------------------------------------------------------------------

export interface LessonFileReading {
  fileName: string;
  name: LessonFileName;
  ok: boolean;
  error: string;
  warnings: string[];
  /** Converted lesson with id '' until a group is chosen. */
  lesson: Lesson | null;
  runtimeId: string;
  sizeBytes: number;
}

export const readLessonFile = (fileName: string, contents: string): LessonFileReading => {
  const name = parseLessonFileName(fileName);
  const failed = (error: string): LessonFileReading => ({
    fileName, name, ok: false, error, warnings: [], lesson: null, runtimeId: '', sizeBytes: 0
  });

  let data: unknown;
  try {
    data = JSON.parse(contents);
  } catch {
    return failed('The file is not valid JSON. It may be cut off, or not a lesson file.');
  }

  let lesson: Lesson;
  try {
    lesson = lessonFromRuntimeJson(data, '');
  } catch (error) {
    return failed(error instanceof Error ? error.message : String(error));
  }

  const problem = lessonStorageProblem(lesson);
  if (problem) return failed(problem);

  const warnings: string[] = [];
  if (!name.followsConvention) {
    warnings.push("The file name doesn't follow WRS_<date>_<Group>_Substep<X-X>.json, so the group and date couldn't be read from it.");
  }
  const insideSubstep = substepLabel(lesson.step, lesson.substep);
  if (name.substep && insideSubstep && name.substep.toLowerCase() !== insideSubstep.toLowerCase()) {
    warnings.push(`The file name says Substep ${name.substep}, but the lesson inside is Substep ${insideSubstep}.`);
  }

  return {
    fileName,
    name,
    ok: true,
    error: '',
    warnings,
    lesson,
    runtimeId: lesson.runtimePlan?.id || '',
    sizeBytes: lessonStorageBytes(lesson)
  };
};

export type LessonWriteStatus = 'ready' | 'replace' | 'needs-group' | 'error';

export interface LessonWritePlan {
  status: LessonWriteStatus;
  message: string;
  record: LibraryLessonRecord | null;
}

export const planLessonWrite = (
  reading: LessonFileReading,
  group: GroupProfile | null | undefined,
  teacherId: string,
  existingIds: ReadonlySet<string>,
  savedAt: string
): LessonWritePlan => {
  if (!reading.ok || !reading.lesson) return { status: 'error', message: reading.error, record: null };
  if (!group) {
    return {
      status: 'needs-group',
      message: reading.name.groupLabel
        ? `No group matches "${reading.name.groupLabel}". Pick one.`
        : 'Pick the group this lesson is for.',
      record: null
    };
  }

  const lessonKey = reading.name.followsConvention ? reading.name.stem : (reading.runtimeId || reading.name.stem);
  const id = libraryLessonId(teacherId, group.id, lessonKey);
  const lesson: Lesson = { ...reading.lesson, id };
  const record: LibraryLessonRecord = {
    id,
    teacherId,
    groupId: group.id,
    groupName: group.name,
    lessonDate: reading.name.date,
    sourceFileName: reading.fileName,
    runtimeId: reading.runtimeId,
    title: lesson.title,
    step: lesson.step,
    substep: lesson.substep,
    savedAt,
    lesson
  };
  const replacing = existingIds.has(id);
  return {
    status: replacing ? 'replace' : 'ready',
    message: replacing ? `Replaces the copy already loaded for ${group.name}.` : `Ready for ${group.name}.`,
    record
  };
};

/** Reads a Firestore `lessons` document, or null if it isn't a usable record. */
export const normalizeLibraryRecord = (id: string, value: unknown): LibraryLessonRecord | null => {
  const data = asRecord(value);
  if (isSideDocData(data)) return null;
  const lesson = asRecord(data?.lesson);
  if (!data || !lesson || !text(data.teacherId) || !text(data.groupId)) return null;
  return {
    id,
    teacherId: text(data.teacherId),
    groupId: text(data.groupId),
    groupName: text(data.groupName),
    lessonDate: text(data.lessonDate),
    sourceFileName: text(data.sourceFileName),
    runtimeId: text(data.runtimeId),
    title: text(data.title) || text(lesson.title),
    step: text(data.step) || text(lesson.step),
    substep: text(data.substep) || text(lesson.substep),
    savedAt: text(data.savedAt),
    // The document id is the lesson's identity everywhere in the app.
    lesson: { ...(lesson as Lesson), id }
  };
};

export interface LibrarySnapshotDoc { id: string; data: unknown }
export interface LibrarySnapshotChange { id: string; data: unknown }

export const isPausedSpotData = (value: unknown) => asRecord(value)?.kind === PAUSED_SPOT_KIND;

/** Documents that share the `lessons` collection but are not lessons: saved spots and taught marks. */
export function isSideDocData(value: unknown): boolean {
  const kind = asRecord(value)?.kind;
  return kind === PAUSED_SPOT_KIND || kind === TAUGHT_MARKS_KIND;
}

/**
 * Turns a `lessons` snapshot into library records. A paused-spot document is
 * saved about once a second during a lesson; a snapshot that only carries
 * those changes must hand back the SAME array, so nothing that depends on the
 * library re-renders. The first snapshot always rebuilds the list.
 */
export const applyLibrarySnapshot = (
  current: LibraryLessonRecord[],
  readDocs: () => LibrarySnapshotDoc[],
  changes: LibrarySnapshotChange[],
  isFirstSnapshot: boolean
): LibraryLessonRecord[] => {
  if (!isFirstSnapshot && changes.every(change => isSideDocData(change.data))) return current;
  return readDocs().flatMap(doc => {
    if (isSideDocData(doc.data)) return [];
    const record = normalizeLibraryRecord(doc.id, doc.data);
    return record ? [record] : [];
  });
};

/** The record to write after the lesson is edited in the app. */
export const recordForLessonEdit = (record: LibraryLessonRecord, lesson: Lesson, savedAt: string): LibraryLessonRecord => ({
  ...record,
  title: lesson.title,
  step: lesson.step,
  substep: lesson.substep,
  savedAt,
  lesson: { ...lesson, id: record.id }
});

// ---------------------------------------------------------------------------
// Showing a group's lessons
// ---------------------------------------------------------------------------

export const localDateString = (date = new Date()) => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);

/**
 * Today and later, soonest first (undated at the end); then earlier lessons,
 * most recent first.
 */
export const arrangeGroupLessons = (records: LibraryLessonRecord[], groupId: string, today: string) => {
  const mine = records.filter(record => record.groupId === groupId);
  const newestSave = (a: LibraryLessonRecord, b: LibraryLessonRecord) => b.savedAt.localeCompare(a.savedAt);
  const upcoming = mine
    .filter(record => !record.lessonDate || record.lessonDate >= today)
    .sort((a, b) => {
      if (a.lessonDate && b.lessonDate) return a.lessonDate.localeCompare(b.lessonDate) || newestSave(a, b);
      if (a.lessonDate) return -1;
      if (b.lessonDate) return 1;
      return newestSave(a, b);
    });
  const earlier = mine
    .filter(record => record.lessonDate && record.lessonDate < today)
    .sort((a, b) => b.lessonDate.localeCompare(a.lessonDate) || newestSave(a, b));
  return { upcoming, earlier };
};

export const formatLessonDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'No date';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    .format(new Date(year, month - 1, day));
};
