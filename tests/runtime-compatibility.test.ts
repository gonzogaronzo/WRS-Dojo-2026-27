import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeRuntimeLessonPlan,
  runtimeLessonToLegacyLesson,
  validateLessonModuleReadiness,
  validatePart2RuntimePresentation,
  validateRuntimeLessonCompatibility
} from '../legacy/runtimeLesson';
import { normalizeLesson } from '../legacy/dataNormalization';
import { nextLessonPart } from '../legacy/lessonRules';
import { studentChartingWordDistributionForLesson } from '../legacy/wordDistribution';
import { LessonPart } from '../legacy/types';
import disposableRuntime73 from './fixtures/disposable-wrs-runtime-7.3-part2.json';
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

test('fails Part 7 when old previousSubstepWords is present but reviewWords is missing', () => {
  const runtime = runtimeOf(lesson1);
  const part7 = partOf(runtime, 7);
  delete part7.data.reviewWords;
  part7.data.previousSubstepWords = ['phone', 'match', 'photograph'];

  assert.throws(() => validateRuntimeLessonCompatibility(runtime), /Part 7 reviewWords\/currentWords missing/);
});

test('fails Part 2 when an unsupported card role is supplied', () => {
  const runtime = runtimeOf(lesson1);
  partOf(runtime, 2).data.part2Presentation.interactiveSteps[0].objects[0].role = 'final-stable-syllable';

  assert.throws(() => validateRuntimeLessonCompatibility(runtime), /Part 2 interactive presentation invalid/);
});

test('fails Part 2 when a step provenance is invalid', () => {
  const runtime = runtimeOf(lesson1);
  partOf(runtime, 2).data.part2Presentation.interactiveSteps[0].provenance = 'unverified';

  assert.throws(() => validateRuntimeLessonCompatibility(runtime), /Part 2 interactive presentation invalid/);
});

test('fails Part 2 when a semantic frame cites an unknown source', () => {
  const runtime = runtimeOf(lesson1);
  partOf(runtime, 2).data.part2Presentation.frames[0].sourceIds = ['not-in-manifest'];

  assert.throws(() => validateRuntimeLessonCompatibility(runtime), /Part 2 semantic frame cites unregistered source IDs/);
});

test('flags a populated Part 4 projection when legacy Wordlist Reading is empty', () => {
  const projected = runtimeLessonToLegacyLesson(runtimeOf(lesson1));
  projected.wordListReading = [];

  assert.match(
    validateLessonModuleReadiness(projected, projected.runtimePlan).join('\n'),
    /Part 4 practice\/charting missing or incompatible with legacy Wordlist Reading/
  );
});

test('fails Part 9 when questions are stranded in an unsupported field', () => {
  const runtime = runtimeOf(lesson1);
  const part9 = partOf(runtime, 9);
  delete part9.data.questions;
  part9.data.followUpQuestions = 'This must not be silently projected.';

  assert.throws(() => validateRuntimeLessonCompatibility(runtime), /Part 9 passage\/questions missing or unsupported/);
});

test('rejects an invalid full runtime lesson during reload normalization', () => {
  const runtime = runtimeOf(lesson1);
  partOf(runtime, 2).data.part2Presentation.interactiveSteps[0].provenance = 'unverified';

  assert.equal(normalizeLesson(runtime), null);
});

test('retains a valid Part 9 title, passage, and ten questions through projection and reload', () => {
  const compatibility = validateRuntimeLessonCompatibility(runtimeOf(lesson1));
  const reloaded = normalizeLesson(JSON.parse(JSON.stringify(compatibility.lesson)));

  assert.ok(reloaded);
  assert.equal(reloaded?.passageTitle, 'The New Kitten');
  assert.equal(reloaded?.passagePage, '122-123');
  assert.equal(reloaded?.passageQuestions?.length, 10);
  assert.equal(reloaded?.runtimePlan?.parts.find(part => part.part === 9)?.data.questions?.length, 10);
});

test('keeps Part 4 roster-bound 15-word lists separate and rejects a roster mismatch', () => {
  const compatibility = validateRuntimeLessonCompatibility(runtimeOf(lesson1));
  const roster = [{ name: 'Alex' }, { name: 'Finn' }, { name: 'Maya' }];
  const distribution = studentChartingWordDistributionForLesson(compatibility.lesson, roster, (() => {
    let index = 0;
    return () => 'instance-' + (++index);
  })());

  assert.ok(distribution);
  assert.deepEqual(
    distribution?.map(studentList => studentList.map(card => card.text)),
    compatibility.lesson.wordListChartingByStudent?.map(list => list.words)
  );
  assert.ok(distribution?.every(studentList => studentList.length === 15));
  assert.equal(
    studentChartingWordDistributionForLesson(compatibility.lesson, [{ name: 'Alex' }, { name: 'Finn' }]),
    null
  );
});

test('fails a bare Part 6 expected response', () => {
  const runtime = runtimeOf(lesson1);
  partOf(runtime, 6).data.quickDrillReverse = ['/a/ → a'];

  assert.throws(() => validateRuntimeLessonCompatibility(runtime), /Part 6 invalid or ambiguous vowel\/response prompt/);
});

test('passes the full classroom runtime gate and keeps every intended mission part navigable', () => {
  const compatibility = validateRuntimeLessonCompatibility(runtimeOf(lesson1));

  assert.deepEqual(compatibility.runtime.plannedParts, [1,2,3,4,5,6,7,8,9,10]);
  for (let current = LessonPart.Part1; current < LessonPart.Part10; current += 1) {
    assert.equal(
      nextLessonPart(current, compatibility.runtime.plannedParts),
      current + 1
    );
  }
});

test('keeps the known-good 7.3 interactive Part 2 fixture supported', () => {
  const runtime = normalizeRuntimeLessonPlan(disposableRuntime73);
  assert.ok(runtime);
  const part2 = runtime?.parts.find(part => part.part === 2);
  assert.ok(part2);
  assert.deepEqual(validatePart2RuntimePresentation(part2?.data), []);
});

test('all five regenerated 5A 7.4 lessons pass the complete compatibility gate', () => {
  for (const runtime of [lesson1, lesson2, lesson3, lesson4, lesson5]) {
    assert.doesNotThrow(() => validateRuntimeLessonCompatibility(runtimeOf(runtime)));
  }
});
