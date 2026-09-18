#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SNAPSHOT_VERSION = 'wrs-group-planning-snapshot-v1';
const PACKET_VERSION = 'wrs-substep-source-packet-v1';
const REQUEST_VERSION = 'wrs-lesson-build-request-v1';
const RUNTIME_VERSION = 'wrs-runtime-v1';
const SCHOOL_YEAR = '2026-27';
const CONTRACT_RE = /^wrs-teacher-plan-contract-v\d+$/;
const FOCI = new Set(['introduction', 'accuracy', 'automaticity-fluency']);
const ROUTES = new Set(['full', 'block1+3', 'block2+3', 'continuation']);

const text = value => typeof value === 'string' ? value.trim() : '';
const strings = value => Array.isArray(value)
  ? value.map(item => text(item)).filter(Boolean)
  : [];
const objects = value => Array.isArray(value)
  ? value.filter(item => item && typeof item === 'object' && !Array.isArray(item))
  : [];

const issue = (code, message, gate = 'orchestration') => ({ code, message, gate });

const readJson = filePath => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot read JSON ${filePath}: ${reason}`);
  }
};

const sameMembers = (left, right) => {
  const a = [...new Set(strings(left))].sort();
  const b = [...new Set(strings(right))].sort();
  return a.length === b.length && a.every((item, index) => item === b[index]);
};

export function resolveTargetSubstep(snapshot, request) {
  const advancement = snapshot?.advancement ?? {};
  const current = text(advancement.currentSubstep)
    || text(snapshot?.students?.[0]?.instructionalTarget?.substep);
  const next = text(advancement.nextSubstep);
  const override = text(request?.teacherDecisions?.advancementOverride) || 'none';

  if (advancement.status === 'teacher-confirmed-advance') {
    return next || current;
  }

  if (advancement.status === 'ready-pending-completion' && override === 'advance') {
    return next || current;
  }

  return current;
}

export function resolveFocus(snapshot, request) {
  const requested = text(request?.teacherDecisions?.focus);
  if (requested && requested !== 'use-snapshot') return requested;
  const focuses = [...new Set(objects(snapshot?.students).map(student => text(student.lessonFocus)).filter(Boolean))];
  return focuses.length === 1 ? focuses[0] : null;
}

export function validatePlanningSnapshot(snapshot) {
  const issues = [];
  if (snapshot?.schemaVersion !== SNAPSHOT_VERSION) {
    issues.push(issue('snapshot_schema_version', `Expected ${SNAPSHOT_VERSION}.`, 'snapshot'));
  }
  if (snapshot?.schoolYear !== SCHOOL_YEAR) {
    issues.push(issue('snapshot_school_year', `Planning snapshot must be for ${SCHOOL_YEAR}.`, 'snapshot'));
  }
  if (!text(snapshot?.snapshotId)) issues.push(issue('snapshot_id_missing', 'Snapshot ID is required.', 'snapshot'));
  if (!text(snapshot?.asOf)) issues.push(issue('snapshot_date_missing', 'Snapshot as-of date is required.', 'snapshot'));

  const roster = strings(snapshot?.group?.roster);
  const students = objects(snapshot?.students);
  const studentNames = students.map(student => text(student.name)).filter(Boolean);
  if (!roster.length) issues.push(issue('snapshot_roster_missing', 'Group roster is empty.', 'snapshot'));
  if (!students.length) issues.push(issue('snapshot_students_missing', 'Snapshot has no students.', 'snapshot'));
  if (roster.length && studentNames.length && !sameMembers(roster, studentNames)) {
    issues.push(issue('snapshot_roster_student_mismatch', 'Group roster and snapshot student names do not match exactly.', 'snapshot'));
  }

  const stateSources = objects(snapshot?.stateSources);
  if (!stateSources.length) {
    issues.push(issue('snapshot_state_sources_missing', 'At least one state source is required.', 'snapshot'));
  }
  for (const source of stateSources) {
    const rank = Number(source.authorityRank);
    if (!text(source.sourceRef) || !text(source.kind) || !text(source.date) || !text(source.locator)) {
      issues.push(issue('snapshot_state_source_incomplete', 'Every state source needs sourceRef, kind, date, and locator.', 'snapshot'));
    }
    if (!Number.isInteger(rank) || rank < 1 || rank > 5) {
      issues.push(issue('snapshot_state_source_rank_invalid', 'State-source authorityRank must be an integer from 1 through 5.', 'snapshot'));
    }
  }

  const blockingConflicts = objects(snapshot?.unresolvedConflicts)
    .filter(conflict => conflict.blocksPlanning === true || conflict.severity === 'blocking');
  if (blockingConflicts.length) {
    issues.push(issue(
      'snapshot_blocking_conflict',
      `Snapshot has ${blockingConflicts.length} unresolved blocking conflict(s).`,
      'snapshot'
    ));
  }

  if (snapshot?.planningReady !== true) {
    const blockers = strings(snapshot?.planningBlockers);
    issues.push(issue(
      'snapshot_not_planning_ready',
      blockers.length ? `Planning is blocked: ${blockers.join('; ')}` : 'Snapshot is not planning-ready.',
      'snapshot'
    ));
  }

  const advancement = snapshot?.advancement ?? {};
  if (!['continue', 'ready-pending-completion', 'teacher-confirmed-advance', 'unresolved'].includes(advancement.status)) {
    issues.push(issue('snapshot_advancement_status_invalid', 'Snapshot advancement status is invalid or missing.', 'snapshot'));
  }
  if (!text(advancement.currentSubstep)) {
    issues.push(issue('snapshot_current_substep_missing', 'Snapshot advancement record must identify currentSubstep.', 'snapshot'));
  }
  if (advancement.status === 'ready-pending-completion' && !text(advancement.nextSubstep)) {
    issues.push(issue('snapshot_next_substep_missing', 'Ready-pending-completion requires nextSubstep.', 'snapshot'));
  }
  if (advancement.status === 'ready-pending-completion' && !text(advancement.condition)) {
    issues.push(issue('snapshot_advancement_condition_missing', 'Ready-pending-completion requires an explicit completion condition.', 'snapshot'));
  }

  return issues;
}

export function validateSourcePacket(packet) {
  const issues = [];
  if (packet?.schemaVersion !== PACKET_VERSION) {
    issues.push(issue('packet_schema_version', `Expected ${PACKET_VERSION}.`, 'source-packet'));
  }
  if (!text(packet?.packetId)) issues.push(issue('packet_id_missing', 'Source packet ID is required.', 'source-packet'));
  if (!/^\d+\.\d+$/.test(text(packet?.substep))) {
    issues.push(issue('packet_substep_invalid', 'Source packet must identify a Step/Substep such as 5.5.', 'source-packet'));
  }
  if (!text(packet?.curriculumRelease)) {
    issues.push(issue('packet_release_missing', 'Source packet must identify its curriculum release.', 'source-packet'));
  }

  const verification = packet?.verification ?? {};
  if (verification.status !== 'verified') {
    issues.push(issue('packet_not_verified', `Source packet verification is ${verification.status || 'missing'}, not verified.`, 'source-packet'));
  }
  const blockingIssues = strings(verification.blockingIssues);
  if (blockingIssues.length) {
    issues.push(issue('packet_blocking_issues', `Source packet has blocking issues: ${blockingIssues.join('; ')}`, 'source-packet'));
  }

  const authorities = objects(packet?.authority);
  if (!authorities.length) {
    issues.push(issue('packet_authority_missing', 'Source packet has no authority records.', 'source-packet'));
  }
  const authorityIds = new Set();
  for (const source of authorities) {
    const id = text(source.sourceId);
    if (!id || !text(source.kind) || !text(source.label) || !text(source.locator)) {
      issues.push(issue('packet_authority_incomplete', 'Every source authority needs sourceId, kind, label, and locator.', 'source-packet'));
    }
    if (id) authorityIds.add(id);
    if (!['visual-verified', 'searchable-companion'].includes(source.verificationStatus)) {
      issues.push(issue(
        'packet_authority_unverified',
        `Authority ${id || '(unnamed)'} is ${source.verificationStatus || 'unverified'}.`,
        'source-packet'
      ));
    }
  }

  const partInputs = packet?.partInputs ?? {};
  for (let part = 1; part <= 9; part += 1) {
    const entry = partInputs[String(part)];
    if (!entry || entry.status !== 'ready') {
      issues.push(issue(
        'packet_part_not_ready',
        `Part ${part} must be ready before a complete runtime can be built; found ${entry?.status || 'missing'}.`,
        'source-packet'
      ));
      continue;
    }
    for (const ref of objects(entry.contentRefs)) {
      if (!authorityIds.has(text(ref.sourceId))) {
        issues.push(issue(
          'packet_content_source_unregistered',
          `Part ${part} contentRef ${text(ref.contentId) || '(unnamed)'} cites an unregistered sourceId.`,
          'source-packet'
        ));
      }
      if (ref.verificationStatus !== 'verified') {
        issues.push(issue(
          'packet_content_unverified',
          `Part ${part} contentRef ${text(ref.contentId) || '(unnamed)'} is not verified.`,
          'source-packet'
        ));
      }
    }
  }

  const part10 = partInputs['10'];
  if (!part10 || !['ready', 'tbd'].includes(part10.status)) {
    issues.push(issue('packet_part10_invalid', 'Part 10 must be ready or explicitly TBD.', 'source-packet'));
  }

  return issues;
}

export function validateBuildRequest(request, snapshot, packet) {
  const issues = [];
  if (request?.schemaVersion !== REQUEST_VERSION) {
    issues.push(issue('request_schema_version', `Expected ${REQUEST_VERSION}.`, 'build-request'));
  }
  if (!text(request?.requestId)) issues.push(issue('request_id_missing', 'Build request ID is required.', 'build-request'));
  if (text(request?.groupSnapshotRef) !== text(snapshot?.snapshotId)) {
    issues.push(issue('request_snapshot_ref_mismatch', 'Build request groupSnapshotRef does not match the supplied snapshot.', 'build-request'));
  }
  if (text(request?.sourcePacketRef) !== text(packet?.packetId)) {
    issues.push(issue('request_packet_ref_mismatch', 'Build request sourcePacketRef does not match the supplied source packet.', 'build-request'));
  }
  if (request?.runtimeSchemaVersion !== RUNTIME_VERSION) {
    issues.push(issue('request_runtime_version', `Build request must target ${RUNTIME_VERSION}.`, 'build-request'));
  }
  if (!CONTRACT_RE.test(text(request?.teacherPlanContractVersion))) {
    issues.push(issue('request_contract_version', 'Build request must name a versioned wrs-teacher-plan-contract-vN contract.', 'build-request'));
  }
  if (!ROUTES.has(text(request?.lessonRoute))) {
    issues.push(issue('request_route_invalid', 'Build request lessonRoute is invalid.', 'build-request'));
  }
  const focus = resolveFocus(snapshot, request);
  if (!focus || !FOCI.has(focus)) {
    issues.push(issue('request_focus_unresolved', 'Lesson focus cannot be resolved to Introduction, Accuracy, or Automaticity/Fluency.', 'build-request'));
  }

  const targetSubstep = resolveTargetSubstep(snapshot, request);
  if (!targetSubstep) {
    issues.push(issue('request_target_unresolved', 'Target Substep cannot be resolved from the current state.', 'build-request'));
  } else if (targetSubstep !== text(packet?.substep)) {
    issues.push(issue(
      'request_packet_substep_mismatch',
      `Resolved target Substep is ${targetSubstep}, but source packet is ${text(packet?.substep) || 'missing'}.`,
      'build-request'
    ));
  }

  const advancement = snapshot?.advancement ?? {};
  const override = text(request?.teacherDecisions?.advancementOverride) || 'none';
  if (override === 'advance' && !['ready-pending-completion', 'teacher-confirmed-advance'].includes(advancement.status)) {
    issues.push(issue(
      'request_advance_without_authority',
      'Advance override is allowed only when the snapshot records ready-pending-completion or teacher-confirmed-advance.',
      'build-request'
    ));
  }
  if (advancement.status === 'ready-pending-completion' && override === 'advance' && !text(request?.teacherDecisions?.notes)) {
    issues.push(issue(
      'request_conditional_advance_note_missing',
      'A conditional advance build must preserve the teacher completion condition in teacherDecisions.notes.',
      'build-request'
    ));
  }

  return issues;
}

export function validateRuntime(runtime, snapshot, packet, request) {
  const issues = [];
  if (runtime?.schemaVersion !== RUNTIME_VERSION) {
    issues.push(issue('runtime_schema_version', `Runtime must use ${RUNTIME_VERSION}.`, 'runtime'));
  }
  const targetSubstep = resolveTargetSubstep(snapshot, request);
  const runtimeSubstep = text(runtime?.substep);
  const normalizedRuntimeSubstep = runtimeSubstep.includes('.')
    ? runtimeSubstep
    : `${text(runtime?.step)}.${runtimeSubstep}`;
  if (targetSubstep && normalizedRuntimeSubstep !== targetSubstep) {
    issues.push(issue('runtime_substep_mismatch', `Runtime target ${normalizedRuntimeSubstep} does not match resolved target ${targetSubstep}.`, 'runtime'));
  }
  const focus = resolveFocus(snapshot, request);
  if (focus && text(runtime?.focus) !== focus) {
    issues.push(issue('runtime_focus_mismatch', `Runtime focus ${text(runtime?.focus) || 'missing'} does not match resolved focus ${focus}.`, 'runtime'));
  }

  const parts = objects(runtime?.parts);
  const partNumbers = parts.map(part => Number(part.part)).filter(Number.isInteger);
  const uniqueParts = new Set(partNumbers);
  if (parts.length !== 10 || uniqueParts.size !== 10 || [...uniqueParts].some(number => number < 1 || number > 10)) {
    issues.push(issue('runtime_parts_incomplete', 'Runtime must contain Parts 1 through 10 exactly once.', 'runtime'));
  }

  const runtimeSources = objects(runtime?.sources);
  const runtimeSourceIds = new Set(runtimeSources.map(source => text(source.id)).filter(Boolean));
  if (!runtimeSourceIds.size) {
    issues.push(issue('runtime_sources_missing', 'Runtime must carry a non-empty source manifest.', 'runtime'));
  }
  for (const part of parts.filter(part => Number(part.part) < 10)) {
    const refs = strings(part.sourceIds);
    if (!refs.length) {
      issues.push(issue('runtime_part_source_missing', `Runtime Part ${part.part} has no sourceIds.`, 'runtime'));
      continue;
    }
    const unknown = refs.filter(ref => !runtimeSourceIds.has(ref));
    if (unknown.length) {
      issues.push(issue('runtime_part_source_unregistered', `Runtime Part ${part.part} cites unknown source IDs: ${unknown.join(', ')}.`, 'runtime'));
    }
  }

  const packetAuthorityLabels = new Set(objects(packet?.authority).map(source => text(source.label)).filter(Boolean));
  const packetAuthorityLocators = new Set(objects(packet?.authority).map(source => text(source.locator)).filter(Boolean));
  const hasPacketAnchoredSource = runtimeSources.some(source => (
    packetAuthorityLabels.has(text(source.label)) || packetAuthorityLocators.has(text(source.locator))
  ));
  if (!hasPacketAnchoredSource) {
    issues.push(issue(
      'runtime_packet_provenance_unlinked',
      'Runtime source manifest is not visibly anchored to any authority in the supplied Substep source packet.',
      'runtime'
    ));
  }

  return issues;
}

export function validateGateReports(contractReport, compatibilityReport, request) {
  const issues = [];
  if (!contractReport || typeof contractReport !== 'object') {
    issues.push(issue('contract_report_missing', 'Active teacher-plan contract report is required for final gate.', 'teacher-plan-contract'));
  } else {
    if (text(contractReport.contractVersion) !== text(request?.teacherPlanContractVersion)) {
      issues.push(issue(
        'contract_report_version_mismatch',
        `Contract report is ${text(contractReport.contractVersion) || 'missing'}, expected ${text(request?.teacherPlanContractVersion)}.`,
        'teacher-plan-contract'
      ));
    }
    if (contractReport.ok !== true) {
      issues.push(issue('contract_report_failed', 'Active teacher-plan contract did not PASS.', 'teacher-plan-contract'));
    }
  }

  if (!compatibilityReport || typeof compatibilityReport !== 'object') {
    issues.push(issue('compatibility_report_missing', 'Live-runtime compatibility report is required for final gate.', 'runtime-compatibility'));
  } else if (compatibilityReport.ok !== true) {
    issues.push(issue('compatibility_report_failed', 'Live-runtime compatibility gate did not PASS.', 'runtime-compatibility'));
  }

  return issues;
}

export function runPreflight({ snapshot, packet, request, runtime = null, contractReport = null, compatibilityReport = null, finalGate = false }) {
  const issues = [
    ...validatePlanningSnapshot(snapshot),
    ...validateSourcePacket(packet),
    ...validateBuildRequest(request, snapshot, packet)
  ];

  if (runtime) issues.push(...validateRuntime(runtime, snapshot, packet, request));
  if (finalGate) issues.push(...validateGateReports(contractReport, compatibilityReport, request));

  const targetSubstep = resolveTargetSubstep(snapshot, request);
  const focus = resolveFocus(snapshot, request);
  return {
    schemaVersion: 'wrs-lesson-orchestration-report-v1',
    status: issues.length ? 'BLOCKED' : 'PASS',
    resolvedTargetSubstep: targetSubstep || null,
    resolvedFocus: focus || null,
    snapshotId: text(snapshot?.snapshotId) || null,
    packetId: text(packet?.packetId) || null,
    requestId: text(request?.requestId) || null,
    contractVersion: text(request?.teacherPlanContractVersion) || null,
    finalGate,
    issues
  };
}

function parseArgs(argv) {
  const [command = 'preflight', ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    const value = rest[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${key}`);
    options[key] = value;
    index += 1;
  }
  return { command, options };
}

function usage() {
  return [
    'Usage:',
    '  node scripts/wrs-lesson-orchestrator.mjs preflight --snapshot SNAPSHOT.json --packet PACKET.json --request REQUEST.json [--runtime RUNTIME.json] [--out REPORT.json]',
    '  node scripts/wrs-lesson-orchestrator.mjs gate --snapshot SNAPSHOT.json --packet PACKET.json --request REQUEST.json --runtime RUNTIME.json --contract-report CONTRACT.json --compatibility-report COMPAT.json [--out REPORT.json]',
    '',
    'preflight validates current state, source authority, build-request compatibility, and optional runtime structure.',
    'gate additionally requires PASS reports from the active teacher-plan contract and live-runtime compatibility gate.',
    'The wrapper never repairs or invents failed lesson content.'
  ].join('\n');
}

export function main(argv = process.argv.slice(2)) {
  const { command, options } = parseArgs(argv);
  if (!['preflight', 'gate'].includes(command)) throw new Error(`${usage()}\n\nUnknown command: ${command}`);
  for (const required of ['snapshot', 'packet', 'request']) {
    if (!options[required]) throw new Error(`${usage()}\n\nMissing --${required}.`);
  }
  if (command === 'gate') {
    for (const required of ['runtime', 'contract-report', 'compatibility-report']) {
      if (!options[required]) throw new Error(`${usage()}\n\nMissing --${required}.`);
    }
  }

  const snapshot = readJson(options.snapshot);
  const packet = readJson(options.packet);
  const request = readJson(options.request);
  const runtime = options.runtime ? readJson(options.runtime) : null;
  const contractReport = options['contract-report'] ? readJson(options['contract-report']) : null;
  const compatibilityReport = options['compatibility-report'] ? readJson(options['compatibility-report']) : null;
  const report = runPreflight({
    snapshot,
    packet,
    request,
    runtime,
    contractReport,
    compatibilityReport,
    finalGate: command === 'gate'
  });

  const rendered = `${JSON.stringify(report, null, 2)}\n`;
  if (options.out) {
    fs.mkdirSync(path.dirname(path.resolve(options.out)), { recursive: true });
    fs.writeFileSync(options.out, rendered, 'utf8');
  }
  process.stdout.write(rendered);
  process.exitCode = report.status === 'PASS' ? 0 : 2;
  return report;
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
