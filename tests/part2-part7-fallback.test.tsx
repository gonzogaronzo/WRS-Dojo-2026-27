import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TeachConcepts from '../legacy/components/modules/TeachConcepts';
import { buildPlanContent } from '../legacy/components/modules/TeachConceptsLegacy';
import { normalizeRuntimeLessonPlan, runtimeLessonToLegacyLesson } from '../legacy/runtimeLesson';
import { part2InteractivePresentationFromData } from '../legacy/part2Presentation';
import { part7SpellingItemsFromData } from '../legacy/components/modules/Part7SpellingRunner';
import { Lesson, Slide } from '../legacy/types';

// A real teacher-authored lesson that supplies neither part2Presentation nor
// spellingItems, so both runners decline and the legacy surface must carry it.
const fixtureUrl = new URL('./fixtures/3A-2.5-no-runner.json', import.meta.url);
const fixture = JSON.parse(readFileSync(fixtureUrl, 'utf8'));

const lessonFromFixture = (): Lesson => {
  const plan = normalizeRuntimeLessonPlan(fixture);
  assert.ok(plan, 'fixture must normalize to a runtime plan');
  return runtimeLessonToLegacyLesson(plan!);
};

const render = (lesson: Lesson, isSpelling: boolean, extra: Record<string, unknown> = {}) =>
  renderToStaticMarkup(<TeachConcepts lesson={lesson} isSpelling={isSpelling} {...extra} />);

test('the fixture is genuinely a no-runner lesson', () => {
  const part2 = fixture.parts.find((part: any) => part.part === 2);
  const part7 = fixture.parts.find((part: any) => part.part === 7);

  assert.equal(part2InteractivePresentationFromData(part2.data), null);
  assert.equal(part7SpellingItemsFromData(part7.data), null);
  assert.equal(lessonFromFixture().slides.length, 0);
});

test('projection keeps concept notes AND teacher directions for both parts', () => {
  const lesson = lessonFromFixture();

  // Previously an `||` discarded every direction whenever conceptNotes existed.
  assert.match(lesson.conceptNotes, /Accuracy with three-letter blends/);
  assert.match(lesson.conceptNotes, /Levi: use a sound-by-sound sequence check/);
  assert.match(lesson.conceptNotes, /Nora and Alice: require complete word/);
  assert.match(lesson.conceptNotes7 || '', /Spelling accuracy for three-letter blends/);
  assert.match(lesson.conceptNotes7 || '', /point to each tile position before writing/);
  assert.match(lesson.conceptNotes7 || '', /Sentence-sequence repair/);
});

test('Part 2 opens on its imported content rather than an empty slideshow', () => {
  const html = render(lessonFromFixture(), false);

  assert.match(html, /Tap every sound, then read without tapping\./);
  assert.match(html, /Levi: use a sound-by-sound sequence check/);
  assert.match(html, /splash/);
  assert.match(html, /trunks/);
  assert.match(html, /Part 2/);
});

test('Part 7 opens on its own spelling content', () => {
  const html = render(lessonFromFixture(), true);

  assert.match(html, /point to each tile position before writing/);
  assert.match(html, /Sentence-sequence repair/);
  assert.match(html, /struck/);
  assert.match(html, /Part 7/);
});

test('Part 2 and Part 7 do not render each other\'s instructional content', () => {
  const lesson = lessonFromFixture();
  const reading = render(lesson, false);
  const spelling = render(lesson, true);

  assert.doesNotMatch(reading, /point to each tile position/);
  assert.doesNotMatch(reading, /Sentence-sequence repair/);
  assert.doesNotMatch(spelling, /read without tapping/);
  assert.doesNotMatch(spelling, /Nora and Alice: require complete word/);
});

test('a stale session mode of slides no longer produces an empty slideshow', () => {
  const lesson = lessonFromFixture();

  // 'slides' is what createInitialLessonSession seeds for every part.
  const reading = render(lesson, false, { mode: 'slides', readOnly: true });
  const spelling = render(lesson, true, { mode: 'slides', readOnly: true });

  // readOnly suppresses the teacher plan, so this asserts the audience surface
  // falls back to the journal board rather than rendering nothing.
  assert.match(reading, /Target Word|Select tiles|Type to build/);
  assert.match(spelling, /Target Word|Select tiles|Type to build/);
});

test('Part 7 never renders Part 2 slides, even in slides mode', () => {
  const lesson = lessonFromFixture();
  const readingSlide: Slide = {
    id: 'r1', type: 'template', title: 'Reading Only Slide', content: 'strap', elements: []
  };
  const withSlides: Lesson = { ...lesson, slides: [readingSlide] };

  assert.doesNotMatch(render(withSlides, true, { mode: 'slides' }), /Reading Only Slide/);
  assert.match(render(withSlides, false, { mode: 'slides', readOnly: true }), /Reading Only Slide/);
});

test('the teacher plan never reaches the student display', () => {
  const lesson = lessonFromFixture();
  const html = render(lesson, false, { readOnly: true });

  assert.doesNotMatch(html, /Levi: use a sound-by-sound sequence check/);
  assert.doesNotMatch(html, /Accuracy with three-letter blends/);
});

test('legacy lessons with only concept notes keep their existing behaviour', () => {
  const legacy: Lesson = {
    id: 'legacy-1',
    title: 'Hand-built',
    step: '2',
    substep: '5',
    conceptNotes: 'Legacy reading notes.',
    conceptNotes7: 'Legacy spelling notes.',
    slides: [],
    quickDrill: [],
    wordCards: [],
    sentences: [],
    dictation: { sounds: [], realWords: [], wordElements: [], nonsenseWords: [], phrases: [], sentences: [] },
    hfwList: [],
    affixPractice: []
  };

  assert.match(render(legacy, false), /Legacy reading notes\./);
  assert.match(render(legacy, true), /Legacy spelling notes\./);
  assert.doesNotMatch(render(legacy, false), /Legacy spelling notes/);

  const plan = buildPlanContent(legacy, false);
  assert.equal(plan.sections.length, 0);
  assert.equal(plan.hasContent, true);
});

test('a part with no plan content at all reports empty rather than crashing', () => {
  const bare: Lesson = {
    id: 'bare', title: 'Bare', step: '2', substep: '5',
    conceptNotes: '', conceptNotes7: '', slides: [], quickDrill: [], wordCards: [],
    sentences: [],
    dictation: { sounds: [], realWords: [], wordElements: [], nonsenseWords: [], phrases: [], sentences: [] },
    hfwList: [], affixPractice: []
  };

  assert.equal(buildPlanContent(bare, false).hasContent, false);
  assert.doesNotThrow(() => render(bare, false));
});
