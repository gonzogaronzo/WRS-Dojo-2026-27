import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
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
import {
  assertPlanningExportAuthorized,
  parseAllowedTeacherUids,
  readPlanningSheetValues
} from './planningSheetRead.js';
import {
  planningStateForExport,
  readPlanningOperationalStates,
  savePlanningOperationalState
} from './planningOperationalState.js';

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
const PLANNING_ALLOWED_TEACHER_UIDS = parseAllowedTeacherUids(process.env.WRS_PLANNING_ALLOWED_TEACHER_UIDS);

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


const planningExportOptions = {
  region: 'us-central1',
  maxInstances: 2,
  concurrency: 4,
  timeoutSeconds: 60,
  serviceAccount: 'wrs-firebase@appspot.gserviceaccount.com'
};

const planningError = error => {
  const code = error?.code;
  if (code === 'unauthenticated' || code === 'permission-denied' || code === 'failed-precondition') {
    return new HttpsError(code, error.message);
  }
  const message = String(error?.message || '');
  if (/must be YYYY-MM-DD|invalid|unsupported planning group|does not match|at least one|exceeds|too large|required/i.test(message)) {
    return new HttpsError('invalid-argument', message);
  }
  console.error('Planning operation failed.', error);
  return new HttpsError('internal', 'Planning operation failed.');
};

export const getPlanningSheetValues = onCall(planningExportOptions, async request => {
  try {
    assertPlanningExportAuthorized({
      authUid: request.auth?.uid,
      allowedTeacherUids: PLANNING_ALLOWED_TEACHER_UIDS
    });

    const teacherId = request.auth.uid;
    const [sheetExport, statesByGroup] = await Promise.all([
      readPlanningSheetValues({
        sheets: await getSheets(),
        dataSpreadsheetId: DATA_LOG_SPREADSHEET_ID,
        dailySpreadsheetId: DAILY_LOG_SPREADSHEET_ID,
        asOf: request.data?.asOf,
        weekOf: request.data?.weekOf
      }),
      readPlanningOperationalStates({
        firestore,
        teacherId
      })
    ]);
    const operational = planningStateForExport(statesByGroup);

    return {
      ...sheetExport,
      groups: sheetExport.groups.map(group => ({
        ...group,
        selectionHistory: operational.groups[group.groupId]?.selectionHistory ?? null
      })),
      validatedArtifacts: operational.validatedArtifacts
    };
  } catch (error) {
    throw planningError(error);
  }
});


export const savePlanningOperationalStateCallable = onCall(planningExportOptions, async request => {
  try {
    assertPlanningExportAuthorized({
      authUid: request.auth?.uid,
      allowedTeacherUids: PLANNING_ALLOWED_TEACHER_UIDS
    });

    return await savePlanningOperationalState({
      firestore,
      teacherId: request.auth.uid,
      groupId: request.data?.groupId,
      selectionHistory: request.data?.selectionHistory,
      plannedDate: request.data?.plannedDate,
      validatedArtifact: request.data?.validatedArtifact
    });
  } catch (error) {
    throw planningError(error);
  }
});
