import { auth } from './firebase';
import { GroupInstructionalProfile, GroupProfile, Lesson } from './types';
import { normalizeRuntimeLessonPlan, runtimeLessonToLegacyLesson } from './runtimeLesson';

export const CURRICULUM_RELEASE_ID = 'WRS-CURRICULUM-1.0.1-2026-09-02';
const PILOT_SUBSTEPS = new Set(['8.2']);

const compilerBaseUrl = () => {
  const value = String((import.meta as any).env?.VITE_WRS_COMPILER_URL || '').trim();
  return value.replace(/\/+$/, '');
};

export const curriculumCompilerConfigured = () => Boolean(compilerBaseUrl());
export const curriculumGenerationSupported = (substep: string) => PILOT_SUBSTEPS.has(substep.trim());

const errorMessage = async (response: Response) => {
  try {
    const body = await response.json();
    return body?.detail?.message || body?.detail || body?.message || `Compiler returned HTTP ${response.status}.`;
  } catch {
    return `Compiler returned HTTP ${response.status}.`;
  }
};

export const generateLessonFromCurriculum = async (
  group: GroupProfile,
  profile: GroupInstructionalProfile
): Promise<Lesson> => {
  const baseUrl = compilerBaseUrl();
  if (!baseUrl) {
    throw new Error('The curriculum compiler URL is not configured for this Dojo build.');
  }
  if (!curriculumGenerationSupported(profile.currentSubstep)) {
    throw new Error(`Automatic source-faithful generation is not enabled for Substep ${profile.currentSubstep || '(not set)'} yet.`);
  }
  if (!auth.currentUser) {
    throw new Error('Sign in to Dojo before generating a curriculum lesson.');
  }
  if (!profile.lessonFocus || profile.lessonFocus === 'mixed') {
    throw new Error('Select Introduction, Accuracy, or Automaticity / Fluency before generating a lesson.');
  }

  const token = await auth.currentUser.getIdToken();
  const response = await fetch(`${baseUrl}/v1/lessons/compile`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      groupId: group.id,
      groupName: group.name,
      currentSubstep: profile.currentSubstep,
      lessonFocus: profile.lessonFocus,
      lessonPath: 'full',
      conceptsToWeave: profile.conceptsToWeave,
      troubleSpots: profile.troubleSpots,
      currentCardRepository: profile.currentCardRepository,
      reviewCardRepository: profile.reviewCardRepository,
      practicedWordElements: profile.practicedWordElements,
      highFrequencyWords: profile.highFrequencyWords,
      nextLessonNotes: profile.nextLessonNotes,
      unmasteredPriorHighFrequencyWords: []
    })
  });

  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }

  const payload = await response.json();
  const rawRuntime = payload?.runtimePlan;
  const runtime = normalizeRuntimeLessonPlan(rawRuntime);
  if (!runtime) {
    throw new Error('The compiler returned a lesson that Dojo could not recognize as wrs-runtime-v1.');
  }
  if (rawRuntime?.curriculumReleaseId !== CURRICULUM_RELEASE_ID) {
    throw new Error(`The compiler returned an unexpected curriculum release: ${rawRuntime?.curriculumReleaseId || 'missing'}.`);
  }

  const lesson = runtimeLessonToLegacyLesson(runtime);
  // Release provenance remains durable inside source metadata notes even before
  // the legacy Lesson type gains a dedicated curriculumReleaseId field.
  return {
    ...lesson,
    sourceMetadata: (lesson.sourceMetadata || []).map(source => ({
      ...source,
      notes: [source.notes, `Curriculum release: ${CURRICULUM_RELEASE_ID}`].filter(Boolean).join(' ')
    }))
  };
};
