import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dailyNoteSource,
  dailyNoteToDailyLogRows,
  groupNoteSource,
  groupNoteToDailyLogRows,
  missionDailySource,
  missionToDailyLogRows,
  missionToStudentDataRows,
  studentDataSourcePrefix
} from '../functions/sheetRows.js';

const mission = {
  id: 'mission-123',
  date: '2026-09-07',
  squadName: 'Sample Group',
  lessonTitle: 'Sample Lesson',
  step: '3',
  substep: '1',
  notes: 'Observed note',
  attendance: [
    { studentId: 'student-a', studentName: 'Student A', status: 'present' },
    { studentId: 'student-b', studentName: 'Student B', status: 'absent' }
  ],
  results: [
    {
      studentId: 'student-a',
      studentName: 'Student A',
      correctCount: 12,
      totalCount: 15,
      accuracy: 80,
      errors: ['word1', 'word2', 'word3']
    }
  ]
};

test('mission rows preserve observed scores, errors, attendance, and stable source ids', () => {
  const rows = missionToStudentDataRows(mission);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0].slice(0, 12), [
    '2026-09-07', 'Student A', 'Sample Group', '3.1', 'Sample Lesson',
    'Wordlist Charting', '12/15 (80%)', 'word1, word2, word3', '', 'Present',
    `${studentDataSourcePrefix('mission-123')}student:student-a`, ''
  ]);
  assert.equal(rows[1][5], 'Attendance');
  assert.equal(rows[1][6], 'Absent');
  assert.equal(rows[1][9], 'Absent');
});

test('mission Daily Log row summarizes only values present on the mission', () => {
  const [row] = missionToDailyLogRows(mission);
  assert.equal(row[0], '2026-09-07');
  assert.equal(row[1], 'Sample Group');
  assert.equal(row[4], 'WRS Lesson');
  assert.equal(row[5], '3.1');
  assert.match(row[6], /Student A 12\/15/);
  assert.match(row[6], /Absent: Student B/);
  assert.match(row[6], /Observed note/);
  assert.equal(row[8], missionDailySource('mission-123'));
});

test('daily and group notes keep stable source keys for idempotent retries', () => {
  const [daily] = dailyNoteToDailyLogRows({ date: '2026-09-07', content: 'Daily observation' }, 'daily-1');
  assert.equal(daily[6], 'Daily observation');
  assert.equal(daily[8], dailyNoteSource('daily-1'));

  const [group] = groupNoteToDailyLogRows({
    createdAt: '2026-09-07T12:00:00.000Z',
    groupName: 'Sample Group',
    studentNames: ['Student A'],
    step: '3',
    substep: '1',
    content: 'Quick observation'
  }, 'group-1');
  assert.equal(group[0], '2026-09-07');
  assert.equal(group[2], 'Student A');
  assert.equal(group[5], '3.1');
  assert.equal(group[6], 'Quick observation');
  assert.equal(group[8], groupNoteSource('group-1'));
});
