import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeLesson } from '../legacy/dataNormalization';
import { createEmptyWrsLessonPlan, getWrsLessonReadiness, normalizeWrsLessonPlan } from '../legacy/wrsLessonPlan';
import { Lesson, RuntimeLessonPart, WRSRuntimeLessonPlan } from '../legacy/types';

const runtimePart = (part: RuntimeLessonPart['part'], data: RuntimeLessonPart['data']): RuntimeLessonPart => ({
  part,
  title: `Part ${part}`,
  teacherDirections: [`Teach Part ${part}`],
  sourceIds: part === 9 ? ['reader-source'] : ['step-source'],
  data
});

const createRuntimePlan = (): WRSRuntimeLessonPlan => ({
  schemaVersion: 'wrs-runtime-v1',
  id: 'runtime-lesson',
  title: 'Runtime lesson',
  step: '1',
  substep: '6',
  focus: 'accuracy',
  sources: [
    { id: 'step-source', label: 'Step Instruction', kind: 'step-instruction' },
    { id: 'reader-source', label: 'Student Reader', kind: 'student-reader' }
  ],
  parts: [
    runtimePart(1, { quickDrill: ['a'] }),
    runtimePart(2, { conceptNotes: 'Review reading concepts.' }),
    runtimePart(3, { wordCards: [{ id: 'card-1', text: 'cats', type: 'regular' }] }),
    runtimePart(4, { practiceWords: ['cats'], chartingWords: ['maps'], chartingType: 'real' }),
    runtimePart(5, { sentences: ['The cats nap.'] }),
    runtimePart(6, { quickDrillReverse: ['a'] }),
    runtimePart(7, { currentWords: ['cats'] }),
    runtimePart(8, { dictation: { sounds: ['a'], realWords: [], wordElements: [], nonsenseWords: [], phrases: [], sentences: [] } }),
    runtimePart(9, { passage: 'A controlled passage.' }),
    runtimePart(10, { listeningComprehension: { mode: 'teacher-selected', title: 'Teacher choice', teacherDirections: ['Read aloud.'], studentPrompt: 'Listen.', sourceIds: ['step-source'] } })
  ]
});

test('upgrades a legacy lesson without removing its runtime fields', () => {
  const lesson = normalizeLesson({
    id: 'legacy-lesson',
    title: 'Legacy lesson',
    step: '8',
    substep: '2',
    quickDrill: ['a', 'sh'],
    wordCards: [{ id: 'card-1', text: 'sunfish', type: 'regular' }],
    dictation: { realWords: ['sunfish'] }
  });

  assert.ok(lesson);
  assert.equal(lesson.schemaVersion, 2);
  assert.deepEqual(lesson.quickDrill, ['a', 'sh']);
  assert.equal(lesson.wordCards[0].text, 'sunfish');
  assert.equal(lesson.wrsPlan?.part10.selectionStatus, 'teacher-selected-at-lesson');
});

test('normalizes official planning fields and rejects unsupported option values', () => {
  const plan = normalizeWrsLessonPlan({
    lessonFocus: 'accuracy',
    wordTypesToChart: ['real', 'invalid'],
    verificationStatus: 'source-verified',
    part4: { studentReader: 'A', practiceHalf: 'top', chartingHalf: 'sideways' },
    part10: { selectionStatus: 'planned', tasks: ['oral-fluency', 'made-up-task'] }
  });

  assert.equal(plan.lessonFocus, 'accuracy');
  assert.deepEqual(plan.wordTypesToChart, ['real']);
  assert.equal(plan.part4.studentReader, 'A');
  assert.equal(plan.part4.chartingHalf, '');
  assert.deepEqual(plan.part10.tasks, ['oral-fluency']);
});

test('readiness requires all ten lesson parts while allowing Part 10 to be selected at lesson time', () => {
  const plan = createEmptyWrsLessonPlan();
  plan.lessonFocus = 'introduction';
  plan.conceptsToWeave = 'Previously taught closed-syllable concepts';
  plan.troubleSpots = 'Vowel sounds';
  plan.wordTypesToChart = ['real'];
  plan.part4.practicePage = '12';
  plan.part4.chartingPage = '13';
  plan.part7.currentConcepts = 'Current spelling concept';
  plan.part9.source = 'student-reader';

  const lesson: Lesson = {
    schemaVersion: 2,
    id: 'lesson-1', title: 'Lesson', step: '8', substep: '2',
    conceptNotes: 'Current reading concept', conceptNotes7: '', slides: [],
    quickDrill: ['a'], quickDrillReverse: ['a'],
    wordCards: [{ id: 'card-1', text: 'sunfish', type: 'regular' }],
    wordListReading: ['sunfish'], sentences: ['The sunfish swam.'],
    dictation: { sounds: ['a'], realWords: [], wordElements: [], nonsenseWords: [], phrases: [], sentences: [] },
    hfwList: [], affixPractice: [], passage: 'A controlled passage.', wrsPlan: plan
  };

  assert.deepEqual(getWrsLessonReadiness(lesson).missing, []);
});

test('runtime readiness derives existing requirements from the authoritative 10-Part plan', () => {
  const runtimePlan = createRuntimePlan();
  const lesson = normalizeLesson({
    id: 'saved-runtime-lesson',
    title: 'Stale compatibility projection',
    step: '1',
    substep: '6',
    runtimePlan,
    wrsPlan: createEmptyWrsLessonPlan()
  });

  assert.ok(lesson);
  assert.equal(lesson.title, 'Runtime lesson');
  assert.deepEqual(lesson.wordListPractice, ['cats']);
  assert.deepEqual(lesson.wordListCharting, ['maps']);
  assert.deepEqual(getWrsLessonReadiness(lesson).missing, ['concepts to weave', 'trouble spots']);
});

test('runtime planning context completes readiness without duplicating legacy wrsPlan fields', () => {
  const runtimePlan = createRuntimePlan();
  runtimePlan.planningContext = {
    conceptsToWeave: 'Previously taught short-vowel contrasts',
    troubleSpots: 'Vowel confusion in base words'
  };
  const lesson = normalizeLesson({
    id: 'saved-runtime-lesson',
    runtimePlan,
    wrsPlan: createEmptyWrsLessonPlan()
  });

  assert.ok(lesson);
  assert.deepEqual(getWrsLessonReadiness(lesson).missing, []);
  assert.equal(lesson.wrsPlan?.lessonFocus, '');
  assert.deepEqual(lesson.wrsPlan?.wordTypesToChart, []);
});
