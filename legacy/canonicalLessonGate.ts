import { validateInstructionalLessonContract, InstructionalContractIssue } from './instructionalLessonContract';
import { validateRuntimeLessonCompatibility } from './runtimeLesson';
import { WRSRuntimeLessonPlan } from './types';

export interface CanonicalLessonGateResult {
  ok: boolean;
  instructionalOk: boolean;
  runtimeOk: boolean;
  issues: InstructionalContractIssue[];
  runtimeErrors: string[];
}

const placeholderPatterns = [
  /\b(?:select|choose|pick)\b.{0,60}\b(?:cards?|sounds?|words?|items?|phrases?|sentences?|passage|examples?|word elements?)\b/i,
  /\breview\b.{0,40}\b(?:vowels?|consonants?|sounds?|words?)\b(?!\s+(?:listed|below|above))/i,
  /\buse\s+cumulative\b.{0,30}\b(?:cards?|sounds?|words?)\b/i,
  /\badd\b.{0,30}\b(?:words?|sounds?|examples?|word elements?)\b/i
];

const collectStrings = (value: unknown, output: string[] = []): string[] => {
  if (typeof value === 'string') {
    output.push(value);
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach(item => collectStrings(item, output));
    return output;
  }
  if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach(item => collectStrings(item, output));
  }
  return output;
};

const placeholderIssues = (runtime: WRSRuntimeLessonPlan): InstructionalContractIssue[] => {
  const issues: InstructionalContractIssue[] = [];
  for (const part of runtime.parts) {
    const strings = collectStrings({ teacherDirections: part.teacherDirections, data: part.data });
    const offending = strings.find(value => placeholderPatterns.some(pattern => pattern.test(value)));
    if (offending) {
      issues.push({
        code: 'teacher_selection_placeholder',
        message: `Part ${part.part} contains teacher-selection placeholder language: ${offending}`,
        part: part.part,
        severity: 'error'
      });
    }
  }
  return issues;
};

/**
 * Single fail-closed classroom gate. A lesson is classroom-ready only when
 * both the canonical instructional contract and the live Dojo runtime gate
 * pass. This function does not repair, infer, or fill missing lesson content.
 */
export const validateCanonicalLessonGate = (
  runtime: WRSRuntimeLessonPlan
): CanonicalLessonGateResult => {
  const instructional = validateInstructionalLessonContract(runtime);
  const issues = [...instructional.issues];

  for (const extra of placeholderIssues(runtime)) {
    if (!issues.some(existing => existing.code === extra.code && existing.part === extra.part)) {
      issues.push(extra);
    }
  }

  const instructionalOk = !issues.some(issue => issue.severity === 'error');
  const runtimeErrors: string[] = [];
  try {
    validateRuntimeLessonCompatibility(runtime);
  } catch (error) {
    runtimeErrors.push(error instanceof Error ? error.message : String(error));
  }
  const runtimeOk = runtimeErrors.length === 0;

  return {
    ok: instructionalOk && runtimeOk,
    instructionalOk,
    runtimeOk,
    issues,
    runtimeErrors
  };
};
