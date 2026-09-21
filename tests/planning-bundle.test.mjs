import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPlanningBundles } from '../scripts/wrs-build-planning-bundles.mjs';
import { buildWeeklyQueue } from '../scripts/wrs-build-weekly-queue.mjs';

const snapshot = () => ({
  schemaVersion: 'wrs-group-planning-snapshot-v1',
  snapshotId: 'snapshot-synthetic-2026-09-21',
  schoolYear: '2026-27',
  generatedAt: '2026-09-21T12:00:00.000Z',
  asOf: '2026-09-21',
  group: { groupId: 'Synthetic', displayName: 'Synthetic', schedule: '', roster: ['Student A'] },
  students: [{
    studentId: 'student-a',
    name: 'Student A',
    officialPlacement: { substep: '5.5', status: 'official', sourceRef: 'synthetic' },
    instructionalTarget: { substep: '5.5', relationshipToPlacement: 'current', sourceRef: 'synthetic' },
    lessonFocus: 'introduction',
    latestData: {},
    troubleSpots: [],
    recommendedInstructionalResponse: []
  }],
  lessonContinuity: {
    lastInstructionDate: '2026-09-18',
    lastSubstep: '5.5',
    partsCompleted: [],
    unfinishedWork: [],
    passageHistory: [],
    selectionHistoryRef: null
  },
  groupTroubleSpots: [],
  materialsAndFollowUps: [],
  advancement: {
    status: 'continue',
    currentSubstep: '5.5',
    nextSubstep: null,
    condition: null,
    authorityRef: 'synthetic'
  },
  unresolvedConflicts: [],
  stateSources: [{
    sourceRef: 'synthetic',
    kind: 'current-snapshot',
    date: '2026-09-21',
    authorityRank: 2,
    locator: 'synthetic'
  }],
  planningReady: true,
  planningBlockers: []
});

const packetRegistry = () => {
  const packet = {
    schemaVersion: 'wrs-substep-source-packet-v1',
    packetId: 'wrs-5.5-source-packet-v1',
    substep: '5.5',
    packetVersion: 'synthetic',
    verification: { status: 'verified', blockingIssues: [] }
  };
  return {
    '5.5': {
      packetId: packet.packetId,
      packetVersion: packet.packetVersion,
      verified: true,
      path: 'synthetic',
      packet
    }
  };
};

test('planning bundle joins the exact queue inputs and fingerprint into one handoff', () => {
  const snap = snapshot();
  const registry = packetRegistry();
  const queue = buildWeeklyQueue({
    snapshots: [snap],
    weekOf: '2026-09-21',
    packetRegistry: registry,
    generatedAt: '2026-09-21T12:05:00.000Z'
  });

  const [bundle] = buildPlanningBundles({
    snapshots: [snap],
    queue,
    packetRegistry: registry,
    generatedAt: '2026-09-21T12:05:00.000Z'
  });

  assert.equal(bundle.schemaVersion, 'wrs-planning-bundle-v1');
  assert.equal(bundle.status, 'needs-build');
  assert.equal(bundle.snapshot, snap);
  assert.equal(bundle.sourcePacket, registry['5.5'].packet);
  assert.equal(bundle.buildRequest.plannedDate, '2026-09-21');
  assert.equal(bundle.inputFingerprint, queue.entries[0].inputFingerprint);
  assert.deepEqual(bundle.blockers, []);
});

test('planning bundle fails closed when full packet content is unavailable', () => {
  const snap = snapshot();
  const registry = {
    '5.5': {
      packetId: 'wrs-5.5-source-packet-v1',
      packetVersion: 'synthetic',
      verified: true,
      path: 'synthetic'
    }
  };
  const queue = buildWeeklyQueue({
    snapshots: [snap],
    weekOf: '2026-09-21',
    packetRegistry: registry
  });

  const [bundle] = buildPlanningBundles({
    snapshots: [snap],
    queue,
    packetRegistry: registry
  });

  assert.equal(bundle.status, 'blocked');
  assert.match(bundle.blockers.join(' '), /Full source packet content is unavailable/i);
  assert.equal('snapshot' in bundle, false);
});

test('planning bundle detects any disagreement with the queue fingerprint', () => {
  const snap = snapshot();
  const registry = packetRegistry();
  const queue = buildWeeklyQueue({
    snapshots: [snap],
    weekOf: '2026-09-21',
    packetRegistry: registry
  });
  queue.entries[0].inputFingerprint = 'sha256:' + 'a'.repeat(64);

  assert.throws(
    () => buildPlanningBundles({ snapshots: [snap], queue, packetRegistry: registry }),
    /fingerprint mismatch/i
  );
});

test('planning-bundle tests use synthetic student names only', () => {
  const source = snapshot.toString();
  for (const name of ['Oliver', 'Ethan', 'Alex', 'Finn', 'Maya', 'Enrique', 'Levi', 'Nora', 'Eleanor', 'Alice', 'Izzy', 'Juliana', 'Carolyn', 'Elise', 'Charlotte', 'Bennett', 'Ben', 'Xavier', 'Uffarren']) {
    assert.equal(source.includes(name), false);
  }
});
