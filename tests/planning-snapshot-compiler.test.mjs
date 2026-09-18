import test from 'node:test';
import assert from 'node:assert/strict';

import { compileGroupPlanningSnapshot } from '../scripts/wrs-compile-planning-snapshot.mjs';

const currentRow = ({
  student,
  group = 'Test',
  currentSubstep = '5.4',
  lessonFocus = '5.4 Accuracy',
  updated = '2026-09-16',
  realWords = '14/15',
  trouble = 'Needs careful decoding.',
  next = 'Continue current instruction.'
}) => ({
  Student: student,
  Group: group,
  Grade: '5',
  'Current Substep': currentSubstep,
  'Lesson Focus': lessonFocus,
  'Most Recent Real-Word Charting': realWords,
  'Most Recent Nonsense-Word Charting': '',
  'Most Recent Spelling / Dictation': '',
  'HFW Status': '',
  'Fluency / Assessment': '',
  'Current Trouble Spots': trouble,
  'Recommended Next Focus': next,
  'Last Updated': updated,
  'Notes / Follow-up': ''
});

const dailyRow = ({
  date = '2026-09-17',
  group = 'Test',
  students = 'Student A; Student B',
  recordType = 'Instructional / Student Data',
  category = 'Spelling / dictation / advancement',
  substep = '5.4 Accuracy',
  note = 'The group nearly completed Part 8 dictation; only the sentences remain.',
  followUp = 'Finish the sentence dictation, then advance to 5.5.',
  source = 'Teacher live note, 2026-09-17'
} = {}) => ({
  Date: date,
  Group: group,
  'Student(s)': students,
  'Record Type': recordType,
  Category: category,
  'Substep / Lesson': substep,
  'Note / Data': note,
  'Follow-up / Instructional Response': followUp,
  Source: source
});

test('compiles a conditional next-Substep plan without recording advancement as complete', () => {
  const snapshot = compileGroupPlanningSnapshot({
    currentSnapshotRows: [
      currentRow({ student: 'Student A' }),
      currentRow({ student: 'Student B', realWords: '15/15' })
    ],
    dailyRows: [dailyRow()],
    groupId: 'Test',
    schedule: '7:45-8:30',
    asOf: '2026-09-17',
    generatedAt: '2026-09-17T18:00:00.000Z'
  });

  assert.equal(snapshot.planningReady, true);
  assert.equal(snapshot.advancement.status, 'ready-pending-completion');
  assert.equal(snapshot.advancement.currentSubstep, '5.4');
  assert.equal(snapshot.advancement.nextSubstep, '5.5');
  assert.match(snapshot.advancement.condition, /Finish the sentence dictation/i);
  assert.equal(snapshot.students[0].instructionalTarget.substep, '5.4');
  assert.equal(snapshot.students[1].instructionalTarget.substep, '5.4');
  assert.equal(snapshot.stateSources[0].kind, 'current-snapshot');
  assert.equal(snapshot.stateSources.some(source => source.kind === 'explicit-teacher-report'), true);
  assert.equal(snapshot.lessonContinuity.partsCompleted.length, 0);
  assert.equal(snapshot.lessonContinuity.unfinishedWork.some(item => /sentences remain/i.test(item)), true);
});

test('keeps official placement separate from review/backfill target', () => {
  const snapshot = compileGroupPlanningSnapshot({
    currentSnapshotRows: [
      currentRow({
        student: 'Student A',
        group: 'Review',
        currentSubstep: '3.1',
        lessonFocus: '2.5 Accuracy review/backfill'
      }),
      currentRow({
        student: 'Student B',
        group: 'Review',
        currentSubstep: '2.5',
        lessonFocus: 'Accuracy'
      })
    ],
    dailyRows: [
      dailyRow({
        group: 'Review',
        substep: '2.5 Accuracy',
        followUp: 'Continue 2.5 review and finish sentence dictation.',
        note: 'Students are working in 2.5 review.'
      })
    ],
    groupId: 'Review',
    asOf: '2026-09-17',
    generatedAt: '2026-09-17T18:00:00.000Z'
  });

  assert.equal(snapshot.planningReady, true);
  assert.equal(snapshot.students[0].officialPlacement.substep, '3.1');
  assert.equal(snapshot.students[0].instructionalTarget.substep, '2.5');
  assert.equal(snapshot.students[0].instructionalTarget.relationshipToPlacement, 'review-backfill');
  assert.equal(snapshot.students[1].officialPlacement.substep, '2.5');
  assert.equal(snapshot.students[1].instructionalTarget.relationshipToPlacement, 'current');
  assert.equal(snapshot.advancement.currentSubstep, '2.5');
});

test('blocks planning when current rows resolve to conflicting instructional targets with no newer resolution', () => {
  const snapshot = compileGroupPlanningSnapshot({
    currentSnapshotRows: [
      currentRow({
        student: 'Student A',
        group: 'Conflict',
        currentSubstep: '2.5',
        lessonFocus: '2.5 Accuracy'
      }),
      currentRow({
        student: 'Student B',
        group: 'Conflict',
        currentSubstep: '3.1',
        lessonFocus: '3.1 Accuracy'
      })
    ],
    dailyRows: [],
    groupId: 'Conflict',
    asOf: '2026-09-17',
    generatedAt: '2026-09-17T18:00:00.000Z'
  });

  assert.equal(snapshot.planningReady, false);
  assert.equal(snapshot.unresolvedConflicts.some(conflict => conflict.blocksPlanning), true);
  assert.equal(snapshot.planningBlockers.some(item => /multiple instructional targets/i.test(item)), true);
});

test('newer explicit daily target outranks an older Current Snapshot target while preserving official placement', () => {
  const snapshot = compileGroupPlanningSnapshot({
    currentSnapshotRows: [
      currentRow({ student: 'Student A', group: 'Advance', currentSubstep: '5.4', lessonFocus: '5.4 Accuracy' }),
      currentRow({ student: 'Student B', group: 'Advance', currentSubstep: '5.4', lessonFocus: '5.4 Accuracy' })
    ],
    dailyRows: [
      dailyRow({
        group: 'Advance',
        substep: '5.5 Introduction',
        note: 'Began 5.5 Introduction after completing the prior exit condition.',
        followUp: 'Continue 5.5 Introduction.'
      })
    ],
    groupId: 'Advance',
    asOf: '2026-09-17',
    generatedAt: '2026-09-17T18:00:00.000Z'
  });

  assert.equal(snapshot.planningReady, true);
  assert.equal(snapshot.students[0].officialPlacement.substep, '5.5');
  assert.equal(snapshot.students[0].officialPlacement.status, 'teacher-confirmed-current');
  assert.equal(snapshot.students[0].instructionalTarget.substep, '5.5');
  assert.equal(snapshot.students[0].instructionalTarget.relationshipToPlacement, 'current');
  assert.equal(snapshot.students[0].lessonFocus, 'introduction');
  assert.equal(snapshot.unresolvedConflicts.some(conflict => conflict.severity === 'nonblocking'), true);
});

test('synthetic compiler tests do not embed current real-student names', () => {
  const source = [
    currentRow.toString(),
    dailyRow.toString()
  ].join('\n');
  for (const name of ['Oliver', 'Ethan', 'Alex', 'Finn', 'Maya', 'Enrique']) {
    assert.equal(source.includes(name), false);
  }
});
