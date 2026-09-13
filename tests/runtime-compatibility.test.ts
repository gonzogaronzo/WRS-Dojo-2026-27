import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeRuntimeLessonPlan,
  runtimeLessonToLegacyLesson,
  validateLessonModuleReadiness,
  validatePart2RuntimePresentation,
  validateRuntimeLessonCompatibility
} from '../legacy/runtimeLesson';
import { validateCanonicalLessonGate } from '../legacy/canonicalLessonGate';
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
const sourceVerifiedRuntimeOf = (value: unknown) => {
  const runtime = runtimeOf(value);
  for (const source of runtime.sources) {
    if (source.verification === 'needs-verification') source.verification = 'verified';
  }
  return runtime;
};
const partOf = (runtime: any, number: number) => runtime.parts.find((part: any) => part.part === number);

test('fails Part 7 when old previousSubstepWords is present but reviewWords is missing', () => {
  const runtime = sourceVerifiedRuntimeOf(lesson1);
  const part7 = partOf(runtime, 7);
  delete part7.data.reviewWords;
  part7.data.previousSubstepWords = ['phone', 'match', 'photograph'];

  assert.throws(() => validateRuntimeLessonCompatibility(runtime), /part7_previous_words_count_failed|Part 7 reviewWords\/currentWords missing/);
});

test('fails Part 2 when an unsupported card role is supplied', () => {
  const runtime = sourceVerifiedRuntimeOf(lesson1);
  partOf(runtime, 2).data.part2Presentation.interactiveSteps[0].objects[0].role = 'final-stable-syllable';

  assert.throws(() => validateRuntimeLessonCompatibility(runtime), /Part 2 interactive presentation invalid/);
});

test('fails Part 2 when a step provenance is invalid', () => {
  const runtime = sourceVerifiedRuntimeOf(lesson1);
  partOf(runtime, 2).data.part2Presentation.interactiveSteps[0].provenance = 'unverified';

  assert.throws(() => validateRuntimeLessonCompatibility(runtime), /Part 2 interactive presentation invalid/);
});

test('fails Part 2 when an interactive step cites an unknown source', () => {
  const runtime = sourceVerifiedRuntimeOf(lesson1);
  partOf(runtime, 2).data.part2Presentation.interactiveSteps[0].sourceRef.sourceIds = ['not-in-manifest'];

  assert.throws(() => validateRuntimeLessonCompatibility(runtime), /cites unregistered source IDs/);
});

test('flags a populated Part 4 projection when legacy Wordlist Reading is empty', () => {
  const projected = runtimeLessonToLegacyLesson(sourceVerifiedRuntimeOf(lesson1));
  projected.wordListReading = [];

  assert.match(
    validateLessonModuleReadiness(projected, projected.runtimePlan).join('\n'),
    /Part 4 targeted practice missing|Part 4 practice\/charting missing/
  );
});

test('fails Part 9 when questions are stranded in an unsupported field', () => {
  const runtime = sourceVerifiedRuntimeOf(lesson1);
  const part9 = partOf(runtime, 9);
  delete part9.data.questions;
  part9.data.followUpQuestions = 'This must not be silently projected.';

  assert.throws(() => validateRuntimeLessonCompatibility(runtime), /part9_question_count_failed|part9_question_ladder_failed|Part 9 passage\/questions missing or unsupported/);
});

test('retains a valid Part 9 title, passage, and ten questions through projection and reload', () => {
  const compatibility = validateRuntimeLessonCompatibility(sourceVerifiedRuntimeOf(lesson1));
  const reloaded = normalizeLesson(JSON.parse(JSON.stringify(compatibility.lesson)));

  assert.ok(reloaded);
  assert.equal(reloaded?.passageTitle, 'The New Kitten');
  assert.equal(reloaded?.passagePage, '122-123');
  assert.equal(reloaded?.passageQuestions?.length, 10);
  assert.equal(reloaded?.runtimePlan?.parts.find(part => part.part === 9)?.data.questions?.length, 10);
  assert.equal(reloaded?.wrsPlan?.lessonFocus, 'accuracy');
});

test('projects Part 4 as targeted practice without fabricating another formal 15-word charting event', () => {
  const compatibility = validateRuntimeLessonCompatibility(sourceVerifiedRuntimeOf(lesson1));
  const roster = [{ name: 'Alex' }, { name: 'Finn' }, { name: 'Maya' }];

  assert.equal(compatibility.lesson.wordListMode, 'practice');
  assert.equal(compatibility.lesson.wordListTargetCount, 6);
  assert.deepEqual(compatibility.lesson.wordListCharting, []);
  assert.deepEqual(compatibility.lesson.wordListChartingByStudent, []);
  assert.equal(studentChartingWordDistributionForLesson(compatibility.lesson, roster), null);
});

test('fails a bare Part 6 expected response', () => {
  const runtime = sourceVerifiedRuntimeOf(lesson1);
  partOf(runtime, 6).data.quickDrillReverse = ['/a/ → a'];

  assert.throws(() => validateRuntimeLessonCompatibility(runtime), /Part 6|part6/);
});

test('passes the full classroom runtime gate and keeps every intended mission part navigable', () => {
  const compatibility = validateRuntimeLessonCompatibility(sourceVerifiedRuntimeOf(lesson1));

  assert.deepEqual(compatibility.runtime.plannedParts, [1,2,3,4,5,6,7,8,9,10]);
  for (let current = LessonPart.Part1; current < LessonPart.Part10; current += 1) {
    assert.equal(
      nextLessonPart(current, compatibility.runtime.plannedParts),
      current + 1
    );
  }
});

test('keeps the known-good 7.3 interactive Part 2 fixture supported by the Part 2 renderer validator', () => {
  const runtime = normalizeRuntimeLessonPlan(disposableRuntime73);
  assert.ok(runtime);
  const part2 = runtime?.parts.find(part => part.part === 2);
  assert.ok(part2);
  assert.deepEqual(validatePart2RuntimePresentation(part2?.data), []);
});

test('all five regenerated 5A 7.4 lessons pass canonical and compatibility gates after required source records are verified', () => {
  for (const source of [lesson1, lesson2, lesson3, lesson4, lesson5]) {
    const runtime = sourceVerifiedRuntimeOf(source);
    const canonical = validateCanonicalLessonGate(runtime);
    assert.equal(canonical.ok, true, canonical.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
    assert.doesNotThrow(() => validateRuntimeLessonCompatibility(runtime));
  }
});

test('all five lessons survive import projection, JSON save, full reload, and reopen data checks after required source records are verified', () => {
  for (const source of [lesson1, lesson2, lesson3, lesson4, lesson5]) {
    const compatibility = validateRuntimeLessonCompatibility(sourceVerifiedRuntimeOf(source));
    const savedJson = JSON.stringify(compatibility.lesson);
    const reloaded = normalizeLesson(JSON.parse(savedJson));
    assert.ok(reloaded);

    const reopenedRuntime = reloaded?.runtimePlan;
    assert.ok(reopenedRuntime);
    const reopenedCanonical = validateCanonicalLessonGate(reopenedRuntime!);
    assert.equal(reopenedCanonical.ok, true, reopenedCanonical.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));

    assert.deepEqual(reopenedRuntime?.plannedParts, [1,2,3,4,5,6,7,8,9,10]);
    assert.equal(reloaded?.wordCards.length, 6);
    assert.equal(reloaded?.wordListMode, 'practice');
    assert.equal(reloaded?.wordListTargetCount, reloaded?.wordListPractice.length);
    assert.equal(reloaded?.wordListChartingByStudent?.length, 0);
    assert.deepEqual(reloaded?.wordListCharting, []);
    assert.equal((reopenedRuntime?.parts.find(part => part.part === 5)?.data as any)?.weaveQuestions?.length, 10);
    assert.equal((reopenedRuntime?.parts.find(part => part.part === 7)?.data as any)?.currentWords?.length, 6);
    assert.equal(reloaded?.dictation.sounds.length, 5);
    assert.equal(reloaded?.dictation.wordElements.length, 5);
    assert.equal(reloaded?.dictation.realWords.length, 5);
    assert.equal(reloaded?.dictation.nonsenseWords.length, 3);
    assert.equal(reloaded?.dictation.phrases.length, 3);
    assert.equal(reloaded?.passageQuestions?.length, 10);
  }
});
