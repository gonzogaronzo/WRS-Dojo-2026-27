'use strict';

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { defineString } = require('firebase-functions/params');
const { google } = require('googleapis');
const { missionRows } = require('./missionRows');
const { createSerializedReconciler, reconcileMissionRows } = require('./sheetSync');

const spreadsheetId = defineString('WRS_DATA_LOG_SPREADSHEET_ID');
const sheetName = defineString('WRS_DATA_LOG_SHEET_NAME', { default: 'Data Log' });
const serializedReconcile = createSerializedReconciler(reconcileMissionRows);

exports.syncCompletedMissionToSheet = onDocumentWritten({
  document: 'missions/{missionId}',
  region: 'us-central1',
  retry: true,
  // Sheets has no conditional append primitive. Keep the read/reconcile/write
  // sequence single-file across the function and within each instance.
  maxInstances: 1,
  concurrency: 1
}, async event => {
  const mission = event.data?.after?.exists ? event.data.after.data() : null;
  const rows = missionRows(mission);
  if (rows.length === 0) return;

  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const targetId = spreadsheetId.value();
  if (!targetId) throw new Error('WRS_DATA_LOG_SPREADSHEET_ID is required.');

  await serializedReconcile({
    sheets,
    spreadsheetId: targetId,
    sheetName: sheetName.value(),
    rows
  });
});
