import assert from 'node:assert/strict';
import test from 'node:test';
import { buildStudentReport, getStudentStepOptions, studentReportToCsv } from '../legacy/studentReport';
import { StudentProfile } from '../legacy/types';

const student: StudentProfile = {
  id: 'student-1',
  name: 'Levi',
  masteredSounds: [],
  masteredHFW: [],
  attendanceCount: 3,
  notes: '',
  history: [
    {
      id: 'mission-3', date: '2026-08-20', lessonTitle: 'Closed Syllables', step: '4', substep: '2',
      attendanceStatus: 'present',
      correctCount: 12, errorCount: 3, totalCount: 15, accuracy: 80,
      attempts: [
        { instanceId: '1', wordText: 'cat', status: 'correct' },
        { instanceId: '2', wordText: 'chip', status: 'error' }
      ],
      errors: ['chip', 'cold'], notes: 'Needs another pass.'
    },
    {
      id: 'mission-absence', date: '2026-08-15', lessonTitle: 'Closed Syllables', step: '4', substep: '2',
      attendanceStatus: 'absent'
    },
    {
      id: 'mission-2', date: '2026-08-10', lessonTitle: 'Closed Syllables', step: '4', substep: '2',
      attendanceStatus: 'present',
      correctCount: 9, errorCount: 6, totalCount: 15, accuracy: 60, errors: ['Chip', 'wild']
    },
    {
      id: 'mission-1', date: '2026-07-15', lessonTitle: 'Suffixes', step: '3', substep: '1',
      attendanceStatus: 'present',
      correctCount: 10, errorCount: 5, totalCount: 15, accuracy: 67, errors: ['jumped']
    }
  ]
};

test('builds filtered totals, trends, repeated errors, and step summaries', () => {
  const report = buildStudentReport(student, { fromDate: '2026-08-01', stepKey: '4.2' });

  assert.equal(report.totalSessions, 3);
  assert.equal(report.attendanceTrackedSessions, 3);
  assert.equal(report.presentSessions, 2);
  assert.equal(report.absentSessions, 1);
  assert.equal(report.attendanceRate, 67);
  assert.equal(report.totalAttempts, 30);
  assert.equal(report.totalCorrect, 21);
  assert.equal(report.overallAccuracy, 70);
  assert.equal(report.latestAccuracy, 80);
  assert.equal(report.previousAccuracy, 60);
  assert.equal(report.accuracyChange, 20);
  assert.deepEqual(report.topErrors[0], { word: 'chip', count: 2 });
  assert.equal(report.stepBreakdown[0].accuracy, 70);
  assert.equal(report.stepBreakdown[0].presentSessions, 2);
  assert.equal(report.stepBreakdown[0].absentSessions, 1);
});

test('lists distinct step options in numeric order', () => {
  assert.deepEqual(getStudentStepOptions(student), ['3.1', '4.2']);
});

test('exports session detail as escaped CSV', () => {
  const csv = studentReportToCsv(buildStudentReport(student));
  assert.match(csv, /"Levi","2026-08-20","Present","4.2"/);
  assert.match(csv, /"Levi","2026-08-15","Absent","4.2"/);
  assert.match(csv, /"chip; cold"/);
  assert.match(csv, /"Needs another pass\."/);
});
