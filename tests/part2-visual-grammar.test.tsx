import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Slideshow from '../legacy/components/modules/Slideshow';
import { part2PresentationToSlides } from '../legacy/part2Presentation';
import {
  getWrsSemanticCardVisual,
  WRS_NEUTRAL_CARD_VISUALS,
  WRS_TILE_VISUALS
} from '../legacy/wrsVisualTokens';
import fixture from './fixtures/part2-7.3-wilson-visual.json';

const slides = part2PresentationToSlides({ part2Presentation: fixture as any });
assert.ok(slides);

const studentHtml = (index: number) => renderToStaticMarkup(
  <Slideshow slides={slides} tool="cursor" readOnly currentIndex={index} />
);

test('uses the Tileboard source colors for semantic WRS tile roles', () => {
  assert.equal(getWrsSemanticCardVisual('consonant').background, WRS_TILE_VISUALS.colors.consonantIvory);
  assert.equal(getWrsSemanticCardVisual('consonant-digraph').background, WRS_TILE_VISUALS.colors.consonantIvory);
  assert.equal(getWrsSemanticCardVisual('consonant-trigraph').background, WRS_TILE_VISUALS.colors.consonantIvory);
  assert.equal(getWrsSemanticCardVisual('vowel').background, WRS_TILE_VISUALS.colors.vowelSalmon);
  assert.equal(getWrsSemanticCardVisual('welded').background, WRS_TILE_VISUALS.colors.weldedGreen);
  assert.equal(getWrsSemanticCardVisual('prefix').background, WRS_TILE_VISUALS.colors.affixYellow);
  assert.equal(getWrsSemanticCardVisual('suffix').background, WRS_TILE_VISUALS.colors.affixYellow);
  assert.equal(getWrsSemanticCardVisual('base-element').background, WRS_NEUTRAL_CARD_VISUALS.white);
  assert.equal(getWrsSemanticCardVisual('greek-combining-form').background, WRS_NEUTRAL_CARD_VISUALS.greekGray);
});

test('keeps ph atomic as one ivory consonant-digraph object', () => {
  const html = studentHtml(1);
  assert.equal((html.match(/data-part2-role="consonant-digraph"/g) || []).length, 1);
  assert.match(html, />ph</);
  assert.match(html, new RegExp(WRS_TILE_VISUALS.colors.consonantIvory.replace('#', '#')));
  assert.match(html, /data-wrs-visual="tileboard"/);
  assert.match(html, /data-part2-role="annotation"/);
  assert.doesNotMatch(html, /Present the ph Letter-Sound Card/);
});

test('keeps dge and tch atomic as consonant-trigraph objects', () => {
  const dgeHtml = studentHtml(3);
  const tchHtml = studentHtml(4);
  assert.equal((dgeHtml.match(/data-part2-role="consonant-trigraph"/g) || []).length, 1);
  assert.equal((tchHtml.match(/data-part2-role="consonant-trigraph"/g) || []).length, 1);
  assert.match(dgeHtml, />dge</);
  assert.match(tchHtml, />tch</);
});

test('renders whole-word review and ph examples as distinct Wilson-style word objects', () => {
  const reviewHtml = studentHtml(0);
  const phWordsHtml = studentHtml(2);
  assert.equal((reviewHtml.match(/data-part2-role="word"/g) || []).length, 4);
  assert.equal((phWordsHtml.match(/data-part2-role="word"/g) || []).length, 5);
  for (const word of ['phone', 'phase', 'graph', 'trophy', 'dolphin']) {
    assert.match(phWordsHtml, new RegExp(`>${word}<`));
  }
  assert.doesNotMatch(phWordsHtml, /phone · phase · graph · trophy · dolphin/);
  assert.equal((phWordsHtml.match(/data-wrs-visual="word-card"/g) || []).length, 5);
});

test('renders explicit syllables as distinct blank white syllable cards', () => {
  const syllableSlides = part2PresentationToSlides({
    part2Presentation: {
      version: 1,
      frames: [{ id: 'napkin', kind: 'syllable-row', syllables: ['nap', 'kin'] }]
    }
  });
  assert.ok(syllableSlides);
  const html = renderToStaticMarkup(<Slideshow slides={syllableSlides} tool="cursor" readOnly currentIndex={0} />);
  assert.equal((html.match(/data-part2-role="syllable"/g) || []).length, 2);
  assert.equal((html.match(/data-wrs-visual="syllable-card"/g) || []).length, 2);
  assert.match(html, />nap</);
  assert.match(html, />kin</);
});

test('renders the 7.3 affix sequence as explicit build rows instead of one prose string', () => {
  const html = studentHtml(8);
  assert.equal((html.match(/data-part2-role="step-label"/g) || []).length, 4);
  assert.equal((html.match(/data-part2-role="row-break"/g) || []).length, 4);
  assert.equal((html.match(/data-part2-role="prefix"/g) || []).length, 2);
  assert.equal((html.match(/data-part2-role="suffix"/g) || []).length, 2);
  assert.ok((html.match(/data-part2-role="consonant-trigraph"/g) || []).length >= 4);
  assert.doesNotMatch(html, /latch → latched → unlatch → unlatched/);
});

test('keeps Greek combining forms as separate gray word-element objects', () => {
  const html = studentHtml(10);
  assert.equal((html.match(/data-part2-role="greek-combining-form"/g) || []).length, 2);
  assert.match(html, /micro-/);
  assert.match(html, /-scope/);
  assert.match(html, /microscope/);
  assert.match(html, new RegExp(WRS_NEUTRAL_CARD_VISUALS.greekGray.replace('#', '#')));
});

test('fails closed on unknown source-controlled semantic tile roles', () => {
  const badSlides = part2PresentationToSlides({
    part2Presentation: {
      version: 1,
      frames: [{ id: 'bad-role', kind: 'tile-row', tiles: [{ text: 'xyz', role: 'mystery-role' }] }]
    }
  });
  assert.ok(badSlides);
  const html = renderToStaticMarkup(<Slideshow slides={badSlides} tool="cursor" readOnly currentIndex={0} />);
  assert.match(html, /Instructional display unavailable/);
  assert.doesNotMatch(html, />xyz</);
});

test('keeps teacher cues private on every 7.3 semantic visual frame', () => {
  const combinedStudentHtml = slides.map((_, index) => studentHtml(index)).join('\n');
  assert.doesNotMatch(combinedStudentHtml, /Have the student read the four previous-substep words/);
  assert.doesNotMatch(combinedStudentHtml, /Build latch with Letter-Sound Cards/);
  assert.doesNotMatch(combinedStudentHtml, /Do not teach this frame/);
});
