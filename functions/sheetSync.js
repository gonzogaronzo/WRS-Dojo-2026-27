'use strict';

const quotedSheet = value => `'${String(value).replaceAll("'", "''")}'`;

const reconcileMissionRows = async ({ sheets, spreadsheetId, sheetName, rows }) => {
  if (rows.length === 0) return { updated: 0, appended: 0 };

  const tab = quotedSheet(sheetName);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!M1:N1`,
    valueInputOption: 'RAW',
    requestBody: { values: [['WRS Sync Key', 'WRS Mission ID']] }
  });

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!M2:N`
  });
  const existingRows = existing.data.values || [];
  const rowBySyncKey = new Map(
    existingRows
      .map((row, index) => [row[0], index + 2])
      .filter(([key]) => Boolean(key))
  );

  // One stable key represents one destination row. Collapse duplicate input
  // entries rather than appending the same logical row twice in one request.
  const desiredRows = new Map();
  for (const row of rows) {
    const syncKey = row[12];
    if (!syncKey) throw new Error('A mission row is missing its WRS sync key.');
    desiredRows.set(syncKey, row);
  }

  const updates = [];
  const additions = [];
  for (const [syncKey, row] of desiredRows) {
    const existingRow = rowBySyncKey.get(syncKey);
    if (existingRow) {
      updates.push({ range: `${tab}!A${existingRow}:N${existingRow}`, values: [row] });
    } else {
      additions.push(row);
    }
  }

  // Do not append if an update fails. A retry can safely repeat successful
  // updates, re-read keys, and then append only rows that are still absent.
  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: 'RAW', data: updates }
    });
  }
  if (additions.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${tab}!A:N`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: additions }
    });
  }

  return { updated: updates.length, appended: additions.length };
};

const createSerializedReconciler = reconcile => {
  let pending = Promise.resolve();
  return input => {
    const result = pending.then(() => reconcile(input));
    pending = result.catch(() => undefined);
    return result;
  };
};

module.exports = { createSerializedReconciler, quotedSheet, reconcileMissionRows };
