import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Slideshow from '../legacy/components/modules/Slideshow';
import TeachConcepts from '../legacy/components/modules/TeachConcepts';
import { UnassignedLessonCompletion } from '../legacy/components/SessionDossier';
import { normalizeLesson } from '../legacy/dataNormalization';

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

test('renders a recoverable completion screen when a lesson has no selected group', () => {
  const html = renderToStaticMarkup(<UnassignedLessonCompletion />);
  assert.match(html, /Select a Group to Finish/);
  assert.match(html, /Return to Briefing/);
});
