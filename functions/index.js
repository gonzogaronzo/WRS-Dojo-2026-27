import { initializeApp } from 'firebase-admin/app';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { google } from 'googleapis';
import {
  dailyNoteSource,
  dailyNoteToDailyLogRows,
  groupNoteSource,
  groupNoteToDailyLogRows,
  missionDailySource,
  missionToDailyLogRows,
  missionToStudentDataRows,
  studentDataSourcePrefix
} from './sheetRows.js';

initializeApp();
setGlobalOptions({
  region: 'us-central1',
  maxInstances: 3,
  serviceAccount: 'wrs-firebase@appspot.gserviceaccount.com'
});

const DATA_LOG_SPREADSHEET_ID = process.env.WRS_DATA_LOG_SPREADSHEET_ID;
const DATA_LOG_SHEET_NAME = process.env.WRS_DATA_LOG_SHEET_NAME || 'Data Log';
const DAILY_LOG_SPREADSHEET_ID = process.env.WRS_DAILY_LOG_SPREADSHEET_ID;
const DAILY_LOG_SHEET_NAME = process.env.WRS_DAILY_LOG_SHEET_NAME || 'Daily Log';

let sheetsPromise;
const getSheets = () => {
  if (!sheetsPromise) {
    sheetsPromise = (async () => {
      const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      const client = await auth.getClient();
      return google.sheets({ version: 'v4', auth: client });
    })();
  }
  return sheetsPromise;
};

const quoteSheet = sheetName => `'${String(sheetName).replaceAll("'", "''")}'`;

const assertConfig = (spreadsheetId, sheetName, label) => {
  if (!spreadsheetId) throw new Error(`${label} spreadsheet ID is not configured.`);
  if (!sheetName) throw new Error(`${label} sheet name is not configured.`);
};

async function syncRows({ spreadsheetId, sheetName, sourceColumn, sourcePrefix, rows, label }) {
  assertConfig(spreadsheetId, sheetName, label);
  const sheets = await getSheets();
  const sheet = quoteSheet(sheetName);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheet}!A:Z`,
    majorDimension: 'ROWS'
  });
  const existing = response.data.values || [];
  const matchingRows = [];
  for (let index = 1; index < existing.length; index += 1) {
    const sourceValue = String(existing[index]?.[sourceColumn] || '');
    if (sourceValue.startsWith(sourcePrefix)) matchingRows.push(index + 1);
  }

  const reuseCount = Math.min(matchingRows.length, rows.length);
  if (reuseCount > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'RAW',
        data: rows.slice(0, reuseCount).map((row, index) => ({
          range: `${sheet}!A${matchingRows[index]}`,
          majorDimension: 'ROWS',
          values: [row]
        }))
      }
    });
  }

  for (const rowNumber of matchingRows.slice(reuseCount)) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheet}!A${rowNumber}:Z${rowNumber}`
    });
  }

  const newRows = rows.slice(reuseCount);
  if (newRows.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheet}!A:Z`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: newRows }
    });
  }
}

export const syncCompletedMissionToSheet = onDocumentWritten('missions/{missionId}', async event => {
  const missionId = event.params.missionId;
  const mission = event.data?.after?.exists ? event.data.after.data() : null;
  await Promise.all([
    syncRows({
      spreadsheetId: DATA_LOG_SPREADSHEET_ID,
      sheetName: DATA_LOG_SHEET_NAME,
      sourceColumn: 10,
      sourcePrefix: studentDataSourcePrefix(missionId),
      rows: missionToStudentDataRows(mission, missionId),
      label: 'Student Data Log'
    }),
    syncRows({
      spreadsheetId: DAILY_LOG_SPREADSHEET_ID,
      sheetName: DAILY_LOG_SHEET_NAME,
      sourceColumn: 8,
      sourcePrefix: missionDailySource(missionId),
      rows: missionToDailyLogRows(mission, missionId),
      label: 'Daily Notes Log'
    })
  ]);
});

export const syncDailyNoteToSheet = onDocumentWritten('daily_notes/{noteId}', async event => {
  const noteId = event.params.noteId;
  const note = event.data?.after?.exists ? event.data.after.data() : null;
  await syncRows({
    spreadsheetId: DAILY_LOG_SPREADSHEET_ID,
    sheetName: DAILY_LOG_SHEET_NAME,
    sourceColumn: 8,
    sourcePrefix: dailyNoteSource(noteId),
    rows: dailyNoteToDailyLogRows(note, noteId),
    label: 'Daily Notes Log'
  });
});

export const syncGroupNoteToSheet = onDocumentWritten('group_notes/{noteId}', async event => {
  const noteId = event.params.noteId;
  const note = event.data?.after?.exists ? event.data.after.data() : null;
  await syncRows({
    spreadsheetId: DAILY_LOG_SPREADSHEET_ID,
    sheetName: DAILY_LOG_SHEET_NAME,
    sourceColumn: 8,
    sourcePrefix: groupNoteSource(noteId),
    rows: groupNoteToDailyLogRows(note, noteId),
    label: 'Daily Notes Log'
  });
});
