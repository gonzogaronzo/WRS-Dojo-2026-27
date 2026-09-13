import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeRuntimeLessonPlan } from '../legacy/runtimeLesson';
import { validateInstructionalLessonContract } from '../legacy/instructionalLessonContract';
import { validateCanonicalLessonGate } from '../legacy/canonicalLessonGate';
import lesson1 from '../curriculum/5a-week-2026-09-14/5a-7.4-lesson-1.json';
import lesson2 from '../curriculum/5a-week-2026-09-14/5a-7.4-lesson-2.json';
import lesson3 from '../curriculum/5a-week-2026-09-14/5a-7.4-lesson-3.json';
import lesson4 from '../curriculum/5a-week-2026-09-14/5a-7.4-lesson-4.json';
import lesson5 from '../curriculum/5a-week-2026-09-14/5a-7.4-lesson-5.json';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const runtimeOf = (value: unknown) => {
  const runtime = normalizeRuntimeLessonPlan(clone(value));
  assert.ok(runtime);
  return runtime!;
};
const partOf = (runtime: any, number: number) => runtime.parts.find((part: any) => part.part === number);
const codes = (value: ReturnType<typeof validateInstructionalLessonContract>) => new Set(value.issues.map(issue => issue.code));

test('all five current 5A 7.4 lessons pass the single canonical gate', () => {
  for (const source of [lesson1, lesson2, lesson3, lesson4, lesson5]) {
    const result = validateCanonicalLessonGate(runtimeOf(source));
    assert.equal(result.ok, true, result.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
    assert.equal(result.instructionalOk, true);
    assert.equal(result.runtimeOk, true);
    assert.deepEqual(result.issues, []);
  }
});

test('Part 3 fails when the expected current HFW packet is incomplete', () => {
  const runtime = runtimeOf(lesson1);
  const part3 = partOf(runtime, 3);
  part3.data.hfwList = ['national', 'themselves', 'half', 'question', 'suggestion'];

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
  partOf(runtime, 5).data.weaveQuestions = Array.from(
    { length: 10 },
    (_, index) => `Which final stable syllable do you see in sentence ${index + 1}?`
  );
  const result = validateInstructionalLessonContract(runtime);
  assert.ok(codes(result).has('part5_weave_variety_failed'));
});

test('Part 8 rejects incomplete canonical category counts', () => {
  const runtime = runtimeOf(lesson1);
  const part8 = partOf(runtime, 8);
  part8.data.dictation.sounds = part8.data.dictation.sounds.slice(0, 3);
  part8.data.dictation.wordElements = ['-ion'];
  part8.data.dictation.nonsenseWords = [];
  part8.data.dictation.phrases = [];

  const result = validateInstructionalLessonContract(runtime);
  const part8Issues = result.issues.filter(issue => issue.part === 8).map(issue => issue.code);
  assert.ok(part8Issues.includes('part8_category_count_failed'));
  assert.ok(part8Issues.includes('part8_word_elements_count_failed'));
});

test('Part 9 rejects a ten-question set with the wrong difficulty distribution', () => {
  const runtime = runtimeOf(lesson1);
  partOf(runtime, 9).data.questions[8].level = 'inference';
  const result = validateInstructionalLessonContract(runtime);
  assert.ok(codes(result).has('part9_question_ladder_failed'));
});

test('the canonical gate rejects teacher-selection placeholders', () => {
  const runtime = runtimeOf(lesson1);
  partOf(runtime, 4).teacherDirections = ['Choose 15 words for each student.'];
  const result = validateCanonicalLessonGate(runtime);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(issue => issue.code === 'teacher_selection_placeholder'));
});
