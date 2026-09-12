import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
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
import { createFirestoreSheetLock } from './sheetLock.js';
import { createSheetSynchronizer } from './sheetSync.js';

const app = initializeApp();
const firestore = getFirestore(app);
const triggerOptions = document => ({
  document,
  region: 'us-central1',
  maxInstances: 3,
  concurrency: 1,
  timeoutSeconds: 60,
  retry: true,
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

const syncRows = createSheetSynchronizer({
  getSheets,
  withSheetLock: createFirestoreSheetLock({ firestore })
});

export const syncCompletedMissionToSheet = onDocumentWritten(triggerOptions('missions/{missionId}'), async event => {
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

export const syncDailyNoteToSheet = onDocumentWritten(triggerOptions('daily_notes/{noteId}'), async event => {
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

export const syncGroupNoteToSheet = onDocumentWritten(triggerOptions('group_notes/{noteId}'), async event => {
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
