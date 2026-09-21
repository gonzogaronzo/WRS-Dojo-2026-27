#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const HISTORY_VERSION = 'wrs-group-selection-history-v1';
const SCHOOL_YEAR = '2026-27';

const text = value => value == null ? '' : String(value).trim();
const strings = value => Array.isArray(value)
  ? value.map(item => text(item)).filter(Boolean)
  : [];
const partOf = (runtime, number) => (
  Array.isArray(runtime?.parts) ? runtime.parts.find(part => part?.part === number) : null
);
const dataOf = part => (
  part?.data && typeof part.data === 'object' && !Array.isArray(part.data)
    ? part.data
    : {}
);

const normalizeSubstep = runtime => {
  const step = text(runtime?.step);
  const substep = text(runtime?.substep);
  if (/^\d+\.\d+$/.test(substep)) return substep;
  if (/^\d+$/.test(step) && /^\d+$/.test(substep)) return `${step}.${substep}`;
  return '';
};

const chartingWordsFrom = data => {
  const direct = strings(data.chartingWords);
  if (direct.length) return direct;
  const lists = Array.isArray(data.studentChartingLists) ? data.studentChartingLists : [];
  return [...new Set(lists.flatMap(item => strings(item?.words)))];
};

const emptySelections = () => ({
  part3: { currentCards: [], hfw: [], wordElements: [] },
  part4: { practiceWords: [], chartingWords: [] },
  part5: { page: null, sentences: [] },
  part8: {
    sounds: [],
    wordElements: [],
    realWords: [],
    nonsenseWords: [],
    phrases: [],
    sentences: []
  },
  part9: { passageId: null, title: null, page: null, status: 'not-used' }
});

const passageIdFrom = data => {
  const explicit = text(data.passageId);
  if (explicit) return explicit;
  const title = text(data.passageTitle);
  const page = text(data.page);
  if (!title && !page) return null;
  return [title || 'untitled', page || 'page-unknown']
    .join('::')
    .toLowerCase()
    .replace(/[^a-z0-9:]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export function extractSelections(runtime, completion) {
  const completed = new Set(
    Array.isArray(completion?.completedParts)
      ? completion.completedParts.map(Number).filter(number => Number.isInteger(number) && number >= 1 && number <= 10)
      : []
  );
  const started = new Set(
    Array.isArray(completion?.startedParts)
      ? completion.startedParts.map(Number).filter(number => Number.isInteger(number) && number >= 1 && number <= 10)
      : []
  );
  const selections = emptySelections();

  if (completed.has(3)) {
    const data = dataOf(partOf(runtime, 3));
    selections.part3 = {
      currentCards: strings(data.currentCards),
      hfw: strings(data.hfwList),
      wordElements: strings(data.wordElements)
    };
  }

  if (completed.has(4)) {
    const data = dataOf(partOf(runtime, 4));
    selections.part4 = {
      practiceWords: strings(data.practiceWords),
      chartingWords: chartingWordsFrom(data)
    };
  }

  if (completed.has(5)) {
    const data = dataOf(partOf(runtime, 5));
    selections.part5 = {
      page: text(data.page) || null,
      sentences: strings(data.sentences)
    };
  }

  if (completed.has(8)) {
    const data = dataOf(partOf(runtime, 8));
    const dictation = data?.dictation && typeof data.dictation === 'object' && !Array.isArray(data.dictation)
      ? data.dictation
      : {};
    selections.part8 = {
      sounds: strings(dictation.sounds),
      wordElements: strings(dictation.wordElements),
      realWords: strings(dictation.realWords),
      nonsenseWords: strings(dictation.nonsenseWords),
      phrases: strings(dictation.phrases),
      sentences: strings(dictation.sentences)
    };
  }

  if (completed.has(9) || started.has(9)) {
    const data = dataOf(partOf(runtime, 9));
    selections.part9 = {
      passageId: passageIdFrom(data),
      title: text(data.passageTitle) || null,
      page: text(data.page) || null,
      status: completed.has(9) ? 'completed' : 'started'
    };
  }

  return selections;
}

export function recordLessonHistory({
  history = null,
  runtime,
  completion,
  updatedAt = new Date().toISOString()
}) {
  if (!runtime || runtime.schemaVersion !== 'wrs-runtime-v1') {
    throw new Error('A wrs-runtime-v1 lesson is required.');
  }

  const groupId = text(completion?.groupId);
  const date = text(completion?.date);
  const completionStatus = text(completion?.completionStatus);
  const sourceRef = text(completion?.sourceRef);
  const lessonId = text(runtime.id);
  const substep = normalizeSubstep(runtime);
  const focus = text(runtime.focus);

  if (!groupId) throw new Error('completion.groupId is required.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('completion.date must be YYYY-MM-DD.');
  if (!['completed','partial'].includes(completionStatus)) {
    throw new Error('completion.completionStatus must be completed or partial.');
  }
  if (!sourceRef) throw new Error('completion.sourceRef is required.');
  if (!lessonId) throw new Error('runtime.id is required.');
  if (!/^\d+\.\d+$/.test(substep)) throw new Error('Runtime Step/Substep could not be resolved.');
  if (!['introduction','accuracy','automaticity-fluency'].includes(focus)) {
    throw new Error('Runtime focus is invalid.');
  }

  const completedParts = [...new Set(
    Array.isArray(completion?.completedParts)
      ? completion.completedParts.map(Number).filter(number => Number.isInteger(number) && number >= 1 && number <= 10)
      : []
  )].sort((a,b) => a-b);

  if (completionStatus === 'completed' && completedParts.length !== 10) {
    throw new Error('A completed lesson history event must explicitly record Parts 1-10 as completed.');
  }
  if (!completedParts.length && !(Array.isArray(completion?.startedParts) && completion.startedParts.length)) {
    throw new Error('Completion evidence must name completedParts or startedParts.');
  }

  const base = history ?? {
    schemaVersion: HISTORY_VERSION,
    schoolYear: SCHOOL_YEAR,
    groupId,
    updatedAt,
    lessons: []
  };

  if (base.schemaVersion !== HISTORY_VERSION) throw new Error(`Expected ${HISTORY_VERSION}.`);
  if (base.schoolYear !== SCHOOL_YEAR) throw new Error(`History must be for ${SCHOOL_YEAR}.`);
  if (text(base.groupId) !== groupId) throw new Error('History groupId does not match completion.groupId.');

  const eventId = `${groupId}:${date}:${lessonId}`;
  const event = {
    eventId,
    lessonId,
    date,
    substep,
    focus,
    completionStatus,
    completedParts,
    sourceRef,
    selections: extractSelections(runtime, completion)
  };

  const prior = Array.isArray(base.lessons) ? base.lessons : [];
  const lessons = prior.filter(item => text(item?.eventId) !== eventId);
  lessons.push(event);
  lessons.sort((left, right) => (
    text(left.date).localeCompare(text(right.date))
    || text(left.eventId).localeCompare(text(right.eventId))
  ));

  return {
    schemaVersion: HISTORY_VERSION,
    schoolYear: SCHOOL_YEAR,
    groupId,
    updatedAt,
    lessons
  };
}

export function passageHistoryFromLedger(history) {
  if (!history || history.schemaVersion !== HISTORY_VERSION) return [];
  return (Array.isArray(history.lessons) ? history.lessons : [])
    .map(event => {
      const passage = event?.selections?.part9;
      if (!passage || passage.status === 'not-used' || !text(passage.passageId)) return null;
      return {
        substep: text(event.substep),
        passageId: text(passage.passageId),
        title: text(passage.title),
        status: passage.status === 'completed' ? 'completed' : 'started',
        date: text(event.date) || null,
        sourceRef: text(event.sourceRef)
      };
    })
    .filter(Boolean);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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
    '  node scripts/wrs-record-lesson-history.mjs --runtime lesson.json --completion completion.json [--history existing-history.json] [--out history.json]',
    '',
    'Completion evidence is explicit. Example:',
    '  {"groupId":"Test","date":"2026-09-21","completionStatus":"partial","completedParts":[1,2,3,4,5],"startedParts":[9],"sourceRef":"daily:2026-09-21:teacher"}',
    '',
    'The ledger stores only group lesson-selection continuity. It does not become curriculum authority or a duplicate student assessment store.'
  ].join('\n');
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (!options.runtime || !options.completion) {
    throw new Error(`${usage()}\n\n--runtime and --completion are required.`);
  }

  const result = recordLessonHistory({
    history: options.history ? readJson(options.history) : null,
    runtime: readJson(options.runtime),
    completion: readJson(options.completion)
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
