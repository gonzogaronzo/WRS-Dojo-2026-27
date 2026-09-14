import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { canonicalRuntimeFromImportValue, serializeCanonicalLesson } from '../legacy/canonicalLesson';
import { normalizeLesson } from '../legacy/dataNormalization';
import { part2InteractivePresentationFromData } from '../legacy/part2Presentation';
import { runtimeLessonToCompatibilityWrsPlan } from '../legacy/runtimeLesson';

const fixtureUrl = new URL('../fixtures/canonical/3A-2.5-accuracy.reference.json', import.meta.url);
const fixture = JSON.parse(readFileSync(fixtureUrl, 'utf8'));

test('3A 2.5 reference is accepted by the strict canonical boundary', () => {
  const runtime = canonicalRuntimeFromImportValue(fixture);
  assert.equal(runtime.schemaVersion, 'wrs-runtime-v1');
  assert.equal(runtime.step, '2');
  assert.equal(runtime.substep, '5');
  assert.equal(runtime.focus, 'accuracy');
  assert.equal(runtime.parts.length, 10);
});

test('3A 2.5 interactive Part 2 is structurally runnable', () => {
  const runtime = canonicalRuntimeFromImportValue(fixture);
  const part2 = runtime.parts.find(part => part.part === 2);
  const presentation = part2InteractivePresentationFromData(part2?.data);

  assert.ok(presentation);
  assert.equal(presentation.steps.length, 6);
  assert.equal(presentation.steps.every(step => step.kind === 'step'), true);
  assert.deepEqual(
    presentation.steps.map(step => step.id),
    ['review-previous', 'strap-build', 'scrap-build', 'script-build', 'spring-exact-ending', 'blend-contrast']
  );
});

test('3A 2.5 canonical runtime projects the current Parts 1 and 3-9 without duplicate authored fields', () => {
  const lesson = normalizeLesson(fixture);
  assert.ok(lesson);

  assert.deepEqual(lesson.quickDrill, ['a', 'e', 'i', 'o', 'u', 's', 'c', 'r', 't', 'p', 'l', 'ang', 'ank', 'ind', 'old']);
  assert.equal(lesson.wordCards.length, 10);
  assert.deepEqual(lesson.wordCards.slice(0, 4).map(card => card.text), ['strap', 'splash', 'string', 'scrap']);
  assert.equal(lesson.hfwList.length, 15);

  assert.deepEqual(lesson.wordListPractice, ['strong', 'splash', 'sprint', 'scrap', 'spring', 'string']);
  assert.deepEqual(lesson.wordListCharting, []);
  assert.deepEqual(lesson.wordListReading, ['strong', 'splash', 'sprint', 'scrap', 'spring', 'string']);
  assert.equal(lesson.wordListReadingAuto, false);

  assert.equal(lesson.sentences.length, 10);
  assert.equal(lesson.dictation.realWords.length, 5);
  assert.equal(lesson.dictation.nonsenseWords.length, 3);
  assert.equal(lesson.dictation.phrases.length, 3);
  assert.equal(lesson.dictation.sentences.length, 3);
  assert.match(lesson.passage || '', /Spring is coming!/);

  const part5 = lesson.runtimePlan?.parts.find(part => part.part === 5);
  const part9 = lesson.runtimePlan?.parts.find(part => part.part === 9);
  assert.equal(Array.isArray((part5?.data as Record<string, unknown>)?.weaveQuestions), true);
  assert.equal(((part5?.data as Record<string, unknown>).weaveQuestions as unknown[]).length, 10);
  assert.equal(Array.isArray((part9?.data as Record<string, unknown>)?.questions), true);
  assert.equal(((part9?.data as Record<string, unknown>).questions as unknown[]).length, 10);
  assert.equal((part9?.data as Record<string, unknown>)?.historyStatus, 'uncertain-flagged');
});

test('3A 2.5 runtime deterministically generates the old Official WRS Plan Details compatibility view', () => {
  const runtime = canonicalRuntimeFromImportValue(fixture);
  const plan = runtimeLessonToCompatibilityWrsPlan(runtime);

  assert.equal(plan.lessonNumber, runtime.id);
  assert.equal(plan.lessonFocus, 'accuracy');
  assert.match(plan.troubleSpots, /Eleanor/);
  assert.equal(plan.part2.reviewWords, 'flask, trend, grant, crunch');
  assert.equal(plan.part2.currentWords, 'strap, scrap, splash, string, script, spring');
  assert.match(plan.part6.vowels, /\/ă\/ → a/);
  assert.match(plan.part6.wordElements, /-struct-/);
  assert.match(plan.part7.reviewWordsAndElements, /flask/);
  assert.match(plan.part7.currentWordsAndElements, /spring/);
  assert.equal(plan.part9.title, 'The Spring Job');
  assert.equal(plan.part9.page, '122-123');
  assert.equal(plan.part9.followUpQuestions.split('\n').length, 10);
});

test('3A 2.5 survives canonical export and re-import without instructional runtime loss', () => {
  const firstLesson = normalizeLesson(fixture);
  assert.ok(firstLesson);

  const exported = serializeCanonicalLesson(firstLesson);
  const exportedValue = JSON.parse(exported) as Record<string, unknown>;
  const secondRuntime = canonicalRuntimeFromImportValue(exportedValue);

  assert.equal(exportedValue.schemaVersion, 'wrs-runtime-v1');
  assert.equal('runtimePlan' in exportedValue, false);
  assert.equal('slides' in exportedValue, false);
  assert.equal('wrsPlan' in exportedValue, false);
  assert.deepEqual(secondRuntime, firstLesson.runtimePlan);
});
