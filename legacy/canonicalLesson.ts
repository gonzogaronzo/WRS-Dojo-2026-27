import { Lesson, WRSRuntimeLessonPlan } from './types';
import { normalizeRuntimeLessonPlan, validateRuntimeLesson } from './runtimeLesson';

/**
 * Canonical interchange boundary for WRS Dojo lessons.
 *
 * The canonical authored/exported object is the bare wrs-runtime-v1 plan.
 * The legacy Lesson object remains an internal compatibility/persistence envelope.
 */
export const canonicalRuntimeFromImportValue = (value: unknown): WRSRuntimeLessonPlan => {
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
  return validateRuntimeLesson(lesson.runtimePlan);
};

export const serializeCanonicalLesson = (lesson: Lesson): string => (
  JSON.stringify(canonicalRuntimeFromLesson(lesson), null, 2)
);
