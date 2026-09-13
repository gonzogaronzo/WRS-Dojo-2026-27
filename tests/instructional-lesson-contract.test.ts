import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeRuntimeLessonPlan } from '../legacy/runtimeLesson';
import { validateInstructionalLessonContract } from '../legacy/instructionalLessonContract';
import lesson1 from '../curriculum/5a-week-2026-09-14/5a-7.4-lesson-1.json';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const runtimeOf = (value: unknown) => {
  const runtime = normalizeRuntimeLessonPlan(clone(value));
  assert.ok(runtime);
  return runtime!;
};
const partOf = (runtime: any, number: number) => runtime.parts.find((part: any) => part.part === number);
const codes = (value: ReturnType<typeof validateInstructionalLessonContract>) => new Set(value.issues.map(issue => issue.code));

test('current 5A lesson 1 is rejected for known canonical instructional defects', () => {
  const result = validateInstructionalLessonContract(runtimeOf(lesson1));
  const found = codes(result);

  assert.equal(result.ok, false);
  assert.ok(found.has('teacher_selection_placeholder'));
  assert.ok(found.has('part5_weave_variety_failed'));
  assert.ok(found.has('part8_category_count_failed'));
  assert.ok(found.has('part8_word_elements_applicability_missing'));
  assert.ok(found.has('part8_sentence_expectation_missing'));
  assert.ok(found.has('part8_mark_reinforce_missing'));
  assert.ok(found.has('part9_question_ladder_failed'));
});

test('Part 3 fails when the source-expected current HFW set is complete but the lesson packet is incomplete', () => {
  const runtime = runtimeOf(lesson1);
  const part3 = partOf(runtime, 3);
  part3.data.expectedCurrentHfw = [
    'national', 'themselves', 'ourselves', 'half', 'whole',
    'whom', 'whose', 'question', 'suggestion'
  ];

  const result = validateInstructionalLessonContract(runtime);
  const hfwIssue = result.issues.find(issue => issue.code === 'part3_current_hfw_incomplete');
  assert.ok(hfwIssue);
  assert.match(hfwIssue?.message || '', /ourselves/);
  assert.match(hfwIssue?.message || '', /whole/);
  assert.match(hfwIssue?.message || '', /whom/);
  assert.match(hfwIssue?.message || '', /whose/);
});

test('Part 5 rejects ten mechanically repeated weave-question stems', () => {
  const runtime = runtimeOf(lesson1);
  const result = validateInstructionalLessonContract(runtime);
  assert.ok(codes(result).has('part5_weave_variety_failed'));
});

test('Part 8 rejects arrays that exist but do not meet canonical category counts', () => {
  const runtime = runtimeOf(lesson1);
  const part8 = partOf(runtime, 8);
  part8.data.wordElementsApplicable = true;
  part8.data.expectedSentenceCount = 3;
  part8.data.markReinforce = 'Mark the final stable syllable and suffix -ion where applicable.';

  const result = validateInstructionalLessonContract(runtime);
  const part8Issues = result.issues.filter(issue => issue.part === 8).map(issue => issue.code);
  assert.ok(part8Issues.includes('part8_category_count_failed'));
  assert.ok(part8Issues.includes('part8_word_elements_count_failed'));
  assert.ok(part8Issues.includes('part8_sentence_count_failed'));
});

test('Part 9 rejects a structurally valid ten-question set with the wrong difficulty distribution', () => {
  const runtime = runtimeOf(lesson1);
  const result = validateInstructionalLessonContract(runtime);
  assert.ok(codes(result).has('part9_question_ladder_failed'));
});
