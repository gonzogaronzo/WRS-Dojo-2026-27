import test from 'node:test';
import assert from 'node:assert/strict';

import { refreshPlanningState } from '../scripts/wrs-refresh-planning-state.mjs';

const currentRow = ({
  student,
  group,
  currentSubstep,
  lessonFocus,
  updated = '2026-09-18'
}) => ({
  Student: student,
  Group: group,
  Grade: '5',
  'Current Substep': currentSubstep,
  'Lesson Focus': lessonFocus,
  'Most Recent Real-Word Charting': '15/15',
  'Most Recent Nonsense-Word Charting': '',
  'Most Recent Spelling / Dictation': '',
  'HFW Status': '',
  'Fluency / Assessment': '',
  'Current Trouble Spots': '',
  'Recommended Next Focus': 'Continue current instruction.',
  'Last Updated': updated,
  'Notes / Follow-up': ''
});

const dailyRow = ({
  date = '2026-09-18',
  group,
  substep,
  note,
  followUp,
  source = 'Teacher live note, 2026-09-18'
}) => ({
  Date: date,
  Group: group,
  'Student(s)': 'Student A; Student B',
  'Record Type': 'Instructional / Student Data',
  Category: 'Instruction',
  'Substep / Lesson': substep,
  'Note / Data': note,
  'Follow-up / Instructional Response': followUp,
  Source: source
});

const packet = substep => ({
  packetId: `wrs-${substep}-source-packet-v1`,
  packetVersion: '1.0.0',
  verified: true,
  path: `curriculum/source-packets/${substep}.v1.json`
});

test('one refresh compiles snapshots and a rolling queue from live-row feed data', () => {
  const feed = {
    schemaVersion: 'wrs-live-planning-feed-v1',
    schoolYear: '2026-27',
    asOf: '2026-09-18',
    weekOf: '2026-09-21',
    currentSnapshotRows: [
      currentRow({ student: 'Student A', group: 'A', currentSubstep: '5.4', lessonFocus: '5.4 Accuracy' }),
      currentRow({ student: 'Student B', group: 'A', currentSubstep: '5.4', lessonFocus: '5.4 Accuracy' }),
      currentRow({ student: 'Student C', group: 'B', currentSubstep: '2.5', lessonFocus: '2.5 Accuracy' })
    ],
    groups: [
      {
        groupId: 'A',
        schedule: 'morning',
        dailyRows: [dailyRow({
          group: 'A',
          substep: '5.4 Accuracy',
          note: 'Sentence dictation remains.',
          followUp: 'Finish sentence dictation, then advance to 5.5.'
        })]
      },
      {
        groupId: 'B',
        schedule: 'afternoon',
        dailyRows: [dailyRow({
          group: 'B',
          substep: '2.5 Accuracy',
          note: 'Continue current 2.5 work.',
          followUp: 'Resume the unfinished lesson.'
        })]
      }
    ]
  };

  const report = refreshPlanningState({
    feed,
    packetRegistry: {
      '5.5': packet('5.5'),
      '2.5': packet('2.5')
    },
    generatedAt: '2026-09-18T12:00:00.000Z'
  });

  assert.equal(report.status, 'PASS');
  assert.equal(report.snapshots.length, 2);
  assert.equal(report.queue.entries.length, 2);

  const a = report.queue.entries.find(entry => entry.groupId === 'A');
  const b = report.queue.entries.find(entry => entry.groupId === 'B');
  assert.equal(a.sourcePacketRef, 'wrs-5.5-source-packet-v1');
  assert.equal(a.status, 'awaiting-condition');
  assert.equal(b.sourcePacketRef, 'wrs-2.5-source-packet-v1');
  assert.equal(b.lessonRoute, 'continuation');
});

test('a missing packet blocks only that queue entry and the refresh report', () => {
  const feed = {
    schemaVersion: 'wrs-live-planning-feed-v1',
    schoolYear: '2026-27',
    asOf: '2026-09-18',
    weekOf: '2026-09-21',
    currentSnapshotRows: [
      currentRow({ student: 'Student A', group: 'A', currentSubstep: '5.5', lessonFocus: '5.5 Accuracy' }),
      currentRow({ student: 'Student B', group: 'B', currentSubstep: '7.5', lessonFocus: '7.5 Introduction' })
    ],
    groups: [
      { groupId: 'A', dailyRows: [] },
      { groupId: 'B', dailyRows: [] }
    ]
  };

  const report = refreshPlanningState({
    feed,
    packetRegistry: { '5.5': packet('5.5') },
    generatedAt: '2026-09-18T12:00:00.000Z'
  });

  assert.equal(report.status, 'BLOCKED');
  assert.equal(report.queue.entries.find(entry => entry.groupId === 'A').status, 'needs-build');
  assert.equal(report.queue.entries.find(entry => entry.groupId === 'B').status, 'blocked');
  assert.equal(report.errors.some(error => error.groupId === 'B' && error.code === 'queue_entry_blocked'), true);
});

test('group compilation failures are reported instead of silently dropping into a false PASS', () => {
  const feed = {
    schemaVersion: 'wrs-live-planning-feed-v1',
    schoolYear: '2026-27',
    asOf: '2026-09-18',
    weekOf: '2026-09-21',
    currentSnapshotRows: [
      currentRow({ student: 'Student A', group: 'A', currentSubstep: '5.5', lessonFocus: '5.5 Accuracy' })
    ],
    groups: [
      { groupId: 'A', dailyRows: [] },
      { groupId: 'Missing', dailyRows: [] }
    ]
  };

  const report = refreshPlanningState({
    feed,
    packetRegistry: { '5.5': packet('5.5') },
    generatedAt: '2026-09-18T12:00:00.000Z'
  });

  assert.equal(report.status, 'BLOCKED');
  assert.equal(report.snapshots.length, 1);
  assert.equal(
    report.errors.some(error => error.groupId === 'Missing' && error.code === 'group_snapshot_compile_failed'),
    true
  );
});

test('refresh tests do not embed current real-student names', () => {
  const source = [currentRow.toString(), dailyRow.toString()].join('\n');
  for (const name of ['Oliver', 'Ethan', 'Alex', 'Finn', 'Maya', 'Enrique']) {
    assert.equal(source.includes(name), false);
  }
});
