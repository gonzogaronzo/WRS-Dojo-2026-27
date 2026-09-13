import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
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
      const auth = new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
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

const mnemonicAtlasParts = [
  'atlas-01.b64', 'atlas-02.b64', 'atlas-03.b64', 'atlas-04.b64',
  'atlas-05.b64', 'atlas-06.b64', 'atlas-07.b64', 'atlas-08.b64'
];
const normalizeMnemonicAtlasPart = (part, index) => {
  const compact = part.replace(/\s+/g, '');
  return index < mnemonicAtlasParts.length - 1 ? compact.slice(0, 8000) : compact;
};
let mnemonicAtlasPromise;
const getMnemonicAtlas = () => {
  mnemonicAtlasPromise ||= Promise.all(
    mnemonicAtlasParts.map(name => readFile(fileURLToPath(new URL(`./assets/word-element-mnemonic-atlas/${name}`, import.meta.url)), 'utf8'))
  ).then(parts => Buffer.from(parts.map(normalizeMnemonicAtlasPart).join(''), 'base64'));
  return mnemonicAtlasPromise;
};

const allowedMnemonicOrigin = origin => !origin
  || origin === 'https://wrs-firebase.web.app'
  || /^https:\/\/wrs-firebase--[a-z0-9-]+\.web\.app$/i.test(origin)
  || /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/i.test(origin);

export const serveWordElementMnemonicAtlas = onRequest({
  region: 'us-central1',
  maxInstances: 3,
  concurrency: 20,
  timeoutSeconds: 30,
  serviceAccount: 'wrs-firebase@appspot.gserviceaccount.com'
}, async (request, response) => {
  const origin = request.get('origin') || '';
  if (!allowedMnemonicOrigin(origin)) {
    response.status(403).send('Origin not allowed');
    return;
  }

  if (origin) response.set('Access-Control-Allow-Origin', origin);
  response.set('Vary', 'Origin');
  response.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  response.set('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }
  if (request.method !== 'GET') {
    response.set('Allow', 'GET, OPTIONS');
    response.status(405).send('Method not allowed');
    return;
  }

  const authorization = request.get('authorization') || '';
  const bearer = authorization.match(/^Bearer\s+(.+)$/i);
  if (!bearer) {
    response.status(401).send('Authentication required');
    return;
  }

  try {
    await getAuth(app).verifyIdToken(bearer[1]);
  } catch {
    response.status(401).send('Invalid authentication token');
    return;
  }

  try {
    const atlas = await getMnemonicAtlas();
    response.set('Content-Type', 'image/png');
    response.set('Cache-Control', 'private, max-age=3600');
    response.status(200).send(atlas);
  } catch (error) {
    console.error('Unable to read word-element mnemonic atlas', error);
    response.status(500).send('Mnemonic atlas unavailable');
  }
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
