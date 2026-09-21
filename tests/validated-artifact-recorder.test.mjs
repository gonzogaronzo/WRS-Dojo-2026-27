import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPlanningBundles } from '../scripts/wrs-build-planning-bundles.mjs';
import { buildWeeklyQueue } from '../scripts/wrs-build-weekly-queue.mjs';
import { recordValidatedArtifact } from '../scripts/wrs-record-validated-artifact.mjs';

const snapshot = {
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
};

const packet = {
  schemaVersion: 'wrs-substep-source-packet-v1',
  packetId: 'wrs-5.5-source-packet-v1',
  substep: '5.5',
  packetVersion: 'synthetic',
  verification: { status: 'verified', blockingIssues: [] }
};

const makeBundle = () => {
  const packetRegistry = {
    '5.5': {
      packetId: packet.packetId,
      packetVersion: packet.packetVersion,
      verified: true,
      path: 'synthetic',
      packet
    }
  };
  const queue = buildWeeklyQueue({
    snapshots: [snapshot],
    weekOf: '2026-09-21',
    packetRegistry,
    generatedAt: '2026-09-21T12:05:00.000Z'
  });
  return buildPlanningBundles({
    snapshots: [snapshot],
    queue,
    packetRegistry,
    generatedAt: '2026-09-21T12:05:00.000Z'
  })[0];
};

const finalReportFor = bundle => ({
  schemaVersion: 'wrs-lesson-orchestration-report-v1',
  status: 'PASS',
  resolvedTargetSubstep: '5.5',
  resolvedFocus: 'introduction',
  snapshotId: bundle.snapshot.snapshotId,
  packetId: bundle.sourcePacket.packetId,
  requestId: bundle.buildRequest.requestId,
  contractVersion: bundle.buildRequest.teacherPlanContractVersion,
  finalGate: true,
  issues: []
});

test('PASS final gate yields persistence-ready validated artifact metadata', () => {
  const bundle = makeBundle();
  const result = recordValidatedArtifact({
    bundle,
    orchestrationReport: finalReportFor(bundle),
    runtimeRef: 'runtime:synthetic',
    teacherPlanRef: 'teacher-plan:synthetic',
    validatedAt: '2026-09-21T13:00:00.000Z'
  });

  assert.equal(result.groupId, 'Synthetic');
  assert.equal(result.plannedDate, '2026-09-21');
  assert.equal(result.validatedArtifact.currentFingerprint, bundle.inputFingerprint);
  assert.equal(result.validatedArtifact.validatedFingerprint, bundle.inputFingerprint);
  assert.equal(result.validatedArtifact.runtimeRef, 'runtime:synthetic');
  assert.equal(result.validatedArtifact.teacherPlanRef, 'teacher-plan:synthetic');
});

test('preflight PASS cannot be persisted as final validation', () => {
  const bundle = makeBundle();
  const report = { ...finalReportFor(bundle), finalGate: false };
  assert.throws(
    () => recordValidatedArtifact({
      bundle,
      orchestrationReport: report,
      runtimeRef: 'runtime:synthetic',
      teacherPlanRef: 'teacher-plan:synthetic'
    }),
    /PASS final orchestration gate/i
  );
});

test('mismatched gate identity cannot validate another bundle', () => {
  const bundle = makeBundle();
  const report = { ...finalReportFor(bundle), requestId: 'another-request' };
  assert.throws(
    () => recordValidatedArtifact({
      bundle,
      orchestrationReport: report,
      runtimeRef: 'runtime:synthetic',
      teacherPlanRef: 'teacher-plan:synthetic'
    }),
    /requestId does not match/i
  );
});

test('changed bundle inputs cannot be persisted under a stale fingerprint', () => {
  const bundle = makeBundle();
  bundle.snapshot.groupTroubleSpots = ['New trouble spot'];
  assert.throws(
    () => recordValidatedArtifact({
      bundle,
      orchestrationReport: finalReportFor(bundle),
      runtimeRef: 'runtime:synthetic',
      teacherPlanRef: 'teacher-plan:synthetic'
    }),
    /fingerprint does not match/i
  );
});

test('validated artifact recorder tests use synthetic students only', () => {
  const source = JSON.stringify(snapshot);
  for (const name of ['Oliver', 'Ethan', 'Alex', 'Finn', 'Maya', 'Enrique', 'Levi', 'Nora', 'Eleanor', 'Alice', 'Izzy', 'Juliana', 'Carolyn', 'Elise', 'Charlotte', 'Bennett', 'Ben', 'Xavier', 'Uffarren']) {
    assert.equal(source.includes(name), false);
  }
});
