import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  chartingBankHasType,
  chartingPlanFromPart4Data,
  chartingPool,
  dealLeveledCharting,
  defaultDealSettings,
  sharedWordCount
} from '../legacy/chartingWordBank';
import WordlistReading from '../legacy/components/modules/WordlistReading';

const roster = [{ name: 'Levi Park' }, { name: 'Maya' }, { name: 'Enrique' }];
const planData = (extra: Record<string, unknown> = {}) => ({
  chartingPlanned: true,
  chartingType: 'real',
  chartingSource: { substep: '2.2', level: 'AB' },
  ...extra
});

test('every level includes AB words; A and B add their own pages', () => {
  const ab = new Set(chartingPool('2.2', 'real', 'AB'));
  const a = new Set(chartingPool('2.2', 'real', 'A'));
  const b = new Set(chartingPool('2.2', 'real', 'B'));
  assert.ok([...ab].every(word => a.has(word) && b.has(word)));
  // printed p. 32 is a Level A page, p. 34 a Level B page (confirmed against the Reader)
  assert.ok(a.has('bask') && !ab.has('bask'));
  assert.ok(b.has('kelp') && !a.has('kelp'));
});

test('split pages put the top 15 words at the first level and the bottom 15 at the second', () => {
  // printed p. 2 is AB+A: "long" opens the page, "bunk" closes it
  assert.ok(chartingPool('2.1', 'real', 'AB').includes('long'));
  assert.ok(!chartingPool('2.1', 'real', 'AB').includes('bunk'));
  assert.ok(chartingPool('2.1', 'real', 'A').includes('bunk'));
});

test('2.3 has no nonsense pages; 2.1 does', () => {
  assert.equal(chartingBankHasType('2.3', 'nonsense'), false);
  assert.equal(chartingBankHasType('2.1', 'nonsense'), true);
});

test('reads the plan from Part 4 data and ignores lessons without one', () => {
  const plan = chartingPlanFromPart4Data(planData({ studentLevels: { Levi: 'B' }, studentLists: [{ student: 'Maya', words: ['flag', 'step'] }] }));
  assert.equal(plan?.substep, '2.2');
  assert.equal(plan?.level, 'AB');
  assert.deepEqual(plan?.studentLevels, { Levi: 'B' });
  assert.equal(plan?.studentLists[0].student, 'Maya');
  assert.equal(chartingPlanFromPart4Data({ chartingWords: ['a'] }), null);
  assert.equal(chartingPlanFromPart4Data(planData({ chartingPlanned: false })), null);
  assert.equal(chartingPlanFromPart4Data(planData({ chartingSource: { substep: '2.2', level: 'C' } })), null);
});

test('deals 15 different words to each of three students', () => {
  const plan = chartingPlanFromPart4Data(planData())!;
  const lists = dealLeveledCharting(defaultDealSettings(plan, roster));
  assert.equal(lists.length, 3);
  lists.forEach(list => assert.equal(list.length, 15));
  assert.equal(sharedWordCount(lists), 0);
  const pool = new Set(chartingPool('2.2', 'real', 'AB'));
  assert.ok(lists.flat().every(word => pool.has(word.text) && word.type === 'regular'));
});

test('a small pool shares words instead of cutting lists short', () => {
  const plan = chartingPlanFromPart4Data(planData({ chartingType: 'nonsense', chartingSource: { substep: '2.1', level: 'AB' } }))!;
  const lists = dealLeveledCharting(defaultDealSettings(plan, roster));
  lists.forEach(list => {
    assert.equal(list.length, 15);
    assert.equal(new Set(list.map(word => word.text)).size, 15, 'no repeats within one list');
    assert.ok(list.every(word => word.type === 'nonsense'));
  });
  assert.ok(sharedWordCount(lists) > 0);
});

test('lesson overrides match by name, falling back to a unique first name', () => {
  const plan = chartingPlanFromPart4Data(planData({
    studentLevels: { Levi: 'B' },
    studentLists: [{ student: 'maya', words: ['flag', 'step', 'brush'] }]
  }))!;
  const settings = defaultDealSettings(plan, roster);
  assert.deepEqual(settings.levels, ['B', 'AB', 'AB']);
  const lists = dealLeveledCharting(settings);
  assert.deepEqual(lists[1].map(word => word.text), ['flag', 'step', 'brush']);
  const levelB = new Set(chartingPool('2.2', 'real', 'B'));
  assert.ok(lists[0].every(word => levelB.has(word.text)));
});

test('Part 4 shows word-bank settings to the teacher and hides them from students', () => {
  const plan = chartingPlanFromPart4Data(planData())!;
  const students = roster.map((student, index) => ({
    id: `s${index}`, name: student.name, masteredSounds: [], masteredHFW: [], attendanceCount: 0, notes: ''
  }));
  const distribution = dealLeveledCharting(defaultDealSettings(plan, students));
  const props = {
    cards: [], chartingPlan: plan, lessonId: 'test', students, scores: [], onUpdateScores: () => {},
    distribution, onUpdateDistribution: () => {}, page: 0, onUpdatePage: () => {}
  };
  const teacher = renderToStaticMarkup(<WordlistReading {...props} />);
  assert.match(teacher, /data-part4-bank-settings/);
  assert.match(teacher, /Student Reader Two/);
  assert.equal((teacher.match(/data-part4-student-level/g) || []).length, 3);
  const student = renderToStaticMarkup(<WordlistReading {...props} isStudentView />);
  assert.doesNotMatch(student, /data-part4-bank-settings|data-part4-student-level/);
  assert.match(student, new RegExp(distribution[0][0].text));
});
