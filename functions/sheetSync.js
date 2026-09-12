const quoteSheet = sheetName => `'${String(sheetName).replaceAll("'", "''")}'`;

const assertSyncInput = ({ spreadsheetId, sheetName, sourceColumn, sourcePrefix, rows, label }) => {
  if (!spreadsheetId) throw new Error(`${label} spreadsheet ID is not configured.`);
  if (!sheetName) throw new Error(`${label} sheet name is not configured.`);
  if (!Number.isInteger(sourceColumn) || sourceColumn < 0) {
    throw new Error(`${label} source column is invalid.`);
  }
  if (!sourcePrefix) throw new Error(`${label} source prefix is missing.`);
  if (!Array.isArray(rows)) throw new Error(`${label} rows must be an array.`);
};

export async function reconcileSheetRows({
  sheets,
  spreadsheetId,
  sheetName,
  sourceColumn,
  sourcePrefix,
  rows,
  label
}) {
  assertSyncInput({ spreadsheetId, sheetName, sourceColumn, sourcePrefix, rows, label });
  const sheet = quoteSheet(sheetName);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheet}!A:Z`,
    majorDimension: 'ROWS'
  });
  const existing = response.data.values || [];

  const existingRowsByKey = new Map();
  for (let index = 1; index < existing.length; index += 1) {
    const sourceKey = String(existing[index]?.[sourceColumn] || '');
    if (!sourceKey.startsWith(sourcePrefix)) continue;
    const rowNumbers = existingRowsByKey.get(sourceKey) || [];
    rowNumbers.push(index + 1);
    existingRowsByKey.set(sourceKey, rowNumbers);
  }

  const desiredRowsByKey = new Map();
  for (const row of rows) {
    const sourceKey = String(row?.[sourceColumn] || '');
    if (!sourceKey.startsWith(sourcePrefix)) {
      throw new Error(`${label} row is missing a stable source key for ${sourcePrefix}.`);
    }
    if (desiredRowsByKey.has(sourceKey)) {
      throw new Error(`${label} produced duplicate source key ${sourceKey}.`);
    }
    desiredRowsByKey.set(sourceKey, row);
  }

  const updates = [];
  const additions = [];
  const staleRowNumbers = [];

  for (const [sourceKey, row] of desiredRowsByKey) {
    const existingRowNumbers = existingRowsByKey.get(sourceKey) || [];
    if (existingRowNumbers.length > 0) {
      updates.push({
        range: `${sheet}!A${existingRowNumbers[0]}`,
        majorDimension: 'ROWS',
        values: [row]
      });
      staleRowNumbers.push(...existingRowNumbers.slice(1));
    } else {
      additions.push(row);
    }
  }

  for (const [sourceKey, rowNumbers] of existingRowsByKey) {
    if (!desiredRowsByKey.has(sourceKey)) staleRowNumbers.push(...rowNumbers);
  }

  // Preserve existing data until all desired rows have been updated/appended.
  // If any write has an uncertain outcome, the retry re-reads stable keys and
  // reconciles the resulting sheet state before making another decision.
  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: 'RAW', data: updates }
    });
  }
  if (additions.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheet}!A:Z`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: additions }
    });
  }
  for (const rowNumber of staleRowNumbers) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheet}!A${rowNumber}:Z${rowNumber}`
    });
  }

  return {
    updated: updates.length,
    appended: additions.length,
    cleared: staleRowNumbers.length
  };
}

export function createSheetSynchronizer({ getSheets, withSheetLock }) {
  const pendingBySpreadsheet = new Map();

  return input => {
    if (!input.spreadsheetId) {
      return Promise.reject(new Error(`${input.label} spreadsheet ID is not configured.`));
    }
    const previous = pendingBySpreadsheet.get(input.spreadsheetId) || Promise.resolve();
    const result = previous.then(async () => withSheetLock({
      spreadsheetId: input.spreadsheetId,
      task: async () => reconcileSheetRows({
        ...input,
        sheets: await getSheets()
      })
    }));

    const settled = result.catch(() => undefined).finally(() => {
      if (pendingBySpreadsheet.get(input.spreadsheetId) === settled) {
        pendingBySpreadsheet.delete(input.spreadsheetId);
      }
    });
    pendingBySpreadsheet.set(input.spreadsheetId, settled);
    return result;
  };
}
