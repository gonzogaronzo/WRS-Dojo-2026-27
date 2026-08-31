import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clampLessonPart,
  getWordlistStatus,
  nextLessonPart,
  previousLessonPart,
  summarizeWordlistScores,
  toggleWordlistScore
} from '../legacy/lessonRules';
import { LessonPart, WordlistScore } from '../legacy/types';

test('keeps navigation inside the briefing-to-part-10 cycle', () => {
  assert.equal(previousLessonPart(LessonPart.Briefing), LessonPart.Briefing);
  assert.equal(nextLessonPart(LessonPart.Part10), LessonPart.Part10);
  assert.equal(nextLessonPart(LessonPart.Part4), LessonPart.Part5);
  assert.equal(previousLessonPart(LessonPart.Part4), LessonPart.Part3);
  assert.equal(clampLessonPart(-20), LessonPart.Briefing);
  assert.equal(clampLessonPart(99), LessonPart.Part10);
});

test('skips unplanned Block 2 parts in a Block 1 + Block 3 lesson', () => {
  const planned = [1, 2, 3, 4, 5, 9, 10];
  assert.equal(nextLessonPart(LessonPart.Part5, planned), LessonPart.Part9);
  assert.equal(previousLessonPart(LessonPart.Part9, planned), LessonPart.Part5);
  assert.equal(nextLessonPart(LessonPart.Part9, planned), LessonPart.Part10);
  assert.equal(previousLessonPart(LessonPart.Part1, planned), LessonPart.Briefing);
});

test('cycles a word score from clear to correct to error to clear', () => {
  let scores: WordlistScore[] = [];
  scores = toggleWordlistScore(scores, 'student-1', 'word-1', 'cold');
  assert.equal(getWordlistStatus(scores, 'student-1', 'word-1'), 'correct');
  scores = toggleWordlistScore(scores, 'student-1', 'word-1', 'cold');
  assert.equal(getWordlistStatus(scores, 'student-1', 'word-1'), 'error');
  scores = toggleWordlistScore(scores, 'student-1', 'word-1', 'cold');
  assert.equal(getWordlistStatus(scores, 'student-1', 'word-1'), 'none');
  assert.deepEqual(scores, []);
});

test('changes only the selected student and word instance', () => {
  const existing: WordlistScore[] = [
    { studentId: 'student-2', instanceId: 'word-1', wordText: 'cold', status: 'error' },
    { studentId: 'student-1', instanceId: 'word-2', wordText: 'wild', status: 'correct' }
  ];
  const changed = toggleWordlistScore(existing, 'student-1', 'word-1', 'cold');

  assert.equal(changed.length, 3);
  assert.equal(getWordlistStatus(changed, 'student-2', 'word-1'), 'error');
  assert.equal(getWordlistStatus(changed, 'student-1', 'word-2'), 'correct');
  assert.equal(getWordlistStatus(changed, 'student-1', 'word-1'), 'correct');
});

test('summarizes attempts without counting untouched words', () => {
  const scores: WordlistScore[] = [
    { studentId: 'student-1', instanceId: 'word-1', wordText: 'cold', status: 'correct' },
    { studentId: 'student-1', instanceId: 'word-2', wordText: 'wild', status: 'error' },
    { studentId: 'student-2', instanceId: 'word-3', wordText: 'post', status: 'correct' }
  ];
  assert.deepEqual(summarizeWordlistScores(scores, 'student-1'), { correct: 1, errors: 1, attempted: 2 });
});
