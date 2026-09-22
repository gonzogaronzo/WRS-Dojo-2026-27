const SCHOOL_YEAR = '2026-27';
const EXPORT_VERSION = 'wrs-sheet-values-export-v1';

export const CURRENT_SNAPSHOT_RANGE = "'Current Snapshot'!A:N";
export const DAILY_NOTE_TABS = Object.freeze(['2nd', '3A', '3B', '4A', '5A', '5B']);
export const DAILY_NOTE_RANGES = Object.freeze(
  Object.fromEntries(DAILY_NOTE_TABS.map(tab => [tab, `'${tab}'!A:I`]))
);

const text = value => value == null ? '' : String(value).trim();
const date = (value, label) => {
  const candidate = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    throw new Error(`${label} must be YYYY-MM-DD.`);
  }
  return candidate;
};

const valuesFrom = response => (
  Array.isArray(response?.data?.values) ? response.data.values : []
);

const normalizeTeacherFocus = value => {
  const raw = text(value).toLowerCase();
  if (!raw) return null;
  if (/^intro(?:duction)?$/.test(raw)) return 'Introduction';
  if (raw === 'accuracy') return 'Accuracy';
  if (/^(?:automaticity(?:\/|\s+)?fluency|automaticity-fluency|fluency)$/.test(raw)) {
    return 'Automaticity/Fluency';
  }
  throw new Error('Teacher focus override must be Introduction, Accuracy, or Automaticity/Fluency.');
};

export function parseTeacherFocusOverrides(value) {
  if (value == null) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('focusOverrides must be an object keyed by supported planning group.');
  }

  const result = {};
  for (const [groupId, rawFocus] of Object.entries(value)) {
    if (!DAILY_NOTE_TABS.includes(groupId)) {
      throw new Error(`Unsupported planning group: ${groupId || '(blank)'}.`);
    }
    const focus = normalizeTeacherFocus(rawFocus);
    if (focus) result[groupId] = focus;
  }
  return result;
}

export function parseAllowedTeacherUids(value) {
  return [...new Set(text(value)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean))];
}

export function assertPlanningExportAuthorized({ authUid, allowedTeacherUids }) {
  const uid = text(authUid);
  if (!uid) {
    const error = new Error('Authentication is required.');
    error.code = 'unauthenticated';
    throw error;
  }

  const allowed = Array.isArray(allowedTeacherUids)
    ? allowedTeacherUids.map(text).filter(Boolean)
    : [];

  if (!allowed.length) {
    const error = new Error('Planning export allowlist is not configured.');
    error.code = 'failed-precondition';
    throw error;
  }

  if (!allowed.includes(uid)) {
    const error = new Error('This teacher is not authorized to read the planning export.');
    error.code = 'permission-denied';
    throw error;
  }
}

export async function readPlanningSheetValues({
  sheets,
  dataSpreadsheetId,
  dailySpreadsheetId,
  asOf,
  weekOf
}) {
  if (!sheets?.spreadsheets?.values?.get) {
    throw new Error('A Google Sheets values client is required.');
  }

  const dataId = text(dataSpreadsheetId);
  const dailyId = text(dailySpreadsheetId);
  if (!dataId) throw new Error('Student Data spreadsheet ID is not configured.');
  if (!dailyId) throw new Error('Daily Notes spreadsheet ID is not configured.');

  const effectiveAsOf = date(asOf, 'asOf');
  const effectiveWeekOf = date(weekOf, 'weekOf');

  const [currentResponse, ...dailyResponses] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: dataId,
      range: CURRENT_SNAPSHOT_RANGE,
      majorDimension: 'ROWS'
    }),
    ...DAILY_NOTE_TABS.map(tab => sheets.spreadsheets.values.get({
      spreadsheetId: dailyId,
      range: DAILY_NOTE_RANGES[tab],
      majorDimension: 'ROWS'
    }))
  ]);

  const currentSnapshotValues = valuesFrom(currentResponse);
  if (!currentSnapshotValues.length) {
    throw new Error('Current Snapshot returned no values.');
  }

  const dailyTabValues = {};
  for (let index = 0; index < DAILY_NOTE_TABS.length; index += 1) {
    const tab = DAILY_NOTE_TABS[index];
    const values = valuesFrom(dailyResponses[index]);
    if (!values.length) throw new Error(`Daily Notes tab ${tab} returned no values.`);
    dailyTabValues[tab] = values;
  }

  return {
    schemaVersion: EXPORT_VERSION,
    schoolYear: SCHOOL_YEAR,
    asOf: effectiveAsOf,
    weekOf: effectiveWeekOf,
    currentSnapshotValues,
    dailyTabValues,
    groups: DAILY_NOTE_TABS.map(groupId => ({
      groupId,
      dailyTab: groupId
    }))
  };
}
