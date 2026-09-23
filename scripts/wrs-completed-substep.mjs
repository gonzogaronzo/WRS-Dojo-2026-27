import { chartingDate, chartingGroupKey } from '../functions/chartingEvidence.js';

const text = value => value == null ? '' : String(value).trim();
const field = (row, key, alias) => text(row?.[key] ?? row?.[alias]);

// Completion of a lesson, a block, dictation, or a Dojo mission is not completion
// of a Substep. Only explicit teacher Substep completion or an unconditional
// teacher advancement corroborated by the current target establishes it here.
export function resolveCompletedSubstep({ dailyRows, groupId, student, currentTarget, asOf }) {
  const candidates = [];
  for (const [index, row] of (Array.isArray(dailyRows) ? dailyRows : []).entries()) {
    if (!field(row, 'Group', 'group').split(/[;,]/).some(g => chartingGroupKey(g) === chartingGroupKey(groupId))) continue;
    const date = chartingDate(field(row, 'Date', 'date'));
    if (!date || date > asOf || !/teacher live note/i.test(field(row, 'Source', 'source'))) continue;
    const names = field(row, 'Student(s)', 'students').split(/[;,]/).map(text).filter(Boolean);
    if (names.length && !names.includes(student)) continue;
    const note = field(row, 'Note / Data', 'note');
    const followUp = field(row, 'Follow-up / Instructional Response', 'followUp');
    const lesson = field(row, 'Substep / Lesson', 'substepLesson');
    const lessonSubsteps = [...new Set(lesson.match(/\b\d+\.\d+\b/g) || [])];
    const completion = note.match(/(?:^|[.!?]\s+)(?:Substep\s+)?(\d+\.\d+)\s+(?:is\s+)?(?:complete|completed|finished)(?:[.!?](?=\s|$)|$)/i)
      || note.match(/(?:^|[.!?]\s+)(?:The group\s+)?(?:completed|finished)\s+Substep\s+(\d+\.\d+)(?:[.!?](?=\s|$)|$)/i);
    const advance = followUp.match(/^(?:begin|start|advance(?:\s+the group)?\s+to|move\s+to)\s+(?:Substep\s+)?(\d+\.\d+)\b/i);
    const conditional = /\b(?:if|unless|once|after|before|then|when|finish)\b/i.test(followUp);
    const substep = completion?.[1] || (
      advance && !conditional && advance[1] === currentTarget && lessonSubsteps.length === 1
        && lessonSubsteps[0] !== currentTarget ? lessonSubsteps[0] : null
    );
    if (substep) candidates.push({ substep, date, sourceRef: `daily:${groupId}:row:${index + 2}`, basis: completion ? 'explicit-completion' : 'teacher-advancement' });
  }
  candidates.sort((a, b) => b.date.localeCompare(a.date));
  const latest = candidates.filter(item => item.date === candidates[0]?.date);
  if (!latest.length) return { status: 'unresolved', substep: null, sources: [], reason: 'No explicit completed Substep is established by the teacher history; current placement and completed lesson parts do not establish it.' };
  if (new Set(latest.map(item => item.substep)).size !== 1) return { status: 'unresolved', substep: null, sources: latest, reason: 'Teacher history identifies conflicting completed Substeps on the latest completion date.' };
  return { status: 'resolved', substep: latest[0].substep, sources: latest, reason: null };
}
