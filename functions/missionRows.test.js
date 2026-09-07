'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { missionRows } = require('./missionRows');

const completedMission = {
  id: 'mission-123',
  status: 'completed',
  date: '2026-09-07',
  squadName: 'Charting Test',
  lessonStep: '7.3',
  lessonTitle: 'Substep 7.3',
  results: [{
    studentId: 'student-1', studentName: 'Test Student',
    correctCount: 13, errorCount: 2, totalCount: 15, accuracy: 87,
    errors: ['graph', 'etch']
  }],
  attendance: [
    { studentId: 'student-1', studentName: 'Test Student', status: 'present' },
    { studentId: 'student-2', studentName: 'Absent Student', status: 'absent' }
  ]
};

test('does not report an in-progress mission', () => {
  assert.deepEqual(missionRows({ ...completedMission, status: 'started' }), []);
});

test('maps one completed mission row per enrolled student to Data Log A:N', () => {
  const rows = missionRows(completedMission);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], [
    '2026-09-07', 'Test Student', 'Charting Test', '7.3', 'Substep 7.3',
    'Word charting', '13/15 (87%)', 'graph, etch', '', 'Present',
    'WRS Dojo automatic session sync · mission-123', 'Yes',
    'mission-123:student-1', 'mission-123'
  ]);
  assert.equal(rows[1][5], 'Attendance');
  assert.equal(rows[1][6], 'Absent');
  assert.equal(rows[1][9], 'Absent');
});

test('uses a stable mission/student key so retries update instead of duplicate', () => {
  assert.equal(missionRows(completedMission)[0][12], missionRows(completedMission)[0][12]);
});
