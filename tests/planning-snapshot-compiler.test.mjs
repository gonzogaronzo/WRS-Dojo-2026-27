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
  spelling = '',
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
  'Most Recent Spelling / Dictation': spelling,
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






test('derives explicitly completed Block and Part numbers without treating nearly-complete work as done', () => {
  const blockSnapshot = compileGroupPlanningSnapshot({
    currentSnapshotRows: [
      currentRow({ student: 'Student A', group: 'Parts', currentSubstep: '2.5', lessonFocus: '2.5 Accuracy' }),
      currentRow({ student: 'Student B', group: 'Parts', currentSubstep: '2.5', lessonFocus: '2.5 Accuracy' })
    ],
    dailyRows: [
      dailyRow({
        group: 'Parts',
        substep: '2.5 Accuracy',
        note: 'The group completed Block 1 and then began Part 9.',
        followUp: 'Resume Part 9 at the stopping point.'
      })
    ],
    groupId: 'Parts',
    asOf: '2026-09-17',
    generatedAt: '2026-09-17T18:00:00.000Z'
  });
  assert.deepEqual(blockSnapshot.lessonContinuity.partsCompleted, [1, 2, 3, 4, 5]);

  const partSnapshot = compileGroupPlanningSnapshot({
    currentSnapshotRows: [
      currentRow({ student: 'Student A', group: 'Part8', currentSubstep: '5.1', lessonFocus: '5.1 Accuracy' }),
      currentRow({ student: 'Student B', group: 'Part8', currentSubstep: '5.1', lessonFocus: '5.1 Accuracy' })
    ],
    dailyRows: [
      dailyRow({
        group: 'Part8',
        substep: '5.1 Accuracy',
        note: 'The group finished Part 8 dictation.',
        followUp: 'Continue concept review.'
      })
    ],
    groupId: 'Part8',
    asOf: '2026-09-17',
    generatedAt: '2026-09-17T18:00:00.000Z'
  });
  assert.deepEqual(partSnapshot.lessonContinuity.partsCompleted, [8]);

  const nearlySnapshot = compileGroupPlanningSnapshot({
    currentSnapshotRows: [
      currentRow({ student: 'Student A', group: 'Nearly', currentSubstep: '5.4', lessonFocus: '5.4 Accuracy' }),
      currentRow({ student: 'Student B', group: 'Nearly', currentSubstep: '5.4', lessonFocus: '5.4 Accuracy' })
    ],
    dailyRows: [
      dailyRow({
        group: 'Nearly',
        substep: '5.4 Accuracy',
        note: 'The group nearly completed Part 8 dictation; only the sentences remain.',
        followUp: 'Finish the sentence dictation, then advance to 5.5.'
      })
    ],
    groupId: 'Nearly',
    asOf: '2026-09-17',
    generatedAt: '2026-09-17T18:00:00.000Z'
  });
  assert.deepEqual(nearlySnapshot.lessonContinuity.partsCompleted, []);
});

test('carries forward unresolved dictation when the newer daily note does not address it', () => {
  const snapshot = compileGroupPlanningSnapshot({
    currentSnapshotRows: [
      currentRow({
        student: 'Student A',
        group: 'Carry',
        currentSubstep: '2.5',
        lessonFocus: '2.5 Accuracy',
        spelling: 'Two phrases completed; sentence dictation remains.'
      }),
      currentRow({
        student: 'Student B',
        group: 'Carry',
        currentSubstep: '2.5',
        lessonFocus: '2.5 Accuracy',
        spelling: 'Two phrases completed; sentence dictation remains.'
      })
    ],
    dailyRows: [
      dailyRow({
        group: 'Carry',
        substep: '2.5 Accuracy',
        note: 'The group completed Block 1 and began controlled text reading.',
        followUp: 'Resume the passage at the stopping point.'
      })
    ],
    groupId: 'Carry',
    asOf: '2026-09-17',
    generatedAt: '2026-09-17T18:00:00.000Z'
  });

  assert.equal(snapshot.lessonContinuity.unfinishedWork.some(item => /sentence dictation remains/i.test(item)), true);
});

test('newer dictation reporting prevents stale snapshot dictation from carrying forward', () => {
  const snapshot = compileGroupPlanningSnapshot({
    currentSnapshotRows: [
      currentRow({
        student: 'Student A',
        group: 'Resolved',
        currentSubstep: '5.1',
        lessonFocus: '5.1 Accuracy',
        spelling: 'Dictation nearly complete; finish next session.'
      }),
      currentRow({
        student: 'Student B',
        group: 'Resolved',
        currentSubstep: '5.1',
        lessonFocus: '5.1 Accuracy',
        spelling: 'Dictation nearly complete; finish next session.'
      })
    ],
    dailyRows: [
      dailyRow({
        group: 'Resolved',
        substep: '5.1 Accuracy',
        note: 'The group finished Part 8 dictation.',
        followUp: 'Continue targeted concept review before advancing.'
      })
    ],
    groupId: 'Resolved',
    asOf: '2026-09-17',
    generatedAt: '2026-09-17T18:00:00.000Z'
  });

  assert.equal(snapshot.lessonContinuity.unfinishedWork.some(item => /dictation nearly complete/i.test(item)), false);
});

test('recognizes conditional wording that says advance to Substep', () => {
  const snapshot = compileGroupPlanningSnapshot({
    currentSnapshotRows: [
      currentRow({ student: 'Student A', group: 'Conditional', currentSubstep: '2.5', lessonFocus: '2.5 Accuracy' }),
      currentRow({ student: 'Student B', group: 'Conditional', currentSubstep: '2.5', lessonFocus: '2.5 Accuracy' })
    ],
    dailyRows: [
      dailyRow({
        group: 'Conditional',
        substep: '2.5 Accuracy',
        note: 'The group will complete charting next.',
        followUp: 'Advance to Substep 3.1 only if the charting data supports mastery.',
        source: 'Teacher live note, 2026-09-17'
      })
    ],
    groupId: 'Conditional',
    asOf: '2026-09-17',
    generatedAt: '2026-09-17T18:00:00.000Z'
  });

  assert.equal(snapshot.planningReady, true);
  assert.equal(snapshot.advancement.status, 'ready-pending-completion');
  assert.equal(snapshot.advancement.currentSubstep, '2.5');
  assert.equal(snapshot.advancement.nextSubstep, '3.1');
  assert.match(snapshot.advancement.condition, /only if the charting data supports mastery/i);
});

test('an unconditional explicit teacher advance is represented as teacher-confirmed-advance', () => {
  const snapshot = compileGroupPlanningSnapshot({
    currentSnapshotRows: [
      currentRow({ student: 'Student A', group: 'Go', currentSubstep: '5.4', lessonFocus: '5.4 Accuracy' }),
      currentRow({ student: 'Student B', group: 'Go', currentSubstep: '5.4', lessonFocus: '5.4 Accuracy' })
    ],
    dailyRows: [
      dailyRow({
        group: 'Go',
        substep: '5.4 Accuracy',
        note: 'Current work is complete.',
        followUp: 'Advance to 5.5.',
        source: 'Teacher live note, 2026-09-17'
      })
    ],
    groupId: 'Go',
    asOf: '2026-09-17',
    generatedAt: '2026-09-17T18:00:00.000Z'
  });

  assert.equal(snapshot.planningReady, true);
  assert.equal(snapshot.advancement.status, 'teacher-confirmed-advance');
  assert.equal(snapshot.advancement.currentSubstep, '5.4');
  assert.equal(snapshot.advancement.nextSubstep, '5.5');
});

test('an older teacher note does not override a newer Current Snapshot state', () => {
  const snapshot = compileGroupPlanningSnapshot({
    currentSnapshotRows: [
      currentRow({
        student: 'Student A',
        group: 'Fresh',
        currentSubstep: '5.5',
        lessonFocus: '5.5 Accuracy',
        updated: '2026-09-18'
      }),
      currentRow({
        student: 'Student B',
        group: 'Fresh',
        currentSubstep: '5.5',
        lessonFocus: '5.5 Accuracy',
        updated: '2026-09-18'
      })
    ],
    dailyRows: [
      dailyRow({
        date: '2026-09-17',
        group: 'Fresh',
        substep: '5.4 Accuracy',
        note: 'Earlier work remained in 5.4.',
        followUp: 'Finish the sentence dictation, then advance to 5.5.'
      })
    ],
    groupId: 'Fresh',
    asOf: '2026-09-18',
    generatedAt: '2026-09-18T18:00:00.000Z'
  });

  assert.equal(snapshot.planningReady, true);
  assert.equal(snapshot.students[0].officialPlacement.substep, '5.5');
  assert.equal(snapshot.students[0].instructionalTarget.substep, '5.5');
  assert.equal(snapshot.students[0].lessonFocus, 'accuracy');
  assert.equal(snapshot.advancement.currentSubstep, '5.5');
  assert.equal(snapshot.advancement.nextSubstep, null);
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
