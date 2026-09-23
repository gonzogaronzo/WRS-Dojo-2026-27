import test from 'node:test';
import assert from 'node:assert/strict';
import { DATA_LOG_HEADERS, normalizeChartingEvidence } from '../functions/chartingEvidence.js';
import { validateChartingConformance } from '../scripts/wrs-charting-conformance.mjs';
import { resolveCompletedSubstep } from '../scripts/wrs-completed-substep.mjs';
import { compileGroupPlanningSnapshot } from '../scripts/wrs-compile-planning-snapshot.mjs';

const row = (score = '13/15', type = 'Real-Word Charting', substep = '5.4', date = '2026-09-18') =>
  [date, 'Student A', 'Group Synthetic', substep, 'Charting', type, score];
const students = [{ name: 'Student A', instructionalTarget: { substep: '5.5' } }];
const completedSubsteps = { 'Student A': { status: 'resolved', substep: '5.4', sources: [] } };
const validate = (rows, overrides = {}) => validateChartingConformance({
  evidence: normalizeChartingEvidence([DATA_LOG_HEADERS, ...rows]), groupId: 'Synthetic',
  students, completedSubsteps, asOf: '2026-09-18', ...overrides
});
const codes = result => result.findings.map(f => f.code);

test('13/15 establishes 15 scored items, regardless of accuracy; either identified type conforms', () => {
  for (const type of ['Real-Word Charting', 'Nonsense-Word Charting', 'Real-word charting', 'Nonsense-word reading']) {
    const result = validate([row('13/15', type)]);
    assert.equal(result.conforming, true);
    assert.equal(result.checks[0].scoredCount, 15);
    assert.equal(result.checks[0].correctCount, 13);
  }
  assert.equal(validate([row('0/15')]).conforming, true);
});

test('short means denominator below 15, never the number correct', () => {
  const result = validate([row('12/13 (92%)')]);
  assert.deepEqual(codes(result), ['short']);
  assert.match(result.blockers[0], /13 items scored; 15 required/);
  assert.deepEqual(codes(validate([row('0/0')])), ['short']);
});

test('unparseable and absent records have distinct blockers', () => {
  for (const score of ['', '80%', 'unknown', 'Teacher reported 15/15; final charting still outstanding', '16/15', '13/15 or 14/15', '13/15; 7.4 complete']) {
    assert.deepEqual(codes(validate([row(score)])), ['unparseable'], score);
  }
  assert.deepEqual(codes(validate([])), ['absent']);
  assert.equal(validate([row('15/15; 5.4 complete')]).conforming, true);
});

test('missing or ambiguous type blocks and is never inferred from score or Substep', () => {
  for (const type of ['', 'Wordlist Charting', 'Word-list reading', 'Real/nonsense charting', 'Unidentified']) {
    assert.deepEqual(codes(validate([row('15/15', type)])), ['missing-type']);
  }
});

test('wrong Substep cannot substitute for completed-Substep evidence', () => {
  assert.deepEqual(codes(validate([row('15/15', 'Real-Word Charting', '5.5')])), ['wrong-substep']);
  assert.equal(validate([row()]).conforming, true, 'no current-target evidence is required');
});

test('newer short, untyped, or malformed records cannot hide behind old conforming records', () => {
  for (const bad of [row('1/13'), row('15/15', 'Wordlist Charting'), row('uncertain')]) {
    assert.equal(validate([row('15/15', 'Real-Word Charting', '5.4', '2026-09-17'), bad]).conforming, false);
    assert.equal(validate([row(), bad]).conforming, false, 'same-day ties all count');
  }
});

test('future rows, other students and other groups cannot supply missing evidence', () => {
  assert.deepEqual(codes(validate([row('15/15', 'Real-Word Charting', '5.4', '2026-09-19')])), ['absent']);
  for (const index of [1, 2]) {
    const other = row(); other[index] = 'Other';
    assert.deepEqual(codes(validate([other])), ['absent']);
  }
});

test('malformed identity or date fails closed; unavailable export differs from an empty Data Log', () => {
  for (const index of [0, 1, 2, 3]) {
    const malformed = row(); malformed[index] = '';
    assert.ok(codes(validate([malformed])).includes('unparseable'));
  }
  assert.ok(codes(validate([row('15/15', 'Real-Word Charting', '5.4', '2026-02-30')])).includes('unparseable'));
  assert.deepEqual(codes(validate([], { evidence: null })), ['evidence-unavailable']);
  assert.deepEqual(codes(validate([], { evidence: normalizeChartingEvidence([]) })), ['evidence-unavailable']);
  assert.deepEqual(codes(validate([], { evidence: normalizeChartingEvidence([['Date']]) })), ['evidence-unavailable']);
  assert.ok(codes(validate([], { evidence: normalizeChartingEvidence([DATA_LOG_HEADERS, null]) })).includes('unparseable'));
});

test('current-target records are checked when present, but absence never blocks', () => {
  assert.equal(validate([row()]).conforming, true);
  const result = validate([row(), row('15/15', 'Word-list reading', '5.5')]);
  assert.deepEqual(codes(result), ['missing-type']);
});

const daily = (note, followUp = '', date = '2026-09-18', source = 'Teacher live note') => ({
  Date: date, Group: 'Synthetic', 'Student(s)': 'Student A',
  'Substep / Lesson': '5.4 Accuracy', 'Note / Data': note,
  'Follow-up / Instructional Response': followUp, Source: source
});
const resolve = rows => resolveCompletedSubstep({dailyRows: rows, groupId: 'Synthetic', student: 'Student A', currentTarget: '5.5', asOf: '2026-09-18'});

test('completed Substep is grounded in explicit teacher completion or corroborated advancement', () => {
  assert.equal(resolve([daily('Substep 5.4 is complete.')]).substep, '5.4');
  assert.equal(resolve([daily('Group ready to advance.', 'Begin 5.5 next week.')]).substep, '5.4');
  for (const note of ['Nearly completed Substep 5.4.', 'Substep 5.4 is not complete.', 'Substep 5.4 is complete if the final charting passes.', 'Completed Part 8.', 'Completed the lesson.', 'All planned parts completed.']) {
    assert.equal(resolve([daily(note)]).status, 'none-established', note);
  }
  assert.equal(resolve([daily('Continue.', 'Finish dictation, then advance to 5.5.')]).status, 'none-established');
  assert.equal(resolve([daily('Substep 5.4 is complete.', '', '2026-09-19')]).status, 'none-established');
  assert.equal(resolve([daily('Substep 5.4 is complete.', '', '2026-09-18', 'WRS Dojo mission:x')]).status, 'none-established');
  assert.equal(resolve([daily('Substep 5.4 is complete.'), daily('Substep 5.3 is complete.')]).status, 'conflicted');
});

test('none-established completion permits ongoing instruction without inventing missing charting', () => {
  const result = validate([], { completedSubsteps: { 'Student A': resolve([]) } });
  assert.deepEqual(codes(result), []);
  assert.equal(result.conforming, true);
});

test('compiler consumes a separate conformance result and ignores formatted snapshot scores', () => {
  const args = {
    currentSnapshotRows: [{ Student: 'Student A', Group: 'Synthetic', 'Current Substep': '5.5', 'Lesson Focus': '5.5 Introduction', 'Last Updated': '2026-09-18', 'Most Recent Real-Word Charting': '99/99 fabricated summary' }],
    dailyRows: [daily('Substep 5.4 is complete.', 'Begin 5.5 next week.')],
    groupId: 'Synthetic', asOf: '2026-09-18',
    chartingEvidence: normalizeChartingEvidence([DATA_LOG_HEADERS, row()])
  };
  assert.equal(compileGroupPlanningSnapshot(args).planningReady, true);
  const blocked = compileGroupPlanningSnapshot({ ...args, chartingEvidence: normalizeChartingEvidence([DATA_LOG_HEADERS, row('12/13')]) });
  assert.equal(blocked.planningReady, false);
  assert.deepEqual(blocked.planningBlockers, blocked.chartingConformance.blockers);
  assert.equal(compileGroupPlanningSnapshot({ ...args, chartingEvidence: null }).planningReady, false);
});

test('lesson-progress prose mentioning charting is not an individual scored record', () => {
  const progress = ['2026-09-18', '', 'Synthetic', '5.4', 'Wordlist reading/charting', 'Lesson progress', 'Completed word-list reading/charting.'];
  assert.equal(validate([row(), progress]).conforming, true);
  const missingStudent = row(); missingStudent[1] = '';
  assert.ok(codes(validate([row(), missingStudent])).includes('unparseable'), 'an actual charting record without a student still blocks');
});

test('natural teacher completion statements work with varied source labels', () => {
  for (const source of ['Teacher live note', 'Daily Debrief', 'Teacher end-of-day summary', 'Original Daily Notes Doc', '']) {
    for (const note of ['We completed Substep 5.4.', 'Student A completed Step 5.4 today.', 'Substep 5.4 is complete today.', 'The group has finished Step 5.4 this morning.', 'Today, we completed Substep 5.4.', 'Step 5.4 was completed yesterday.']) {
      assert.equal(resolve([daily(note, '', '2026-09-18', source)]).substep, '5.4', `${source}: ${note}`);
    }
  }
});

test('parser does not turn conditional, partial, quoted, other-student or lesson claims into completion', () => {
  for (const note of [
    'We almost completed Substep 5.4 today.', 'We have not completed Step 5.4.',
    'We will have completed Step 5.4 tomorrow.', 'If we completed Step 5.4, we could advance.',
    'Step 5.4 is complete if the final assessment passes.', 'Step 5.4 is complete?',
    'Teacher asked: “Substep 5.4 is complete.”', 'Student B completed Substep 5.4 today.',
    'We completed Step 5.4 dictation today.', 'We completed the lesson for Step 5.4.',
    'We completed Step 5.4 practice.', 'We completed Part 8 in Substep 5.4.',
    'We completed Substep 5.4 but still need final instruction.'
  ]) assert.equal(resolve([daily(note)]).status, 'none-established', note);
});

test('Dojo mission completion cannot defeat contradictory teacher records', () => {
  const result = resolve([
    daily('Completed Step 5.4.', '', '2026-09-18', 'WRS Dojo mission:example'),
    daily('We completed Block 1; Part 8 is unfinished.', '', '2026-09-18', 'Daily Debrief')
  ]);
  assert.equal(result.status, 'none-established');
  assert.equal(resolve([
    daily('Step 5.4 is complete.', '', '2026-09-17', 'Daily Debrief'),
    daily('Step 5.4 is not yet complete.', '', '2026-09-18', 'Teacher correction')
  ]).status, 'conflicted');
});

test('completion assertion and conformance stay separate; recorded completion still requires evidence', () => {
  const completed = resolve([daily('We completed Step 5.4 today.', '', '2026-09-18', 'Daily Debrief')]);
  assert.equal(completed.status, 'resolved');
  assert.deepEqual(codes(validate([], {completedSubsteps: {'Student A': completed}})), ['absent']);
  assert.deepEqual(codes(validate([], {completedSubsteps: {'Student A': {...completed, status: 'conflicted', substep: null, reason: 'Conflicting teacher records.'}}})), ['completion-conflict']);
});

const requestArgs = () => ({
  currentSnapshotRows: [{Student: 'Student A', Group: 'Synthetic', 'Current Substep': '3.1', 'Lesson Focus': '3.1 Accuracy', 'Last Updated': '2026-09-18'}],
  dailyRows: [], groupId: 'Synthetic', asOf: '2026-09-18', teacherTargetOverride: '2.5',
  chartingEvidence: normalizeChartingEvidence([DATA_LOG_HEADERS])
});

test('request target overrides snapshot and daily advancement without claiming placement or completion', () => {
  const snapshot = compileGroupPlanningSnapshot({...requestArgs(), dailyRows: [{...daily('Group ready to advance.', 'Begin 3.1 next week.'), 'Substep / Lesson': '2.5'}]});
  assert.equal(snapshot.planningReady, true);
  assert.equal(snapshot.students[0].instructionalTarget.substep, '2.5');
  assert.equal(snapshot.students[0].officialPlacement.substep, '3.1');
  assert.equal(snapshot.students[0].instructionalTarget.relationshipToPlacement, 'teacher-directed');
  assert.match(snapshot.students[0].instructionalTarget.sourceRef, /^teacher-request:/);
  assert.equal(snapshot.advancement.nextSubstep, null);
  assert.equal(snapshot.chartingConformance.completedSubsteps['Student A'].status, 'none-established');
  // Even an advancement to the requested target does not infer completion.
  const inferred = compileGroupPlanningSnapshot({...requestArgs(), dailyRows: [{...daily('Group ready to advance.', 'Begin 2.5 next week.'), 'Substep / Lesson': '2.4'}]});
  assert.equal(inferred.chartingConformance.completedSubsteps['Student A'].status, 'none-established');
});

test('request target never bypasses current counts/types, unavailable evidence or explicit completed-Substep evidence', () => {
  for (const record of [row('12/13', 'Real-Word Charting', '2.5'), row('15/15', 'Wordlist Charting', '2.5'), row('unknown', 'Real-Word Charting', '2.5')]) {
    const snapshot = compileGroupPlanningSnapshot({...requestArgs(), chartingEvidence: normalizeChartingEvidence([DATA_LOG_HEADERS, record])});
    assert.equal(snapshot.planningReady, false);
  }
  assert.equal(compileGroupPlanningSnapshot({...requestArgs(), chartingEvidence: null}).planningReady, false);
  const explicitCompletion = compileGroupPlanningSnapshot({...requestArgs(), dailyRows: [daily('Step 5.4 is complete.')]});
  assert.equal(explicitCompletion.planningReady, false);
  assert.equal(explicitCompletion.chartingConformance.findings[0].code, 'absent');
  for (const target of ['', 'next', '2.5 then 3.1', '0.0']) assert.throws(() => compileGroupPlanningSnapshot({...requestArgs(), teacherTargetOverride: target}), /target override/);
});
