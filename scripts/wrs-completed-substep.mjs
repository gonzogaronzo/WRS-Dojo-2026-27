import { chartingDate, chartingGroupKey } from '../functions/chartingEvidence.js';

const text = value => value == null ? '' : String(value).trim();
const field = (row, key, alias) => text(row?.[key] ?? row?.[alias]);
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sentences = value => value.split(/(?<=[.!?])\s+/).map(text).filter(Boolean);

// Keep the subject and the completed object explicit. In particular, completing
// a lesson/assessment/Part *in* a Substep is not completing the Substep itself.
export function completionStatements(note, student) {
  const subject = `(?:(?:we|the group|all students|the students|everyone|${escapeRegex(student)})\\s+(?:(?:have|has)\\s+)?)?`;
  const active = new RegExp(`^${subject}(?:completed|finished)\\s+(?:the\\s+)?(?:substep|step)\\s+(\\d+\\.\\d+)(.*)$`, 'i');
  const passive = /^(?:Substep\s+|Step\s+)?(\d+\.\d+)\s+(?:(?:is|was|has been)\s+)?(?:complete|completed|finished)\b(.*)$/i;
  const tail = /^(?:\s+(?:today|yesterday|this morning|this afternoon|this week|on \d{4}-\d{2}-\d{2}))?[.!]?$/i;
  const result = [];
  for (let sentence of sentences(note)) {
    // No hypothetical, negated, partial, quoted, future, or questioning claims.
    if (/[?"“”]/.test(sentence) || /\b(?:not|never|nearly|almost|partially|partly|if|unless|once|when|pending|will|would|could|should|might|may)\b/i.test(sentence)) continue;
    sentence = sentence.replace(/^(?:today|yesterday|this morning|this afternoon),?\s+/i, '');
    const match = sentence.match(active) || sentence.match(passive);
    if (match && tail.test(match[2])) result.push(match[1]);
  }
  return result;
}

// A mission archive describes a lesson session, not authoritative Substep mastery.
// Human Daily Debrief and other dated notes do not need a magic Source label.
export function resolveCompletedSubstep({ dailyRows, groupId, student, currentTarget, asOf, allowAdvancementInference = true }) {
  const candidates = [];
  const retractions = [];
  for (const [index, row] of (Array.isArray(dailyRows) ? dailyRows : []).entries()) {
    if (!field(row, 'Group', 'group').split(/[;,]/).some(g => chartingGroupKey(g) === chartingGroupKey(groupId))) continue;
    const date = chartingDate(field(row, 'Date', 'date'));
    const source = field(row, 'Source', 'source');
    if (!date || date > asOf || /\bdojo\b.*\bmission\b/i.test(source)) continue;
    const names = field(row, 'Student(s)', 'students').split(/[;,]/).map(text).filter(Boolean);
    if (names.length && !names.includes(student)) continue;
    const note = field(row, 'Note / Data', 'note');
    const followUp = field(row, 'Follow-up / Instructional Response', 'followUp');
    const lesson = field(row, 'Substep / Lesson', 'substepLesson');
    const lessonSubsteps = [...new Set(lesson.match(/\b\d+\.\d+\b/g) || [])];
    const sourceRef = `daily:${groupId}:row:${index + 2}`;
    const completions = completionStatements(note, student);
    for (const substep of completions) candidates.push({ substep, date, sourceRef, basis: 'explicit-completion' });
    for (const match of note.matchAll(/\b(?:Substep|Step)\s+(\d+\.\d+)\s+(?:is\s+)?(?:not (?:yet )?complete|incomplete|unfinished)\b/gi)) {
      retractions.push({ substep: match[1], date, sourceRef, basis: 'explicit-incomplete' });
    }
    const advance = followUp.match(/^(?:begin|start|advance(?:\s+the group)?\s+to|move\s+to)\s+(?:Substep\s+|Step\s+)?(\d+\.\d+)\b/i);
    const conditional = /\b(?:if|unless|once|after|before|then|when|finish|not)\b/i.test(followUp);
    if (!completions.length && allowAdvancementInference && advance && !conditional
      && advance[1] === currentTarget && lessonSubsteps.length === 1 && lessonSubsteps[0] !== currentTarget) {
      candidates.push({ substep: lessonSubsteps[0], date, sourceRef, basis: 'teacher-advancement' });
    }
  }
  candidates.sort((a, b) => b.date.localeCompare(a.date));
  const latest = candidates.filter(item => item.date === candidates[0]?.date);
  if (!latest.length) return { status: 'none-established', substep: null, sources: [], reason: 'No completed Substep is established; this does not prevent continuing instruction.' };
  const contradictions = retractions.filter(item => latest.some(candidate => candidate.substep === item.substep && item.date >= candidate.date));
  if (new Set(latest.map(item => item.substep)).size !== 1 || contradictions.length) {
    return { status: 'conflicted', substep: null, sources: [...latest, ...contradictions], reason: 'Teacher history contains conflicting Substep-completion claims.' };
  }
  return { status: 'resolved', substep: latest[0].substep, sources: latest, reason: null };
}
