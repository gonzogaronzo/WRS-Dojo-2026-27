import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import QuickDrill from '../legacy/components/modules/QuickDrill';
import Part7SpellingRunner from '../legacy/components/modules/Part7SpellingRunner';
import { BoardSafeProvider } from '../legacy/components/boardSafeContext';

const items = [{ id: 'c-strap', word: 'strap', group: 'current' as const, representation: 'letter-sound-tiles' as const,
  units: [{ text: 's', role: 'consonant' as const }, { text: 't', role: 'consonant' as const }, { text: 'r', role: 'consonant' as const },
          { text: 'a', role: 'vowel' as const }, { text: 'p', role: 'consonant' as const }] }];

const wrap = (boardSafe: boolean | null, node: React.ReactElement) => renderToStaticMarkup(
  boardSafe === null ? node : <BoardSafeProvider value={{ boardSafe, setBoardSafe: () => {} }}>{node}</BoardSafeProvider>);

const part6 = <QuickDrill sounds={['/ăx/ → zq']} isReverse step="2" substep="5" />;
const part7 = <Part7SpellingRunner items={items} />;

test('Part 6 teacher view shows the dictation cue when board-safe is off', () => {
  for (const bs of [null, false]) assert.match(wrap(bs, part6), /teacher-dictation-cue/);
});
test('Part 6 board-safe hides the dictation cue, the sound, and Shuffle', () => {
  const html = wrap(true, part6);
  assert.doesNotMatch(html, /teacher-dictation-cue/);
  assert.doesNotMatch(html, /ăx/);
  assert.doesNotMatch(html, />Shuffle</);
  assert.match(html, /LISTEN/);
});
test('Part 7 teacher view shows the target word when board-safe is off', () => {
  for (const bs of [null, false]) assert.match(wrap(bs, part7), /data-part7-target-private/);
});
test('Part 7 board-safe hides the target word', () => {
  const html = wrap(true, part7);
  assert.doesNotMatch(html, /data-part7-target-private/);
  assert.doesNotMatch(html, />strap</);
  assert.match(html, /Listen/);
});
