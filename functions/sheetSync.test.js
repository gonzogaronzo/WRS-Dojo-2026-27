'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createSerializedReconciler, reconcileMissionRows } = require('./sheetSync');

const row = (syncKey, value = syncKey) => [
  '2026-09-07', value, 'Group', '7.3', 'Lesson', 'Word charting',
  '15/15 (100%)', '', '', 'Present', 'automatic', 'No', syncKey, 'mission-1'
];

// Mocked integration-style fixture: it exercises reconciliation through the
// same Google Sheets API surface used in production, but it is not a live API
// or distributed-concurrency test.
const createMockSheets = ({ initialRows = [], appendFailure = null, beforeGet = null } = {}) => {
  const stored = initialRows.map(value => [...value]);
  const calls = { update: [], get: [], batchUpdate: [], append: [] };
  let appendAttempts = 0;
  const values = {
    update: async request => calls.update.push(request),
    get: async request => {
      calls.get.push(request);
      if (beforeGet) await beforeGet(calls.get.length);
      return { data: { values: stored.map(value => [value[12], value[13]]) } };
    },
    batchUpdate: async request => {
      calls.batchUpdate.push(request);
      for (const update of request.requestBody.data) {
        const sheetRow = Number(update.range.match(/!A(\d+):N/)[1]);
        stored[sheetRow - 2] = [...update.values[0]];
      }
    },
    append: async request => {
      calls.append.push(request);
      appendAttempts += 1;
      const shouldFail = appendFailure?.(appendAttempts);
      if (shouldFail !== 'before-commit') {
        stored.push(...request.requestBody.values.map(value => [...value]));
      }
      if (shouldFail) throw new Error(`simulated append failure ${shouldFail}`);
    }
  };
  return { sheets: { spreadsheets: { values } }, stored, calls };
};

const sync = (fixture, rows) => reconcileMissionRows({
  sheets: fixture.sheets,
  spreadsheetId: 'spreadsheet-test',
  sheetName: "Teacher's Log",
  rows
});

test('mocked integration: appends missing rows and updates rows found by stable key', async () => {
  const fixture = createMockSheets({ initialRows: [row('mission-1:student-1', 'old')] });
  const result = await sync(fixture, [
    row('mission-1:student-1', 'updated'),
    row('mission-1:student-2', 'new')
  ]);

  assert.deepEqual(result, { updated: 1, appended: 1 });
  assert.equal(fixture.calls.batchUpdate.length, 1);
  assert.match(fixture.calls.batchUpdate[0].requestBody.data[0].range, /!A2:N2$/);
  assert.equal(fixture.calls.append.length, 1);
  assert.deepEqual(fixture.stored.map(value => value[1]), ['updated', 'new']);
});

test('mocked integration: repeated invocation updates instead of duplicating rows', async () => {
  const fixture = createMockSheets();
  const desired = [row('mission-1:student-1')];

  assert.deepEqual(await sync(fixture, desired), { updated: 0, appended: 1 });
  assert.deepEqual(await sync(fixture, desired), { updated: 1, appended: 0 });
  assert.equal(fixture.stored.length, 1);
  assert.equal(fixture.calls.append.length, 1);
});

test('mocked integration: retry recovers when append failed before committing', async () => {
  const fixture = createMockSheets({
    appendFailure: attempt => attempt === 1 ? 'before-commit' : null
  });
  const desired = [row('mission-1:student-1')];

  await assert.rejects(sync(fixture, desired), /before-commit/);
  assert.deepEqual(await sync(fixture, desired), { updated: 0, appended: 1 });
  assert.equal(fixture.stored.length, 1);
  assert.equal(fixture.calls.append.length, 2);
});

test('mocked integration: retry detects an append committed before its response failed', async () => {
  const fixture = createMockSheets({
    appendFailure: attempt => attempt === 1 ? 'after-commit' : null
  });
  const desired = [row('mission-1:student-1')];

  await assert.rejects(sync(fixture, desired), /after-commit/);
  assert.deepEqual(await sync(fixture, desired), { updated: 1, appended: 0 });
  assert.equal(fixture.stored.length, 1);
  assert.equal(fixture.calls.append.length, 1);
});

test('mocked integration: update failure prevents append so a retry cannot lose rows', async () => {
  const fixture = createMockSheets({ initialRows: [row('mission-1:student-1', 'old')] });
  const originalBatchUpdate = fixture.sheets.spreadsheets.values.batchUpdate;
  let failOnce = true;
  fixture.sheets.spreadsheets.values.batchUpdate = async request => {
    if (failOnce) {
      failOnce = false;
      throw new Error('simulated update failure');
    }
    return originalBatchUpdate(request);
  };
  const desired = [row('mission-1:student-1', 'updated'), row('mission-1:student-2', 'new')];

  await assert.rejects(sync(fixture, desired), /update failure/);
  assert.equal(fixture.calls.append.length, 0);
  assert.deepEqual(await sync(fixture, desired), { updated: 1, appended: 1 });
  assert.deepEqual(fixture.stored.map(value => value[1]), ['updated', 'new']);
});

test('mocked integration: serialized concurrent attempts do not both append', async () => {
  let releaseFirstGet;
  const firstGetBlocked = new Promise(resolve => { releaseFirstGet = resolve; });
  const fixture = createMockSheets({
    beforeGet: invocation => invocation === 1 ? firstGetBlocked : undefined
  });
  const serializedSync = createSerializedReconciler(reconcileMissionRows);
  const input = {
    sheets: fixture.sheets,
    spreadsheetId: 'spreadsheet-test',
    sheetName: 'Data Log',
    rows: [row('mission-1:student-1')]
  };

  const first = serializedSync(input);
  const second = serializedSync(input);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fixture.calls.get.length, 1, 'second reconciliation must wait for the first');
  releaseFirstGet();

  assert.deepEqual(await Promise.all([first, second]), [
    { updated: 0, appended: 1 },
    { updated: 1, appended: 0 }
  ]);
  assert.equal(fixture.stored.length, 1);
  assert.equal(fixture.calls.append.length, 1);
});

test('unit: duplicate desired keys collapse to one logical destination row', async () => {
  const fixture = createMockSheets();
  await sync(fixture, [row('mission-1:student-1', 'old'), row('mission-1:student-1', 'latest')]);
  assert.equal(fixture.stored.length, 1);
  assert.equal(fixture.stored[0][1], 'latest');
});

test('unit: rejects a row without a stable key before writing mission data', async () => {
  const fixture = createMockSheets();
  const invalid = row('');
  await assert.rejects(sync(fixture, [invalid]), /missing its WRS sync key/);
  assert.equal(fixture.calls.append.length, 0);
});
