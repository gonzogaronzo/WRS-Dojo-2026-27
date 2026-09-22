#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { computeLessonBuildFingerprint } from './wrs-lesson-build-fingerprint.mjs';

const BUNDLE_VERSION = 'wrs-planning-bundle-v1';
const ORCHESTRATION_REPORT_VERSION = 'wrs-lesson-orchestration-report-v1';
const FINGERPRINT = /^sha256:[a-f0-9]{64}$/;

const text = value => value == null ? '' : String(value).trim();
const readJson = filePath => JSON.parse(fs.readFileSync(filePath, 'utf8'));

export function recordValidatedArtifact({
  bundle,
  orchestrationReport,
  runtimeRef = null,
  teacherPlanRef = null,
  validatedAt = new Date().toISOString()
}) {
  if (bundle?.schemaVersion !== BUNDLE_VERSION) {
    throw new Error(`bundle must use ${BUNDLE_VERSION}.`);
  }
  if (bundle.status === 'blocked' || (Array.isArray(bundle.blockers) && bundle.blockers.length)) {
    throw new Error('Blocked planning bundles cannot be recorded as validated.');
  }
  if (!bundle.snapshot || !bundle.sourcePacket || !bundle.buildRequest) {
    throw new Error('Planning bundle is missing snapshot, source packet, or build request.');
  }
  if (orchestrationReport?.schemaVersion !== ORCHESTRATION_REPORT_VERSION) {
    throw new Error(`orchestrationReport must use ${ORCHESTRATION_REPORT_VERSION}.`);
  }
  if (orchestrationReport.status !== 'PASS' || orchestrationReport.finalGate !== true) {
    throw new Error('Only a PASS final orchestration gate may create validated artifact metadata.');
  }

  const expected = {
    snapshotId: text(bundle.snapshot.snapshotId),
    packetId: text(bundle.sourcePacket.packetId),
    requestId: text(bundle.buildRequest.requestId),
    contractVersion: text(bundle.buildRequest.teacherPlanContractVersion)
  };
  for (const [key, value] of Object.entries(expected)) {
    if (!value || text(orchestrationReport[key]) !== value) {
      throw new Error(`Final orchestration report ${key} does not match the planning bundle.`);
    }
  }

  const freshFingerprint = computeLessonBuildFingerprint({
    snapshot: bundle.snapshot,
    packet: bundle.sourcePacket,
    request: bundle.buildRequest,
    selectionHistory: bundle.selectionHistory ?? null
  });
  if (!FINGERPRINT.test(text(bundle.inputFingerprint))
    || text(bundle.inputFingerprint) !== freshFingerprint) {
    throw new Error('Planning bundle fingerprint does not match its substantive inputs.');
  }

  if (!text(runtimeRef) || !text(teacherPlanRef)) {
    throw new Error('runtimeRef and teacherPlanRef are required after final validation.');
  }
  if (!text(bundle.groupId) || !/^\d{4}-\d{2}-\d{2}$/.test(text(bundle.plannedDate))) {
    throw new Error('Planning bundle groupId/plannedDate are invalid.');
  }
  if (!validatedAt || Number.isNaN(Date.parse(validatedAt))) {
    throw new Error('validatedAt must be an ISO date-time.');
  }

  return {
    groupId: text(bundle.groupId),
    plannedDate: text(bundle.plannedDate),
    validatedArtifact: {
      currentFingerprint: freshFingerprint,
      validatedFingerprint: freshFingerprint,
      runtimeRef: text(runtimeRef),
      teacherPlanRef: text(teacherPlanRef),
      lastValidatedAt: validatedAt
    }
  };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${key}`);
    options[key] = value;
    index += 1;
  }
  return options;
}

function usage() {
  return [
    'Usage:',
    '  node scripts/wrs-record-validated-artifact.mjs --bundle GROUP.planning-bundle.json --orchestration-report FINAL-GATE.json --runtime-ref REF --teacher-plan-ref REF [--out metadata.json]',
    '',
    'The command emits only persistence-ready validated-artifact metadata after a PASS final gate. It does not persist anything by itself.'
  ].join('\n');
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  for (const required of ['bundle', 'orchestration-report', 'runtime-ref', 'teacher-plan-ref']) {
    if (!options[required]) throw new Error(`${usage()}\n\nMissing --${required}.`);
  }

  const result = recordValidatedArtifact({
    bundle: readJson(options.bundle),
    orchestrationReport: readJson(options['orchestration-report']),
    runtimeRef: options['runtime-ref'],
    teacherPlanRef: options['teacher-plan-ref']
  });

  const rendered = `${JSON.stringify(result, null, 2)}\n`;
  if (options.out) {
    fs.mkdirSync(path.dirname(path.resolve(options.out)), { recursive: true });
    fs.writeFileSync(options.out, rendered, 'utf8');
  }
  process.stdout.write(rendered);
  return result;
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
