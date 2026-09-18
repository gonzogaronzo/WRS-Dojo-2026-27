#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SCHOOL_YEAR = '2026-27';
const QUEUE_VERSION = 'wrs-weekly-build-queue-v1';

const text = value => value == null ? '' : String(value).trim();
const objects = value => Array.isArray(value)
  ? value.filter(item => item && typeof item === 'object' && !Array.isArray(item))
  : [];
const unique = values => [...new Set(values.filter(Boolean))];

const readJson = filePath => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const normalizeSnapshots = value => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.snapshots)) return value.snapshots;
  if (value?.schemaVersion === 'wrs-group-planning-snapshot-v1') return [value];
  throw new Error('Snapshot input must be one snapshot, an array of snapshots, or {"snapshots": [...]}.');
};

export function discoverPacketRegistry(packetDir) {
  if (!fs.existsSync(packetDir)) return {};
  const registry = {};

  for (const name of fs.readdirSync(packetDir).filter(name => name.endsWith('.json')).sort()) {
    const filePath = path.join(packetDir, name);
    let packet;
    try {
      packet = readJson(filePath);
    } catch {
      continue;
    }
    const substep = text(packet?.substep);
    if (!substep) continue;
    registry[substep] = {
      packetId: text(packet?.packetId) || `wrs-${substep}-source-packet-v1`,
      packetVersion: text(packet?.packetVersion) || null,
      verified: packet?.verification?.status === 'verified'
        && objects(packet?.verification?.blockingIssues).length === 0
        && (!Array.isArray(packet?.verification?.blockingIssues) || packet.verification.blockingIssues.length === 0),
      path: filePath
    };
  }

  return registry;
}

export function resolveQueueTarget(snapshot) {
  const advancement = snapshot?.advancement ?? {};
  const current = text(advancement.currentSubstep)
    || text(snapshot?.students?.[0]?.instructionalTarget?.substep);
  const next = text(advancement.nextSubstep);

  if (advancement.status === 'teacher-confirmed-advance' && next) {
    return {
      substep: next,
      entryCondition: text(advancement.condition) || `Teacher-confirmed advancement from ${current} to ${next}.`,
      entryConditionStatus: 'met',
      isAdvancePath: true
    };
  }

  if (advancement.status === 'ready-pending-completion' && next) {
    return {
      substep: next,
      entryCondition: text(advancement.condition) || `Complete the recorded ${current} exit condition before beginning ${next}.`,
      entryConditionStatus: 'pending',
      isAdvancePath: true
    };
  }

  return {
    substep: current,
    entryCondition: current
      ? `Continue the current ${current} instructional path from the newest planning snapshot.`
      : 'Current instructional target must be resolved before a lesson can be built.',
    entryConditionStatus: current ? 'not-applicable' : 'blocked',
    isAdvancePath: false
  };
}

const defaultRouteFor = (snapshot, target) => {
  if (target.isAdvancePath) return 'full';
  const unfinished = Array.isArray(snapshot?.lessonContinuity?.unfinishedWork)
    ? snapshot.lessonContinuity.unfinishedWork.map(text).filter(Boolean)
    : [];
  return unfinished.length ? 'continuation' : 'full';
};

const validatedFor = (validatedArtifacts, groupId, plannedDate) => {
  if (!validatedArtifacts || typeof validatedArtifacts !== 'object') return null;
  return validatedArtifacts[`${groupId}:${plannedDate}`] ?? validatedArtifacts[groupId] ?? null;
};

export function buildWeeklyQueue({
  snapshots,
  weekOf,
  plannedDates = {},
  routes = {},
  packetRegistry = {},
  validatedArtifacts = {},
  generatedAt = new Date().toISOString()
}) {
  const snapshotList = normalizeSnapshots(snapshots);
  const effectiveWeekOf = text(weekOf);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveWeekOf)) {
    throw new Error('weekOf must be YYYY-MM-DD.');
  }

  const entries = snapshotList.map(snapshot => {
    const groupId = text(snapshot?.group?.groupId);
    const displayName = text(snapshot?.group?.displayName) || groupId;
    if (!groupId) throw new Error('Every snapshot needs group.groupId.');

    const plannedDate = text(plannedDates[groupId]) || effectiveWeekOf;
    const target = resolveQueueTarget(snapshot);
    const desiredPacketId = target.substep
      ? `wrs-${target.substep}-source-packet-v1`
      : `wrs-unresolved-source-packet-v1`;
    const packet = target.substep ? packetRegistry[target.substep] : null;
    const sourcePacketRef = text(packet?.packetId) || desiredPacketId;

    const blockers = [];
    if (snapshot?.planningReady !== true) {
      blockers.push(...(Array.isArray(snapshot?.planningBlockers)
        ? snapshot.planningBlockers.map(text).filter(Boolean)
        : []));
      if (!blockers.length) blockers.push('Planning snapshot is not planning-ready.');
    }
    if (!target.substep) blockers.push('Target Substep is unresolved.');
    if (target.substep && !packet) blockers.push(`No registered source packet is available for Substep ${target.substep}.`);
    if (packet && packet.verified !== true) blockers.push(`Source packet ${sourcePacketRef} is not verified.`);

    const route = text(routes[groupId]) || defaultRouteFor(snapshot, target);
    const unfinished = Array.isArray(snapshot?.lessonContinuity?.unfinishedWork)
      ? snapshot.lessonContinuity.unfinishedWork.map(text).filter(Boolean)
      : [];

    const exitEvidence = unique([
      ...(target.entryConditionStatus === 'pending' ? [target.entryCondition] : []),
      ...unfinished,
      'Record actual Parts completed, student performance, unfinished work, and the next teacher advancement decision.'
    ]);

    const continuationRule = target.entryConditionStatus === 'pending'
      ? `If the entry condition is not met, continue Substep ${text(snapshot?.advancement?.currentSubstep)} and regenerate only ${groupId}; do not record advancement.`
      : 'Use the next dated Planning Snapshot to decide continue, repeat, or advance; regenerate only this group if substantive state changes.';

    const nextDependency = target.entryConditionStatus === 'pending'
      ? `Entry into Substep ${target.substep} depends on the recorded completion condition becoming true.`
      : 'The next lesson depends on the next dated snapshot plus selection/passage history.';

    const validated = validatedFor(validatedArtifacts, groupId, plannedDate);
    const inputFingerprint = text(validated?.currentFingerprint) || null;
    const validatedFingerprint = text(validated?.validatedFingerprint) || null;

    let status;
    if (blockers.length) status = 'blocked';
    else if (target.entryConditionStatus === 'pending') status = 'awaiting-condition';
    else if (inputFingerprint && validatedFingerprint && inputFingerprint === validatedFingerprint) status = 'validated';
    else status = 'needs-build';

    return {
      groupId,
      displayName,
      plannedDate,
      stateAsOf: text(snapshot?.asOf),
      snapshotRef: text(snapshot?.snapshotId),
      sourcePacketRef,
      buildRequestRef: `build-request:${groupId}:${plannedDate}:${target.substep || 'unresolved'}`,
      runtimeRef: validated?.runtimeRef ?? null,
      teacherPlanRef: validated?.teacherPlanRef ?? null,
      entryCondition: target.entryCondition,
      entryConditionStatus: blockers.length && target.entryConditionStatus !== 'pending'
        ? 'blocked'
        : target.entryConditionStatus,
      lessonRoute: route,
      exitEvidence,
      continuationRule,
      nextDependency,
      status,
      inputFingerprint,
      validatedFingerprint,
      lastValidatedAt: validated?.lastValidatedAt ?? null,
      blockers,
      notes: unique([
        target.isAdvancePath
          ? `Prepared target is Substep ${target.substep}; this does not itself change official placement.`
          : `Prepared target remains Substep ${target.substep || 'unresolved'}.`,
        packet?.packetVersion ? `Registered packet version: ${packet.packetVersion}.` : null
      ])
    };
  });

  return {
    schemaVersion: QUEUE_VERSION,
    schoolYear: SCHOOL_YEAR,
    weekOf: effectiveWeekOf,
    generatedAt,
    entries
  };
}

function parseMap(value, label) {
  if (!value) return {};
  const parsed = readJson(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return parsed;
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
    '  node scripts/wrs-build-weekly-queue.mjs --snapshots snapshots.json --week-of YYYY-MM-DD [--packets-dir curriculum/source-packets] [--planned-dates planned-dates.json] [--routes routes.json] [--validated-artifacts validated.json] [--out queue.json]',
    '',
    'The queue is derived orchestration state. Missing or unverified source packets block only the affected group entry.'
  ].join('\n');
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (!options.snapshots || !options['week-of']) {
    throw new Error(`${usage()}\n\n--snapshots and --week-of are required.`);
  }

  const queue = buildWeeklyQueue({
    snapshots: readJson(options.snapshots),
    weekOf: options['week-of'],
    plannedDates: parseMap(options['planned-dates'], 'planned-dates'),
    routes: parseMap(options.routes, 'routes'),
    packetRegistry: discoverPacketRegistry(options['packets-dir'] || 'curriculum/source-packets'),
    validatedArtifacts: parseMap(options['validated-artifacts'], 'validated-artifacts')
  });

  const rendered = `${JSON.stringify(queue, null, 2)}\n`;
  if (options.out) {
    fs.mkdirSync(path.dirname(path.resolve(options.out)), { recursive: true });
    fs.writeFileSync(options.out, rendered, 'utf8');
  }
  process.stdout.write(rendered);
  process.exitCode = queue.entries.some(entry => entry.status === 'blocked') ? 2 : 0;
  return queue;
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
