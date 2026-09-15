import { Lesson, LessonPath, RuntimeLessonPart, WRSRuntimeLessonPlan } from './types';
import { normalizeRuntimeLessonPlan, validateRuntimeLesson } from './runtimeLesson';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : null
);

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const strings = (value: unknown) => Array.isArray(value)
  ? value.filter((entry): entry is string => typeof entry === 'string').map(entry => entry.trim()).filter(Boolean)
  : [];

const allowedTopLevelKeys = new Set([
  'schemaVersion', 'id', 'title', 'step', 'substep', 'focus', 'lessonPath',
  'plannedParts', 'planningContext', 'sources', 'parts'
]);

const expectedPartsForPath: Record<LessonPath, RuntimeLessonPart['part'][]> = {
  full: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  'block1+3': [1, 2, 3, 4, 5, 9, 10],
  'block2+3': [6, 7, 8, 9, 10]
};

const canonicalFocus = new Set(['introduction', 'accuracy', 'automaticity-fluency']);
const canonicalPaths = new Set<LessonPath>(['full', 'block1+3', 'block2+3']);
const canonicalSourceKinds = new Set([
  'step-instruction',
  'instructor-manual',
  'dictation-book',
  'student-reader',
  'student-notebook',
  'teacher-selection'
]);
const canonicalSourceVerification = new Set(['verified', 'needs-verification', 'teacher-created']);

const assertExactKeys = (record: UnknownRecord, allowed: Set<string>, label: string) => {
  const unexpected = Object.keys(record).filter(key => !allowed.has(key));
  if (unexpected.length) {
    throw new Error(`${label} contains noncanonical fields: ${unexpected.join(', ')}.`);
  }
};

const assertCanonicalRawShape = (value: unknown): UnknownRecord => {
  const raw = asRecord(value);
  if (!raw || raw.schemaVersion !== 'wrs-runtime-v1') {
    throw new Error('Canonical WRS lesson JSON must be a top-level wrs-runtime-v1 lesson.');
  }

  assertExactKeys(raw, allowedTopLevelKeys, 'Canonical lesson');

  for (const field of ['id', 'title', 'step', 'substep'] as const) {
    if (!text(raw[field])) throw new Error(`Canonical lesson requires a nonblank ${field}.`);
  }

  if (!canonicalFocus.has(text(raw.focus))) {
    throw new Error('Canonical lesson focus must be introduction, accuracy, or automaticity-fluency.');
  }

  const path = text(raw.lessonPath) as LessonPath;
  if (!canonicalPaths.has(path)) {
    throw new Error('Canonical lesson requires an explicit lessonPath: full, block1+3, or block2+3.');
  }

  if (!Array.isArray(raw.plannedParts)) {
    throw new Error('Canonical lesson requires explicit plannedParts.');
  }
  const plannedParts = raw.plannedParts.map(Number);
  const expectedPlanned = expectedPartsForPath[path];
  if (
    plannedParts.length !== expectedPlanned.length ||
    plannedParts.some((part, index) => part !== expectedPlanned[index])
  ) {
    throw new Error(`Canonical plannedParts must exactly match lessonPath ${path}.`);
  }

  const planningContext = asRecord(raw.planningContext);
  if (!planningContext) throw new Error('Canonical lesson requires planningContext.');
  assertExactKeys(planningContext, new Set(['conceptsToWeave', 'troubleSpots']), 'planningContext');
  if (typeof planningContext.conceptsToWeave !== 'string' || typeof planningContext.troubleSpots !== 'string') {
    throw new Error('Canonical planningContext requires conceptsToWeave and troubleSpots strings.');
  }

  if (!Array.isArray(raw.sources) || raw.sources.length === 0) {
    throw new Error('Canonical lesson requires a nonempty source manifest.');
  }
  const sourceIds = new Set<string>();
  const allowedSourceKeys = new Set(['id', 'label', 'kind', 'edition', 'locator', 'notes', 'verification']);
  for (const rawSource of raw.sources) {
    const source = asRecord(rawSource);
    if (!source) throw new Error('Canonical source entries must be objects.');
    assertExactKeys(source, allowedSourceKeys, 'Canonical source');
    const id = text(source.id);
    const kind = text(source.kind);
    if (!id || !text(source.label) || !kind || !text(source.locator)) {
      throw new Error('Canonical sources require id, label, kind, and locator.');
    }
    if (!canonicalSourceKinds.has(kind)) {
      throw new Error(`Canonical source ${id} has unsupported kind ${kind}.`);
    }
    const verification = 'verification' in source ? text(source.verification) : '';
    if ('verification' in source && !canonicalSourceVerification.has(verification)) {
      throw new Error(`Canonical source ${id} has unsupported verification ${verification || '(blank)'}.`);
    }
    if (verification === 'teacher-created' && kind !== 'teacher-selection') {
      throw new Error(`Canonical source ${id} may use teacher-created verification only with kind teacher-selection.`);
    }
    if (kind === 'teacher-selection' && verification && verification !== 'teacher-created') {
      throw new Error(`Canonical teacher-selection source ${id} cannot claim ${verification} verification.`);
    }
    if (sourceIds.has(id)) throw new Error(`Canonical source id ${id} is duplicated.`);
    sourceIds.add(id);
  }

  if (!Array.isArray(raw.parts) || raw.parts.length !== 10) {
    throw new Error('Canonical lesson must contain exactly ten ordered Part objects.');
  }
  const allowedPartKeys = new Set(['part', 'title', 'teacherDirections', 'sourceIds', 'data']);
  raw.parts.forEach((rawPart, index) => {
    const part = asRecord(rawPart);
    const expectedPart = index + 1;
    if (!part) throw new Error(`Canonical Part ${expectedPart} must be an object.`);
    assertExactKeys(part, allowedPartKeys, `Canonical Part ${expectedPart}`);
    if (Number(part.part) !== expectedPart) {
      throw new Error(`Canonical Parts must be ordered 1-10; position ${expectedPart} contains Part ${String(part.part)}.`);
    }
    if (!text(part.title)) throw new Error(`Canonical Part ${expectedPart} requires a title.`);
    if (!Array.isArray(part.teacherDirections) || part.teacherDirections.some(item => typeof item !== 'string')) {
      throw new Error(`Canonical Part ${expectedPart} teacherDirections must be a string array.`);
    }
    if (!Array.isArray(part.sourceIds) || part.sourceIds.some(item => typeof item !== 'string')) {
      throw new Error(`Canonical Part ${expectedPart} sourceIds must be a string array.`);
    }
    if (!asRecord(part.data)) throw new Error(`Canonical Part ${expectedPart} data must be an object.`);

    const linkedSources = strings(part.sourceIds);
    if (new Set(linkedSources).size !== linkedSources.length) {
      throw new Error(`Canonical Part ${expectedPart} sourceIds must not contain duplicates.`);
    }
    const isPlanned = expectedPlanned.includes(expectedPart as RuntimeLessonPart['part']);
    if (isPlanned && expectedPart < 10 && linkedSources.length === 0) {
      throw new Error(`Canonical planned Part ${expectedPart} requires at least one source reference.`);
    }
    const unknown = linkedSources.filter(sourceId => !sourceIds.has(sourceId));
    if (unknown.length) {
      throw new Error(`Canonical Part ${expectedPart} cites unregistered source IDs: ${unknown.join(', ')}.`);
    }
  });

  return raw;
};

/**
 * Canonical interchange boundary for WRS Dojo lessons.
 *
 * The canonical authored/exported object is the bare wrs-runtime-v1 plan.
 * The legacy Lesson object remains an internal compatibility/persistence envelope.
 * This boundary is intentionally stricter than the legacy normalizer: it rejects
 * repairable/hybrid shapes instead of silently discarding or filling fields.
 */
export const canonicalRuntimeFromImportValue = (value: unknown): WRSRuntimeLessonPlan => {
  assertCanonicalRawShape(value);
  const runtime = normalizeRuntimeLessonPlan(value);
  if (!runtime) {
    throw new Error('Canonical WRS lesson JSON must be a top-level wrs-runtime-v1 lesson.');
  }
  return validateRuntimeLesson(runtime);
};

export const canonicalRuntimeFromLesson = (lesson: Lesson): WRSRuntimeLessonPlan => {
  if (!lesson.runtimePlan) {
    throw new Error('This lesson has no authoritative runtimePlan and cannot be canonically exported.');
  }
  return canonicalRuntimeFromImportValue(lesson.runtimePlan);
};

export const serializeCanonicalLesson = (lesson: Lesson): string => (
  JSON.stringify(canonicalRuntimeFromLesson(lesson), null, 2)
);
