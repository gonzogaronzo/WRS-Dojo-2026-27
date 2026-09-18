#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { compileGroupPlanningSnapshot } from './wrs-compile-planning-snapshot.mjs';
import { buildWeeklyQueue, discoverPacketRegistry } from './wrs-build-weekly-queue.mjs';

const FEED_VERSION = 'wrs-live-planning-feed-v1';
const REPORT_VERSION = 'wrs-planning-refresh-report-v1';
const SCHOOL_YEAR = '2026-27';

const text = value => value == null ? '' : String(value).trim();
const readJson = filePath => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const slug = value => text(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'group';

export function refreshPlanningState({
  feed,
  packetRegistry = {},
  weekOf = null,
  generatedAt = new Date().toISOString()
}) {
  const errors = [];

  if (feed?.schemaVersion !== FEED_VERSION) {
    errors.push({
      code: 'feed_schema_version',
      message: `Expected ${FEED_VERSION}.`
    });
  }
  if (feed?.schoolYear !== SCHOOL_YEAR) {
    errors.push({
      code: 'feed_school_year',
      message: `Live planning feed must be for ${SCHOOL_YEAR}.`
    });
  }

  const asOf = text(feed?.asOf);
  const effectiveWeekOf = text(weekOf) || text(feed?.weekOf);
  const currentSnapshotRows = Array.isArray(feed?.currentSnapshotRows)
    ? feed.currentSnapshotRows
    : [];
  const groups = Array.isArray(feed?.groups) ? feed.groups : [];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    errors.push({ code: 'feed_as_of', message: 'Feed asOf must be YYYY-MM-DD.' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveWeekOf)) {
    errors.push({ code: 'feed_week_of', message: 'weekOf must be YYYY-MM-DD.' });
  }
  if (!currentSnapshotRows.length) {
    errors.push({ code: 'feed_current_snapshot_rows', message: 'Feed has no Current Snapshot rows.' });
  }
  if (!groups.length) {
    errors.push({ code: 'feed_groups', message: 'Feed has no group definitions.' });
  }

  const snapshots = [];
  const plannedDates = {};
  const routes = {};

  for (const group of groups) {
    const groupId = text(group?.groupId);
    if (!groupId) {
      errors.push({ code: 'group_id_missing', message: 'A feed group is missing groupId.' });
      continue;
    }

    try {
      const snapshot = compileGroupPlanningSnapshot({
        currentSnapshotRows,
        dailyRows: Array.isArray(group?.dailyRows) ? group.dailyRows : [],
        groupId,
        schedule: text(group?.schedule),
        asOf,
        generatedAt
      });
      if (text(group?.displayName)) snapshot.group.displayName = text(group.displayName);
      snapshots.push(snapshot);

      if (text(group?.plannedDate)) plannedDates[groupId] = text(group.plannedDate);
      if (text(group?.lessonRoute)) routes[groupId] = text(group.lessonRoute);
    } catch (error) {
      errors.push({
        code: 'group_snapshot_compile_failed',
        groupId,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  let queue = null;
  if (snapshots.length && /^\d{4}-\d{2}-\d{2}$/.test(effectiveWeekOf)) {
    queue = buildWeeklyQueue({
      snapshots,
      weekOf: effectiveWeekOf,
      plannedDates,
      routes,
      packetRegistry,
      generatedAt
    });
  }

  const queueBlockers = queue
    ? queue.entries
      .filter(entry => entry.status === 'blocked')
      .map(entry => ({
        code: 'queue_entry_blocked',
        groupId: entry.groupId,
        message: entry.blockers.join('; ') || 'Queue entry is blocked.'
      }))
    : [];

  return {
    schemaVersion: REPORT_VERSION,
    schoolYear: SCHOOL_YEAR,
    generatedAt,
    asOf: asOf || null,
    weekOf: effectiveWeekOf || null,
    status: errors.length || queueBlockers.length ? 'BLOCKED' : 'PASS',
    snapshots,
    queue,
    errors: [...errors, ...queueBlockers]
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
    '  node scripts/wrs-refresh-planning-state.mjs --feed live-feed.json [--week-of YYYY-MM-DD] [--packets-dir curriculum/source-packets] [--out-dir planning-output]',
    '',
    'Feed shape:',
    '  {',
    '    "schemaVersion": "wrs-live-planning-feed-v1",',
    '    "schoolYear": "2026-27",',
    '    "asOf": "YYYY-MM-DD",',
    '    "weekOf": "YYYY-MM-DD",',
    '    "currentSnapshotRows": [...],',
    '    "groups": [{ "groupId": "5B", "schedule": "...", "dailyRows": [...], "plannedDate": "YYYY-MM-DD" }]',
    '  }',
    '',
    'This command consumes connector/exported live rows. It does not authenticate to Google Drive and never writes student data into repository fixtures.'
  ].join('\n');
}

export function writeRefreshOutput(report, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const snapshot of report.snapshots) {
    const groupId = text(snapshot?.group?.groupId);
    fs.writeFileSync(
      path.join(outDir, `${slug(groupId)}.snapshot.json`),
      `${JSON.stringify(snapshot, null, 2)}\n`,
      'utf8'
    );
  }
  if (report.queue) {
    fs.writeFileSync(
      path.join(outDir, 'weekly-queue.json'),
      `${JSON.stringify(report.queue, null, 2)}\n`,
      'utf8'
    );
  }
  fs.writeFileSync(
    path.join(outDir, 'refresh-report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8'
  );
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (!options.feed) throw new Error(`${usage()}\n\n--feed is required.`);

  const feed = readJson(options.feed);
  const report = refreshPlanningState({
    feed,
    packetRegistry: discoverPacketRegistry(options['packets-dir'] || 'curriculum/source-packets'),
    weekOf: options['week-of'] || null
  });

  if (options['out-dir']) writeRefreshOutput(report, options['out-dir']);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
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
