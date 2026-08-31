import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addMissionAttendanceToStudent,
  addMissionToGroup,
  addMissionToStudent,
  buildMissionRecord,
  upsertMissionRecord
} from '../legacy/missionArchive';
import { GroupProfile, Lesson, StudentProfile, WordlistScore } from '../legacy/types';

const lesson: Lesson = {
  id: 'lesson-4-2', title: 'Closed Syllables', step: '4', substep: '2',
  conceptNotes: '', slides: [], quickDrill: [], wordCards: [], sentences: [],
  dictation: { sounds: [], realWords: [], wordElements: [], nonsenseWords: [], phrases: [], sentences: [] },
  hfwList: [], affixPractice: []
};

const student: StudentProfile = {
  id: 'student-1', name: 'Levi', masteredSounds: [], masteredHFW: [],
  attendanceCount: 2, notes: '', history: []
};

const absentStudent: StudentProfile = {
  id: 'student-2', name: 'Nora', masteredSounds: [], masteredHFW: [],
  attendanceCount: 4, lastSeen: '2026-08-18', notes: '', history: []
};

const group: GroupProfile = {
  id: 'group-1', name: 'Red Dragons', studentIds: [student.id, absentStudent.id],
  inventory: { learnedSounds: [], learnedHFW: [] }, savedLessons: [lesson], history: []
};

const scores: WordlistScore[] = [
  { studentId: student.id, instanceId: 'word-1', wordText: 'cat', status: 'correct' },
  { studentId: student.id, instanceId: 'word-2', wordText: 'chip', status: 'error' },
  { studentId: student.id, instanceId: 'word-3', wordText: 'sun', status: 'none' }
];

const mission = buildMissionRecord({
  id: 'mission-123', teacherId: 'teacher-1', date: '2026-08-19',
  lesson, group, students: [student, absentStudent], studentIds: [student.id], scores,
  notes: 'Mixed up the initial sound in chip.'
});

test('builds a complete exact word-by-word mission record', () => {
  assert.equal(mission.date, '2026-08-19');
  assert.equal(mission.lessonId, lesson.id);
  assert.equal(mission.lessonStep, '4.2');
  assert.equal(mission.results[0].correctCount, 1);
  assert.equal(mission.results[0].errorCount, 1);
  assert.equal(mission.results[0].totalCount, 2);
  assert.equal(mission.results[0].accuracy, 50);
  assert.deepEqual(mission.results[0].attempts, [
    { instanceId: 'word-1', wordText: 'cat', status: 'correct' },
    { instanceId: 'word-2', wordText: 'chip', status: 'error' }
  ]);
  assert.deepEqual(mission.results[0].errors, ['chip']);
  assert.deepEqual(mission.attendance, [
    { studentId: student.id, studentName: student.name, status: 'present' },
    { studentId: absentStudent.id, studentName: absentStudent.name, status: 'absent' }
  ]);
});

test('adds full records to student and group history', () => {
  const nextStudent = addMissionToStudent(student, mission, mission.results[0]);
  const nextGroup = addMissionToGroup(group, mission);

  assert.equal(nextStudent.attendanceCount, 3);
  assert.equal(nextStudent.history[0].id, mission.id);
  assert.deepEqual(nextStudent.history[0].attempts, mission.results[0].attempts);
  assert.equal(nextStudent.history[0].notes, mission.notes);
  assert.equal(nextGroup.history[0].id, mission.id);
  assert.deepEqual(nextGroup.history[0].results, mission.results);
  assert.deepEqual(nextGroup.history[0].absentStudentIds, [absentStudent.id]);
});

test('adds an absence without increasing the present count', () => {
  const once = addMissionAttendanceToStudent(absentStudent, mission, 'absent');
  const twice = addMissionAttendanceToStudent(once, mission, 'absent');

  assert.equal(once.attendanceCount, 4);
  assert.equal(once.lastSeen, '2026-08-18');
  assert.equal(once.history[0].attendanceStatus, 'absent');
  assert.equal(twice.attendanceCount, 4);
  assert.equal(twice.history.length, 1);
});

test('retries are idempotent and never duplicate a mission', () => {
  const once = addMissionToStudent(student, mission, mission.results[0]);
  const twice = addMissionToStudent(once, mission, mission.results[0]);
  const missionList = upsertMissionRecord(upsertMissionRecord([], mission), mission);

  assert.equal(twice.attendanceCount, 3);
  assert.equal(twice.history.length, 1);
  assert.equal(missionList.length, 1);
});
