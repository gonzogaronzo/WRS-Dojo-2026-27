import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  CURRENT_SNAPSHOT_RANGE,
  DATA_LOG_RANGE,
  DAILY_NOTE_RANGES,
  DAILY_NOTE_TABS,
  assertPlanningExportAuthorized,
  parseAllowedTeacherUids,
  parseTeacherFocusOverrides,
  parseTeacherTargetOverrides,
  readPlanningSheetValues
} from '../functions/planningSheetRead.js';

import { DATA_LOG_HEADERS } from '../functions/chartingEvidence.js';

const dataValues = [DATA_LOG_HEADERS, ['2026-09-18', 'Synthetic Student', 'Synthetic', '5.4', 'Charting', 'Real-Word Charting', '13/15']];

const currentValues = [
  ['Student', 'Group', 'Current Substep'],
  ['Synthetic Student', 'Synthetic', '5.5']
];

const dailyValues = tab => [
  ['Date', 'Group', 'Student(s)', 'Record Type', 'Category', 'Substep / Lesson', 'Note / Data', 'Follow-up / Instructional Response', 'Source'],
  ['2026-09-21', tab, 'Synthetic Student', 'Instructional / Student Data', 'Synthetic', '5.5 Introduction', 'Synthetic note.', 'Continue.', 'Synthetic source']
];

const fakeSheets = () => {
  const calls = [];
  return {
    calls,
    client: {
      spreadsheets: {
        values: {
          get: async args => {
            calls.push(args);
            if (args.spreadsheetId === 'data-id' && args.range === CURRENT_SNAPSHOT_RANGE) {
              return { data: { values: currentValues } };
            }
            if (args.spreadsheetId === 'data-id' && args.range === DATA_LOG_RANGE) {
              return { data: { values: dataValues } };
            }
            const tab = DAILY_NOTE_TABS.find(name => (
              args.spreadsheetId === 'daily-id' && args.range === DAILY_NOTE_RANGES[name]
            ));
            if (tab) return { data: { values: dailyValues(tab) } };
            throw new Error(`Unexpected read: ${args.spreadsheetId} ${args.range}`);
          }
        }
      }
    }
  };
};

test('planning export allowlist is explicit and fail-closed', () => {
  assert.deepEqual(parseAllowedTeacherUids(' teacher-a,teacher-b, teacher-a '), ['teacher-a', 'teacher-b']);

  assert.throws(
    () => assertPlanningExportAuthorized({ authUid: '', allowedTeacherUids: ['teacher-a'] }),
    error => error.code === 'unauthenticated'
  );
  assert.throws(
    () => assertPlanningExportAuthorized({ authUid: 'teacher-a', allowedTeacherUids: [] }),
    error => error.code === 'failed-precondition'
  );
  assert.throws(
    () => assertPlanningExportAuthorized({ authUid: 'teacher-x', allowedTeacherUids: ['teacher-a'] }),
    error => error.code === 'permission-denied'
  );
  assert.doesNotThrow(
    () => assertPlanningExportAuthorized({ authUid: 'teacher-a', allowedTeacherUids: ['teacher-a'] })
  );
});

test('teacher focus overrides are normalized and restricted to supported groups', () => {
  assert.deepEqual(
    parseTeacherFocusOverrides({
      '4A': 'Introduction',
      '5A': 'fluency',
      '5B': ''
    }),
    {
      '4A': 'Introduction',
      '5A': 'Automaticity/Fluency'
    }
  );

  assert.throws(
    () => parseTeacherFocusOverrides({ Unknown: 'Accuracy' }),
    /Unsupported planning group/i
  );
  assert.throws(
    () => parseTeacherFocusOverrides({ '4A': 'Something else' }),
    /must be Introduction, Accuracy, or Automaticity\/Fluency/i
  );
});

test('planning export reads the fixed Current Snapshot, Data Log and six fixed Daily Notes tabs', async () => {
  const fake = fakeSheets();
  const result = await readPlanningSheetValues({
    sheets: fake.client,
    dataSpreadsheetId: 'data-id',
    dailySpreadsheetId: 'daily-id',
    asOf: '2026-09-21',
    weekOf: '2026-09-21'
  });

  assert.equal(result.schemaVersion, 'wrs-sheet-values-export-v1');
  assert.equal(result.schoolYear, '2026-27');
  assert.deepEqual(result.currentSnapshotValues, currentValues);
  assert.deepEqual(Object.keys(result.dailyTabValues), DAILY_NOTE_TABS);
  assert.equal(result.chartingEvidence.records[0].scoredCount, 15);
  assert.equal(result.chartingEvidence.records[0].chartingType, 'real');
  assert.equal(fake.calls.length, 2 + DAILY_NOTE_TABS.length);

  assert.deepEqual(
    fake.calls.map(call => [call.spreadsheetId, call.range]),
    [
      ['data-id', CURRENT_SNAPSHOT_RANGE],
      ['data-id', DATA_LOG_RANGE],
      ...DAILY_NOTE_TABS.map(tab => ['daily-id', DAILY_NOTE_RANGES[tab]])
    ]
  );
});

test('planning export rejects invalid dates and empty required sheet data', async () => {
  const fake = fakeSheets();
  await assert.rejects(
    () => readPlanningSheetValues({
      sheets: fake.client,
      dataSpreadsheetId: 'data-id',
      dailySpreadsheetId: 'daily-id',
      asOf: 'Sep 21',
      weekOf: '2026-09-21'
    }),
    /asOf must be YYYY-MM-DD/
  );

  const emptyClient = {
    spreadsheets: {
      values: {
        get: async () => ({ data: { values: [] } })
      }
    }
  };
  await assert.rejects(
    () => readPlanningSheetValues({
      sheets: emptyClient,
      dataSpreadsheetId: 'data-id',
      dailySpreadsheetId: 'daily-id',
      asOf: '2026-09-21',
      weekOf: '2026-09-21'
    }),
    /Current Snapshot returned no values/
  );
});

test('callable planning export is auth-gated and does not accept spreadsheet IDs or tab names from request data', async () => {
  const source = await readFile(new URL('../functions/index.js', import.meta.url), 'utf8');

  assert.match(source, /assertPlanningExportAuthorized/);
  assert.match(source, /request\.auth\?\.uid/);
  assert.match(source, /WRS_PLANNING_ALLOWED_TEACHER_UIDS/);
  assert.match(source, /dataSpreadsheetId:\s*DATA_LOG_SPREADSHEET_ID/);
  assert.match(source, /dailySpreadsheetId:\s*DAILY_LOG_SPREADSHEET_ID/);
  assert.match(source, /parseTeacherFocusOverrides\(request\.data\?\.focusOverrides\)/);
  assert.match(source, /parseTeacherTargetOverrides\(request\.data\?\.targetOverrides\)/);
  assert.match(source, /teacherTargetOverride:\s*targetOverrides\[group\.groupId\]/);
  assert.match(source, /teacherFocusOverride:\s*focusOverrides\[group\.groupId\]/);
  assert.doesNotMatch(source, /request\.data\?\.(?:spreadsheetId|dataSpreadsheetId|dailySpreadsheetId|sheetName|tabName)/);
});

test('planning export tests contain no current real-student names', () => {
  const source = JSON.stringify({ currentValues, dailyValues: dailyValues('Synthetic') });
  for (const name of ['Oliver', 'Ethan', 'Alex', 'Finn', 'Maya', 'Enrique', 'Levi', 'Nora', 'Eleanor', 'Alice', 'Izzy', 'Juliana', 'Carolyn', 'Elise', 'Charlotte', 'Bennett', 'Ben', 'Xavier', 'Uffarren']) {
    assert.equal(source.includes(name), false);
  }
});

test('missing Data Log values remain unavailable rather than becoming an empty successful export', async () => {
  const fake = fakeSheets();
  const get = fake.client.spreadsheets.values.get;
  fake.client.spreadsheets.values.get = args => args.range === DATA_LOG_RANGE
    ? Promise.resolve({ data: {} }) : get(args);
  const result = await readPlanningSheetValues({sheets: fake.client, dataSpreadsheetId: 'data-id', dailySpreadsheetId: 'daily-id', asOf: '2026-09-18', weekOf: '2026-09-21'});
  assert.equal(result.chartingEvidence.status, 'unavailable');
});

test('failed Data Log transport rejects the export, never returning successful partial evidence', async () => {
  const fake = fakeSheets();
  const get = fake.client.spreadsheets.values.get;
  fake.client.spreadsheets.values.get = args => args.range === DATA_LOG_RANGE
    ? Promise.reject(new Error('Data Log read failed')) : get(args);
  await assert.rejects(() => readPlanningSheetValues({sheets: fake.client, dataSpreadsheetId: 'data-id', dailySpreadsheetId: 'daily-id', asOf: '2026-09-18', weekOf: '2026-09-21'}), /Data Log read failed/);
});

test('request targets are validated separately from focus and restricted to supported groups', () => {
  assert.deepEqual(parseTeacherTargetOverrides({'3A': ' 2.5 ', '5A': '7.5'}), {'3A': '2.5', '5A': '7.5'});
  assert.deepEqual(parseTeacherTargetOverrides(null), {});
  for (const input of [[], '2.5', {'Unknown': '2.5'}, {'3A': ''}, {'3A': '2.5 then 3.1'}, {'3A': '0.0'}]) {
    assert.throws(() => parseTeacherTargetOverrides(input));
  }
});
