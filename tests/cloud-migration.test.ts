import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCloudMigrationPlan, teacherScopedId } from '../legacy/cloudMigration';
import { GroupProfile, Lesson, LessonPart, MissionRecord, StudentProfile } from '../legacy/types';

const teacherId = 'teacher-12345';
const lesson: Lesson = {
  id: 'lesson-1', title: 'Closed Syllables', step: '1', substep: '2',
  conceptNotes: '', slides: [], quickDrill: [], wordCards: [], sentences: [],
  dictation: { sounds: [], realWords: [], wordElements: [], nonsenseWords: [], phrases: [], sentences: [] },
  hfwList: [], affixPractice: []
};

const student: StudentProfile = {
  id: 'student-1', name: 'Levi', masteredSounds: [], masteredHFW: [], attendanceCount: 1,
  notes: '', history: [{ id: 'mission-1', date: '2026-08-20', lessonTitle: lesson.title, step: '1', groupId: 'group-1' }]
};

const mission: MissionRecord = {
  id: 'mission-1', teacherId: 'guest-sensei', squadId: 'group-1', squadName: 'Red Dragons',
  lessonId: lesson.id, date: '2026-08-20', step: '1', substep: '2', lessonStep: '1.2',
  lessonTitle: lesson.title, notes: 'Short vowel error', timestamp: '2026-08-20T12:00:00.000Z',
  results: [{
    studentId: student.id, studentName: student.name, correctCount: 1, errorCount: 1,
    totalCount: 2, accuracy: 50, attempts: [], errors: ['cat']
  }]
};

const group: GroupProfile = {
  id: 'group-1', name: 'Red Dragons', studentIds: [student.id], jobs: { leader: student.id },
  inventory: { learnedSounds: [], learnedHFW: [] }, savedLessons: [lesson],
  history: [{ id: mission.id, lessonId: lesson.id, title: lesson.title, date: mission.date, studentIds: [student.id], results: mission.results }]
};

test('adds a stable teacher scope exactly once', () => {
  assert.equal(teacherScopedId('student-1', teacherId), 'student-1-teach');
  assert.equal(teacherScopedId('student-1-teach', teacherId), 'student-1-teach');
});

test('keeps every migrated student, group, mission, and session reference connected', () => {
  const plan = buildCloudMigrationPlan({
    teacherId,
    students: [student],
    groups: [group],
    missions: [mission],
    activeSession: {
      lesson, currentPart: LessonPart.Part4, groupId: group.id, studentIds: [student.id],
      scores: [{ studentId: student.id, instanceId: 'word-1', wordText: 'cat', status: 'error' }]
    }
  });

  const studentId = 'student-1-teach';
  const groupId = 'group-1-teach';
  const missionId = 'mission-1-teach';

  assert.equal(plan.students[0].id, studentId);
  assert.equal(plan.students[0].history[0].id, missionId);
  assert.equal(plan.students[0].history[0].groupId, groupId);
  assert.deepEqual(plan.groups[0].studentIds, [studentId]);
  assert.equal(plan.groups[0].jobs?.leader, studentId);
  assert.equal(plan.groups[0].history[0].id, missionId);
  assert.equal(plan.groups[0].history[0].results?.[0].studentId, studentId);
  assert.equal(plan.missions[0].id, missionId);
  assert.equal(plan.missions[0].teacherId, teacherId);
  assert.equal(plan.missions[0].squadId, groupId);
  assert.equal(plan.missions[0].results[0].studentId, studentId);
  assert.equal(plan.activeSession?.groupId, groupId);
  assert.deepEqual(plan.activeSession?.studentIds, [studentId]);
  assert.equal(plan.activeSession?.scores?.[0].studentId, studentId);
});
