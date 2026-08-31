import { LessonPart, WordlistScore } from './types';

export const clampLessonPart = (part: number): LessonPart =>
  Math.min(LessonPart.Part10, Math.max(LessonPart.Briefing, Math.trunc(part))) as LessonPart;

export const normalizePlannedParts = (plannedParts?: number[]): LessonPart[] => {
  const normalized = Array.from(new Set(
    (plannedParts || [])
      .map(part => clampLessonPart(part))
      .filter(part => part >= LessonPart.Part1 && part <= LessonPart.Part10)
  )).sort((left, right) => left - right);
  return normalized.length
    ? normalized
    : Array.from({ length: 10 }, (_, index) => (index + 1) as LessonPart);
};

export const previousLessonPart = (part: LessonPart, plannedParts?: number[]): LessonPart => {
  if (part === LessonPart.Briefing) return LessonPart.Briefing;
  const planned = normalizePlannedParts(plannedParts);
  const index = planned.indexOf(part);
  if (index <= 0) return LessonPart.Briefing;
  return planned[index - 1];
};

export const nextLessonPart = (part: LessonPart, plannedParts?: number[]): LessonPart => {
  const planned = normalizePlannedParts(plannedParts);
  if (part === LessonPart.Briefing) return planned[0];
  const index = planned.indexOf(part);
  if (index < 0) return planned.find(candidate => candidate > part) || planned[planned.length - 1];
  return planned[Math.min(index + 1, planned.length - 1)];
};

export const getWordlistStatus = (
  scores: WordlistScore[], studentId: string, instanceId: string
): WordlistScore['status'] =>
  scores.find(score => score.studentId === studentId && score.instanceId === instanceId)?.status || 'none';

export const toggleWordlistScore = (
  scores: WordlistScore[], studentId: string, instanceId: string, wordText: string
): WordlistScore[] => {
  const current = getWordlistStatus(scores, studentId, instanceId);
  const nextStatus: WordlistScore['status'] = current === 'none' ? 'correct' : current === 'correct' ? 'error' : 'none';
  const unchangedScores = scores.filter(score => !(score.studentId === studentId && score.instanceId === instanceId));

  return nextStatus === 'none'
    ? unchangedScores
    : [...unchangedScores, { studentId, instanceId, wordText, status: nextStatus }];
};

export const summarizeWordlistScores = (scores: WordlistScore[], studentId: string) => {
  const studentScores = scores.filter(score => score.studentId === studentId);
  const correct = studentScores.filter(score => score.status === 'correct').length;
  const errors = studentScores.filter(score => score.status === 'error').length;
  return { correct, errors, attempted: correct + errors };
};
