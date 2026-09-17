import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Layout from '../legacy/components/Layout';
import LessonForm from '../legacy/components/LessonForm';
import { createEmptyWrsLessonPlan } from '../legacy/wrsLessonPlan';
import { LessonPart, type Lesson, type RuntimeLessonPart } from '../legacy/types';

const runtimePart = (part: RuntimeLessonPart['part']): RuntimeLessonPart => ({
  part,
  title: `Part ${part}`,
  teacherDirections: [],
  sourceIds: ['source'],
  data: {}
});

const runtimeLesson: Lesson = {
  schemaVersion: 2,
  id: 'export-placement-test',
  title: 'Export placement test',
  step: '2',
  substep: '5',
  conceptNotes: '',
  conceptNotes7: '',
  cipherWords: [],
  cipherDistractors: [],
  googleSlidesUrl: '',
  slides: [],
  quickDrill: [],
  quickDrillReverse: [],
  wordCards: [],
  wordListReading: [],
  wordListReadingAuto: true,
  sentences: [],
  dictation: {
    sounds: [],
    realWords: [],
    wordElements: [],
    nonsenseWords: [],
    phrases: [],
    sentences: []
  },
  hfwList: [],
  affixPractice: [],
  passage: '',
  plannedParts: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  wrsPlan: createEmptyWrsLessonPlan(),
  runtimePlan: {
    schemaVersion: 'wrs-runtime-v1',
    id: 'export-placement-test',
    title: 'Export placement test',
    step: '2',
    substep: '5',
    focus: 'accuracy',
    lessonPath: 'full',
    plannedParts: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    planningContext: { conceptsToWeave: '', troubleSpots: '' },
    sources: [{ id: 'source', label: 'Test source', kind: 'teacher-selection', locator: 'test only' }],
    parts: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(number => runtimePart(number as RuntimeLessonPart['part']))
  }
};

test('export control stays on Lesson Plan page and out of active lesson runner', () => {
  const runner = renderToStaticMarkup(
    <Layout
      lesson={runtimeLesson}
      currentPart={LessonPart.Part5}
      onChangePart={() => {}}
      onExit={() => {}}
    >
      <div data-runner-content="visible">Active lesson content</div>
    </Layout>
  );

  assert.doesNotMatch(runner, /Export Canonical JSON/);
  assert.doesNotMatch(runner, /data-canonical-export/);
  assert.match(runner, /data-runner-content="visible"/);
  assert.match(runner, /Print Lesson/);
  assert.match(runner, /Edit Lesson/);

  const lessonPlan = renderToStaticMarkup(
    <LessonForm initialLesson={runtimeLesson} onSave={() => {}} />
  );

  assert.match(lessonPlan, /Export JSON/);
  assert.match(lessonPlan, /Run Mission/);
});
