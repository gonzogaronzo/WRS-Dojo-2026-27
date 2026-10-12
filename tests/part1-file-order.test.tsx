import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import QuickDrill from '../legacy/components/modules/QuickDrill';

const renderPart1 = (sounds: string[], index: number, shuffledItems?: string[]) => renderToStaticMarkup(
  <QuickDrill
    sounds={sounds}
    step="3"
    substep="1"
    currentIndex={index}
    shuffledItems={shuffledItems}
  />
);

const currentCard = (markup: string) => markup.match(/data-part1-current-card="([^"]*)"/)?.[1];

test('Part 1 shows cards in lesson file order, not introduction order', () => {
  const sounds = ['ink', 'sh', 'a'];
  assert.equal(currentCard(renderPart1(sounds, 0)), 'ink');
  assert.equal(currentCard(renderPart1(sounds, 1)), 'sh');
  assert.equal(currentCard(renderPart1(sounds, 2)), 'a');
});

test('a valid saved shuffle still overrides file order', () => {
  const sounds = ['ink', 'sh', 'a'];
  const saved = ['a', 'ink', 'sh'];
  assert.equal(currentCard(renderPart1(sounds, 0, saved)), 'a');
  assert.equal(currentCard(renderPart1(sounds, 1, saved)), 'ink');
  assert.equal(currentCard(renderPart1(sounds, 2, saved)), 'sh');
});

test('an invalid saved shuffle is ignored and file order is used', () => {
  const sounds = ['ink', 'sh', 'a'];
  assert.equal(currentCard(renderPart1(sounds, 0, ['a', 'ink', 'zz'])), 'ink');
  assert.equal(currentCard(renderPart1(sounds, 0, ['a', 'ink'])), 'ink');
});

test('Part 6 keeps the lesson file order', () => {
  const sounds = ['/s/ → s, ss', '/k/ → c, k, ck'];
  const render = (index: number) => renderToStaticMarkup(
    <QuickDrill sounds={sounds} isReverse step="3" substep="1" currentIndex={index} revealedCount={1} />
  );
  const pronunciation = (markup: string) => markup.match(/data-part6-pronunciation[^>]*>([^<]*)</)?.[1];
  assert.equal(pronunciation(render(0)), '/s/');
  assert.equal(pronunciation(render(1)), '/k/');
});
