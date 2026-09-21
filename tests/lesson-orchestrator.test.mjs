import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { computeLessonBuildFingerprint } from '../scripts/wrs-lesson-build-fingerprint.mjs';
import { runBundlePreflight, runPreflight, validatePlanningBundle, validateSourcePacket } from '../scripts/wrs-lesson-orchestrator.mjs';

const makeSnapshot = () => ({
  schemaVersion: 'wrs-group-planning-snapshot-v1',
  snapshotId: 'synthetic-group-2026-09-17',
  schoolYear: '2026-27',
  generatedAt: '2026-09-17T12:00:00-05:00',
  asOf: '2026-09-17',
  group: {
    groupId: 'synthetic-group',
    displayName: 'Synthetic Group',
    schedule: '8:00-8:45',
    roster: ['Student A', 'Student B']
  },
  students: [
    {
      studentId: 'synthetic-a',
      name: 'Student A',
      officialPlacement: { substep: '5.4', status: 'official', sourceRef: 'state-1' },
      instructionalTarget: { substep: '5.4', relationshipToPlacement: 'current', sourceRef: 'state-1' },
      lessonFocus: 'accuracy',
      latestData: { realWordCharting: 'synthetic only' },
      troubleSpots: ['synthetic trouble spot'],
      recommendedInstructionalResponse: ['synthetic response']
    },
    {
      studentId: 'synthetic-b',
      name: 'Student B',
      officialPlacement: { substep: '5.4', status: 'official', sourceRef: 'state-1' },
      instructionalTarget: { substep: '5.4', relationshipToPlacement: 'current', sourceRef: 'state-1' },
      lessonFocus: 'accuracy',
      latestData: { realWordCharting: 'synthetic only' },
      troubleSpots: [],
      recommendedInstructionalResponse: []
    }
  ],
  lessonContinuity: {
    lastInstructionDate: '2026-09-17',
    lastSubstep: '5.4',
    partsCompleted: [1, 2, 3, 4, 5, 6, 7],
    unfinishedWork: ['Finish Part 8 sentences.'],
    passageHistory: [],
    selectionHistoryRef: 'synthetic-history'
  },
  groupTroubleSpots: ['synthetic trouble spot'],
  materialsAndFollowUps: [],
  advancement: {
    status: 'ready-pending-completion',
    currentSubstep: '5.4',
    nextSubstep: '5.5',
    condition: 'Finish remaining current-substep dictation.',
    authorityRef: 'state-1'
  },
  unresolvedConflicts: [],
  stateSources: [
    {
      sourceRef: 'state-1',
      kind: 'explicit-teacher-report',
      date: '2026-09-17',
      authorityRank: 1,
      locator: 'synthetic-test-only'
    }
  ],
  planningReady: true,
  planningBlockers: []
});

const makePacket = () => ({
  schemaVersion: 'wrs-substep-source-packet-v1',
  packetId: 'synthetic-5.5-packet',
  substep: '5.5',
  curriculumRelease: 'SYNTHETIC-RELEASE',
  packetVersion: '1.0.0',
  verifiedAt: '2026-09-17T12:00:00-05:00',
  authority: [
    {
      sourceId: 'SI-SYNTHETIC',
      kind: 'step-instruction',
      label: 'Synthetic Step Instruction',
      edition: 'synthetic',
      locator: 'synthetic://5.5',
      priority: 1,
      verificationStatus: 'visual-verified'
    }
  ],
  currentConcept: [
    { contentId: 'concept', sourceId: 'SI-SYNTHETIC', locator: 'synthetic://5.5/concept', verificationStatus: 'verified' }
  ],
  sourceOrderedTeachingSequence: [],
  cumulativeEligibility: {
    throughSubstep: '5.5',
    soundInventoryRefs: [],
    wordElementRefs: [],
    hfwRefs: [],
    reviewPoolRefs: []
  },
  partInputs: Object.fromEntries(Array.from({ length: 10 }, (_, offset) => {
    const part = offset + 1;
    return [String(part), {
      status: part === 10 ? 'tbd' : 'ready',
      contentRefs: part === 10 ? [] : [
        {
          contentId: `part-${part}`,
          sourceId: 'SI-SYNTHETIC',
          locator: `synthetic://5.5/part-${part}`,
          verificationStatus: 'verified'
        }
      ],
      selectionRules: []
    }];
  })),
  notebook: [],
  verification: {
    status: 'verified',
    verifiedBy: 'synthetic-test',
    sourceReleaseId: 'SYNTHETIC-RELEASE',
    blockingIssues: []
  }
});

const makeRequest = () => ({
  schemaVersion: 'wrs-lesson-build-request-v1',
  requestId: 'synthetic-request',
  createdAt: '2026-09-17T12:00:00-05:00',
  groupSnapshotRef: 'synthetic-group-2026-09-17',
  sourcePacketRef: 'synthetic-5.5-packet',
  selectionHistoryRef: 'synthetic-history',
  protocolVersion: '2026-09-17',
  teacherPlanContractVersion: 'wrs-teacher-plan-contract-v2',
  runtimeSchemaVersion: 'wrs-runtime-v1',
  plannedDate: '2026-09-18',
  lessonRoute: 'full',
  teacherDecisions: {
    focus: 'introduction',
    advancementOverride: 'advance',
    notes: 'Conditional build: run only after the remaining 5.4 dictation is completed.'
  }
});

const makeRuntime = () => ({
  schemaVersion: 'wrs-runtime-v1',
  id: 'synthetic-runtime',
  title: 'Synthetic runtime',
  step: '5',
  substep: '5',
  focus: 'introduction',
  lessonPath: 'full',
  plannedParts: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  planningContext: { conceptsToWeave: 'synthetic', troubleSpots: 'synthetic' },
  sources: [
    {
      id: 'SI-SYNTHETIC',
      kind: 'step-instruction',
      label: 'Synthetic Step Instruction',
      locator: 'synthetic://5.5',
      verification: 'verified'
    }
  ],
  parts: Array.from({ length: 10 }, (_, offset) => ({
    part: offset + 1,
    title: `Part ${offset + 1}`,
    sourceIds: offset + 1 === 10 ? [] : ['SI-SYNTHETIC'],
    teacherDirections: [],
    data: {}
  }))
});

const makeBundle = () => {
  const snapshot = makeSnapshot();
  const packet = makePacket();
  const request = makeRequest();
  const selectionHistory = {
    schemaVersion: 'wrs-group-selection-history-v1',
    schoolYear: '2026-27',
    groupId: 'synthetic-group',
    updatedAt: '2026-09-17T12:00:00-05:00',
    lessons: []
  };
  return {
    schemaVersion: 'wrs-planning-bundle-v1',
    schoolYear: '2026-27',
    generatedAt: '2026-09-17T12:00:00-05:00',
    groupId: 'synthetic-group',
    plannedDate: '2026-09-18',
    status: 'awaiting-condition',
    blockers: [],
    inputFingerprint: computeLessonBuildFingerprint({
      snapshot,
      packet,
      request,
      selectionHistory
    }),
    queueEntry: {
      groupId: 'synthetic-group',
      plannedDate: '2026-09-18',
      status: 'awaiting-condition'
    },
    snapshot,
    sourcePacket: packet,
    selectionHistory,
    buildRequest: request
  };
};

const passingContract = {
  contractVersion: 'wrs-teacher-plan-contract-v2',
  ok: true,
  issues: []
};

const passingCompatibility = {
  gateVersion: 'synthetic-runtime-compatibility-v1',
  ok: true,
  issues: []
};

test('single planning bundle passes orchestration preflight without reconstructing split inputs', () => {
  const bundle = makeBundle();
  const result = runBundlePreflight({ bundle });
  assert.equal(result.status, 'PASS');
  assert.equal(result.resolvedTargetSubstep, '5.5');
  assert.equal(result.inputFingerprint, bundle.inputFingerprint);
});

test('single planning bundle passes the final gate with matching reports', () => {
  const bundle = makeBundle();
  const result = runBundlePreflight({
    bundle,
    runtime: makeRuntime(),
    contractReport: passingContract,
    compatibilityReport: passingCompatibility,
    finalGate: true
  });
  assert.equal(result.status, 'PASS');
  assert.equal(result.finalGate, true);
});

test('stale planning bundle fingerprint fails closed before generation', () => {
  const bundle = makeBundle();
  bundle.snapshot.groupTroubleSpots.push('Synthetic newly observed issue');
  const issues = validatePlanningBundle(bundle);
  assert.ok(issues.some(item => item.code === 'bundle_fingerprint_mismatch'));

  const result = runBundlePreflight({ bundle });
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.issues.some(item => item.code === 'bundle_fingerprint_mismatch'));
});

test('blocked planning bundle cannot pass orchestration', () => {
  const bundle = makeBundle();
  bundle.status = 'blocked';
  bundle.blockers = ['Synthetic unresolved state conflict.'];
  const result = runBundlePreflight({ bundle });
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.issues.some(item => item.code === 'bundle_blocked'));
});

test('conditional next-Substep preflight passes when teacher advance authority and verified packet agree', () => {
  const result = runPreflight({
    snapshot: makeSnapshot(),
    packet: makePacket(),
    request: makeRequest()
  });
  assert.equal(result.status, 'PASS');
  assert.equal(result.resolvedTargetSubstep, '5.5');
  assert.equal(result.resolvedFocus, 'introduction');
});

test('final gate requires both the active teacher-plan contract and runtime compatibility PASS reports', () => {
  const result = runPreflight({
    snapshot: makeSnapshot(),
    packet: makePacket(),
    request: makeRequest(),
    runtime: makeRuntime(),
    contractReport: passingContract,
    compatibilityReport: passingCompatibility,
    finalGate: true
  });
  assert.equal(result.status, 'PASS');
});

test('blocking state conflict fails closed before source selection', () => {
  const snapshot = makeSnapshot();
  snapshot.unresolvedConflicts.push({
    conflictId: 'synthetic-conflict',
    severity: 'blocking',
    description: 'Synthetic conflict',
    sources: ['state-1', 'state-2'],
    blocksPlanning: true
  });
  const result = runPreflight({ snapshot, packet: makePacket(), request: makeRequest() });
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.issues.some(item => item.code === 'snapshot_blocking_conflict'));
});

test('mismatched source packet fails closed', () => {
  const packet = makePacket();
  packet.substep = '5.4';
  const result = runPreflight({ snapshot: makeSnapshot(), packet, request: makeRequest() });
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.issues.some(item => item.code === 'request_packet_substep_mismatch'));
});

test('unverified or partial source material fails closed', () => {
  const packet = makePacket();
  packet.verification.status = 'partial';
  packet.partInputs['7'].status = 'partial';
  const result = runPreflight({ snapshot: makeSnapshot(), packet, request: makeRequest() });
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.issues.some(item => item.code === 'packet_not_verified'));
  assert.ok(result.issues.some(item => item.code === 'packet_part_not_ready'));
});

test('runtime mismatch and absent final gate reports cannot be presented as complete', () => {
  const runtime = makeRuntime();
  runtime.substep = '4';
  const result = runPreflight({
    snapshot: makeSnapshot(),
    packet: makePacket(),
    request: makeRequest(),
    runtime,
    finalGate: true
  });
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.issues.some(item => item.code === 'runtime_substep_mismatch'));
  assert.ok(result.issues.some(item => item.code === 'contract_report_missing'));
  assert.ok(result.issues.some(item => item.code === 'compatibility_report_missing'));
});

test('real 5.5 source packet is accepted by the orchestration source gate', () => {
  const packet = JSON.parse(fs.readFileSync(new URL('../curriculum/source-packets/5.5.v1.json', import.meta.url), 'utf8'));
  const issues = validateSourcePacket(packet);
  assert.deepEqual(issues, []);
});

test('real 3.1 source packet is accepted by the orchestration source gate', () => {
  const packet = JSON.parse(fs.readFileSync(new URL('../curriculum/source-packets/3.1.v1.json', import.meta.url), 'utf8'));
  const issues = validateSourcePacket(packet);
  assert.deepEqual(issues, []);
});

test('real 5.2 source packet is accepted by the orchestration source gate', () => {
  const packet = JSON.parse(fs.readFileSync(new URL('../curriculum/source-packets/5.2.v1.json', import.meta.url), 'utf8'));
  const issues = validateSourcePacket(packet);
  assert.deepEqual(issues, []);
});

test('real 1.6 source packet is accepted by the orchestration source gate', () => {
  const packet = JSON.parse(fs.readFileSync(new URL('../curriculum/source-packets/1.6.v1.json', import.meta.url), 'utf8'));
  const issues = validateSourcePacket(packet);
  assert.deepEqual(issues, []);
});

test('real 2.5 source packet is accepted by the orchestration source gate', () => {
  const packet = JSON.parse(fs.readFileSync(new URL('../curriculum/source-packets/2.5.v1.json', import.meta.url), 'utf8'));
  const issues = validateSourcePacket(packet);
  assert.deepEqual(issues, []);
});

test('real 7.5 source packet is accepted by the orchestration source gate', () => {
  const packet = JSON.parse(fs.readFileSync(new URL('../curriculum/source-packets/7.5.v1.json', import.meta.url), 'utf8'));
  const issues = validateSourcePacket(packet);
  assert.deepEqual(issues, []);
});

test('real student data are not embedded in orchestration regression fixtures', () => {
  const serialized = JSON.stringify({ makeSnapshot: makeSnapshot(), makePacket: makePacket(), makeRequest: makeRequest() });
  for (const forbidden of ['Oliver', 'Ethan', 'Alex', 'Finn', 'Maya', 'Enrique']) {
    assert.equal(serialized.includes(forbidden), false);
  }
});