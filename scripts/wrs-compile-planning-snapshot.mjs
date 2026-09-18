#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SCHOOL_YEAR = '2026-27';
const SNAPSHOT_VERSION = 'wrs-group-planning-snapshot-v1';

const text = value => value == null ? '' : String(value).trim();
const nullable = value => text(value) || null;

const readJson = filePath => {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.rows)) return parsed.rows;
  throw new Error(`Expected an array or {"rows": [...]} in ${filePath}`);
};

const field = (row, ...keys) => {
  for (const key of keys) {
    if (row && Object.prototype.hasOwnProperty.call(row, key)) return row[key];
  }
  return null;
};

const dateOnly = value => {
  const candidate = text(value);
  const match = candidate.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : '';
};

const splitGroupTokens = value => text(value)
  .split(/[;,]/)
  .map(item => item.trim())
  .filter(Boolean);

const rowMatchesGroup = (row, groupId) => (
  splitGroupTokens(field(row, 'Group', 'group')).includes(groupId)
);

const substepFrom = value => {
  const match = text(value).match(/\b(\d+\.\d+)\b/);
  return match ? match[1] : '';
};

const normalizeFocus = value => {
  const raw = text(value).toLowerCase();
  if (/automaticity|fluency/.test(raw)) return 'automaticity-fluency';
  if (/intro/.test(raw)) return 'introduction';
  if (/accuracy|review\/backfill|near mastery/.test(raw)) return 'accuracy';
  return '';
};

const slug = value => text(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'student';

const unique = values => [...new Set(values.filter(Boolean))];

const maxDate = values => {
  const dates = values.map(dateOnly).filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : '';
};

const sourceKind = row => {
  const source = text(field(row, 'Source', 'source')).toLowerCase();
  if (source.includes('teacher live note')) return {
    kind: 'explicit-teacher-report',
    authorityRank: 1
  };
  if (source.includes('dojo')) return {
    kind: 'dojo-completion-event',
    authorityRank: 4
  };
  return {
    kind: 'dated-lesson-data',
    authorityRank: 3
  };
};

const relevantDailyRows = (dailyRows, groupId, asOf) => dailyRows
  .filter(row => rowMatchesGroup(row, groupId))
  .filter(row => {
    const date = dateOnly(field(row, 'Date', 'date'));
    return date && (!asOf || date <= asOf);
  })
  .sort((a, b) => dateOnly(field(a, 'Date', 'date')).localeCompare(dateOnly(field(b, 'Date', 'date'))));

const currentRowsForGroup = (rows, groupId, asOf) => rows
  .filter(row => text(field(row, 'Group', 'group')) === groupId)
  .filter(row => {
    const updated = dateOnly(field(row, 'Last Updated', 'lastUpdated'));
    return !asOf || !updated || updated <= asOf;
  });

const latestHigherAuthorityDailyRows = dailyRows => {
  if (!dailyRows.length) return [];
  const latestDate = maxDate(dailyRows.map(row => field(row, 'Date', 'date')));
  const latestRows = dailyRows.filter(row => dateOnly(field(row, 'Date', 'date')) === latestDate);
  const highestAuthority = Math.min(...latestRows.map(row => sourceKind(row).authorityRank));
  return latestRows.filter(row => sourceKind(row).authorityRank === highestAuthority);
};

const deriveAdvancement = ({ currentSubstep, latestDailyRows, fallbackAuthorityRef }) => {
  for (const row of [...latestDailyRows].reverse()) {
    const followUp = text(field(row, 'Follow-up / Instructional Response', 'followUp'));
    const note = text(field(row, 'Note / Data', 'note'));
    const combined = [followUp, note].filter(Boolean).join(' ');
    const match = combined.match(/\b(?:advance|move)\s+(?:on\s+)?to\s+(?:substep\s+)?(\d+\.\d+)\b/i);
    if (!match) continue;
    const meta = sourceKind(row);
    const date = dateOnly(field(row, 'Date', 'date'));
    const sourceRef = `daily:${date}:${meta.kind}`;
    const nextSubstep = match[1];
    if (nextSubstep === currentSubstep) {
      return {
        status: 'continue',
        currentSubstep,
        nextSubstep: null,
        condition: null,
        authorityRef: sourceRef
      };
    }

    const conditionText = followUp || combined;
    const hasCompletionCondition = /\b(?:finish|after|once|then|before|when|if|unless)\b/i.test(conditionText);
    const explicitlyTeacherConfirmed = meta.authorityRank === 1;
    return {
      status: hasCompletionCondition
        ? 'ready-pending-completion'
        : (explicitlyTeacherConfirmed ? 'teacher-confirmed-advance' : 'continue'),
      currentSubstep,
      nextSubstep: nextSubstep,
      condition: hasCompletionCondition ? combined : null,
      authorityRef: sourceRef
    };
  }

  return {
    status: 'continue',
    currentSubstep,
    nextSubstep: null,
    condition: null,
    authorityRef: fallbackAuthorityRef
  };
};

const deriveUnfinishedWork = latestDailyRows => {
  const candidates = [];
  for (const row of latestDailyRows) {
    const note = text(field(row, 'Note / Data', 'note'));
    const followUp = text(field(row, 'Follow-up / Instructional Response', 'followUp'));
    for (const value of [note, followUp]) {
      if (/\b(?:remain|unfinished|finish|resume|continue|complete)\b/i.test(value)) {
        candidates.push(value);
      }
    }
  }
  return unique(candidates);
};

const latestInstructionDate = dailyRows => {
  const candidates = dailyRows.filter(row => {
    const type = text(field(row, 'Record Type', 'recordType')).toLowerCase();
    return /(instruction|assessment|data)/.test(type);
  });
  return maxDate(candidates.map(row => field(row, 'Date', 'date'))) || null;
};

const deriveDailySubstep = latestDailyRows => {
  const values = unique(latestDailyRows.map(row => substepFrom(field(row, 'Substep / Lesson', 'substepLesson'))));
  return values.length === 1 ? values[0] : '';
};

const deriveDailyFocus = latestDailyRows => {
  const values = unique(latestDailyRows.map(row => normalizeFocus(field(row, 'Substep / Lesson', 'substepLesson'))));
  return values.length === 1 ? values[0] : '';
};

const rowSignalsReviewBackfill = row => {
  const combined = [
    field(row, 'Substep / Lesson', 'substepLesson'),
    field(row, 'Note / Data', 'note'),
    field(row, 'Follow-up / Instructional Response', 'followUp')
  ].map(text).filter(Boolean).join(' ');
  return /\b(?:review|backfill)\b/i.test(combined);
};

export function compileGroupPlanningSnapshot({
  currentSnapshotRows,
  dailyRows,
  groupId,
  schedule = '',
  asOf,
  generatedAt = new Date().toISOString()
}) {
  if (!groupId) throw new Error('groupId is required.');
  const effectiveAsOf = dateOnly(asOf) || dateOnly(generatedAt);
  if (!effectiveAsOf) throw new Error('asOf must resolve to YYYY-MM-DD.');

  const current = currentRowsForGroup(currentSnapshotRows, groupId, effectiveAsOf);
  if (!current.length) throw new Error(`No Current Snapshot rows found for group ${groupId} on or before ${effectiveAsOf}.`);

  const daily = relevantDailyRows(dailyRows, groupId, effectiveAsOf);
  const latestDailyCandidate = latestHigherAuthorityDailyRows(daily);
  const snapshotDate = maxDate(current.map(row => field(row, 'Last Updated', 'lastUpdated'))) || effectiveAsOf;
  const latestDailyDate = maxDate(latestDailyCandidate.map(row => field(row, 'Date', 'date')));
  const latestDaily = latestDailyDate && latestDailyDate >= snapshotDate ? latestDailyCandidate : [];

  const rawTargets = current.map(row => (
    substepFrom(field(row, 'Lesson Focus', 'lessonFocus'))
      || substepFrom(field(row, 'Current Substep', 'currentSubstep'))
  ));
  const currentTargets = unique(rawTargets);
  const dailyTarget = deriveDailySubstep(latestDaily);
  const currentSubstep = dailyTarget || (currentTargets.length === 1 ? currentTargets[0] : '');

  const currentFocuses = unique(current.map(row => normalizeFocus(field(row, 'Lesson Focus', 'lessonFocus'))));
  const dailyFocus = deriveDailyFocus(latestDaily);
  const resolvedFocus = dailyFocus || (currentFocuses.length === 1 ? currentFocuses[0] : '');
  const conflicts = [];

  if (currentTargets.length > 1 && !dailyTarget) {
    conflicts.push({
      conflictId: `${groupId}-target-substep-conflict-${effectiveAsOf}`,
      severity: 'blocking',
      description: `Current Snapshot rows resolve to multiple instructional targets: ${currentTargets.join(', ')}.`,
      sources: currentTargets.map(value => `current-snapshot:target:${value}`),
      blocksPlanning: true
    });
  }

  if (currentFocuses.length > 1 && !dailyFocus) {
    conflicts.push({
      conflictId: `${groupId}-focus-conflict-${effectiveAsOf}`,
      severity: 'blocking',
      description: `Current Snapshot rows resolve to multiple lesson focuses: ${currentFocuses.join(', ')}.`,
      sources: currentFocuses.map(value => `current-snapshot:focus:${value}`),
      blocksPlanning: true
    });
  }

  if (latestDaily.length) {
    const latestDailyDate = dateOnly(field(latestDaily[0], 'Date', 'date'));
    if (latestDailyDate > snapshotDate && dailyTarget && currentTargets.length === 1 && dailyTarget !== currentTargets[0]) {
      conflicts.push({
        conflictId: `${groupId}-snapshot-stale-${latestDailyDate}`,
        severity: 'nonblocking',
        description: `Newer teacher/daily state targets ${dailyTarget}; Current Snapshot still targets ${currentTargets[0]}.`,
        sources: [`daily:${latestDailyDate}`, `current-snapshot:${snapshotDate}`],
        blocksPlanning: false
      });
    }
  }

  const roster = current.map(row => text(field(row, 'Student', 'student'))).filter(Boolean);
  const fallbackAuthorityRef = `current-snapshot:${groupId}:${snapshotDate}`;

  const students = current.map(row => {
    const name = text(field(row, 'Student', 'student'));
    const snapshotOfficialSubstep = substepFrom(field(row, 'Current Substep', 'currentSubstep'));
    const target = currentSubstep || substepFrom(field(row, 'Lesson Focus', 'lessonFocus')) || snapshotOfficialSubstep;
    const currentRowSignalsReview = /\b(?:review|backfill)\b/i.test(text(field(row, 'Lesson Focus', 'lessonFocus')));
    const dailySignalsReview = latestDaily.some(rowSignalsReviewBackfill);
    const newerTeacherCurrent = Boolean(
      dailyTarget
      && dailyTarget !== snapshotOfficialSubstep
      && !currentRowSignalsReview
      && !dailySignalsReview
      && latestDaily.some(row => sourceKind(row).authorityRank === 1)
    );
    const officialSubstep = newerTeacherCurrent ? dailyTarget : snapshotOfficialSubstep;
    const officialSourceRef = newerTeacherCurrent
      ? `daily:${dateOnly(field(latestDaily[0], 'Date', 'date'))}:explicit-teacher-report`
      : fallbackAuthorityRef;
    const focus = resolvedFocus || normalizeFocus(field(row, 'Lesson Focus', 'lessonFocus')) || 'accuracy';
    const dailyAuthorityRef = latestDaily.length
      ? `daily:${dateOnly(field(latestDaily[0], 'Date', 'date'))}:${sourceKind(latestDaily[0]).kind}`
      : fallbackAuthorityRef;

    return {
      studentId: `${groupId.toLowerCase()}-${slug(name)}`,
      name,
      officialPlacement: {
        substep: officialSubstep,
        status: newerTeacherCurrent ? 'teacher-confirmed-current' : 'official',
        sourceRef: officialSourceRef
      },
      instructionalTarget: {
        substep: target,
        relationshipToPlacement: target === officialSubstep ? 'current' : 'review-backfill',
        sourceRef: dailyTarget ? dailyAuthorityRef : fallbackAuthorityRef
      },
      lessonFocus: focus,
      latestData: {
        realWordCharting: nullable(field(row, 'Most Recent Real-Word Charting', 'realWordCharting')),
        nonsenseWordCharting: nullable(field(row, 'Most Recent Nonsense-Word Charting', 'nonsenseWordCharting')),
        spellingDictation: nullable(field(row, 'Most Recent Spelling / Dictation', 'spellingDictation')),
        fluencyAssessment: nullable(field(row, 'Fluency / Assessment', 'fluencyAssessment'))
      },
      troubleSpots: nullable(field(row, 'Current Trouble Spots', 'troubleSpots'))
        ? [text(field(row, 'Current Trouble Spots', 'troubleSpots'))]
        : [],
      recommendedInstructionalResponse: nullable(field(row, 'Recommended Next Focus', 'recommendedNextFocus'))
        ? [text(field(row, 'Recommended Next Focus', 'recommendedNextFocus'))]
        : [],
      hfwStatus: nullable(field(row, 'HFW Status', 'hfwStatus')),
      notebookStatus: null
    };
  });

  const stateSources = [{
    sourceRef: fallbackAuthorityRef,
    kind: 'current-snapshot',
    date: snapshotDate,
    authorityRank: 2,
    locator: `WRS 2026–27 Student Data Log / Current Snapshot / group ${groupId}`,
    notes: 'Official placement, per-student latest data, trouble spots, and recommended response.'
  }];

  for (const row of latestDaily) {
    const meta = sourceKind(row);
    const date = dateOnly(field(row, 'Date', 'date'));
    const source = text(field(row, 'Source', 'source')) || 'Daily Notes';
    const sourceRef = `daily:${date}:${meta.kind}`;
    if (stateSources.some(item => item.sourceRef === sourceRef)) continue;
    stateSources.push({
      sourceRef,
      kind: meta.kind,
      date,
      authorityRank: meta.authorityRank,
      locator: `WRS 2026–27 Daily Notes Log / ${groupId} / ${date}`,
      notes: source
    });
  }

  const advancement = deriveAdvancement({
    currentSubstep,
    latestDailyRows: latestDaily,
    fallbackAuthorityRef
  });

  const blockingConflicts = conflicts.filter(item => item.blocksPlanning);
  const blockers = [];
  if (!currentSubstep) blockers.push('Group instructional target could not be resolved.');
  if (!resolvedFocus) blockers.push('Lesson focus could not be resolved.');
  if (students.some(student => !student.officialPlacement.substep)) blockers.push('One or more official placements are missing.');
  if (blockingConflicts.length) blockers.push(...blockingConflicts.map(item => item.description));

  return {
    schemaVersion: SNAPSHOT_VERSION,
    snapshotId: `snapshot-${groupId.toLowerCase()}-${effectiveAsOf}`,
    schoolYear: SCHOOL_YEAR,
    generatedAt,
    asOf: effectiveAsOf,
    group: {
      groupId,
      displayName: groupId,
      schedule: text(schedule),
      roster
    },
    students,
    lessonContinuity: {
      lastInstructionDate: latestInstructionDate(daily),
      lastSubstep: currentSubstep || students[0]?.instructionalTarget?.substep || students[0]?.officialPlacement?.substep || '',
      partsCompleted: [],
      unfinishedWork: deriveUnfinishedWork(latestDaily),
      passageHistory: [],
      selectionHistoryRef: null
    },
    groupTroubleSpots: unique(students.flatMap(student => student.troubleSpots)),
    materialsAndFollowUps: unique(latestDaily
      .map(row => text(field(row, 'Follow-up / Instructional Response', 'followUp')))
      .filter(Boolean)),
    advancement,
    unresolvedConflicts: conflicts,
    stateSources,
    planningReady: blockers.length === 0,
    planningBlockers: blockers
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
    '  node scripts/wrs-compile-planning-snapshot.mjs --current-snapshot current.json --daily-notes daily.json --group 5B --as-of YYYY-MM-DD [--schedule "7:45-8:30"] [--out snapshot.json]',
    '',
    'Inputs are current row exports from WRS 2026–27 Student Data Log / Current Snapshot and the matching Daily Notes group tab.',
    'The compiler is deterministic and conservative: it does not connect to Google Drive itself, infer missing Wilson content, or record a conditional advancement as completed.'
  ].join('\n');
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  for (const required of ['current-snapshot', 'daily-notes', 'group', 'as-of']) {
    if (!options[required]) throw new Error(`${usage()}\n\nMissing --${required}.`);
  }

  const snapshot = compileGroupPlanningSnapshot({
    currentSnapshotRows: readJson(options['current-snapshot']),
    dailyRows: readJson(options['daily-notes']),
    groupId: options.group,
    schedule: options.schedule || '',
    asOf: options['as-of']
  });

  const rendered = `${JSON.stringify(snapshot, null, 2)}\n`;
  if (options.out) {
    fs.mkdirSync(path.dirname(path.resolve(options.out)), { recursive: true });
    fs.writeFileSync(options.out, rendered, 'utf8');
  }
  process.stdout.write(rendered);
  process.exitCode = snapshot.planningReady ? 0 : 2;
  return snapshot;
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
