import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  arrangeGroupLessons,
  LESSON_DOCUMENT_BYTE_LIMIT,
  lessonStorageProblem,
  LibraryLessonRecord,
  libraryLessonId,
  matchGroupForLabel,
  normalizeLibraryRecord,
  parseLessonFileName,
  planLessonWrite,
  readLessonFile,
  recordForLessonEdit,
  substepLabel
} from '../legacy/lessonLibrary';
import type { GroupProfile, StudentProfile } from '../legacy/types';

const fixtureText = readFileSync(new URL('../fixtures/canonical/5A-7.4-accuracy-regression.json', import.meta.url), 'utf8');
const fixtureName = 'WRS_2026-09-14_5A_Substep7-4.json';
const teacherId = 'teacher-abc';

const student = (id: string, name: string): StudentProfile => ({
  id, name, masteredSounds: [], masteredHFW: [], attendanceCount: 0, notes: '', history: []
});
const group = (id: string, name: string, studentIds: string[]): GroupProfile => ({
  id, name, studentIds, inventory: { learnedSounds: [], learnedHFW: [] }, savedLessons: [], history: []
});

const students = [student('student-alex-t', 'Alex'), student('student-enrique-t', 'Enrique'), student('student-oliver-t', 'Oliver')];
const group5A = group('group-2026-27-5a-t', 'Group 5A', ['student-alex-t']);
const group2 = group('group-2026-27-2-t', 'Group 2', ['student-enrique-t']);
const group5B = group('group-2026-27-5b-t', 'Group 5B', ['student-oliver-t']);
const groups = [group5A, group2, group5B];

test('reads group, date, and substep from the generator file name', () => {
  assert.deepEqual(parseLessonFileName('WRS_2026-09-24_5A_Substep7-5.json'), {
    stem: 'WRS_2026-09-24_5A_Substep7-5', date: '2026-09-24', groupLabel: '5A', substep: '7.5', followsConvention: true
  });
  const duplicateDownload = parseLessonFileName('C:\\Users\\Asher\\Downloads\\WRS_2026-09-24_Enrique_Substep1-6 (2).json');
  assert.equal(duplicateDownload.stem, 'WRS_2026-09-24_Enrique_Substep1-6');
  assert.equal(duplicateDownload.groupLabel, 'Enrique');
  const other = parseLessonFileName('my lesson.json');
  assert.equal(other.followsConvention, false);
  assert.equal(other.groupLabel, '');
  assert.equal(other.stem, 'my lesson');
});

test('matches a file-name label to a group by name, or by its only student', () => {
  assert.equal(matchGroupForLabel('5A', groups, students)?.id, group5A.id);
  assert.equal(matchGroupForLabel('group-5a', groups, students)?.id, group5A.id);
  assert.equal(matchGroupForLabel('Enrique', groups, students)?.id, group2.id);
  assert.equal(matchGroupForLabel('9Z', groups, students), null);
  assert.equal(matchGroupForLabel('', groups, students), null);
  const ambiguous = [...groups, group('dup', '5A', [])];
  assert.equal(matchGroupForLabel('5A', ambiguous, students), null);
});

test('converts the 5A 7.4 runtime fixture the way the editor import does', () => {
  const reading = readLessonFile(fixtureName, fixtureText);
  assert.equal(reading.ok, true, reading.error);
  assert.deepEqual(reading.warnings, []);
  assert.equal(reading.runtimeId, '5a-2026-09-14-7-4-lesson-1');
  const lesson = reading.lesson!;
  assert.equal(lesson.id, '');
  assert.equal(lesson.schemaVersion, 2);
  assert.equal(lesson.step, '7');
  assert.equal(lesson.substep, '4');
  assert.match(lesson.title, /^5A · 7\.4 Final Stable Syllables/);
  assert.equal(lesson.quickDrill.length, 16);
  assert.equal(lesson.sentences.length, 10);
  assert.match(lesson.passage || '', /^Peg and Mike/);
  assert.equal(lesson.runtimePlan?.parts.length, 10);
  const part2 = lesson.runtimePlan?.parts.find(part => part.part === 2);
  assert.ok(part2?.data.part2Presentation, 'Part 2 runner payload must survive conversion');
  assert.ok(reading.sizeBytes > 0 && reading.sizeBytes < LESSON_DOCUMENT_BYTE_LIMIT);
  assert.equal(lessonStorageProblem(lesson), null);
});

test('warns when the file name and the lesson disagree on the substep', () => {
  const reading = readLessonFile('WRS_2026-09-14_5A_Substep7-5.json', fixtureText);
  assert.equal(reading.ok, true);
  assert.equal(reading.warnings.length, 1);
  assert.match(reading.warnings[0], /Substep 7\.5.*Substep 7\.4/);
});

test('rejects files the app could not run, with a plain reason', () => {
  assert.match(readLessonFile(fixtureName, '{ "schemaVersion": ').error, /not valid JSON/);
  assert.match(readLessonFile(fixtureName, JSON.stringify({ step: '7', substep: '4' })).error, /not a wrs-runtime-v1 lesson/);
  const missingPart = JSON.parse(fixtureText);
  missingPart.parts = missingPart.parts.filter((part: { part: number }) => part.part !== 10);
  assert.match(readLessonFile(fixtureName, JSON.stringify(missingPart)).error, /Parts 1-10/);
});

test('catches data Firestore would refuse before it is sent', () => {
  const lesson = readLessonFile(fixtureName, fixtureText).lesson!;
  const nested = { ...lesson, extra: { grid: [[1, 2], [3, 4]] } } as typeof lesson;
  assert.match(lessonStorageProblem(nested) || '', /list directly inside another list \(found at extra\.grid\[0\]\)/);
  const huge = { ...lesson, passage: 'x'.repeat(LESSON_DOCUMENT_BYTE_LIMIT) };
  assert.match(lessonStorageProblem(huge) || '', /KB/);
});

test('plans one stable document per group and file, so reloading replaces instead of duplicating', () => {
  const reading = readLessonFile(fixtureName, fixtureText);
  assert.equal(planLessonWrite(reading, null, teacherId, new Set(), 'now').status, 'needs-group');

  const plan = planLessonWrite(reading, group5A, teacherId, new Set(), '2026-09-27T12:00:00.000Z');
  const expectedId = libraryLessonId(teacherId, group5A.id, 'WRS_2026-09-14_5A_Substep7-4');
  assert.equal(plan.status, 'ready');
  assert.equal(plan.record?.id, expectedId);
  assert.equal(plan.record?.lesson.id, expectedId);
  assert.equal(plan.record?.lessonDate, '2026-09-14');
  assert.equal(plan.record?.groupName, 'Group 5A');
  assert.doesNotMatch(expectedId, /[/\s]/);

  const again = readLessonFile('WRS_2026-09-14_5A_Substep7-4 (1).json', fixtureText);
  const replan = planLessonWrite(again, group5A, teacherId, new Set([expectedId]), 'later');
  assert.equal(replan.status, 'replace');
  assert.equal(replan.record?.id, expectedId);

  const otherGroup = planLessonWrite(reading, group5B, teacherId, new Set([expectedId]), 'later');
  assert.equal(otherGroup.status, 'ready');
  assert.notEqual(otherGroup.record?.id, expectedId);
});

test('reads stored records defensively and keeps the document id as the lesson id', () => {
  const plan = planLessonWrite(readLessonFile(fixtureName, fixtureText), group5A, teacherId, new Set(), 'saved-1');
  const stored = { ...plan.record!, lesson: { ...plan.record!.lesson, id: 'something-else' }, lastUpdated: { seconds: 1 } };
  const record = normalizeLibraryRecord(plan.record!.id, stored)!;
  assert.equal(record.lesson.id, plan.record!.id);
  assert.equal(record.savedAt, 'saved-1');
  assert.equal(normalizeLibraryRecord('x', { ...stored, teacherId: undefined }), null);
  assert.equal(normalizeLibraryRecord('x', { ...stored, lesson: null }), null);

  const edited = recordForLessonEdit(record, { ...record.lesson, title: 'Edited', id: 'wrong' }, 'saved-2');
  assert.equal(edited.title, 'Edited');
  assert.equal(edited.lesson.id, record.id);
  assert.equal(edited.savedAt, 'saved-2');
});

test("orders a group's lessons: today onward soonest first, then earlier newest first", () => {
  const make = (id: string, lessonDate: string, groupId = group5A.id): LibraryLessonRecord => ({
    id, teacherId, groupId, groupName: '', lessonDate, sourceFileName: '', runtimeId: '', title: id,
    step: '7', substep: '5', savedAt: '2026-09-27T00:00:00.000Z',
    lesson: { id, title: id, step: '7', substep: '5', conceptNotes: '', slides: [], quickDrill: [], wordCards: [], sentences: [],
      dictation: { sounds: [], realWords: [], wordElements: [], nonsenseWords: [], phrases: [], sentences: [] }, hfwList: [], affixPractice: [] }
  });
  const { upcoming, earlier } = arrangeGroupLessons([
    make('fri', '2026-10-02'), make('undated', ''), make('mon', '2026-09-28'), make('today', '2026-09-27'),
    make('last-week', '2026-09-21'), make('thursday', '2026-09-24'), make('other-group', '2026-09-28', group5B.id)
  ], group5A.id, '2026-09-27');
  assert.deepEqual(upcoming.map(record => record.id), ['today', 'mon', 'fri', 'undated']);
  assert.deepEqual(earlier.map(record => record.id), ['thursday', 'last-week']);
});

test('labels substeps the way the lesson cards do', () => {
  assert.equal(substepLabel('7', '5'), '7.5');
  assert.equal(substepLabel('7', '7.5'), '7.5');
  assert.equal(substepLabel('', '3'), '3');
});
