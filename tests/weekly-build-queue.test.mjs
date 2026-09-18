import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildWeeklyQueue,
  resolveQueueTarget
} from '../scripts/wrs-build-weekly-queue.mjs';

const snapshot = ({
  groupId = 'Group A',
  substep = '5.4',
  nextSubstep = null,
  advancementStatus = 'continue',
  condition = null,
  planningReady = true,
  blockers = [],
  unfinishedWork = []
} = {}) => ({
  schemaVersion: 'wrs-group-planning-snapshot-v1',
  snapshotId: `snapshot-${groupId.toLowerCase().replace(/\s+/g, '-')}-2026-09-18`,
  schoolYear: '2026-27',
  generatedAt: '2026-09-18T12:00:00.000Z',
  asOf: '2026-09-18',
  group: {
    groupId,
    displayName: groupId,
    schedule: '',
    roster: ['Student A']
  },
  students: [{
    studentId: 'student-a',
    name: 'Student A',
    officialPlacement: {
      substep,
      status: 'official',
      sourceRef: 'current-snapshot:test'
    },
    instructionalTarget: {
      substep,
      relationshipToPlacement: 'current',
      sourceRef: 'current-snapshot:test'
    },
    lessonFocus: 'accuracy',
    latestData: {},
    troubleSpots: [],
    recommendedInstructionalResponse: []
  }],
  lessonContinuity: {
    lastInstructionDate: '2026-09-17',
    lastSubstep: substep,
    partsCompleted: [],
    unfinishedWork,
    passageHistory: [],
    selectionHistoryRef: null
  },
  groupTroubleSpots: [],
  materialsAndFollowUps: [],
  advancement: {
    status: advancementStatus,
    currentSubstep: substep,
    nextSubstep,
    condition,
    authorityRef: 'teacher:test'
  },
  unresolvedConflicts: [],
  stateSources: [{
    sourceRef: 'current-snapshot:test',
    kind: 'current-snapshot',
    date: '2026-09-18',
    authorityRank: 2,
    locator: 'synthetic'
  }],
  planningReady,
  planningBlockers: blockers
});

const verifiedPacket = (substep, packetVersion = '1.0.0') => ({
  packetId: `wrs-${substep}-source-packet-v1`,
  packetVersion,
  verified: true,
  path: `curriculum/source-packets/${substep}.v1.json`
});

test('conditional advancement prepares the next Substep but waits on the entry condition', () => {
  const snap = snapshot({
    groupId: '5B Test',
    substep: '5.4',
    nextSubstep: '5.5',
    advancementStatus: 'ready-pending-completion',
    condition: 'Finish remaining sentence dictation, then advance.'
  });

  const target = resolveQueueTarget(snap);
  assert.equal(target.substep, '5.5');
  assert.equal(target.entryConditionStatus, 'pending');

  const queue = buildWeeklyQueue({
    snapshots: [snap],
    weekOf: '2026-09-21',
    packetRegistry: { '5.5': verifiedPacket('5.5') },
    generatedAt: '2026-09-18T12:00:00.000Z'
  });

  const entry = queue.entries[0];
  assert.equal(entry.sourcePacketRef, 'wrs-5.5-source-packet-v1');
  assert.equal(entry.entryConditionStatus, 'pending');
  assert.equal(entry.status, 'awaiting-condition');
  assert.equal(entry.lessonRoute, 'full');
  assert.match(entry.continuationRule, /do not record advancement/i);
});

test('missing source packet blocks only the affected entry', () => {
  const queue = buildWeeklyQueue({
    snapshots: [
      snapshot({ groupId: 'Ready', substep: '5.5' }),
      snapshot({ groupId: 'Missing', substep: '7.5' })
    ],
    weekOf: '2026-09-21',
    packetRegistry: { '5.5': verifiedPacket('5.5') },
    generatedAt: '2026-09-18T12:00:00.000Z'
  });

  const ready = queue.entries.find(entry => entry.groupId === 'Ready');
  const missing = queue.entries.find(entry => entry.groupId === 'Missing');

  assert.equal(ready.status, 'needs-build');
  assert.equal(missing.status, 'blocked');
  assert.match(missing.blockers.join(' '), /No registered source packet.*7\.5/i);
  assert.equal(ready.blockers.length, 0);
});

test('current unfinished work defaults to continuation route', () => {
  const queue = buildWeeklyQueue({
    snapshots: [snapshot({
      groupId: 'Continue',
      substep: '2.5',
      unfinishedWork: ['Sentence dictation remains.']
    })],
    weekOf: '2026-09-21',
    packetRegistry: { '2.5': verifiedPacket('2.5') },
    generatedAt: '2026-09-18T12:00:00.000Z'
  });

  assert.equal(queue.entries[0].lessonRoute, 'continuation');
  assert.equal(queue.entries[0].status, 'needs-build');
  assert.equal(queue.entries[0].exitEvidence.some(item => /Sentence dictation remains/i.test(item)), true);
});

test('planning blockers fail closed before packet availability can matter', () => {
  const queue = buildWeeklyQueue({
    snapshots: [snapshot({
      groupId: 'Blocked',
      substep: '3.1',
      planningReady: false,
      blockers: ['Roster conflict must be resolved.']
    })],
    weekOf: '2026-09-21',
    packetRegistry: { '3.1': verifiedPacket('3.1') },
    generatedAt: '2026-09-18T12:00:00.000Z'
  });

  assert.equal(queue.entries[0].status, 'blocked');
  assert.equal(queue.entries[0].entryConditionStatus, 'blocked');
  assert.deepEqual(queue.entries[0].blockers, ['Roster conflict must be resolved.']);
});

test('matching validated fingerprints let an unchanged entry be reused', () => {
  const fingerprint = 'sha256:' + 'a'.repeat(64);
  const queue = buildWeeklyQueue({
    snapshots: [snapshot({ groupId: 'Validated', substep: '5.5' })],
    weekOf: '2026-09-21',
    packetRegistry: { '5.5': verifiedPacket('5.5', '1.0.4') },
    validatedArtifacts: {
      'Validated:2026-09-21': {
        inputFingerprint: fingerprint,
        validatedFingerprint: fingerprint,
        runtimeRef: 'runtime:test',
        teacherPlanRef: 'teacher-plan:test',
        lastValidatedAt: '2026-09-18T12:00:00.000Z'
      }
    },
    generatedAt: '2026-09-18T12:00:00.000Z'
  });

  const entry = queue.entries[0];
  assert.equal(entry.status, 'validated');
  assert.equal(entry.runtimeRef, 'runtime:test');
  assert.equal(entry.validatedFingerprint, fingerprint);
});

test('queue tests use synthetic students only', () => {
  const source = snapshot.toString();
  for (const name of ['Oliver', 'Ethan', 'Alex', 'Finn', 'Maya', 'Enrique']) {
    assert.equal(source.includes(name), false);
  }
});
