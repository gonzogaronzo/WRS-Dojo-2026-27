import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildFeedFromSheetValues,
  refreshFromSheetValues,
  rowsFromValues
} from '../scripts/wrs-refresh-from-sheet-values.mjs';

const currentHeaders = [
  'Student',
  'Group',
  'Grade',
  'Current Substep',
  'Lesson Focus',
  'Most Recent Real-Word Charting',
  'Most Recent Nonsense-Word Charting',
  'Most Recent Spelling / Dictation',
  'HFW Status',
  'Fluency / Assessment',
  'Current Trouble Spots',
  'Recommended Next Focus',
  'Last Updated',
  'Notes / Follow-up'
];

const dailyHeaders = [
  'Date',
  'Group',
  'Student(s)',
  'Record Type',
  'Category',
  'Substep / Lesson',
  'Note / Data',
  'Follow-up / Instructional Response',
  'Source'
];

const packetRegistry = {
  '5.5': {
    packetId: 'wrs-5.5-source-packet-v1',
    packetVersion: 'synthetic',
    verified: true,
    path: 'synthetic',
    packet: {
      schemaVersion: 'wrs-substep-source-packet-v1',
      packetId: 'wrs-5.5-source-packet-v1',
      substep: '5.5',
      packetVersion: 'synthetic',
      verification: { status: 'verified', blockingIssues: [] }
    }
  }
};

const sheetExport = {
  schemaVersion: 'wrs-sheet-values-export-v1',
  schoolYear: '2026-27',
  asOf: '2026-09-21',
  weekOf: '2026-09-21',
  currentSnapshotValues: [
    currentHeaders,
    ['Synthetic Student', 'Synthetic', '5', '5.5', '5.5 Introduction', '15/15', '', 'Prior substep complete.', '', '', 'Needs cumulative review.', 'Begin 5.5.', '2026-09-21', '']
  ],
  dailyTabValues: {
    Synthetic: [
      dailyHeaders,
      ['2026-09-21', 'Synthetic', 'Synthetic Student', 'Instructional / Student Data', 'Substep start', '5.5 Introduction', 'Began 5.5.', 'Continue 5.5 Introduction.', 'Teacher live note, 2026-09-21']
    ]
  },
  groups: [{
    groupId: 'Synthetic',
    schedule: '8:00-8:45',
    plannedDate: '2026-09-21'
  }]
};

test('rowsFromValues maps a Sheets values matrix to named row objects', () => {
  const rows = rowsFromValues([
    ['A', 'B'],
    ['one', 'two'],
    ['', ''],
    ['three']
  ], 'Synthetic Sheet');

  assert.deepEqual(rows, [
    { A: 'one', B: 'two' },
    { A: 'three', B: '' }
  ]);
});

test('raw connector/Sheets values become the canonical live planning feed shape', () => {
  const feed = buildFeedFromSheetValues(sheetExport);

  assert.equal(feed.schemaVersion, 'wrs-live-planning-feed-v1');
  assert.equal(feed.schoolYear, '2026-27');
  assert.equal(feed.currentSnapshotRows.length, 1);
  assert.equal(feed.groups.length, 1);
  assert.equal(feed.groups[0].groupId, 'Synthetic');
  assert.equal(feed.groups[0].dailyRows.length, 1);
  assert.equal(feed.groups[0].dailyRows[0]['Substep / Lesson'], '5.5 Introduction');
});

test('raw sheet-values refresh reuses a durable validated artifact only when the fresh fingerprint matches', () => {
  const initial = refreshFromSheetValues({
    exportData: sheetExport,
    packetRegistry,
    generatedAt: '2026-09-21T18:00:00.000Z'
  });
  const fingerprint = initial.queue.entries[0].inputFingerprint;
  assert.match(fingerprint, /^sha256:[a-f0-9]{64}$/);

  const withValidatedArtifact = {
    ...sheetExport,
    validatedArtifacts: {
      'Synthetic:2026-09-21': {
        currentFingerprint: fingerprint,
        validatedFingerprint: fingerprint,
        runtimeRef: 'runtime:synthetic',
        teacherPlanRef: 'teacher-plan:synthetic',
        lastValidatedAt: '2026-09-21T18:00:00.000Z'
      }
    }
  };

  const report = refreshFromSheetValues({
    exportData: withValidatedArtifact,
    packetRegistry,
    generatedAt: '2026-09-21T18:05:00.000Z'
  });

  assert.equal(report.status, 'PASS');
  assert.equal(report.queue.entries[0].status, 'validated');
  assert.equal(report.queue.entries[0].runtimeRef, 'runtime:synthetic');
  assert.equal(report.queue.entries[0].teacherPlanRef, 'teacher-plan:synthetic');
});

test('raw sheet-values refresh compiles a planning-ready snapshot and unblocked queue entry', () => {
  const report = refreshFromSheetValues({
    exportData: sheetExport,
    packetRegistry,
    generatedAt: '2026-09-21T18:00:00.000Z'
  });

  assert.equal(report.status, 'PASS');
  assert.equal(report.snapshots.length, 1);
  assert.equal(report.snapshots[0].planningReady, true);
  assert.equal(report.snapshots[0].students[0].instructionalTarget.substep, '5.5');
  assert.equal(report.queue.entries.length, 1);
  assert.deepEqual(report.queue.entries[0].blockers, []);
  assert.equal(report.queue.entries[0].status, 'needs-build');
});

test('sheet-values adapter fails closed on malformed or missing tab data', () => {
  assert.throws(
    () => rowsFromValues([['A', 'A'], ['x', 'y']], 'Duplicate Headers'),
    /duplicate column names/i
  );

  const missingCurrentHeader = {
    ...sheetExport,
    currentSnapshotValues: [
      currentHeaders.filter(header => header !== 'Lesson Focus'),
      ['Synthetic Student', 'Synthetic', '5', '5.5']
    ]
  };
  assert.throws(
    () => buildFeedFromSheetValues(missingCurrentHeader),
    /Current Snapshot is missing required columns: Lesson Focus/i
  );

  const missingTab = {
    ...sheetExport,
    dailyTabValues: {}
  };
  assert.throws(
    () => buildFeedFromSheetValues(missingTab),
    /Missing Daily Notes values/i
  );
});

test('sheet-values adapter tests contain no current real-student names', () => {
  const source = JSON.stringify(sheetExport);
  for (const name of ['Oliver', 'Ethan', 'Alex', 'Finn', 'Maya', 'Enrique', 'Levi', 'Nora', 'Eleanor', 'Alice', 'Izzy', 'Juliana', 'Carolyn', 'Elise', 'Charlotte', 'Bennett', 'Ben', 'Xavier', 'Uffarren']) {
    assert.equal(source.includes(name), false);
  }
});
