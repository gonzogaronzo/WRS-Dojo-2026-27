import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPart4ChartingAttempt,
  chartingInstanceId,
  createPart4AttemptId,
  historyEntryFromPart4Attempt,
  resolvePart4SourceContext,
  upsertPart4History
} from '../legacy/part4Charting';
import { Lesson } from '../legacy/types';

const words = (prefix: string, count: number) => Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`);

const lesson = (): Lesson => ({
  id: 'mock-part4-lesson',
  title: 'MOCK Part 4 Lesson',
  step: '3',
  substep: '3.1',
  conceptNotes: '',
  slides: [],
  quickDrill: [],
  wordCards: [],
  wordListPractice: words('practice-', 6),
  wordListCharting: words('chart-', 15),
  sentences: [],
  dictation: { sounds: [], realWords: [], wordElements: [], nonsenseWords: [], phrases: [], sentences: [] },
  hfwList: [],
  affixPractice: [],
  sourceMetadata: [{
    id: 'reader-3-mock',
    label: 'MOCK Student Reader 3',
    kind: 'student-reader',
    edition: 'Fourth Edition',
    locator: 'MOCK p. 12'
  }],
  runtimePlan: {
    schemaVersion: 'wrs-runtime-v1',
    id: 'mock-part4-lesson',
    title: 'MOCK Part 4 Lesson',
    step: '3',
    substep: '3.1',
    focus: 'accuracy',
    sources: [{
      id: 'reader-3-mock',
      label: 'MOCK Student Reader 3',
      kind: 'student-reader',
      edition: 'Fourth Edition',
      locator: 'MOCK p. 12'
    }],
    parts: Array.from({ length: 10 }, (_, index) => ({
      part: (index + 1) as 1|2|3|4|5|6|7|8|9|10,
      title: `Part ${index + 1}`,
      teacherDirections: [],
      sourceIds: index === 3 ? ['reader-3-mock'] : [],
      data: index === 3
        ? { practiceWords: words('practice-', 6), chartingWords: words('chart-', 15), chartingType: 'real' as const }
        : {}
    }))
  }
});

test('Part 4 source resolver requires Student Reader provenance and separate 5–6/15 lists', () => {
  const context = resolvePart4SourceContext(lesson());
  assert.equal(context.gap, undefined);
  assert.equal(context.practiceLists.length, 1);
  assert.equal(context.chartingLists.length, 1);
  assert.equal(context.practiceLists[0].words.length, 6);
  assert.equal(context.chartingLists[0].words.length, 15);
  assert.equal(context.chartingLists[0].sourceKind, 'student-reader');
  assert.notEqual(context.practiceLists[0].listId, context.chartingLists[0].listId);
});

test('Part 4 source resolver fails closed without Student Reader provenance', () => {
  const input = lesson();
  input.sourceMetadata = [{ id: 'teacher-made', label: 'Teacher list', kind: 'teacher-selection' }];
  input.runtimePlan!.sources = input.sourceMetadata;
  input.runtimePlan!.parts[3].sourceIds = ['teacher-made'];
  const context = resolvePart4SourceContext(input);
  assert.match(context.gap || '', /Student Reader provenance/);
  assert.equal(context.chartingLists.length, 0);
});

test('Part 4 attempt ID is deterministic for retry/double-save protection', () => {
  const first = createPart4AttemptId('session-123', 'student-mock', 'reader:list-a');
  const second = createPart4AttemptId('session-123', 'student-mock', 'reader:list-a');
  assert.equal(first, second);
  assert.notEqual(first, createPart4AttemptId('session-123', 'student-mock-2', 'reader:list-a'));
});

test('completed attempt preserves item-level results, errors, provenance, and history without duplicate entries', () => {
  const currentLesson = lesson();
  const context = resolvePart4SourceContext(currentLesson);
  const list = context.chartingLists[0];
  const itemResults = list.words.map((word, index) => ({
    instanceId: chartingInstanceId(list.listId, index),
    index,
    wordText: word,
    status: index === 4 || index === 11 ? 'error' as const : 'correct' as const,
    ...(index === 4 ? { errorNote: 'MOCK vowel substitution' } : {})
  }));
  const attempt = buildPart4ChartingAttempt({
    teacherId: 'teacher-mock',
    studentId: 'student-mock',
    studentName: 'MOCK STUDENT',
    groupId: 'group-mock',
    groupName: 'MOCK GROUP',
    lesson: currentLesson,
    sessionId: 'session-123',
    completedAt: '2026-09-01T20:00:00.000Z',
    list,
    itemResults,
    teacherNotes: 'MOCK disposable test record'
  });
  assert.equal(attempt.totalItems, 15);
  assert.equal(attempt.correctCount, 13);
  assert.equal(attempt.incorrectCount, 2);
  assert.deepEqual(attempt.incorrectItems, ['chart-5', 'chart-12']);
  assert.equal(attempt.itemResults[4].errorNote, 'MOCK vowel substitution');
  assert.equal(attempt.sourceId, 'reader-3-mock');
  assert.equal(attempt.listId, list.listId);

  const entry = historyEntryFromPart4Attempt(attempt);
  assert.equal(entry.correctCount, 13);
  assert.deepEqual(entry.errors, ['chart-5', 'chart-12']);
  assert.match(entry.notes || '', /Source: MOCK Student Reader 3/);
  assert.match(entry.notes || '', /List:/);
  assert.match(entry.notes || '', /real charting/);

  const once = upsertPart4History([], entry);
  const twice = upsertPart4History(once, entry);
  assert.equal(twice.length, 1);
  assert.equal(twice[0].id, attempt.id);
});

test('attempt builder refuses results that do not reconstruct the selected list', () => {
  const currentLesson = lesson();
  const list = resolvePart4SourceContext(currentLesson).chartingLists[0];
  assert.throws(() => buildPart4ChartingAttempt({
    teacherId: 'teacher-mock',
    studentId: 'student-mock',
    studentName: 'MOCK STUDENT',
    groupId: 'group-mock',
    groupName: 'MOCK GROUP',
    lesson: currentLesson,
    sessionId: 'session-123',
    completedAt: '2026-09-01T20:00:00.000Z',
    list,
    itemResults: list.words.slice(0, 14).map((word, index) => ({
      instanceId: chartingInstanceId(list.listId, index),
      index,
      wordText: word,
      status: 'correct' as const
    }))
  }), /do not exactly match/);
});
