import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Part2InteractiveRunner from '../legacy/components/modules/Part2InteractiveRunner';
import TeachConcepts from '../legacy/components/modules/TeachConcepts';
import {
  PART2_SUBSEQUENT_INTRO_PACING_RULE,
  part2InteractivePresentationFromData,
  sanitizePart2PresentationForStudent,
  type Part2InstructionStep,
  type Part2InteractivePresentation
} from '../legacy/part2Presentation';
import type { Lesson } from '../legacy/types';
import {
  createPart2SavePayload,
  insertPart2QuickPractice,
  nextPart2Step,
  previousPart2Step,
  upsertPart2SavePayloadInNotes
} from '../legacy/part2StepRunner';
import fixture73 from './fixtures/part2-7.3-wilson-visual.json';
import fixture82 from './fixtures/part2-8.2-rcontrolled.json';

const runnerPresentation = (fixture: unknown): Part2InteractivePresentation => {
  const result = part2InteractivePresentationFromData({ part2Presentation: fixture });
  if (!result) throw new Error('Expected source-owned interactive Part 2 data.');
  return result;
};

const suppliedStep = (presentation: Part2InteractivePresentation, id: string): Part2InstructionStep => {
  const step = presentation.steps.find(candidate => candidate.id === id);
  if (!step || step.kind !== 'step') throw new Error(`Expected valid source step ${id}.`);
  return step;
};

const lessonWithPart2Source = (presentation: unknown): Lesson => ({
  id: 'runner-source-test', title: 'Runner source test', step: '7', substep: '3',
  conceptNotes: '', conceptNotes7: '', slides: [{ id: 'legacy-slide', type: 'template', title: '', content: 'legacy', elements: [] }],
  quickDrill: [], wordCards: [], sentences: [],
  dictation: { sounds: [], realWords: [], wordElements: [], nonsenseWords: [], phrases: [], sentences: [] },
  hfwList: [], affixPractice: [],
  runtimePlan: {
    schemaVersion: 'wrs-runtime-v1', id: 'runner-source-test', title: 'Runner source test', step: '7', substep: '3',
    focus: 'introduction', sources: [],
    parts: Array.from({ length: 10 }, (_, index) => ({
      part: index + 1,
      title: '',
      teacherDirections: [],
      sourceIds: [],
      data: index === 1 ? { part2Presentation: presentation } : {}
    }))
  }
} as unknown as Lesson);

test('uses explicit source action, display, cards, and staging order for 7.3 rather than spelling inference', () => {
  const presentation = runnerPresentation(fixture73);
  const catchBuild = suppliedStep(presentation, 'catch-build');
  const affixBuild = suppliedStep(presentation, 'latch-affix-manipulation');
  const greekBuild = suppliedStep(presentation, 'greek-word-element-build');

  assert.equal(catchBuild.actionType, 'BUILD_WORD');
  assert.equal(catchBuild.displayType, 'LETTER_SOUND_TILES');
  assert.deepEqual(catchBuild.objects.map(object => [object.text, object.role, object.stagingOrder]), [
    ['c', 'consonant', 1],
    ['a', 'vowel', 2],
    ['tch', 'consonant-trigraph', 3]
  ]);
  assert.equal(affixBuild.displayType, 'PREFIX_SUFFIX_CARDS');
  assert.deepEqual(affixBuild.objects.map(object => object.role), [
    'consonant', 'vowel', 'consonant-trigraph', 'suffix', 'prefix'
  ]);
  assert.equal(greekBuild.displayType, 'WORD_ELEMENT_CARDS');
  assert.equal(greekBuild.sourceSection, 'subsequent-lessons');
  assert.equal(greekBuild.projectPacingRule, PART2_SUBSEQUENT_INTRO_PACING_RULE);
  assert.deepEqual(greekBuild.objects.map(object => object.text), ['micro-', '-scope']);
});

test('supports a structurally different 8.2 source with Syllable and Word Element Cards', () => {
  const presentation = runnerPresentation(fixture82);
  const market = suppliedStep(presentation, 'market-syllable-build');
  const latin = suppliedStep(presentation, 'latin-base-word-elements');

  assert.equal(market.displayType, 'SYLLABLE_CARDS');
  assert.deepEqual(market.objects.map(object => [object.text, object.role, object.stagingOrder]), [
    ['mar', 'syllable', 1],
    ['ket', 'syllable', 2]
  ]);
  assert.equal(latin.actionType, 'WORD_ELEMENT_BUILD');
  assert.equal(latin.displayType, 'WORD_ELEMENT_CARDS');
  assert.deepEqual(latin.objects.map(object => object.role), ['base-element', 'base-element', 'base-element']);

  const malformed = JSON.parse(JSON.stringify(fixture82));
  delete malformed.interactiveSteps[0].objects[1].stagingOrder;
  const failClosed = runnerPresentation(malformed);
  const invalid = failClosed.steps[0];
  assert.equal(invalid.kind, 'invalid');
  if (invalid.kind === 'invalid') assert.match(invalid.reason, /stagingOrder/);

  const unsupportedRole = JSON.parse(JSON.stringify(fixture73));
  const catchSource = unsupportedRole.interactiveSteps.find((step: { id: string }) => step.id === 'catch-build');
  catchSource.objects[2].role = 'unsupported-card-role';
  const roleFailure = runnerPresentation(unsupportedRole).steps.find(step => step.id === 'catch-build');
  assert.equal(roleFailure?.kind, 'invalid');

  const noPacingOverride = JSON.parse(JSON.stringify(fixture73));
  delete noPacingOverride.interactiveSteps.find((step: { id: string }) => step.id === 'greek-word-element-build').projectPacingRule;
  assert.equal(runnerPresentation(noPacingOverride).steps.some(step => step.id === 'greek-word-element-build'), false);
});

test('routes supplied runner source through Teach Concepts while legacy semantic slides remain the fallback', () => {
  const runnerHtml = renderToStaticMarkup(
    <TeachConcepts lesson={lessonWithPart2Source(fixture73)} mode="slides" slideIndex={0} />
  );
  assert.match(runnerHtml, /data-part2-interactive-runner/);

  const legacyHtml = renderToStaticMarkup(
    <TeachConcepts lesson={lessonWithPart2Source({ version: 1, frames: fixture73.frames })} mode="slides" slideIndex={0} />
  );
  assert.doesNotMatch(legacyHtml, /data-part2-interactive-runner/);
  assert.match(legacyHtml, /Toggle Sensei Notes/);
});

test('renders only one source-owned move, an ordered teacher stack, and a passive student projection', () => {
  const teacherPresentation = runnerPresentation(fixture73);
  const catchIndex = teacherPresentation.steps.findIndex(step => step.id === 'catch-build');
  assert.ok(catchIndex >= 0);
  const teacherHtml = renderToStaticMarkup(
    <Part2InteractiveRunner presentation={teacherPresentation} activeStepIndex={catchIndex} />
  );
  assert.match(teacherHtml, /data-part2-staging-stack/);
  assert.match(teacherHtml, /Build the supplied catch example/);
  assert.match(teacherHtml, /Full source directions/);
  assert.match(teacherHtml, /data-part2-runner-controls/);
  const cPosition = teacherHtml.indexOf('data-part2-object-id="c"');
  const aPosition = teacherHtml.indexOf('data-part2-object-id="a"');
  const tchPosition = teacherHtml.indexOf('data-part2-object-id="tch"');
  assert.ok(cPosition >= 0 && cPosition < aPosition && aPosition < tchPosition);
  assert.match(teacherHtml, /data-staging-order="1"/);
  assert.match(teacherHtml, /data-staging-order="2"/);
  assert.match(teacherHtml, /data-staging-order="3"/);

  const studentSource = sanitizePart2PresentationForStudent(fixture73);
  const studentPresentation = runnerPresentation(studentSource);
  const studentHtml = renderToStaticMarkup(
    <Part2InteractiveRunner
      presentation={studentPresentation}
      activeStepIndex={catchIndex}
      readOnly
      objectStates={{
        [catchIndex]: {
          'part2:catch-build:c': { x: 410, y: 410, scale: 1, placed: true }
        }
      }}
    />
  );
  assert.match(studentHtml, /data-part2-live-work-area/);
  assert.match(studentHtml, /data-part2-object-id="c"/);
  assert.doesNotMatch(studentHtml, /data-part2-staging-stack/);
  assert.doesNotMatch(studentHtml, /data-part2-runner-controls/);
  assert.doesNotMatch(studentHtml, /Build the supplied catch example/);
  assert.doesNotMatch(studentHtml, /Full source directions/);
  assert.doesNotMatch(JSON.stringify(studentSource), /SI-07|Build the supplied catch example/);
});

test('keeps Quick Practice transient and bounds Back/Next navigation to source order', () => {
  const presentation = runnerPresentation(fixture73);
  const catchIndex = presentation.steps.findIndex(step => step.id === 'catch-build');
  assert.ok(catchIndex >= 0);
  const before = JSON.stringify(presentation.steps);
  const quick = insertPart2QuickPractice({ activeIndex: catchIndex }, presentation.steps);
  assert.equal(quick.activeIndex, catchIndex);
  assert.equal(quick.quickPracticeAnchorId, 'catch-build');
  assert.equal(JSON.stringify(presentation.steps), before);
  assert.equal(previousPart2Step({ activeIndex: 0 }, presentation.steps.length).activeIndex, 0);
  assert.equal(nextPart2Step({ activeIndex: presentation.steps.length - 1 }, presentation.steps.length).activeIndex, presentation.steps.length - 1);
  assert.equal(nextPart2Step(quick, presentation.steps.length).activeIndex, catchIndex + 1);
});

test('writes only the concise Part 2 lesson record into the existing session note', () => {
  const payload = createPart2SavePayload({
    completed: true,
    troubleSpots: '  misses  tch  ',
    note: '  needs one repeat ',
    stepId: 'catch-build'
  });
  const once = upsertPart2SavePayloadInNotes('Existing teacher note', payload);
  const twice = upsertPart2SavePayloadInNotes(once, { ...payload, completed: false });
  assert.match(twice, /Existing teacher note/);
  assert.equal((twice.match(/\[Part 2 save\]/g) || []).length, 1);
  assert.match(twice, /completion=in-progress/);
  assert.match(twice, /trouble spots=misses tch/);
  assert.match(twice, /step=catch-build/);
  assert.doesNotMatch(twice, /studentId|score|assessment/i);
});
