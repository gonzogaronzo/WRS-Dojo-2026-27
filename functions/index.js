'use strict';

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { defineString } = require('firebase-functions/params');
const { google } = require('googleapis');
const { missionRows } = require('./missionRows');

const spreadsheetId = defineString('WRS_DATA_LOG_SPREADSHEET_ID', {
  default: '1RcYj87UyBYWTRvOjmfpyJjvYVb5AWIV5aY6t6Ss9G7o'
});
const sheetName = defineString('WRS_DATA_LOG_SHEET_NAME', { default: 'Data Log' });

const quotedSheet = value => `'${String(value).replaceAll("'", "''")}'`;

exports.syncCompletedMissionToSheet = onDocumentWritten({
  document: 'missions/{missionId}',
  region: 'us-central1',
  retry: true,
  maxInstances: 3
}, async event => {
  const mission = event.data?.after?.exists ? event.data.after.data() : null;
  const rows = missionRows(mission);
  if (rows.length === 0) return;

  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const targetId = spreadsheetId.value();
  const tab = quotedSheet(sheetName.value());

  await sheets.spreadsheets.values.update({
    spreadsheetId: targetId,
    range: `${tab}!M1:N1`,
    valueInputOption: 'RAW',
    requestBody: { values: [['WRS Sync Key', 'WRS Mission ID']] }
  });

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: targetId,
    range: `${tab}!M2:N`
  });
  const existingRows = existing.data.values || [];
  const rowBySyncKey = new Map(
    existingRows.map((row, index) => [row[0], index + 2]).filter(([key]) => Boolean(key))
  );
  const updates = [];
  const additions = [];

  for (const row of rows) {
    const existingRow = rowBySyncKey.get(row[12]);
    if (existingRow) {
      updates.push({ range: `${tab}!A${existingRow}:N${existingRow}`, values: [row] });
    } else {
      additions.push(row);
    }
  }

  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: targetId,
      requestBody: { valueInputOption: 'RAW', data: updates }
    });
  }
  if (additions.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: targetId,
      range: `${tab}!A:N`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: additions }
    });
  }
});
