import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dailyNoteSource,
  dailyNoteToDailyLogRows,
  groupNoteSource,
  groupNoteToDailyLogRows,
  missionDailySource,
  missionToDailyLogRows,
  missionToStudentDataRows,
  studentDataSourcePrefix
} from '../functions/sheetRows.js';
import { createFirestoreSheetLock, SheetSyncBusyError } from '../functions/sheetLock.js';
import { createSheetSynchronizer, reconcileSheetRows } from '../functions/sheetSync.js';

const studentRow = (key, name = key) => [
  '2026-09-11', name, 'Group', '7.3', 'Lesson', 'Wordlist Charting',
  '15/15 (100%)', '', '', 'Present', key, ''
];

// Mocked integration fixture: this models the Google Sheets values API and
// persistent row state. It does not call Google or prove production timing.
const createMockSheets = ({ initialRows = [], appendFailure = null, beforeGet = null } = {}) => {
  const stored = initialRows.map(row => [...row]);
  const calls = { get: [], batchUpdate: [], append: [], clear: [] };
  let appendAttempt = 0;
  const values = {
    get: async request => {
      calls.get.push(request);
      if (beforeGet) await beforeGet(calls.get.length);
      return { data: { values: stored.map(row => [...row]) } };
    },
    batchUpdate: async request => {
      calls.batchUpdate.push(request);
      for (const update of request.requestBody.data) {
        const rowNumber = Number(update.range.match(/!A(\d+)/)[1]);
        stored[rowNumber - 1] = [...update.values[0]];
      }
    },
    append: async request => {
      calls.append.push(request);
      appendAttempt += 1;
      const failure = appendFailure?.(appendAttempt);
      if (failure !== 'before-commit') {
        stored.push(...request.requestBody.values.map(row => [...row]));
      }
      if (failure) throw new Error(`simulated append failure ${failure}`);
    },
    clear: async request => {
      calls.clear.push(request);
      const rowNumber = Number(request.range.match(/!A(\d+)/)[1]);
      stored[rowNumber - 1] = [];
    }
  };
  return { sheets: { spreadsheets: { values } }, stored, calls };
};

const reconcile = (fixture, overrides = {}) => reconcileSheetRows({
  sheets: fixture.sheets,
  spreadsheetId: 'spreadsheet-test',
  sheetName: 'Data Log',
  sourceColumn: 10,
  sourcePrefix: 'WRS Dojo mission:mission-1 ',
  rows: [],
  label: 'Student Data Log',
  ...overrides
});

test('mocked integration: exact stable keys update existing rows and append missing rows', async () => {
  const fixture = createMockSheets({
    initialRows: [['header'], studentRow('WRS Dojo mission:mission-1 student:a', 'old')]
  });
  const result = await reconcile(fixture, { rows: [
    studentRow('WRS Dojo mission:mission-1 student:a', 'updated'),
    studentRow('WRS Dojo mission:mission-1 student:b', 'new')
  ] });

  assert.deepEqual(result, { updated: 1, appended: 1, cleared: 0 });
  assert.equal(fixture.calls.batchUpdate.length, 1);
  assert.match(fixture.calls.batchUpdate[0].requestBody.data[0].range, /!A2$/);
  assert.equal(fixture.calls.append.length, 1);
  assert.deepEqual(fixture.stored.filter(row => row.length).slice(1).map(row => row[1]), ['updated', 'new']);
});

test('mocked integration: repeated invocation updates without duplicate append', async () => {
  const fixture = createMockSheets({ initialRows: [['header']] });
  const rows = [studentRow('WRS Dojo mission:mission-1 student:a')];

  assert.deepEqual(await reconcile(fixture, { rows }), { updated: 0, appended: 1, cleared: 0 });
  assert.deepEqual(await reconcile(fixture, { rows }), { updated: 1, appended: 0, cleared: 0 });
  assert.equal(fixture.calls.append.length, 1);
  assert.equal(fixture.stored.filter(row => row[10]?.includes('student:a')).length, 1);
});

test('mocked integration: retry after append failed before commit writes every missing row once', async () => {
  const fixture = createMockSheets({
    initialRows: [['header']],
    appendFailure: attempt => attempt === 1 ? 'before-commit' : null
  });
  const rows = [
    studentRow('WRS Dojo mission:mission-1 student:a'),
    studentRow('WRS Dojo mission:mission-1 student:b')
  ];

  await assert.rejects(reconcile(fixture, { rows }), /before-commit/);
  assert.deepEqual(await reconcile(fixture, { rows }), { updated: 0, appended: 2, cleared: 0 });
  assert.equal(fixture.stored.length, 3);
});

test('mocked integration: retry detects append committed before an uncertain response failed', async () => {
  const fixture = createMockSheets({
    initialRows: [['header']],
    appendFailure: attempt => attempt === 1 ? 'after-commit' : null
  });
  const rows = [studentRow('WRS Dojo mission:mission-1 student:a')];

  await assert.rejects(reconcile(fixture, { rows }), /after-commit/);
  assert.deepEqual(await reconcile(fixture, { rows }), { updated: 1, appended: 0, cleared: 0 });
  assert.equal(fixture.calls.append.length, 1);
  assert.equal(fixture.stored.length, 2);
});

test('mocked integration: update failure prevents append and stale-row cleanup until retry', async () => {
  const stale = studentRow('WRS Dojo mission:mission-1 student:stale');
  const fixture = createMockSheets({
    initialRows: [['header'], studentRow('WRS Dojo mission:mission-1 student:a', 'old'), stale]
  });
  const originalUpdate = fixture.sheets.spreadsheets.values.batchUpdate;
  let failOnce = true;
  fixture.sheets.spreadsheets.values.batchUpdate = async request => {
    if (failOnce) {
      failOnce = false;
      throw new Error('simulated update failure');
    }
    return originalUpdate(request);
  };
  const rows = [
    studentRow('WRS Dojo mission:mission-1 student:a', 'updated'),
    studentRow('WRS Dojo mission:mission-1 student:b', 'new')
  ];

  await assert.rejects(reconcile(fixture, { rows }), /update failure/);
  assert.equal(fixture.calls.append.length, 0);
  assert.equal(fixture.calls.clear.length, 0);
  assert.deepEqual(await reconcile(fixture, { rows }), { updated: 1, appended: 1, cleared: 1 });
  assert.equal(fixture.stored[1][1], 'updated');
  assert.deepEqual(fixture.stored[2], []);
});

test('mocked integration: duplicate existing stable keys are reduced to one row', async () => {
  const key = 'WRS Dojo mission:mission-1 student:a';
  const fixture = createMockSheets({ initialRows: [['header'], studentRow(key, 'first'), studentRow(key, 'duplicate')] });

  assert.deepEqual(await reconcile(fixture, { rows: [studentRow(key, 'canonical')] }), {
    updated: 1,
    appended: 0,
    cleared: 1
  });
  assert.equal(fixture.stored[1][1], 'canonical');
  assert.deepEqual(fixture.stored[2], []);
});

test('mocked integration: in-process concurrent attempts serialize and re-read before append', async () => {
  let releaseFirstGet;
  const blocked = new Promise(resolve => { releaseFirstGet = resolve; });
  const fixture = createMockSheets({
    initialRows: [['header']],
    beforeGet: invocation => invocation === 1 ? blocked : undefined
  });
  const syncRows = createSheetSynchronizer({
    getSheets: async () => fixture.sheets,
    withSheetLock: async ({ task }) => task()
  });
  const input = {
    spreadsheetId: 'spreadsheet-test',
    sheetName: 'Data Log',
    sourceColumn: 10,
    sourcePrefix: 'WRS Dojo mission:mission-1 ',
    rows: [studentRow('WRS Dojo mission:mission-1 student:a')],
    label: 'Student Data Log'
  };

  const first = syncRows(input);
  const second = syncRows(input);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fixture.calls.get.length, 1);
  releaseFirstGet();
  assert.deepEqual(await Promise.all([first, second]), [
    { updated: 0, appended: 1, cleared: 0 },
    { updated: 1, appended: 0, cleared: 0 }
  ]);
  assert.equal(fixture.calls.append.length, 1);
});

const createFakeFirestore = () => {
  const documents = new Map();
  let transactionQueue = Promise.resolve();
  return {
    documents,
    collection: collection => ({ doc: id => ({ path: `${collection}/${id}` }) }),
    runTransaction: callback => {
      const result = transactionQueue.then(async () => {
        const mutations = [];
        const transaction = {
          get: async ref => ({
            exists: documents.has(ref.path),
            data: () => documents.get(ref.path)
          }),
          set: (ref, value) => mutations.push(() => documents.set(ref.path, value)),
          delete: ref => mutations.push(() => documents.delete(ref.path))
        };
        const value = await callback(transaction);
        mutations.forEach(apply => apply());
        return value;
      });
      transactionQueue = result.catch(() => undefined);
      return result;
    }
  };
};

test('unit: Firestore lease rejects a concurrent owner and allows its retry after release', async () => {
  const firestore = createFakeFirestore();
  const withLock = createFirestoreSheetLock({ firestore, leaseMs: 60_000 });
  let releaseFirst;
  const firstBlocked = new Promise(resolve => { releaseFirst = resolve; });
  const first = withLock({ spreadsheetId: 'shared-sheet', task: async () => firstBlocked });
  await new Promise(resolve => setImmediate(resolve));

  await assert.rejects(
    withLock({ spreadsheetId: 'shared-sheet', task: async () => 'second' }),
    SheetSyncBusyError
  );
  releaseFirst('first');
  assert.equal(await first, 'first');
  assert.equal(await withLock({ spreadsheetId: 'shared-sheet', task: async () => 'retry' }), 'retry');
  assert.equal(firestore.documents.size, 0);
});

test('mocked integration: every supported transformation reconciles through the shared sync path', async t => {
  const mission = {
    id: 'mission-flow',
    date: '2026-09-11',
    squadName: 'Group',
    lessonTitle: 'Lesson',
    step: '7',
    substep: '3',
    attendance: [{ studentId: 'student-a', studentName: 'Student A', status: 'present' }],
    results: [{ studentId: 'student-a', studentName: 'Student A', correctCount: 15, totalCount: 15, accuracy: 100 }]
  };
  const flows = [
    {
      name: 'mission-to-student-log', sourceColumn: 10,
      sourcePrefix: studentDataSourcePrefix('mission-flow'), rows: missionToStudentDataRows(mission, 'mission-flow')
    },
    {
      name: 'mission-to-daily-log', sourceColumn: 8,
      sourcePrefix: missionDailySource('mission-flow'), rows: missionToDailyLogRows(mission, 'mission-flow')
    },
    {
      name: 'daily-note', sourceColumn: 8,
      sourcePrefix: dailyNoteSource('daily-1'),
      rows: dailyNoteToDailyLogRows({ date: '2026-09-11', content: 'Daily' }, 'daily-1')
    },
    {
      name: 'group-note', sourceColumn: 8,
      sourcePrefix: groupNoteSource('group-1'),
      rows: groupNoteToDailyLogRows({ sessionDate: '2026-09-11', content: 'Group' }, 'group-1')
    }
  ];

  for (const flow of flows) {
    await t.test(flow.name, async () => {
      const fixture = createMockSheets({ initialRows: [['header']] });
      const input = {
        sheets: fixture.sheets,
        spreadsheetId: 'spreadsheet-test',
        sheetName: 'Log',
        label: flow.name,
        ...flow
      };
      assert.deepEqual(await reconcileSheetRows(input), { updated: 0, appended: flow.rows.length, cleared: 0 });
      assert.deepEqual(await reconcileSheetRows(input), { updated: flow.rows.length, appended: 0, cleared: 0 });
      assert.equal(fixture.calls.append.length, 1);
    });
  }
});

test('unit: all deployed sheet triggers enable retries and single-request instance concurrency', async () => {
  const functions = await import('../functions/index.js');
  for (const name of ['syncCompletedMissionToSheet', 'syncDailyNoteToSheet', 'syncGroupNoteToSheet']) {
    const endpoint = functions[name].__endpoint;
    assert.equal(endpoint.eventTrigger.retry, true, `${name} retry`);
    assert.equal(endpoint.concurrency, 1, `${name} concurrency`);
    assert.equal(endpoint.timeoutSeconds, 60, `${name} timeout`);
  }
});
