import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SentenceReading from '../legacy/components/modules/SentenceReading';
import PassageReading from '../legacy/components/modules/PassageReading';
import Part7SpellingRunner, { part7SpellingItemsFromData } from '../legacy/components/modules/Part7SpellingRunner';
import { LessonRuntimeProvider } from '../legacy/components/lessonRuntimeContext';
import type { Lesson, RuntimeLessonPart } from '../legacy/types';

const part = (number: RuntimeLessonPart['part'], data: RuntimeLessonPart['data'] = {}): RuntimeLessonPart => ({
  part: number,
  title: `Part ${number}`,
  teacherDirections: [],
  sourceIds: number === 10 ? [] : ['source'],
  data
});

const lesson = (part5Data: Record<string, unknown>, part9Data: Record<string, unknown>): Lesson => ({
  schemaVersion: 2,
  id: 'surface-test',
  title: 'Surface test',
  step: '2',
  substep: '5',
  conceptNotes: '',
  slides: [],
  quickDrill: [],
  wordCards: [],
  sentences: ['Grab some string so we can bind the two boxes.'],
  dictation: { sounds: [], realWords: [], wordElements: [], nonsenseWords: [], phrases: [], sentences: [] },
  hfwList: [],
  affixPractice: [],
  passage: 'Spring is coming!',
  runtimePlan: {
    schemaVersion: 'wrs-runtime-v1',
    id: 'surface-test',
    title: 'Surface test',
    step: '2',
    substep: '5',
    focus: 'accuracy',
    lessonPath: 'full',
    plannedParts: [1,2,3,4,5,6,7,8,9,10],
    planningContext: { conceptsToWeave: '', troubleSpots: '' },
    sources: [{ id: 'source', label: 'Test source', kind: 'teacher-selection', locator: 'test only' }],
    parts: [
      part(1), part(2), part(3), part(4), part(5, part5Data),
      part(6), part(7), part(8), part(9, part9Data), part(10)
    ]
  }
});

test('Part 5 weave question is visible to teacher but not student', () => {
  const currentLesson = lesson(
    { weaveQuestions: ['What three letters form the beginning blend in string?'] },
    {}
  );
  const teacher = renderToStaticMarkup(
    <LessonRuntimeProvider lesson={currentLesson}>
      <SentenceReading sentences={currentLesson.sentences} />
    </LessonRuntimeProvider>
  );
  const student = renderToStaticMarkup(
    <LessonRuntimeProvider lesson={currentLesson}>
      <SentenceReading sentences={currentLesson.sentences} readOnly />
    </LessonRuntimeProvider>
  );

  assert.match(teacher, /data-part5-teacher-weave/);
  assert.match(teacher, /What three letters form the beginning blend in string/);
  assert.doesNotMatch(student, /data-part5-teacher-weave/);
  assert.doesNotMatch(student, /What three letters form the beginning blend in string/);
  assert.match(student, /Grab some string so we can bind the two boxes/);
});

test('Part 9 questions and history stay teacher-only while passage remains student-safe', () => {
  const currentLesson = lesson({}, {
    passageTitle: 'The Spring Job',
    studentReader: 'Student Reader 2',
    page: '122-123',
    questions: [
      { question: 'What season is coming in the passage?', level: 'direct-recall' },
      { question: 'What message does the passage give?', level: 'synthesis' }
    ],
    historyStatus: 'uncertain-flagged',
    historyNote: 'Prior passage history is not inferred.'
  });
  const teacher = renderToStaticMarkup(
    <LessonRuntimeProvider lesson={currentLesson}>
      <PassageReading text={currentLesson.passage || ''} />
    </LessonRuntimeProvider>
  );
  const student = renderToStaticMarkup(
    <LessonRuntimeProvider lesson={currentLesson}>
      <PassageReading text={currentLesson.passage || ''} readOnly />
    </LessonRuntimeProvider>
  );

  assert.match(teacher, /data-part9-teacher-questions/);
  assert.match(teacher, /What season is coming in the passage/);
  assert.match(teacher, /Prior passage history is not inferred/);
  assert.match(teacher, /The Spring Job/);
  assert.match(student, /The Spring Job/);
  assert.match(student, /Spring is coming/);
  assert.doesNotMatch(student, /data-part9-teacher-questions/);
  assert.doesNotMatch(student, /What season is coming in the passage/);
  assert.doesNotMatch(student, /Prior passage history is not inferred/);
});

const spellingData = {
  spellingItems: [
    {
      id: 'strap',
      word: 'strap',
      group: 'current',
      representation: 'letter-sound-tiles',
      units: [
        { text: 's', role: 'consonant' },
        { text: 't', role: 'consonant' },
        { text: 'r', role: 'consonant' },
        { text: 'a', role: 'vowel' },
        { text: 'p', role: 'consonant' }
      ]
    },
    {
      id: 'sunset',
      word: 'sunset',
      group: 'current',
      representation: 'syllable-cards',
      units: [
        { text: 'sun', role: 'syllable' },
        { text: 'set', role: 'syllable' }
      ]
    },
    {
      id: 'suffix-ing',
      word: '-ing',
      group: 'word-element',
      representation: 'prefix-suffix-cards',
      units: [{ text: '-ing', role: 'suffix' }]
    }
  ]
};

test('Part 7 uses explicit source-owned representations and rejects inferred/malformed affixes', () => {
  const items = part7SpellingItemsFromData(spellingData);
  assert.ok(items);
  assert.deepEqual(items.map(item => item.representation), [
    'letter-sound-tiles', 'syllable-cards', 'prefix-suffix-cards'
  ]);

  const malformedSuffix = JSON.parse(JSON.stringify(spellingData));
  malformedSuffix.spellingItems[2].units[0].text = 'ing';
  assert.equal(part7SpellingItemsFromData(malformedSuffix), null);

  const missingRepresentation = JSON.parse(JSON.stringify(spellingData));
  delete missingRepresentation.spellingItems[0].representation;
  assert.equal(part7SpellingItemsFromData(missingRepresentation), null);
});

test('Part 7 hides the target until reveal and uses Wilson semantic card roles', () => {
  const items = part7SpellingItemsFromData(spellingData);
  assert.ok(items);

  const teacherHidden = renderToStaticMarkup(<Part7SpellingRunner items={items} activeIndex={0} />);
  const studentHidden = renderToStaticMarkup(<Part7SpellingRunner items={items} activeIndex={0} readOnly />);
  const studentRevealed = renderToStaticMarkup(
    <Part7SpellingRunner items={items} activeIndex={0} revealedItems={{ 0: true }} readOnly />
  );
  const affixRevealed = renderToStaticMarkup(
    <Part7SpellingRunner items={items} activeIndex={2} revealedItems={{ 2: true }} readOnly />
  );

  assert.match(teacherHidden, /data-part7-target-private/);
  assert.match(teacherHidden, />strap</);
  assert.match(studentHidden, />Listen</);
  assert.doesNotMatch(studentHidden, /data-part7-target-private/);
  assert.doesNotMatch(studentHidden, />strap</);
  assert.match(studentRevealed, /data-part2-role="consonant"/);
  assert.match(studentRevealed, /data-part2-role="vowel"/);
  assert.match(studentRevealed, />s</);
  assert.match(studentRevealed, />a</);
  assert.match(affixRevealed, /data-part2-role="suffix"/);
  assert.match(affixRevealed, /data-wrs-visual="affix"/);
  assert.match(affixRevealed, /-ing/);
  assert.doesNotMatch(teacherHidden, /Quick Practice|Cipher/i);
});
