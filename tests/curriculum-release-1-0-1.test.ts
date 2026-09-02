import assert from 'node:assert/strict';
import test from 'node:test';
import { validateRuntimeLesson } from '../legacy/runtimeLesson';
import {
  lesson82Release101,
  runtimeLesson82Release101
} from '../legacy/lessons/step8-2-curriculum-release';

test('Release 1.0.1 8.2 integration preserves the canonical ten-part runtime', () => {
  const validated = validateRuntimeLesson(runtimeLesson82Release101);
  assert.deepEqual(validated.parts.map(part => part.part), [1,2,3,4,5,6,7,8,9,10]);
  assert.equal(validated.focus, 'introduction');
  assert.equal(validated.lessonPath, 'full');
  assert.deepEqual(validated.plannedParts, [1,2,3,4,5,6,7,8,9,10]);
});

test('Release 1.0.1 8.2 contains the repaired seven-word current HFW set', () => {
  assert.deepEqual(lesson82Release101.hfwList, [
    'superior', 'vary', 'varies', 'variety', 'vocabulary', 'area', 'garage'
  ]);
});

test('Release 1.0.1 8.2 keeps Part 4 practice and charting distinct', () => {
  assert.equal(lesson82Release101.wordListPractice?.length, 6);
  assert.equal(lesson82Release101.wordListCharting?.length, 15);
  assert.notDeepEqual(lesson82Release101.wordListPractice, lesson82Release101.wordListCharting);
});

test('Release 1.0.1 8.2 Part 8 includes every required dictation category', () => {
  assert.ok(lesson82Release101.dictation.sounds.length > 0);
  assert.ok(lesson82Release101.dictation.wordElements.length > 0);
  assert.ok(lesson82Release101.dictation.realWords.length > 0);
  assert.ok(lesson82Release101.dictation.phrases.length > 0);
  assert.ok(lesson82Release101.dictation.sentences.length > 0);
});

test('Release 1.0.1 8.2 retains controlled Part 9 and teacher-selected Part 10', () => {
  assert.match(lesson82Release101.passage || '', /Backyard Visitor/);
  assert.equal(lesson82Release101.listeningComprehension?.mode, 'teacher-selected');
  assert.ok(lesson82Release101.sourceMetadata?.some(source => source.id === 'DICT-07-12-4E' && source.edition === 'Fourth Edition'));
});
