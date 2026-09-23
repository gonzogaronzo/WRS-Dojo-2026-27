const text = value => value == null ? '' : String(value).trim();
export const chartingGroupKey = value => text(value).replace(/^(?:group|grp)\s+/i, '').toLowerCase();
export const chartingDate = value => {
  const candidate = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return null;
  const parsed = new Date(`${candidate}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === candidate ? candidate : null;
};
export const CHARTING_EVIDENCE_VERSION = 'wrs-charting-evidence-v1';
export const DATA_LOG_HEADERS = ['Date', 'Student', 'Group', 'Current Substep', 'Lesson / Assessment', 'Data Type', 'Data Point / Score'];

// Only the record's explicit Data Type establishes type. Never infer from words,
// Substep, score, lesson title, or a Current Snapshot summary.
export function chartingTypeFromDataType(value) {
  const label = text(value).toLowerCase();
  const match = label.match(/^(real|nonsense)[- ]word (?:charting|reading)(?:\s*\/\s*attention context)?$/);
  return match?.[1] ?? null;
}

export function normalizeChartingEvidence(values) {
  const result = { schemaVersion: CHARTING_EVIDENCE_VERSION, status: 'available', issues: [], records: [] };
  const invalid = message => ({ ...result, status: 'unavailable', issues: [message] });
  if (!Array.isArray(values) || !Array.isArray(values[0])) return invalid('Data Log values/header are missing.');
  const headers = values[0].map(text);
  if (new Set(headers).size !== headers.length || DATA_LOG_HEADERS.some(header => !headers.includes(header))) {
    return invalid('Data Log has missing or duplicate required headers.');
  }
  for (let index = 1; index < values.length; index += 1) {
    const cells = values[index];
    if (!Array.isArray(cells)) {
      result.issues.push(`Data Log row ${index + 1} is not a row array.`);
      continue;
    }
    if (!cells.some(value => text(value))) continue;
    const row = Object.fromEntries(headers.map((header, i) => [header, text(cells[i])]));
    const label = row['Data Type'];
    const rawScore = row['Data Point / Score'];
    const isCharting = /charting|^(?:word[- ]?list|real[- ]word|nonsense[- ]word) reading/i.test(label)
      || (!/attendance|dictation|spelling|observation|assessment|lesson progress|instructional|procedure|concept/i.test(label)
        && (/charting|word[- ]?list/i.test(row['Lesson / Assessment']) || (!label && /\d\s*\//.test(rawScore))));
    if (!isCharting) continue; // Attendance, dictation and post-tests are different evidence.
    const issues = [];
    const date = chartingDate(row.Date);
    const groupId = chartingGroupKey(row.Group);
    const student = row.Student;
    const substep = /^\d+\.\d+$/.test(row['Current Substep']) ? row['Current Substep'] : null;
    if (!date) issues.push('Record date is missing or invalid.');
    if (!groupId) issues.push('Record group is missing.');
    if (!student) issues.push('Record student is missing.');
    if (!substep) issues.push('Record Substep is missing or ambiguous.');
    // A bounded grammar, not a search for a fraction inside arbitrary prose.
    // Completion annotations are preserved; uncertain/narrative claims are not scores.
    const score = rawScore.match(/^(\d+)\s*\/\s*(\d+)(?:\s*\((\d+(?:\.\d+)?)%\))?(?:;\s*(\d+\.\d+) complete)?$/i);
    const correctCount = score ? Number(score[1]) : null;
    const scoredCount = score ? Number(score[2]) : null;
    const validScore = score && Number.isSafeInteger(correctCount) && Number.isSafeInteger(scoredCount)
      && scoredCount >= 0 && correctCount <= scoredCount
      && (!score[3] || Number(score[3]) <= 100)
      && (!score[4] || score[4] === substep);
    if (!validScore) issues.push('Score does not establish a valid scored-item denominator.');
    result.records.push({
      sourceRef: `data-log:row:${index + 1}`, rowNumber: index + 1,
      date, groupId, student, substep, chartingType: chartingTypeFromDataType(label),
      correctCount: validScore ? correctCount : null, scoredCount: validScore ? scoredCount : null,
      parseStatus: issues.length ? 'unparseable' : 'parsed', issues,
      raw: { date: row.Date, substep: row['Current Substep'], dataType: label, score: rawScore, sourceNote: row['Source Note'] || '' }
    });
  }
  return result;
}
