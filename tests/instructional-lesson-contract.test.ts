import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeRuntimeLessonPlan, validateRuntimeLessonCompatibility } from '../legacy/runtimeLesson';
import { validateInstructionalLessonContract } from '../legacy/instructionalLessonContract';
import { validateCanonicalLessonGate } from '../legacy/canonicalLessonGate';
import lesson1 from '../curriculum/5a-week-2026-09-14/5a-7.4-lesson-1.json';
import lesson2 from '../curriculum/5a-week-2026-09-14/5a-7.4-lesson-2.json';
import lesson3 from '../curriculum/5a-week-2026-09-14/5a-7.4-lesson-3.json';
import lesson4 from '../curriculum/5a-week-2026-09-14/5a-7.4-lesson-4.json';
import lesson5 from '../curriculum/5a-week-2026-09-14/5a-7.4-lesson-5.json';

const lessons = [lesson1, lesson2, lesson3, lesson4, lesson5];
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const runtimeOf = (value: unknown) => {
  const runtime = normalizeRuntimeLessonPlan(clone(value));
  assert.ok(runtime);
  return runtime!;
};
const sourceVerifiedRuntimeOf = (value: unknown) => {
  const runtime = runtimeOf(value);
  for (const source of runtime.sources) {
    if (source.verification === 'needs-verification') source.verification = 'verified';
  }
  return runtime;
};
const partOf = (runtime: any, number: number) => runtime.parts.find((part: any) => part.part === number);
const codes = (value: ReturnType<typeof validateInstructionalLessonContract>) => new Set(value.issues.map(issue => issue.code));
const nonSourceIssues = (value: ReturnType<typeof validateInstructionalLessonContract>) => (
  value.issues.filter(issue => issue.code !== 'source_provenance_unverified')
);

test('all five 5A 7.4 lessons fail closed while their required Part 8 sources remain unverified', () => {
  for (const source of lessons) {
    const runtime = runtimeOf(source);
    const contract = validateInstructionalLessonContract(runtime);
    const canonical = validateCanonicalLessonGate(runtime);

    assert.equal(contract.ok, false);
    assert.ok(codes(contract).has('source_provenance_unverified'));
    assert.deepEqual(nonSourceIssues(contract), []);
    assert.equal(canonical.ok, false);
    assert.equal(canonical.instructionalOk, false);
    assert.equal(canonical.runtimeOk, false);
  }
});

test('corrected 5A 7.4 lesson payloads pass the combined gate once their blocking source records are verified', () => {
  for (const source of lessons) {
    const runtime = sourceVerifiedRuntimeOf(source);
    const canonical = validateCanonicalLessonGate(runtime);
    assert.equal(canonical.ok, true, canonical.issues.map(issue => issue.code + ': ' + issue.message).join('\n'));
    assert.equal(canonical.instructionalOk, true);
    assert.equal(canonical.runtimeOk, true);
    assert.deepEqual(canonical.issues, []);
    assert.doesNotThrow(() => validateRuntimeLessonCompatibility(runtime));
  }
});


test('all five use selected targeted Part 4 practice instead of automatic daily formal charting', () => {
  for (const source of lessons) {
    const runtime = sourceVerifiedRuntimeOf(source);
    const part4 = partOf(runtime, 4);
    assert.equal(part4.data.chartingPlanned, false);
    assert.equal(part4.data.studentChartingLists, undefined);
    assert.deepEqual(part4.data.studentPracticeTargets.map((target: any) => target.studentName), ['Alex', 'Finn', 'Maya']);
    assert.match(part4.data.weeklyInstructionRationale, /Sep 11/);
  }
});

test('Part 1 rejects the exact cumulative-card selection placeholder', () => {
  const runtime = sourceVerifiedRuntimeOf(lesson1);
  partOf(runtime, 1).teacherDirections = ['Select cumulative cards before the drill.'];

  const result = validateInstructionalLessonContract(runtime);
  assert.ok(codes(result).has('teacher_selection_placeholder'));
});

test('Part 3 rejects an incomplete 7.4 HFW packet even when its self-declared expectation is shortened', () => {
  const runtime = sourceVerifiedRuntimeOf(lesson1);
  const part3 = partOf(runtime, 3);
  part3.data.expectedCurrentHfw = ['national', 'themselves', 'half', 'question', 'suggestion'];
  part3.data.hfwList = ['national', 'themselves', 'half', 'question', 'suggestion'];

  const result = validateInstructionalLessonContract(runtime);
  const hfwIssue = result.issues.find(issue => issue.code === 'part3_current_hfw_incomplete');
  assert.ok(hfwIssue);
  assert.match(hfwIssue?.message || '', /ourselves/);
  assert.match(hfwIssue?.message || '', /whole/);
  assert.match(hfwIssue?.message || '', /whom/);
  assert.match(hfwIssue?.message || '', /whose/);
  assert.ok(codes(result).has('part3_current_hfw_profile_failed'));
});

test('Part 5 rejects ten mechanically repeated weave-question stems', () => {
  const runtime = sourceVerifiedRuntimeOf(lesson1);
  partOf(runtime, 5).data.weaveQuestions = Array.from(
    { length: 10 },
    (_, index) => 'Which final stable syllable do you see in sentence ' + (index + 1) + '?'
  );

  const result = validateInstructionalLessonContract(runtime);
  assert.ok(codes(result).has('part5_weave_variety_failed'));
});

test('Part 8 rejects wrong category counts even when every required array exists', () => {
  const runtime = sourceVerifiedRuntimeOf(lesson1);
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

test('Part 8 rejects empty nonsense and phrase arrays without a validated exception', () => {
  const runtime = sourceVerifiedRuntimeOf(lesson1);
  const part8 = partOf(runtime, 8);
  part8.data.dictation.nonsenseWords = [];
  part8.data.dictation.phrases = [];
  part8.data.dictationExceptions = [];

  const result = validateInstructionalLessonContract(runtime);
  const issues = result.issues.filter(issue => issue.part === 8).map(issue => issue.code);
  assert.ok(issues.includes('part8_category_count_failed'));
});

test('Part 9 rejects a ten-question set with the wrong difficulty distribution', () => {
  const runtime = sourceVerifiedRuntimeOf(lesson1);
  partOf(runtime, 9).data.questions[8].level = 'inference';
  const result = validateInstructionalLessonContract(runtime);
  assert.ok(codes(result).has('part9_question_ladder_failed'));
});
