import assert from 'node:assert/strict';
import test from 'node:test';

import { computeLessonBuildFingerprint } from '../scripts/wrs-lesson-build-fingerprint.mjs';

const base = () => ({
  snapshot: {
    schemaVersion: 'wrs-group-planning-snapshot-v1',
    snapshotId: 'volatile-id-a',
    generatedAt: '2026-09-17T12:00:00-05:00',
    asOf: '2026-09-17',
    group: { groupId: 'synthetic', roster: ['Student A'] },
    advancement: { status: 'continue', currentSubstep: '5.5' }
  },
  packet: {
    schemaVersion: 'wrs-substep-source-packet-v1',
    packetId: 'wrs-5.5-source-packet-v1',
    packetVersion: '1.0.4',
    verifiedAt: '2026-09-17T12:00:00-05:00',
    substep: '5.5',
    verification: { status: 'verified' }
  },
  request: {
    schemaVersion: 'wrs-lesson-build-request-v1',
    requestId: 'volatile-request-a',
    createdAt: '2026-09-17T12:00:00-05:00',
    groupSnapshotRef: 'volatile-snapshot-ref',
    sourcePacketRef: 'volatile-packet-ref',
    selectionHistoryRef: 'volatile-history-ref',
    plannedDate: '2026-09-18',
    lessonRoute: 'full',
    protocolVersion: '2026-09-17',
    teacherPlanContractVersion: 'wrs-teacher-plan-contract-v2',
    runtimeSchemaVersion: 'wrs-runtime-v1',
    teacherDecisions: { focus: 'introduction', advancementOverride: 'none' }
  },
  selectionHistory: { passages: ['synthetic-passage-1'] }
});

test('fingerprint ignores purely volatile generation identifiers and timestamps', () => {
  const first = base();
  const second = base();
  second.snapshot.snapshotId = 'volatile-id-b';
  second.snapshot.generatedAt = '2026-09-17T14:00:00-05:00';
  second.packet.verifiedAt = '2026-09-17T14:00:00-05:00';
  second.request.requestId = 'volatile-request-b';
  second.request.createdAt = '2026-09-17T14:00:00-05:00';
  second.request.groupSnapshotRef = 'another-ref';
  second.request.sourcePacketRef = 'another-packet-ref';
  second.request.selectionHistoryRef = 'another-history-ref';
  assert.equal(computeLessonBuildFingerprint(first), computeLessonBuildFingerprint(second));
});

test('fingerprint changes when instructional state changes', () => {
  const first = base();
  const second = base();
  second.snapshot.advancement.status = 'ready-pending-completion';
  assert.notEqual(computeLessonBuildFingerprint(first), computeLessonBuildFingerprint(second));
});

test('fingerprint changes when source packet version changes', () => {
  const first = base();
  const second = base();
  second.packet.packetVersion = '1.0.5';
  assert.notEqual(computeLessonBuildFingerprint(first), computeLessonBuildFingerprint(second));
});

test('fingerprint changes when selection history changes', () => {
  const first = base();
  const second = base();
  second.selectionHistory.passages.push('synthetic-passage-2');
  assert.notEqual(computeLessonBuildFingerprint(first), computeLessonBuildFingerprint(second));
});

test('fingerprint changes when the planned date changes because rendered teacher output changes', () => {
  const first = base();
  const second = base();
  second.request.plannedDate = '2026-09-19';
  assert.notEqual(computeLessonBuildFingerprint(first), computeLessonBuildFingerprint(second));
});
