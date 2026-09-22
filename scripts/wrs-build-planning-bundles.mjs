#!/usr/bin/env node

import { computeLessonBuildFingerprint } from './wrs-lesson-build-fingerprint.mjs';
import { buildQueueFingerprintRequest, resolveQueueTarget } from './wrs-build-weekly-queue.mjs';

const SCHOOL_YEAR = '2026-27';
const BUNDLE_VERSION = 'wrs-planning-bundle-v1';

const text = value => value == null ? '' : String(value).trim();

const packetForEntry = (packetRegistry, substep) => {
  const entry = packetRegistry?.[substep];
  return entry?.packet && typeof entry.packet === 'object' && !Array.isArray(entry.packet)
    ? entry.packet
    : null;
};

export function buildPlanningBundles({
  snapshots,
  queue,
  packetRegistry = {},
  selectionHistories = {},
  generatedAt = new Date().toISOString()
}) {
  if (!Array.isArray(snapshots)) throw new Error('snapshots must be an array.');
  if (!queue || !Array.isArray(queue.entries)) throw new Error('queue.entries must be an array.');

  const byGroup = new Map(
    snapshots
      .map(snapshot => [text(snapshot?.group?.groupId), snapshot])
      .filter(([groupId]) => groupId)
  );

  return queue.entries.map(entry => {
    const groupId = text(entry?.groupId);
    const snapshot = byGroup.get(groupId);
    if (!snapshot) {
      return {
        schemaVersion: BUNDLE_VERSION,
        schoolYear: SCHOOL_YEAR,
        generatedAt,
        groupId,
        plannedDate: text(entry?.plannedDate),
        status: 'blocked',
        blockers: ['Matching Planning Snapshot is missing.']
      };
    }

    const target = resolveQueueTarget(snapshot);
    const packet = packetForEntry(packetRegistry, target.substep);
    const selectionHistory = selectionHistories?.[groupId] ?? null;
    const blockers = Array.isArray(entry?.blockers) ? [...entry.blockers] : [];

    if (entry?.status === 'assessment-only') {
      return {
        schemaVersion: BUNDLE_VERSION,
        schoolYear: SCHOOL_YEAR,
        generatedAt,
        groupId,
        plannedDate: text(entry?.plannedDate),
        status: 'assessment-only',
        blockers: [],
        queueEntry: entry,
        snapshot
      };
    }

    if (!packet) {
      blockers.push(`Full source packet content is unavailable for Substep ${target.substep || 'unresolved'}.`);
    }

    if (blockers.length) {
      return {
        schemaVersion: BUNDLE_VERSION,
        schoolYear: SCHOOL_YEAR,
        generatedAt,
        groupId,
        plannedDate: text(entry?.plannedDate),
        status: 'blocked',
        blockers
      };
    }

    const request = buildQueueFingerprintRequest({
      groupId,
      plannedDate: text(entry.plannedDate),
      targetSubstep: target.substep,
      route: text(entry.lessonRoute),
      snapshot,
      packet,
      createdAt: generatedAt
    });
    const fingerprint = computeLessonBuildFingerprint({
      snapshot,
      packet,
      request,
      selectionHistory
    });

    if (text(entry.inputFingerprint) && text(entry.inputFingerprint) !== fingerprint) {
      throw new Error(`Queue/bundle fingerprint mismatch for ${groupId}.`);
    }

    return {
      schemaVersion: BUNDLE_VERSION,
      schoolYear: SCHOOL_YEAR,
      generatedAt,
      groupId,
      plannedDate: text(entry.plannedDate),
      status: entry.status,
      blockers: [],
      inputFingerprint: fingerprint,
      queueEntry: entry,
      snapshot,
      sourcePacket: packet,
      selectionHistory,
      buildRequest: request
    };
  });
}
