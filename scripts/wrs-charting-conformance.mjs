import { CHARTING_EVIDENCE_VERSION, chartingDate, chartingGroupKey } from '../functions/chartingEvidence.js';

export const REQUIRED_CHARTING_ITEMS = 15;

// No accuracy threshold and no expected type. Both explicit types are evidence.
// Select before validating: a newer ambiguous/short record cannot be hidden by
// falling back to an older valid score. Tied dates retain every record.
export function validateChartingConformance({ evidence, groupId, students, completedSubsteps, asOf }) {
  const findings = [];
  const checks = [];
  const add = (code, message, student = null, record = null) => findings.push({
    code, student, sourceRef: record?.sourceRef ?? null, message
  });
  if (!chartingDate(asOf) || !groupId || !Array.isArray(students) || !students.length) {
    add('invalid-context', 'Charting conformance context is missing or malformed.');
  }
  const available = evidence?.schemaVersion === CHARTING_EVIDENCE_VERSION
    && evidence.status === 'available' && Array.isArray(evidence.records) && Array.isArray(evidence.issues);
  if (!available) add('evidence-unavailable', 'Data Log charting evidence is missing or malformed; conformance cannot be established.');
  for (const issue of available ? evidence.issues : []) add('unparseable', String(issue));
  const records = [];
  for (const record of available ? evidence.records : []) {
    if (!record || typeof record !== 'object') {
      add('unparseable', 'Data Log contains a malformed structured record.');
      continue;
    }
    if (record.groupId && chartingGroupKey(record.groupId) !== chartingGroupKey(groupId)) continue;
    if (chartingDate(record.date) && record.date > asOf) continue;
    if (typeof record.sourceRef !== 'string' || !record.sourceRef || !record.groupId || !record.student || !chartingDate(record.date) || !/^\d+\.\d+$/.test(record.substep || '')) {
      add('unparseable', `${record.sourceRef || 'Data Log record'}: source, student, group, date or Substep cannot be established.`, record.student || null, record);
      continue;
    }
    records.push(record);
  }
  const validateRecord = record => {
    const codes = [];
    const prefix = `${record.student}, Substep ${record.substep}, ${record.sourceRef}`;
    if (!['real', 'nonsense'].includes(record.chartingType)) {
      codes.push('missing-type');
      add('missing-type', `${prefix}: charting type is not identified as real or nonsense; this record cannot count as evidence.`, record.student, record);
    }
    if (record.parseStatus !== 'parsed' || !Array.isArray(record.issues) || record.issues.length
      || !Number.isSafeInteger(record.scoredCount) || record.scoredCount < 0
      || !Number.isSafeInteger(record.correctCount) || record.correctCount < 0 || record.correctCount > record.scoredCount) {
      codes.push('unparseable');
      add('unparseable', `${prefix}: a valid scored-item denominator cannot be established; the record is unparseable, not a known short count.`, record.student, record);
    } else if (record.scoredCount < REQUIRED_CHARTING_ITEMS) {
      codes.push('short');
      add('short', `${prefix}: ${record.scoredCount} items scored; ${REQUIRED_CHARTING_ITEMS} required.`, record.student, record);
    }
    checks.push({ student: record.student, substep: record.substep, sourceRef: record.sourceRef,
      date: record.date, chartingType: record.chartingType, scoredCount: record.scoredCount,
      correctCount: record.correctCount, status: codes.length ? 'blocked' : 'conforming', codes });
  };
  for (const student of Array.isArray(students) ? students : []) {
    const name = student?.name;
    if (!name) { add('invalid-context', 'A planning student has no identity.'); continue; }
    const completed = completedSubsteps?.[name];
    const requiredSubstep = completed?.status === 'resolved' && /^\d+\.\d+$/.test(completed.substep || '') ? completed.substep : null;
    if (!requiredSubstep) add('completed-substep-unresolved', `${name}: ${completed?.reason || 'Most recently completed Substep cannot be established.'}`, name);
    const studentRecords = records.filter(record => record.student === name);
    if (available && requiredSubstep && !studentRecords.some(record => record.substep === requiredSubstep)) {
      const otherSubsteps = [...new Set(studentRecords.map(record => record.substep))];
      add(otherSubsteps.length ? 'wrong-substep' : 'absent',
        `${name}: no charting record for completed Substep ${requiredSubstep}.`
          + (otherSubsteps.length ? ` Available records cover ${otherSubsteps.join(', ')} and cannot substitute.` : ' No scored charting record is available.'), name);
    }
    const relevantSubsteps = new Set([requiredSubstep, student?.instructionalTarget?.substep].filter(Boolean));
    for (const substep of relevantSubsteps) {
      const matching = studentRecords.filter(record => record.substep === substep);
      const latest = matching.map(record => record.date).sort().at(-1);
      matching.filter(record => record.date === latest).forEach(validateRecord);
    }
  }
  return { schemaVersion: 'wrs-charting-conformance-v1', requiredItems: REQUIRED_CHARTING_ITEMS,
    conforming: findings.length === 0, completedSubsteps: completedSubsteps ?? {}, checks, findings,
    blockers: findings.map(finding => finding.message) };
}
