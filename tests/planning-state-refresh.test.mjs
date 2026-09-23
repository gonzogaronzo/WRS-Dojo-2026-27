import test from 'node:test';
import assert from 'node:assert/strict';

import { DATA_LOG_HEADERS, normalizeChartingEvidence } from '../functions/chartingEvidence.js';
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

// Synthetic prior completion/evidence keeps these queue/history tests focused on
// their existing behavior while exercising the new gate through the real pipeline.
const withPriorCharting = feed => ({
  ...feed,
  chartingEvidence: normalizeChartingEvidence([DATA_LOG_HEADERS,
    ...feed.currentSnapshotRows.map(row => ['2026-09-01', row.Student, row.Group, '1.1', 'Charting', 'Real-Word Charting', '13/15'])
  ]),
  groups: feed.groups.map(group => ({ ...group, dailyRows: [
    { Date: '2026-09-01', Group: group.groupId, 'Student(s)': '', 'Substep / Lesson': '1.1',
      'Note / Data': 'Substep 1.1 is complete.', Source: 'Teacher live note' },
    ...group.dailyRows
  ] }))
});

const packet = substep => {
  const sourcePacket = {
    schemaVersion: 'wrs-substep-source-packet-v1',
    packetId: `wrs-${substep}-source-packet-v1`,
    substep,
    packetVersion: '1.0.0',
    verification: { status: 'verified', blockingIssues: [] }
  };
  return {
    packetId: sourcePacket.packetId,
    packetVersion: sourcePacket.packetVersion,
    verified: true,
    path: `curriculum/source-packets/${substep}.v1.json`,
    packet: sourcePacket
  };
};

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
    feed: withPriorCharting(feed),
    packetRegistry: {
      '5.5': packet('5.5'),
      '2.5': packet('2.5')
    },
    generatedAt: '2026-09-18T12:00:00.000Z'
  });

  assert.equal(report.status, 'PASS');
  assert.equal(report.snapshots.length, 2);
  assert.equal(report.queue.entries.length, 2);
  assert.equal(report.bundles.length, 2);
  assert.equal(report.bundles.every(bundle => bundle.status !== 'blocked'), true);
  assert.equal(report.bundles.every(bundle => /^sha256:[a-f0-9]{64}$/.test(bundle.inputFingerprint)), true);

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
    feed: withPriorCharting(feed),
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
    feed: withPriorCharting(feed),
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


test('refresh applies an explicit teacher focus override without changing the Substep', () => {
  const feed = {
    schemaVersion: 'wrs-live-planning-feed-v1',
    schoolYear: '2026-27',
    asOf: '2026-09-18',
    weekOf: '2026-09-21',
    currentSnapshotRows: [
      currentRow({ student: 'Student A', group: 'Focus', currentSubstep: '5.2', lessonFocus: '5.2 Accuracy' }),
      currentRow({ student: 'Student B', group: 'Focus', currentSubstep: '5.2', lessonFocus: '5.2 Accuracy' })
    ],
    groups: [{
      groupId: 'Focus',
      teacherFocusOverride: 'Introduction',
      dailyRows: [dailyRow({
        group: 'Focus',
        substep: '5.2 Accuracy',
        note: 'The group has not yet received a full, proper 5.2 lesson.',
        followUp: 'Begin with explicit 5.2 instruction before moving forward.'
      })]
    }]
  };

  const report = refreshPlanningState({
    feed: withPriorCharting(feed),
    packetRegistry: { '5.2': packet('5.2') },
    generatedAt: '2026-09-18T12:00:00.000Z'
  });

  assert.equal(report.status, 'PASS');
  assert.equal(report.snapshots[0].students[0].instructionalTarget.substep, '5.2');
  assert.equal(report.snapshots[0].students[0].lessonFocus, 'introduction');
  assert.equal(report.queue.entries[0].status, 'needs-build');
});

test('refresh carries persisted passage history into the derived group snapshot', () => {
  const selectionHistory = {
    schemaVersion: 'wrs-group-selection-history-v1',
    schoolYear: '2026-27',
    groupId: 'A',
    updatedAt: '2026-09-18T10:00:00.000Z',
    lessons: [{
      eventId: 'A:2026-09-18:lesson-a',
      lessonId: 'lesson-a',
      date: '2026-09-18',
      substep: '5.5',
      focus: 'introduction',
      completionStatus: 'partial',
      completedParts: [1,2,3,4,5],
      sourceRef: 'daily:2026-09-18:teacher',
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

  const feed = {
    schemaVersion: 'wrs-live-planning-feed-v1',
    schoolYear: '2026-27',
    asOf: '2026-09-18',
    weekOf: '2026-09-21',
    currentSnapshotRows: [
      currentRow({ student: 'Student A', group: 'A', currentSubstep: '5.5', lessonFocus: '5.5 Introduction' })
    ],
    groups: [
      { groupId: 'A', dailyRows: [], selectionHistory }
    ]
  };

  const report = refreshPlanningState({
    feed: withPriorCharting(feed),
    packetRegistry: { '5.5': packet('5.5') },
    generatedAt: '2026-09-18T12:00:00.000Z'
  });

  assert.equal(report.status, 'PASS');
  assert.equal(report.snapshots[0].lessonContinuity.selectionHistoryRef, 'selection-history:A');
  assert.equal(report.snapshots[0].lessonContinuity.passageHistory[0].title, 'Synthetic Passage');
  assert.equal(report.bundles[0].selectionHistory.lessons[0].selections.part9.title, 'Synthetic Passage');
  assert.equal(report.bundles[0].inputFingerprint, report.queue.entries[0].inputFingerprint);
});

test('refresh tests do not embed current real-student names', () => {
  const source = [currentRow.toString(), dailyRow.toString()].join('\n');
  for (const name of ['Oliver', 'Ethan', 'Alex', 'Finn', 'Maya', 'Enrique']) {
    assert.equal(source.includes(name), false);
  }
});
