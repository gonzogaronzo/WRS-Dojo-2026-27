import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractSelections,
  passageHistoryFromLedger,
  recordLessonHistory
} from '../scripts/wrs-record-lesson-history.mjs';

const runtime = () => ({
  schemaVersion: 'wrs-runtime-v1',
  id: 'synthetic-lesson',
  title: 'Synthetic lesson',
  step: '5',
  substep: '5',
  focus: 'introduction',
  lessonPath: 'full',
  plannedParts: [1,2,3,4,5,6,7,8,9,10],
  parts: [
    { part: 1, data: {} },
    { part: 2, data: {} },
    { part: 3, data: {
      currentCards: ['card-a','card-b'],
      hfwList: ['hfw-a'],
      wordElements: ['-x']
    }},
    { part: 4, data: {
      practiceWords: ['practice-a','practice-b'],
      chartingWords: []
    }},
    { part: 5, data: {
      page: '118',
      sentences: ['Sentence one.','Sentence two.']
    }},
    { part: 6, data: {} },
    { part: 7, data: {} },
    { part: 8, data: {
      dictation: {
        sounds: ['sound-a'],
        wordElements: ['-x'],
        realWords: ['real-a'],
        nonsenseWords: ['nonsense-a'],
        phrases: ['phrase-a'],
        sentences: ['Dictation sentence.']
      }
    }},
    { part: 9, data: {
      passageTitle: 'Synthetic Passage',
      page: '128-129',
      passage: 'Text.'
    }},
    { part: 10, data: { teacherPlanStatus: 'TBD' } }
  ]
});

test('partial lesson history records only explicitly completed selections and a started passage', () => {
  const result = recordLessonHistory({
    runtime: runtime(),
    completion: {
      groupId: 'Test Group',
      date: '2026-09-21',
      completionStatus: 'partial',
      completedParts: [1,2,3,4,5],
      startedParts: [9],
      sourceRef: 'daily:2026-09-21:teacher'
    },
    updatedAt: '2026-09-21T12:00:00.000Z'
  });

  assert.equal(result.lessons.length, 1);
  const event = result.lessons[0];
  assert.deepEqual(event.selections.part3.currentCards, ['card-a','card-b']);
  assert.deepEqual(event.selections.part4.practiceWords, ['practice-a','practice-b']);
  assert.deepEqual(event.selections.part5.sentences, ['Sentence one.','Sentence two.']);
  assert.deepEqual(event.selections.part8.realWords, []);
  assert.equal(event.selections.part9.status, 'started');
  assert.equal(event.selections.part9.title, 'Synthetic Passage');
});

test('completed lesson requires explicit Parts 1-10', () => {
  assert.throws(() => recordLessonHistory({
    runtime: runtime(),
    completion: {
      groupId: 'Test Group',
      date: '2026-09-21',
      completionStatus: 'completed',
      completedParts: [1,2,3,4,5,6,7,8,9],
      sourceRef: 'daily:2026-09-21:teacher'
    }
  }), /Parts 1-10/i);
});

test('recording the same lesson/date is idempotent and replaces the event', () => {
  const first = recordLessonHistory({
    runtime: runtime(),
    completion: {
      groupId: 'Test Group',
      date: '2026-09-21',
      completionStatus: 'partial',
      completedParts: [1,2,3],
      sourceRef: 'daily:first'
    },
    updatedAt: '2026-09-21T12:00:00.000Z'
  });

  const second = recordLessonHistory({
    history: first,
    runtime: runtime(),
    completion: {
      groupId: 'Test Group',
      date: '2026-09-21',
      completionStatus: 'partial',
      completedParts: [1,2,3,4,5],
      sourceRef: 'daily:corrected'
    },
    updatedAt: '2026-09-21T13:00:00.000Z'
  });

  assert.equal(second.lessons.length, 1);
  assert.equal(second.lessons[0].sourceRef, 'daily:corrected');
  assert.deepEqual(second.lessons[0].completedParts, [1,2,3,4,5]);
});

test('passage history is derived only from started or completed Part 9 use', () => {
  const started = recordLessonHistory({
    runtime: runtime(),
    completion: {
      groupId: 'Test Group',
      date: '2026-09-21',
      completionStatus: 'partial',
      completedParts: [1,2,3,4,5],
      startedParts: [9],
      sourceRef: 'daily:2026-09-21:teacher'
    },
    updatedAt: '2026-09-21T12:00:00.000Z'
  });

  const passages = passageHistoryFromLedger(started);
  assert.equal(passages.length, 1);
  assert.equal(passages[0].status, 'started');
  assert.equal(passages[0].substep, '5.5');
  assert.equal(passages[0].title, 'Synthetic Passage');
});

test('group mismatch fails closed', () => {
  const existing = recordLessonHistory({
    runtime: runtime(),
    completion: {
      groupId: 'Group A',
      date: '2026-09-21',
      completionStatus: 'partial',
      completedParts: [1],
      sourceRef: 'daily:a'
    }
  });

  assert.throws(() => recordLessonHistory({
    history: existing,
    runtime: runtime(),
    completion: {
      groupId: 'Group B',
      date: '2026-09-22',
      completionStatus: 'partial',
      completedParts: [1],
      sourceRef: 'daily:b'
    }
  }), /groupId does not match/i);
});

test('history tests contain no current real-student names', () => {
  const source = runtime.toString();
  for (const name of ['Oliver','Ethan','Alex','Finn','Maya','Enrique']) {
    assert.equal(source.includes(name), false);
  }
});
