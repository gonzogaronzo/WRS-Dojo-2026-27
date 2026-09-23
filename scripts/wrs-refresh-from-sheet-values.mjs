#!/usr/bin/env node
import { normalizeChartingEvidence } from '../functions/chartingEvidence.js';

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  refreshPlanningState,
  writeRefreshOutput
} from './wrs-refresh-planning-state.mjs';
import { discoverPacketRegistry } from './wrs-build-weekly-queue.mjs';

const EXPORT_VERSION = 'wrs-sheet-values-export-v1';
const FEED_VERSION = 'wrs-live-planning-feed-v1';
const SCHOOL_YEAR = '2026-27';

const text = value => value == null ? '' : String(value).trim();
const readJson = filePath => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const assertRequiredHeaders = (values, required, label) => {
  const headers = Array.isArray(values?.[0]) ? values[0].map(text) : [];
  const missing = required.filter(header => !headers.includes(header));
  if (missing.length) {
    throw new Error(`${label} is missing required columns: ${missing.join(', ')}.`);
  }
};

export function rowsFromValues(values, label = 'sheet') {
  if (!Array.isArray(values) || values.length < 1 || !Array.isArray(values[0])) {
    throw new Error(`${label} must be a two-dimensional values array with a header row.`);
  }

  const headers = values[0].map(text);
  if (!headers.length || headers.some(header => !header)) {
    throw new Error(`${label} header row contains a blank column name.`);
  }
  if (new Set(headers).size !== headers.length) {
    throw new Error(`${label} header row contains duplicate column names.`);
  }

  return values.slice(1)
    .filter(row => Array.isArray(row) && row.some(value => text(value)))
    .map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
}

export function buildFeedFromSheetValues(exportData) {
  if (exportData?.schemaVersion !== EXPORT_VERSION) {
    throw new Error(`Expected ${EXPORT_VERSION}.`);
  }
  if (exportData?.schoolYear !== SCHOOL_YEAR) {
    throw new Error(`Sheet export must be for ${SCHOOL_YEAR}.`);
  }

  const asOf = text(exportData.asOf);
  const weekOf = text(exportData.weekOf);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new Error('asOf must be YYYY-MM-DD.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekOf)) throw new Error('weekOf must be YYYY-MM-DD.');

  assertRequiredHeaders(
    exportData.currentSnapshotValues,
    ['Student', 'Group', 'Current Substep', 'Lesson Focus', 'Last Updated'],
    'Current Snapshot'
  );
  const currentSnapshotRows = rowsFromValues(
    exportData.currentSnapshotValues,
    'Current Snapshot'
  );

  const dailyTabValues = exportData.dailyTabValues;
  if (!dailyTabValues || typeof dailyTabValues !== 'object' || Array.isArray(dailyTabValues)) {
    throw new Error('dailyTabValues must be an object keyed by Daily Notes tab name.');
  }

  const groups = Array.isArray(exportData.groups) ? exportData.groups : [];
  if (!groups.length) throw new Error('groups must contain at least one group definition.');

  const seen = new Set();
  const feedGroups = groups.map(group => {
    const groupId = text(group?.groupId);
    if (!groupId) throw new Error('Every group definition needs groupId.');
    if (seen.has(groupId)) throw new Error(`Duplicate group definition: ${groupId}.`);
    seen.add(groupId);

    const dailyTab = text(group?.dailyTab) || groupId;
    const values = dailyTabValues[dailyTab];
    if (!values) throw new Error(`Missing Daily Notes values for tab ${dailyTab} (group ${groupId}).`);
    assertRequiredHeaders(
      values,
      ['Date', 'Group', 'Substep / Lesson', 'Note / Data', 'Follow-up / Instructional Response', 'Source'],
      `Daily Notes / ${dailyTab}`
    );

    return {
      groupId,
      displayName: text(group?.displayName) || groupId,
      schedule: text(group?.schedule),
      plannedDate: text(group?.plannedDate) || null,
      lessonRoute: text(group?.lessonRoute) || null,
      selectionHistory: group?.selectionHistory ?? null,
      teacherFocusOverride: text(group?.teacherFocusOverride) || null,
      dailyRows: rowsFromValues(values, `Daily Notes / ${dailyTab}`)
    };
  });

  return {
    schemaVersion: FEED_VERSION,
    schoolYear: SCHOOL_YEAR,
    asOf,
    weekOf,
    currentSnapshotRows,
    chartingEvidence: exportData.chartingEvidence ?? normalizeChartingEvidence(exportData.dataLogValues),
    groups: feedGroups
  };
}

export function refreshFromSheetValues({
  exportData,
  packetRegistry = {},
  generatedAt = new Date().toISOString()
}) {
  return refreshPlanningState({
    feed: buildFeedFromSheetValues(exportData),
    packetRegistry,
    validatedArtifacts: exportData?.validatedArtifacts ?? {},
    generatedAt
  });
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
    '  node scripts/wrs-refresh-from-sheet-values.mjs --sheet-values sheet-values.json [--packets-dir curriculum/source-packets] [--out-dir planning-output]',
    '',
    'The input is a connector/Sheets-API value export, not manually normalized row objects.',
    'It must contain Current Snapshot values, one Daily Notes values matrix per group/tab, and group metadata.',
    'Real student output belongs in an operational/private location and must not be committed as repository fixtures.'
  ].join('\n');
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (!options['sheet-values']) throw new Error(`${usage()}\n\n--sheet-values is required.`);

  const report = refreshFromSheetValues({
    exportData: readJson(options['sheet-values']),
    packetRegistry: discoverPacketRegistry(options['packets-dir'] || 'curriculum/source-packets')
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
