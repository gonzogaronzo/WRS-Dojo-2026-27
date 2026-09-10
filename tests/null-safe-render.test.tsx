import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Slideshow from '../legacy/components/modules/Slideshow';
import TeachConcepts from '../legacy/components/modules/TeachConcepts';
import MissionPlayer from '../legacy/components/MissionPlayer';
import LessonStage from '../legacy/components/LessonStage';
import QuickDrill from '../legacy/components/modules/QuickDrill';
import Spelling from '../legacy/components/modules/Spelling';
import { UnassignedLessonCompletion } from '../legacy/components/SessionDossier';
import { normalizeLesson } from '../legacy/dataNormalization';
import { part2PresentationToSlides } from '../legacy/part2Presentation';
import { runtimeLessonToLegacyLesson } from '../legacy/runtimeLesson';

const lesson = normalizeLesson({
  id: 'lesson-1',
  title: 'Recovered Lesson',
  step: '2',
  substep: '3',
  slides: [{
    id: 'slide-1',
    type: 'template',
    title: 'Recovered Slide',
    content: 'cat',
    elements: [{ id: 'element-1', type: 'word', content: 'cat' }]
  }]
});

test('renders a slideshow even when legacy slides contain null nested elements', () => {
  assert.ok(lesson);
  const brokenSlides = [{ ...lesson.slides[0], elements: [null, ...lesson.slides[0].elements!] }] as any;
  const html = renderToStaticMarkup(<Slideshow slides={brokenSlides} tool="cursor" />);
  assert.match(html, /Recovered Slide/);
});

test('renders the teaching board even when restored coding marks contain null', () => {
  assert.ok(lesson);
  const html = renderToStaticMarkup(
    <TeachConcepts lesson={lesson} mode="board" marks={[null, { id: 'mark-1', type: 'star', x: 0, y: 0, scale: 1 }] as any} />
  );
  assert.match(html, /Target Word|Select tiles to build a word/);
});

test('never renders teacher slide notes on the passive student display', () => {
  assert.ok(lesson);
  const slides = [{ ...lesson.slides[0], notes: 'Private teacher prompt' }];
  const html = renderToStaticMarkup(<Slideshow slides={slides} tool="cursor" readOnly currentIndex={0} />);
  assert.doesNotMatch(html, /Private teacher prompt/);
  assert.doesNotMatch(html, /Toggle Sensei Notes/);
});

test('keeps auditory Quick Drill dictation cues teacher-only', () => {
  const teacherHtml = renderToStaticMarkup(
    <QuickDrill sounds={['a']} isReverse step="1" substep="1" />
  );
  const studentHtml = renderToStaticMarkup(
    <QuickDrill sounds={['a']} isReverse step="1" substep="1" readOnly />
  );

  assert.match(teacherHtml, /Teacher only/);
  assert.match(teacherHtml, /Dictate/);
  assert.doesNotMatch(studentHtml, /Teacher only/);
  assert.match(studentHtml, /Listen/);
  assert.doesNotMatch(studentHtml, /Shuffle/);
});

test('shows unrevealed written-work items to the teacher but not the student display', () => {
  const data = {
    sounds: ['/k/'],
    realWords: ['spring'],
    wordElements: [],
    nonsenseWords: [],
    phrases: [],
    sentences: []
  };
  const teacherHtml = renderToStaticMarkup(<Spelling data={data} lessonStep="2" lessonSubstep="5" />);
  const studentHtml = renderToStaticMarkup(<Spelling data={data} lessonStep="2" lessonSubstep="5" readOnly />);

  assert.match(teacherHtml, /Teacher only/);
  assert.match(teacherHtml, /\/k\//);
  assert.doesNotMatch(studentHtml, /Teacher only/);
  assert.doesNotMatch(studentHtml, /\/k\//);
  assert.match(studentHtml, /Waiting for teacher/);
  assert.doesNotMatch(studentHtml, /Reveal All/);
});

test('renders a recoverable completion screen when a lesson has no selected group', () => {
  const html = renderToStaticMarkup(<UnassignedLessonCompletion />);
  assert.match(html, /Select a Group to Finish/);
  assert.match(html, /Return to Briefing/);
});

test('renders a supplied multi-letter Part 2 tile as one semantic card without arbitrary positioning', () => {
  const slides = part2PresentationToSlides({
    part2Presentation: {
      version: 1,
      focus: 'introduction',
      frames: [{
        id: 'ph-card',
        kind: 'tile-row',
        title: 'Supplied heading',
        tiles: [{ text: 'ph', role: 'consonant-digraph' }],
        annotation: 'Supplied student annotation.',
        teacherCue: 'Private teacher move.'
      }]
    }
  });

  assert.ok(slides);
  assert.equal(slides.length, 1);
  assert.equal(slides[0].type, 'template');
  assert.equal(slides[0].elements?.[0]?.x, undefined);
  assert.equal(slides[0].elements?.[0]?.y, undefined);

  const studentHtml = renderToStaticMarkup(<Slideshow slides={slides} tool="cursor" readOnly currentIndex={0} />);
  const teacherHtml = renderToStaticMarkup(<Slideshow slides={slides} tool="cursor" currentIndex={0} />);
  assert.equal((studentHtml.match(/data-part2-role="consonant-digraph"/g) || []).length, 1);
  assert.match(studentHtml, />ph</);
  assert.match(studentHtml, /Supplied student annotation/);
  assert.doesNotMatch(studentHtml, /Private teacher move/);
  assert.match(teacherHtml, /Private teacher move/);
});

test('uses only supplied Part 2 syllable divisions and preserves Greek combining-form units', () => {
  const slides = part2PresentationToSlides({
    part2Presentation: {
      version: 1,
      frames: [
        { id: 'syllables', kind: 'syllable-row', syllables: ['nap', 'kin'] },
        {
          id: 'elements',
          kind: 'word-elements',
          elements: [
            { text: 'micro-', role: 'greek-combining-form' },
            { text: '-scope', role: 'greek-combining-form' }
          ]
        }
      ]
    }
  });

  assert.ok(slides);
  const syllableHtml = renderToStaticMarkup(<Slideshow slides={slides} tool="cursor" readOnly currentIndex={0} />);
  assert.equal((syllableHtml.match(/data-part2-role="syllable"/g) || []).length, 2);
  assert.match(syllableHtml, />nap</);
  assert.match(syllableHtml, />kin</);

  const elementsHtml = renderToStaticMarkup(<Slideshow slides={slides} tool="cursor" readOnly currentIndex={1} />);
  assert.equal((elementsHtml.match(/data-part2-role="greek-combining-form"/g) || []).length, 2);
  assert.match(elementsHtml, /micro-/);
  assert.match(elementsHtml, /-scope/);
});

test('fails closed when a semantic Part 2 frame is malformed', () => {
  const slides = part2PresentationToSlides({
    part2Presentation: {
      version: 1,
      frames: [{ id: 'bad-frame', kind: 'mystery-kind', text: 'Do not leak this malformed content.' }]
    }
  });

  assert.ok(slides);
  const studentHtml = renderToStaticMarkup(<Slideshow slides={slides} tool="cursor" readOnly currentIndex={0} />);
  const teacherHtml = renderToStaticMarkup(<Slideshow slides={slides} tool="cursor" currentIndex={0} />);
  assert.match(studentHtml, /Instructional display unavailable/);
  assert.doesNotMatch(studentHtml, /Do not leak this malformed content/);
  assert.doesNotMatch(studentHtml, /Unknown Part 2 frame kind/);
  assert.match(teacherHtml, /Part 2 frame unavailable/);
  assert.match(teacherHtml, /Unknown Part 2 frame kind/);
});

test('projects semantic Part 2 runtime data into the existing synchronized Teach Concepts slide path', () => {
  const runtime = {
    schemaVersion: 'wrs-runtime-v1',
    id: 'semantic-part2-runtime',
    title: 'Semantic Part 2 Runtime',
    step: '7',
    substep: '3',
    focus: 'introduction',
    sources: [],
    parts: Array.from({ length: 10 }, (_, index) => ({
      part: index + 1,
      title: `Part ${index + 1}`,
      teacherDirections: [],
      sourceIds: [],
      data: index === 1 ? {
        slides: [{ id: 'legacy-should-not-win', type: 'text', title: 'Legacy', content: 'Legacy slide' }],
        part2Presentation: {
          version: 1,
          frames: [{
            id: 'semantic-wins',
            kind: 'explanation',
            text: 'Supplied semantic explanation.'
          }]
        }
      } : {}
    }))
  } as any;

  const projected = runtimeLessonToLegacyLesson(runtime);
  assert.equal(projected.slides.length, 1);
  assert.equal(projected.slides[0].id, 'part2-semantic-wins');
  assert.equal(projected.slides[0].type, 'template');

  const html = renderToStaticMarkup(
    <TeachConcepts lesson={projected} mode="slides" slideIndex={0} readOnly />
  );
  assert.match(html, /Supplied semantic explanation/);
  assert.doesNotMatch(html, /Legacy slide/);
  assert.match(html, /data-part2-role="statement"/);
});


test('keeps an independent, touch-safe Mission scroll path when a short viewport cannot fit the mission content', () => {
  const tallLesson = {
    id: 'scroll-guard',
    title: 'Mission scroll guard '.repeat(80),
    step: '7',
    substep: '3',
    wordCards: [{ id: 'scroll-card', text: 'scrollable', type: 'word' }]
  } as any;
  const html = renderToStaticMarkup(
    <MissionPlayer
      lesson={tallLesson}
      students={[{ id: 'student-scroll', name: 'Student Scroll Guard' }] as any}
      onComplete={() => {}}
      onExit={() => {}}
    />
  );

  const root = html.match(/<div([^>]*data-mission-scroll-container="true"[^>]*)>/);
  assert.ok(root, 'Mission needs a dedicated scroll owner instead of relying on document overflow.');
  assert.match(root[1], /overflow-y-auto/);
  assert.match(root[1], /touch-pan-y/);
  assert.match(root[1], /tabindex="-1"/);
  assert.match(html, /data-mission-scroll-content="true"/);
  assert.match(html, /Mission scroll guard/);
});

test('allows document vertical overflow while preserving the fixed lesson-stage viewport', () => {
  const globalCss = readFileSync(new URL('../legacy/index.css', import.meta.url), 'utf8');
  assert.match(globalCss, /overflow-x:\s*hidden;/);
  assert.match(globalCss, /overflow-y:\s*auto;/);
  assert.doesNotMatch(globalCss, /html, body\s*\{[^}]*overflow:\s*hidden;/s);

  const stageHtml = renderToStaticMarkup(<LessonStage><div>Fixed lesson stage</div></LessonStage>);
  assert.match(stageHtml, /data-lesson-stage-viewport/);
  assert.match(stageHtml, /overflow-hidden/);
});
