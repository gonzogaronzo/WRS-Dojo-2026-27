import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { CURRENT_SCHOOL_YEAR, MASTER_NINJAS, MASTER_SQUADS, scheduleField } from '../legacy/masterRoster';
import { classifyWordElements } from '../legacy/cumulativeWrsScope';

test('defines the complete active 2026-27 roster without duplicate students', () => {
  const studentNames = MASTER_NINJAS.map(student => student.name);
  assert.equal(CURRENT_SCHOOL_YEAR, '2026-27');
  assert.equal(MASTER_SQUADS.length, 7);
  assert.equal(studentNames.length, 19);
  assert.equal(new Set(studentNames).size, studentNames.length);
  assert.ok(MASTER_NINJAS.every(student => student.active && student.schoolYear === CURRENT_SCHOOL_YEAR));
});

test('assigns every current student to exactly one requested group', () => {
  const studentsById = new Map(MASTER_NINJAS.map(student => [student.id, student.name]));
  const assignments = MASTER_SQUADS.flatMap(group => group.studentIds.map(studentId => ({
    group: group.name,
    student: studentsById.get(studentId)
  })));

  assert.deepEqual(Object.fromEntries(MASTER_SQUADS.map(group => [group.name, group.studentIds.map(id => studentsById.get(id))])), {
    'Group 5B': ['Oliver', 'Ethan'],
    'Group 5A': ['Alex', 'Finn', 'Maya'],
    'Group 2': ['Enrique'],
    'Group 3A': ['Levi', 'Nora', 'Izzy'],
    'Group 3B': ['Eleanor', 'Ellie', 'Carolyn', 'Juliana'],
    'Group 4A': ['Charlotte', 'Bennett', 'Ben', 'Xavier', 'Uffarren'],
    'Group 4B': ["K'lee"]
  });
  assert.ok(assignments.every(assignment => assignment.student));
  assert.equal(new Set(assignments.map(assignment => assignment.student)).size, MASTER_NINJAS.length);
});

test('omits an unconfirmed group schedule from Firestore roster writes', () => {
  const group4B = MASTER_SQUADS.find(group => group.name === 'Group 4B');
  assert.ok(group4B);
  assert.equal(group4B.schedule, undefined);
  assert.deepEqual(scheduleField(group4B.schedule), {});
  assert.deepEqual(scheduleField('2:05–2:50'), { schedule: '2:05–2:50' });
});

test('seeds source-based instructional baselines without claiming teacher-set focus or review mastery', () => {
  const byName = new Map(MASTER_SQUADS.map(group => [group.name, group]));

  assert.equal(byName.get('Group 2')?.instructionalProfile?.currentSubstep, '1.6');
  assert.deepEqual(byName.get('Group 2')?.instructionalProfile?.practicedWordElements, ['-es', '-s']);
  assert.deepEqual(classifyWordElements(byName.get('Group 2')?.instructionalProfile?.practicedWordElements || []), {
    affixes: ['-es', '-s'],
    baseElements: [],
    other: []
  });
  assert.equal(byName.get('Group 2')?.instructionalProfile?.highFrequencyWords.length, 34);
  assert.deepEqual(byName.get('Group 2')?.instructionalProfile?.highFrequencyWords.slice(-5), ['both', 'from', 'have', 'one', 'they']);

  const group3A = byName.get('Group 3A')?.instructionalProfile;
  const group3AElements = classifyWordElements(group3A?.practicedWordElements || []);
  assert.ok(['-s', '-es', 'mid-', 'mis-', 'non-', 'trans-', 'un-'].every(item => group3AElements.affixes.includes(item)));
  assert.ok(['-fess-', '-dict-'].every(item => group3AElements.baseElements.includes(item)));

  assert.equal(byName.get('Group 5A')?.instructionalProfile?.currentSubstep, '7.3');
  assert.ok(byName.get('Group 5A')?.instructionalProfile?.practicedWordElements.includes('tele-'));
  assert.equal(byName.get('Group 5A')?.instructionalProfile?.lessonFocus, '');
  assert.ok((byName.get('Group 5A')?.instructionalProfile?.reviewCardRepository.length || 0) > 0);
  assert.equal(byName.get('Group 5A')?.instructionalProfile?.curriculumScopeVersion, 2);
});

test('protects group notes with teacher ownership rules', () => {
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  assert.match(rules, /match \/group_notes\/\{noteId\}/);
  assert.match(rules, /allow create: if ownsIncomingTeacherRecord\(\)/);
  assert.match(rules, /allow read, delete: if ownsExistingTeacherRecord\(\)/);
});
