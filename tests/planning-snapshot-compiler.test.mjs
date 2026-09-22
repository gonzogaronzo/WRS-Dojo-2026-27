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

test('normalizes Daily Notes group labels without allowing partial-token matches', () => {
  const matchingVariants = ['3B', 'Group 3B', 'group 3b', ' 3B ', 'Grp 3B'];
  for (const group of matchingVariants) {
    const snapshot = compileGroupPlanningSnapshot({
      currentSnapshotRows: [
        currentRow({
          student: 'Student A',
          group: '3B',
          currentSubstep: '2.5',
          lessonFocus: '2.5 Accuracy'
        })
      ],
      dailyRows: [
        dailyRow({
          group,
          substep: '2.5 Accuracy',
          note: 'Matched normalized group label.',
          followUp: 'Continue 2.5.',
          source: 'WRS Dojo mission:group-normalization-test'
        })
      ],
      groupId: '3B',
      asOf: '2026-09-17',
      generatedAt: '2026-09-17T18:00:00.000Z'
    });

    assert.equal(snapshot.lessonContinuity.lastInstructionDate, '2026-09-17', `expected ${group} to match 3B`);
    assert.equal(
      snapshot.stateSources.some(source => source.kind === 'dojo-completion-event'),
      true,
      `expected ${group} to be included as a Dojo row`
    );
  }

  const nonMatchingVariants = ['3B/3A', 'Group 13B', 'Group 3A', 'prefix 3B suffix'];
  for (const group of nonMatchingVariants) {
    const snapshot = compileGroupPlanningSnapshot({
      currentSnapshotRows: [
        currentRow({
          student: 'Student A',
          group: '3B',
          currentSubstep: '2.5',
          lessonFocus: '2.5 Accuracy'
        })
      ],
      dailyRows: [
        dailyRow({
          group,
          substep: '2.5 Accuracy',
          note: 'This row must not match 3B.',
          followUp: 'Continue 2.5.',
          source: 'WRS Dojo mission:group-normalization-test'
        })
      ],
      groupId: '3B',
      asOf: '2026-09-17',
      generatedAt: '2026-09-17T18:00:00.000Z'
    });

    assert.equal(snapshot.lessonContinuity.lastInstructionDate, null, `expected ${group} not to match 3B`);
    assert.equal(
      snapshot.stateSources.some(source => source.kind === 'dojo-completion-event'),
      false,
      `expected ${group} to remain excluded`
    );
  }
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

test('newer dictation reporting for present students does not erase an absent student\'s unfinished dictation', () => {
  const snapshot = compileGroupPlanningSnapshot({
    currentSnapshotRows: [
      currentRow({
        student: 'Student A',
        group: 'AbsentCarry',
        currentSubstep: '3.1',
        lessonFocus: '2.5 Accuracy review/backfill',
        spelling: '2.5 dictation completed.'
      }),
      currentRow({
        student: 'Student B',
        group: 'AbsentCarry',
        currentSubstep: '3.1',
        lessonFocus: '2.5 Accuracy review/backfill',
        spelling: '2.5 Block 2: two phrase dictation items completed; sentence dictation remains.'
      })
    ],
    dailyRows: [
      dailyRow({
        group: 'AbsentCarry',
        students: 'Student A',
        substep: '2.5 Accuracy',
        category: 'Dictation / sentence construction',
        note: 'Student A completed dictation and worked through all planned parts.',
        followUp: 'Continue monitoring accuracy.'
      }),
      dailyRow({
        group: 'AbsentCarry',
        students: 'Student B',
        recordType: 'Attendance',
        category: 'Groups seen / attendance',
        substep: '2.5',
        note: 'Student B was absent again today.',
        followUp: 'Follow up on attendance.'
      })
    ],
    groupId: 'AbsentCarry',
    asOf: '2026-09-17',
    generatedAt: '2026-09-17T18:00:00.000Z'
  });

  assert.equal(
    snapshot.lessonContinuity.unfinishedWork.some(item => /sentence dictation remains/i.test(item)),
    true
  );
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

test('same-day teacher completion plus explicit begin-next-substep resolves to the new current state', () => {
  const snapshot = compileGroupPlanningSnapshot({
    currentSnapshotRows: [
      currentRow({
        student: 'Student A',
        group: 'SameDayAdvance',
        currentSubstep: '7.5',
        lessonFocus: '7.5 Introduction',
        updated: '2026-09-18'
      }),
      currentRow({
        student: 'Student B',
        group: 'SameDayAdvance',
        currentSubstep: '7.5',
        lessonFocus: '7.5 Introduction',
        updated: '2026-09-18'
      })
    ],
    dailyRows: [
      dailyRow({
        date: '2026-09-18',
        group: 'SameDayAdvance',
        substep: '7.4 Accuracy',
        note: 'The group charted at 100% and is ready to advance.',
        followUp: 'Begin 7.5 next week.',
        source: 'Teacher live note, 2026-09-18'
      })
    ],
    groupId: 'SameDayAdvance',
    asOf: '2026-09-18',
    generatedAt: '2026-09-18T18:00:00.000Z'
  });

  assert.equal(snapshot.planningReady, true);
  assert.equal(snapshot.students[0].officialPlacement.substep, '7.5');
  assert.equal(snapshot.students[0].instructionalTarget.substep, '7.5');
  assert.equal(snapshot.students[0].lessonFocus, 'introduction');
  assert.equal(snapshot.advancement.status, 'continue');
  assert.equal(snapshot.advancement.currentSubstep, '7.5');
  assert.equal(snapshot.advancement.nextSubstep, null);
  assert.equal(snapshot.lessonContinuity.lastSubstep, '7.4');
});

test('explicit current-Substep teaching owed blocks a conflicting Accuracy focus', () => {
  const snapshot = compileGroupPlanningSnapshot({
    currentSnapshotRows: [
      currentRow({
        student: 'Student A',
        group: 'IntroConflict',
        currentSubstep: '5.2',
        lessonFocus: '5.2 Accuracy',
        updated: '2026-09-18',
        next: 'Begin next week with explicit 5.2 instruction.'
      }),
      currentRow({
        student: 'Student B',
        group: 'IntroConflict',
        currentSubstep: '5.2',
        lessonFocus: '5.2 Accuracy',
        updated: '2026-09-18',
        next: 'Begin next week with explicit 5.2 instruction.'
      })
    ],
    dailyRows: [
      dailyRow({
        date: '2026-09-18',
        group: 'IntroConflict',
        students: 'Student A; Student B',
        substep: '5.2 Accuracy',
        note: 'The group has not yet received a full, proper 5.2 lesson and important 5.2 content still needs to be explicitly taught.',
        followUp: 'Next week, begin with explicit 5.2 instruction before moving forward.',
        source: 'Teacher live note, 2026-09-18'
      })
    ],
    groupId: 'IntroConflict',
    asOf: '2026-09-18',
    generatedAt: '2026-09-18T18:00:00.000Z'
  });

  assert.equal(snapshot.students[0].instructionalTarget.substep, '5.2');
  assert.equal(snapshot.students[0].lessonFocus, 'accuracy');
  assert.equal(snapshot.planningReady, false);
  assert.equal(
    snapshot.unresolvedConflicts.some(conflict => conflict.conflictId.includes('explicit-instruction-focus-conflict')),
    true
  );
  assert.match(snapshot.planningBlockers.join(' '), /Teacher must confirm Introduction versus the recorded focus/i);
});

test('explicit teacher focus override resolves the current-Substep teaching ambiguity', () => {
  const snapshot = compileGroupPlanningSnapshot({
    currentSnapshotRows: [
      currentRow({
        student: 'Student A',
        group: 'IntroOverride',
        currentSubstep: '5.2',
        lessonFocus: '5.2 Accuracy',
        updated: '2026-09-18'
      }),
      currentRow({
        student: 'Student B',
        group: 'IntroOverride',
        currentSubstep: '5.2',
        lessonFocus: '5.2 Accuracy',
        updated: '2026-09-18'
      })
    ],
    dailyRows: [
      dailyRow({
        date: '2026-09-18',
        group: 'IntroOverride',
        students: 'Student A; Student B',
        substep: '5.2 Accuracy',
        note: 'The group has not yet received a full, proper 5.2 lesson and important 5.2 content still needs to be explicitly taught.',
        followUp: 'Next week, begin with explicit 5.2 instruction before moving forward.',
        source: 'Teacher live note, 2026-09-18'
      })
    ],
    groupId: 'IntroOverride',
    asOf: '2026-09-18',
    teacherFocusOverride: 'Introduction',
    generatedAt: '2026-09-18T18:00:00.000Z'
  });

  assert.equal(snapshot.planningReady, true);
  assert.equal(snapshot.students.every(student => student.lessonFocus === 'introduction'), true);
  assert.equal(
    snapshot.unresolvedConflicts.some(conflict => conflict.conflictId.includes('explicit-instruction-focus-conflict')),
    false
  );
  assert.equal(
    snapshot.stateSources.some(source => source.sourceRef.includes('teacher-decision:IntroOverride') && source.authorityRank === 1),
    true
  );
});

test('same-day advance preserves prior taught Substep while keeping prior follow-up visible', () => {
  const snapshot = compileGroupPlanningSnapshot({
    currentSnapshotRows: [
      currentRow({
        student: 'Student A',
        group: 'PriorFollowUp',
        currentSubstep: '5.5',
        lessonFocus: '5.5 Introduction',
        updated: '2026-09-18',
        spelling: '5.4 marked complete by teacher on 2026-09-18.'
      }),
      currentRow({
        student: 'Student B',
        group: 'PriorFollowUp',
        currentSubstep: '5.5',
        lessonFocus: '5.5 Introduction',
        updated: '2026-09-18',
        spelling: '5.4 marked complete by teacher on 2026-09-18.'
      })
    ],
    dailyRows: [
      dailyRow({
        date: '2026-09-18',
        group: 'PriorFollowUp',
        students: 'Student A; Student B',
        substep: '5.4 Accuracy',
        note: 'Substep 5.4 is complete. Student B still needs final charting.',
        followUp: 'Begin 5.5 next week. Complete Student B final charting.',
        source: 'Teacher live note, 2026-09-18'
      })
    ],
    groupId: 'PriorFollowUp',
    asOf: '2026-09-18',
    generatedAt: '2026-09-18T18:00:00.000Z'
  });

  assert.equal(snapshot.planningReady, true);
  assert.equal(snapshot.students[0].instructionalTarget.substep, '5.5');
  assert.equal(snapshot.students[0].lessonFocus, 'introduction');
  assert.equal(snapshot.lessonContinuity.lastSubstep, '5.4');
  assert.equal(snapshot.lessonContinuity.unfinishedWork.some(item => /final charting/i.test(item)), true);
  assert.equal(snapshot.lessonContinuity.unfinishedWork.some(item => /^Substep 5\.4 is complete\./i.test(item)), false);
  assert.equal(snapshot.advancement.status, 'continue');
  assert.equal(snapshot.advancement.currentSubstep, '5.5');
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


test('persisted selection history feeds passage continuity into the planning snapshot', () => {
  const selectionHistory = {
    schemaVersion: 'wrs-group-selection-history-v1',
    schoolYear: '2026-27',
    groupId: 'History',
    updatedAt: '2026-09-17T18:00:00.000Z',
    lessons: [{
      eventId: 'History:2026-09-17:lesson-a',
      lessonId: 'lesson-a',
      date: '2026-09-17',
      substep: '5.5',
      focus: 'introduction',
      completionStatus: 'partial',
      completedParts: [1,2,3,4,5],
      sourceRef: 'daily:2026-09-17:teacher',
      selections: {
        part3: { currentCards: [], hfw: [], wordElements: [] },
        part4: { practiceWords: [], chartingWords: [] },
        part5: { page: null, sentences: [] },
        part8: { sounds: [], wordElements: [], realWords: [], nonsenseWords: [], phrases: [], sentences: [] },
        part9: {
          passageId: 'synthetic-passage::128',
          title: 'Synthetic Passage',
          page: '128',
          status: 'started'
        }
      }
    }]
  };

  const snapshot = compileGroupPlanningSnapshot({
    currentSnapshotRows: [
      currentRow({ student: 'Student A', group: 'History', currentSubstep: '5.5', lessonFocus: '5.5 Introduction', updated: '2026-09-17' }),
      currentRow({ student: 'Student B', group: 'History', currentSubstep: '5.5', lessonFocus: '5.5 Introduction', updated: '2026-09-17' })
    ],
    dailyRows: [],
    groupId: 'History',
    asOf: '2026-09-17',
    selectionHistory,
    generatedAt: '2026-09-17T18:00:00.000Z'
  });

  assert.equal(snapshot.lessonContinuity.selectionHistoryRef, 'selection-history:History');
  assert.equal(snapshot.lessonContinuity.passageHistory.length, 1);
  assert.equal(snapshot.lessonContinuity.passageHistory[0].status, 'started');
  assert.equal(snapshot.lessonContinuity.passageHistory[0].title, 'Synthetic Passage');
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
