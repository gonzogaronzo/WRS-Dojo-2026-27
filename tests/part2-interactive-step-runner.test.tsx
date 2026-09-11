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
  const phasePractice = suppliedStep(presentation, 'phase-reading-practice');
  const graphPractice = suppliedStep(presentation, 'graph-reading-practice');
  const trophyPractice = suppliedStep(presentation, 'trophy-reading-practice');
  const dolphinPractice = suppliedStep(presentation, 'dolphin-reading-practice');

  assert.equal(catchBuild.actionType, 'BUILD_WORD');
  assert.equal(catchBuild.displayType, 'LETTER_SOUND_TILES');
  assert.deepEqual(catchBuild.objects.map(object => [object.text, object.role, object.stagingOrder]), [
    ['c', 'consonant', 1],
    ['a', 'vowel', 2],
    ['tch', 'consonant-trigraph', 3]
  ]);
  assert.equal(affixBuild.displayType, 'PREFIX_SUFFIX_CARDS');
  assert.equal(affixBuild.cardRepresentation, 'morphological');
  assert.deepEqual(affixBuild.objects.map(object => object.role), [
    'consonant', 'vowel', 'consonant-trigraph', 'suffix', 'prefix'
  ]);
  assert.equal(greekBuild.displayType, 'WORD_ELEMENT_CARDS');
  assert.equal(greekBuild.cardRepresentation, 'greek-latin');
  assert.equal(greekBuild.sourceSection, 'subsequent-lessons');
  assert.equal(greekBuild.projectPacingRule, PART2_SUBSEQUENT_INTRO_PACING_RULE);
  assert.deepEqual(greekBuild.objects.map(object => object.text), ['micro-', '-scope']);
  assert.deepEqual(greekBuild.wordElementMeanings?.map(entry => [entry.objectId, entry.meaning]), [
    ['micro', 'small'],
    ['scope', 'instrument for viewing']
  ]);
  assert.equal(phasePractice.actionType, 'READ_WORDS');
  assert.equal(phasePractice.displayType, 'LETTER_SOUND_TILES');
  assert.equal(phasePractice.cardRepresentation, 'single-syllable');
  assert.deepEqual(phasePractice.objects.map(object => object.text), ['ph', 'a', 's', 'e']);
  assert.equal(graphPractice.cardRepresentation, 'single-syllable');
  assert.equal(trophyPractice.displayType, 'SYLLABLE_CARDS');
  assert.equal(trophyPractice.cardRepresentation, 'multisyllabic');
  assert.deepEqual(trophyPractice.objects.map(object => object.text), ['tro', 'phy']);
  assert.equal(dolphinPractice.displayType, 'SYLLABLE_CARDS');
  assert.deepEqual(dolphinPractice.objects.map(object => object.text), ['dol', 'phin']);
});

test('supports a structurally different 8.2 source with Syllable and Word Element Cards', () => {
  const presentation = runnerPresentation(fixture82);
  const market = suppliedStep(presentation, 'market-syllable-build');
  const latin = suppliedStep(presentation, 'latin-base-word-elements');

  assert.equal(market.displayType, 'SYLLABLE_CARDS');
  assert.equal(market.cardRepresentation, 'multisyllabic');
  assert.deepEqual(market.objects.map(object => [object.text, object.role, object.stagingOrder]), [
    ['mar', 'syllable', 1],
    ['ket', 'syllable', 2]
  ]);
  assert.equal(latin.actionType, 'WORD_ELEMENT_BUILD');
  assert.equal(latin.displayType, 'WORD_ELEMENT_CARDS');
  assert.equal(latin.cardRepresentation, 'greek-latin');
  assert.deepEqual(latin.objects.map(object => object.role), ['base-element', 'base-element', 'base-element']);
  assert.deepEqual(latin.wordElementMeanings?.map(entry => [entry.objectId, entry.meaning]), [
    ['form', 'to form, shape'],
    ['part', 'part, divide'],
    ['port', 'to carry']
  ]);

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

  const rawWordFallback = JSON.parse(JSON.stringify(fixture73));
  const trophySource = rawWordFallback.interactiveSteps.find((step: { id: string }) => step.id === 'trophy-reading-practice');
  trophySource.displayType = 'WRITTEN_WORD';
  trophySource.objects = [{ id: 'trophy-word', text: 'trophy', role: 'word', stagingOrder: 1 }];
  const rawWordFailure = runnerPresentation(rawWordFallback).steps.find(step => step.id === 'trophy-reading-practice');
  assert.equal(rawWordFailure?.kind, 'invalid');
  if (rawWordFailure?.kind === 'invalid') assert.match(rawWordFailure.reason, /multisyllabic|WRITTEN_WORD/);

  const missingCardRepresentation = JSON.parse(JSON.stringify(fixture73));
  delete missingCardRepresentation.interactiveSteps.find((step: { id: string }) => step.id === 'phase-reading-practice').cardRepresentation;
  const representationFailure = runnerPresentation(missingCardRepresentation).steps.find(step => step.id === 'phase-reading-practice');
  assert.equal(representationFailure?.kind, 'invalid');
  if (representationFailure?.kind === 'invalid') assert.match(representationFailure.reason, /cardRepresentation/);
});

test('shows one movable review card at a time and keeps Next runner-owned', () => {
  const presentation = runnerPresentation(fixture73);
  const reviewIndex = presentation.steps.findIndex(step => step.id === 'previous-substep-review');
  assert.ok(reviewIndex >= 0);
  const html = renderToStaticMarkup(
    <Part2InteractiveRunner presentation={presentation} activeStepIndex={reviewIndex} />
  );
  assert.match(html, /data-part2-active-word="true"/);
  assert.match(html, /bridge/);
  assert.doesNotMatch(html, /hinge/);
  assert.doesNotMatch(html, /fence/);
  assert.match(html, /data-part2-review-card="true"/);
  assert.match(html, /data-part2-manipulative/);
  assert.equal((html.match(/aria-label="Next"/g) || []).length, 1);
  assert.match(html, /data-part2-next-scope="review-word"/);
  assert.doesNotMatch(html, /data-part2-word-sequence-controls|Previous word|Next word|Quick Practice/);
});

test('keeps source-supplied and already-placed Letter-Sound tiles draggable on the teacher surface', () => {
  const presentation = runnerPresentation(fixture73);
  const suppliedIndex = presentation.steps.findIndex(step => step.id === 'known-digraph-review');
  assert.ok(suppliedIndex >= 0);
  const suppliedHtml = renderToStaticMarkup(
    <Part2InteractiveRunner presentation={presentation} activeStepIndex={suppliedIndex} />
  );
  const suppliedWh = suppliedHtml.slice(Math.max(0, suppliedHtml.indexOf('data-part2-object-id="wh"') - 220), suppliedHtml.indexOf('data-part2-object-id="wh"') + 140);
  assert.match(suppliedWh, /data-part2-manipulative/);
  assert.match(suppliedWh, /data-part2-draggable="true"/);
  assert.match(suppliedWh, /data-part2-drag-enabled="true"/);

  const phoneIndex = presentation.steps.findIndex(step => step.id === 'phone-build');
  assert.ok(phoneIndex >= 0);
  const placedHtml = renderToStaticMarkup(
    <Part2InteractiveRunner
      presentation={presentation}
      activeStepIndex={phoneIndex}
      objectStates={{
        [phoneIndex]: {
          'part2:phone-build:ph': { x: 640, y: 410, scale: 1, placed: true }
        }
      }}
    />
  );
  const placedPh = placedHtml.slice(Math.max(0, placedHtml.indexOf('data-part2-object-id="ph"') - 220), placedHtml.indexOf('data-part2-object-id="ph"') + 140);
  assert.match(placedPh, /data-part2-draggable="true"/);
  assert.match(placedPh, /data-part2-drag-enabled="true"/);
}); 

test('keeps target-word build and read directions private from student projections', () => {
  const teacherPresentation = runnerPresentation(fixture73);
  const phoneIndex = teacherPresentation.steps.findIndex(step => step.id === 'phone-build');
  const phaseIndex = teacherPresentation.steps.findIndex(step => step.id === 'phase-reading-practice');
  assert.ok(phoneIndex >= 0 && phaseIndex >= 0);
  const teacherHtml = renderToStaticMarkup(
    <Part2InteractiveRunner presentation={teacherPresentation} activeStepIndex={phoneIndex} />
  );
  assert.match(teacherHtml, /Full source directions/);
  assert.match(teacherHtml, /build phone/);
  assert.doesNotMatch(teacherHtml, /data-part2-teacher-cue/);

  const studentSource = sanitizePart2PresentationForStudent(fixture73);
  const studentPresentation = runnerPresentation(studentSource);
  const phoneHtml = renderToStaticMarkup(
    <Part2InteractiveRunner presentation={studentPresentation} activeStepIndex={phoneIndex} readOnly />
  );
  const phaseHtml = renderToStaticMarkup(
    <Part2InteractiveRunner presentation={studentPresentation} activeStepIndex={phaseIndex} readOnly />
  );
  const studentSerialized = JSON.stringify(studentSource);
  assert.doesNotMatch(studentSerialized, /Build the supplied phone example|build phone|Read phase with the supplied Letter-Sound Tiles|for phase in order/i);
  assert.doesNotMatch(phoneHtml, /Build the supplied phone example|build phone|data-part2-teacher-cue|data-part2-teacher-directions/i);
  assert.doesNotMatch(phaseHtml, /Read phase with the supplied Letter-Sound Tiles|for phase in order|data-part2-teacher-cue|data-part2-teacher-directions/i);
});

test('renders an Answer-Key-grounded notebook facsimile while keeping locator prose private', () => {
  const presentation = runnerPresentation(fixture73);
  const notebookIndex = presentation.steps.findIndex(step => step.id === 'ph-notebook');
  const notebookStep = suppliedStep(presentation, 'ph-notebook');
  assert.equal(notebookStep.notebookContext?.pageNumber, 2);
  assert.equal(notebookStep.notebookContext?.section, 'Sounds');
  assert.equal(notebookStep.notebookContext?.subheading, 'Consonant Combinations — Digraphs');
  assert.match(notebookStep.notebookContext?.pageLocation || '', /first unshaded entry box/);
  assert.match(notebookStep.notebookContext?.entryAppearance || '', /telephone picture/);
  assert.match(notebookStep.notebookContext?.purpose || '', /Step 7.3 ph digraph/);
  assert.deepEqual(notebookStep.notebookVisual?.rows.map(row => [row.id, row.sourceOrder, row.target]), [
    ['ph-previously-taught', 1, false],
    ['ph-entry', 2, true],
    ['ch-k-chorus-entry', 3, false]
  ]);

  const teacherHtml = renderToStaticMarkup(
    <Part2InteractiveRunner presentation={presentation} activeStepIndex={notebookIndex} />
  );
  assert.match(teacherHtml, /data-part2-notebook-page/);
  assert.match(teacherHtml, /data-part2-notebook-entry-grid/);
  assert.match(teacherHtml, /data-part2-notebook-target-row="true"/);
  assert.match(teacherHtml, /Previously Taught/);
  assert.match(teacherHtml, /Visual cue · telephone/);
  assert.match(teacherHtml, /data-part2-notebook-note/);
  assert.match(teacherHtml, /Notebook source details/);
  assert.match(teacherHtml, /first unshaded entry box/);
  assert.match(teacherHtml, /telephone drawing/);

  const noVisual = JSON.parse(JSON.stringify(fixture73));
  delete noVisual.interactiveSteps.find((step: { id: string }) => step.id === 'ph-notebook').notebookVisual;
  const noVisualPresentation = runnerPresentation(noVisual);
  const noVisualIndex = noVisualPresentation.steps.findIndex(step => step.id === 'ph-notebook');
  const noVisualStudent = runnerPresentation(sanitizePart2PresentationForStudent(noVisual));
  const noVisualHtml = renderToStaticMarkup(
    <Part2InteractiveRunner presentation={noVisualStudent} activeStepIndex={noVisualIndex} readOnly />
  );
  assert.match(noVisualHtml, /data-part2-notebook-page-unavailable/);
  assert.match(noVisualHtml, /Notebook page view unavailable/);

  const malformedVisual = JSON.parse(JSON.stringify(fixture73));
  malformedVisual.interactiveSteps.find((step: { id: string }) => step.id === 'ph-notebook').notebookVisual.rows[1].target = false;
  const malformedStep = runnerPresentation(malformedVisual).steps.find(step => step.id === 'ph-notebook');
  assert.equal(malformedStep?.kind, 'invalid');

  const studentSource = sanitizePart2PresentationForStudent(fixture73);
  const studentPresentation = runnerPresentation(studentSource);
  const studentHtml = renderToStaticMarkup(
    <Part2InteractiveRunner presentation={studentPresentation} activeStepIndex={notebookIndex} readOnly />
  );
  assert.match(JSON.stringify(studentSource), /notebookVisual/);
  assert.doesNotMatch(JSON.stringify(studentSource), /notebookContext|first unshaded entry box|telephone drawing/);
  assert.match(studentHtml, /data-part2-notebook-page/);
  assert.match(studentHtml, /Consonant Combinations — Digraphs/);
  assert.match(studentHtml, /data-part2-notebook-target-row="true"/);
  assert.doesNotMatch(studentHtml, /data-part2-notebook-note|first unshaded entry box|telephone drawing/);
});

test('shows Answer Key word-element meanings while stripping the private source context from students', () => {
  const presentation = runnerPresentation(fixture73);
  const greekIndex = presentation.steps.findIndex(step => step.id === 'greek-word-element-build');
  const teacherHtml = renderToStaticMarkup(
    <Part2InteractiveRunner presentation={presentation} activeStepIndex={greekIndex} />
  );
  assert.match(teacherHtml, /data-part2-word-element-meanings/);
  assert.match(teacherHtml, /small/);
  assert.match(teacherHtml, /instrument for viewing/);
  assert.match(teacherHtml, /data-part2-word-element-source-context/);
  assert.match(teacherHtml, /p\. 47/);
  assert.match(teacherHtml, /Example Image column shows a microscope/);

  const studentSource = sanitizePart2PresentationForStudent(fixture73);
  const studentPresentation = runnerPresentation(studentSource);
  const studentHtml = renderToStaticMarkup(
    <Part2InteractiveRunner presentation={studentPresentation} activeStepIndex={greekIndex} readOnly />
  );
  assert.match(JSON.stringify(studentSource), /"meaning":"small"/);
  assert.doesNotMatch(JSON.stringify(studentSource), /sourceContext|p\. 47|Common Greek Bases/);
  assert.match(studentHtml, /data-part2-word-element-meanings/);
  assert.match(studentHtml, /small/);
  assert.doesNotMatch(studentHtml, /data-part2-word-element-source-context|Common Greek Bases|p\. 47/);
});

test('never surfaces answer-giving card prompts to students and fails closed for build/read/manipulation prompts', () => {
  const promptOnBuild = JSON.parse(JSON.stringify(fixture73));
  promptOnBuild.interactiveSteps.find((step: { id: string }) => step.id === 'catch-build').studentPrompt = 'Build and read catch.';
  const buildFailure = runnerPresentation(promptOnBuild).steps.find(step => step.id === 'catch-build');
  assert.equal(buildFailure?.kind, 'invalid');
  if (buildFailure?.kind === 'invalid') assert.match(buildFailure.reason, /studentPrompt/);

  const cardPrompt = JSON.parse(JSON.stringify(fixture73));
  cardPrompt.interactiveSteps.find((step: { id: string }) => step.id === 'tch-card').studentPrompt = 'Say the sound for tch.';
  const cardPresentation = runnerPresentation(cardPrompt);
  const cardIndex = cardPresentation.steps.findIndex(step => step.id === 'tch-card');
  const studentSource = sanitizePart2PresentationForStudent(cardPrompt);
  const studentHtml = renderToStaticMarkup(
    <Part2InteractiveRunner presentation={runnerPresentation(studentSource)} activeStepIndex={cardIndex} readOnly />
  );
  assert.doesNotMatch(JSON.stringify(studentSource), /Say the sound for tch/);
  assert.doesNotMatch(studentHtml, /data-part2-student-prompt|Say the sound for tch/);
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
  assert.match(teacherHtml, /Full source directions/);
  assert.doesNotMatch(teacherHtml, /data-part2-teacher-cue/);
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

test('keeps drawing and Wilson coding marks available on MARK_WORDS while hiding the controls from students', () => {
  const teacherPresentation = runnerPresentation(fixture73);
  const markIndex = teacherPresentation.steps.findIndex(step => step.id === 'tch-short-vowel-check');
  assert.ok(markIndex >= 0);
  const teacherHtml = renderToStaticMarkup(
    <Part2InteractiveRunner
      presentation={teacherPresentation}
      activeStepIndex={markIndex}
      drawingTool="pen"
      marks={[{ id: 'mark-1', type: 'breve', x: 740, y: 390, scale: 1 }]}
    />
  );
  assert.match(teacherHtml, /data-part2-drawing-tools/);
  assert.match(teacherHtml, /data-part2-drawing-surface/);
  assert.match(teacherHtml, /data-part2-marking-surface="true"/);
  assert.match(teacherHtml, /data-part2-coding-mark/);
  assert.match(teacherHtml, /Draw or underline on the active Part 2 step/);

  const studentPresentation = runnerPresentation(sanitizePart2PresentationForStudent(fixture73));
  const studentHtml = renderToStaticMarkup(
    <Part2InteractiveRunner
      presentation={studentPresentation}
      activeStepIndex={markIndex}
      marks={[{ id: 'mark-1', type: 'breve', x: 740, y: 390, scale: 1 }]}
      readOnly
    />
  );
  assert.match(studentHtml, /data-part2-drawing-surface/);
  assert.match(studentHtml, /data-part2-coding-mark/);
  assert.doesNotMatch(studentHtml, /data-part2-drawing-tools/);
  assert.doesNotMatch(studentHtml, /Draw or underline on the active Part 2 step/);
});

test('removes Quick Practice and keeps one runner-owned navigation path', () => {
  const presentation = runnerPresentation(fixture73);
  assert.equal(nextPart2Step({ activeIndex: 0 }, presentation.steps.length).activeIndex, 1);
  assert.equal(previousPart2Step({ activeIndex: 1 }, presentation.steps.length).activeIndex, 0);
  assert.equal(previousPart2Step({ activeIndex: 0 }, presentation.steps.length).activeIndex, 0);
  assert.equal(nextPart2Step({ activeIndex: presentation.steps.length - 1 }, presentation.steps.length).activeIndex, presentation.steps.length - 1);
  const catchIndex = presentation.steps.findIndex(step => step.id === 'catch-build');
  const html = renderToStaticMarkup(<Part2InteractiveRunner presentation={presentation} activeStepIndex={catchIndex} />);
  assert.equal((html.match(/aria-label="Next"/g) || []).length, 1);
  assert.match(html, /data-part2-next-scope="instructional-move"/);
  assert.doesNotMatch(html, /Quick Practice|quickPractice|data-part2-quick-practice|data-part2-word-sequence-controls|Previous word|Next word/);
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


test('uses explicit layout to keep draggable review sets readable while retaining source-ordered pull stacks', () => {
  const presentation = runnerPresentation(fixture73);
  const reviewIndex = presentation.steps.findIndex(step => step.id === 'known-digraph-review');
  const buildIndex = presentation.steps.findIndex(step => step.id === 'phone-build');
  assert.ok(reviewIndex >= 0 && buildIndex >= 0);

  const reviewHtml = renderToStaticMarkup(
    <Part2InteractiveRunner presentation={presentation} activeStepIndex={reviewIndex} />
  );
  assert.match(reviewHtml, /data-part2-layout="review-row"/);
  assert.doesNotMatch(reviewHtml, /data-part2-staging-stack/);
  for (const card of ['wh', 'ch', 'sh', 'th', 'ck']) {
    const cardHtml = reviewHtml.slice(Math.max(0, reviewHtml.indexOf(`data-part2-object-id="${card}"`) - 180), reviewHtml.indexOf(`data-part2-object-id="${card}"`) + 180);
    assert.match(cardHtml, /data-part2-draggable="true"/);
    assert.match(cardHtml, /data-part2-drag-enabled="true"/);
  }

  const buildHtml = renderToStaticMarkup(
    <Part2InteractiveRunner presentation={presentation} activeStepIndex={buildIndex} />
  );
  assert.match(buildHtml, /data-part2-staging-stack/);
  assert.match(buildHtml, /data-staging-order="1"/);
});

test('scans every 7.3 answer-bearing move to keep target directions out of passive rendering', () => {
  const teacher = runnerPresentation(fixture73);
  const passiveSource = sanitizePart2PresentationForStudent(fixture73);
  const passive = runnerPresentation(passiveSource);
  const answerBearing = teacher.steps.filter((step): step is Part2InstructionStep => (
    step.kind === 'step' && ['BUILD_WORD', 'PRACTICE_BUILD', 'READ_WORDS', 'AFFIX_MANIPULATION', 'WORD_ELEMENT_BUILD'].includes(step.actionType)
  ));
  assert.ok(answerBearing.length > 0);
  for (const step of answerBearing) {
    const passiveStep = suppliedStep(passive, step.id);
    assert.equal(passiveStep.studentPrompt, undefined, `${step.id} must not carry a passive prompt`);
    const stepIndex = passive.steps.findIndex(candidate => candidate.id === step.id);
    const html = renderToStaticMarkup(<Part2InteractiveRunner presentation={passive} activeStepIndex={stepIndex} readOnly />);
    assert.doesNotMatch(html, new RegExp(step.teacherCue.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&'), 'i'));
    for (const direction of step.teacherDirections) {
      assert.doesNotMatch(html, new RegExp(direction.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&'), 'i'));
    }
  }
});

test('keeps both Answer-Key notebook visuals through the runtime lesson path and renders them instead of fallback', () => {
  const lesson = lessonWithPart2Source(fixture73);
  const presentation = part2InteractivePresentationFromData(lesson.runtimePlan?.parts.find(part => part.part === 2)?.data);
  assert.ok(presentation);
  for (const notebookId of ['ph-notebook', 'tch-notebook']) {
    const step = suppliedStep(presentation, notebookId);
    assert.equal(step.layout, 'notebook-page');
    assert.ok(step.notebookVisual, `${notebookId} visual must survive runtime adaptation`);
    const index = presentation.steps.findIndex(candidate => candidate.id === notebookId);
    const html = renderToStaticMarkup(<Part2InteractiveRunner presentation={presentation} activeStepIndex={index} readOnly />);
    assert.match(html, /data-part2-notebook-page/);
    assert.match(html, /data-part2-notebook-visual-status="facsimile-fallback"/);
    assert.doesNotMatch(html, /Notebook page view unavailable/);
  }
});


test('uses a private whole-page notebook asset when runtime supplies it and otherwise keeps the verified facsimile', () => {
  const withAsset = JSON.parse(JSON.stringify(fixture73));
  const notebook = withAsset.interactiveSteps.find((step: { id: string }) => step.id === 'ph-notebook');
  notebook.notebookPageImage.imageUrl = '/notebook-assets/wrs-notebook-7-12-answer-key-page-002.png';
  const presentation = runnerPresentation(withAsset);
  const index = presentation.steps.findIndex(step => step.id === 'ph-notebook');
  const imageHtml = renderToStaticMarkup(<Part2InteractiveRunner presentation={presentation} activeStepIndex={index} readOnly />);
  assert.match(imageHtml, /data-part2-notebook-page-image/);
  assert.match(imageHtml, /notebook-page-002\.png/);
  assert.doesNotMatch(imageHtml, /Private notebook page image is unavailable/);

  const fallback = runnerPresentation(fixture73);
  const fallbackIndex = fallback.steps.findIndex(step => step.id === 'ph-notebook');
  const fallbackHtml = renderToStaticMarkup(<Part2InteractiveRunner presentation={fallback} activeStepIndex={fallbackIndex} readOnly />);
  assert.match(fallbackHtml, /data-part2-notebook-image-unavailable/);
  assert.match(fallbackHtml, /verified page facsimile/);
});
