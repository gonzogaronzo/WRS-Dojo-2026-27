#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const text = value => value == null ? '' : String(value).trim();
const unique = values => [...new Set(values.filter(Boolean))];

const normalizedFocus = value => {
  const raw = text(value);
  if (!raw) return null;
  if (/introduction/i.test(raw)) return 'Introduction';
  if (/automaticity|fluency/i.test(raw)) return 'Automaticity/Fluency';
  if (/accuracy/i.test(raw)) return 'Accuracy';
  return raw;
};

const focusFor = (snapshot, entry) => {
  const current = text(snapshot?.advancement?.currentSubstep);
  const target = text(entry?.sourcePacketRef).match(/wrs-(\d+\.\d+)-source-packet-v1/)?.[1] || current;
  if (current && target && current !== target) return 'Introduction';

  const focuses = unique(
    (Array.isArray(snapshot?.students) ? snapshot.students : [])
      .map(student => normalizedFocus(student?.lessonFocus))
  );
  return focuses.length === 1 ? focuses[0] : focuses.length > 1 ? 'Mixed focus' : 'Focus unresolved';
};

const targetFor = (snapshot, entry) => {
  const packetTarget = text(entry?.sourcePacketRef).match(/wrs-(\d+\.\d+)-source-packet-v1/)?.[1];
  return packetTarget || text(snapshot?.advancement?.currentSubstep) || 'unresolved';
};

const nextNeedFor = snapshot => {
  const unfinished = Array.isArray(snapshot?.lessonContinuity?.unfinishedWork)
    ? snapshot.lessonContinuity.unfinishedWork.map(text).filter(Boolean)
    : [];
  if (unfinished.length) return unfinished[0];

  const groupTrouble = Array.isArray(snapshot?.groupTroubleSpots)
    ? snapshot.groupTroubleSpots.map(text).filter(Boolean)
    : [];
  if (groupTrouble.length) return groupTrouble[0];

  const studentTrouble = unique(
    (Array.isArray(snapshot?.students) ? snapshot.students : [])
      .flatMap(student => Array.isArray(student?.troubleSpots) ? student.troubleSpots.map(text) : [])
  );
  return studentTrouble[0] || null;
};

const actionFor = entry => {
  switch (entry?.status) {
    case 'blocked': {
      const blockerText = Array.isArray(entry?.blockers) && entry.blockers.length
        ? entry.blockers.join('; ')
        : 'planning blocker';
      return /teacher must confirm/i.test(blockerText)
        ? 'TEACHER DECISION: ' + blockerText
        : 'BLOCKED: ' + blockerText;
    }
    case 'awaiting-condition':
      return 'WAIT: ' + (text(entry?.entryCondition) || 'entry condition not yet met');
    case 'validated':
      return 'REUSE validated lesson';
    case 'needs-regeneration':
      return 'REGENERATE because substantive inputs changed';
    case 'needs-build':
      return 'BUILD';
    case 'completed':
      return 'COMPLETE';
    default:
      return text(entry?.status) || 'STATUS UNRESOLVED';
  }
};

export function planningReviewLines({ snapshots = [], queue = null }) {
  const byGroup = new Map(
    (Array.isArray(snapshots) ? snapshots : [])
      .map(snapshot => [text(snapshot?.group?.groupId), snapshot])
      .filter(([groupId]) => groupId)
  );

  return (Array.isArray(queue?.entries) ? queue.entries : []).map(entry => {
    const groupId = text(entry?.groupId);
    const snapshot = byGroup.get(groupId);
    const displayName = text(entry?.displayName) || text(snapshot?.group?.displayName) || groupId || 'Unknown group';
    const target = targetFor(snapshot, entry);
    const focus = focusFor(snapshot, entry);
    const action = actionFor(entry);
    const need = snapshot ? nextNeedFor(snapshot) : null;
    return displayName + ' → ' + target + ' ' + focus + ' → ' + action + (need ? ' → keep in view: ' + need : '');
  });
}

export function renderPlanningReview({
  snapshots = [],
  queue = null,
  weekOf = null,
  asOf = null
}) {
  const lines = planningReviewLines({ snapshots, queue });
  const header = [
    '# WRS Weekly Planning Review',
    '',
    'Week of: ' + (text(weekOf) || 'unresolved'),
    'State through: ' + (text(asOf) || 'unresolved'),
    ''
  ];
  return [...header, ...lines.map(line => '- ' + line), ''].join('\n') + '\n';
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error('Unexpected argument: ' + token);
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error('Missing value for --' + key);
    options[key] = value;
    index += 1;
  }
  return options;
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (!options.report) {
    throw new Error('Usage: node scripts/wrs-render-planning-review.mjs --report refresh-report.json [--out planning-review.md]');
  }
  const report = JSON.parse(fs.readFileSync(options.report, 'utf8'));
  const rendered = renderPlanningReview({
    snapshots: report.snapshots,
    queue: report.queue,
    weekOf: report.weekOf,
    asOf: report.asOf
  });
  if (options.out) {
    fs.mkdirSync(path.dirname(path.resolve(options.out)), { recursive: true });
    fs.writeFileSync(options.out, rendered, 'utf8');
  }
  process.stdout.write(rendered);
  return rendered;
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  try {
    main();
  } catch (error) {
    process.stderr.write((error instanceof Error ? error.message : String(error)) + '\n');
    process.exitCode = 1;
  }
}
