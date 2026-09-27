import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import QuickDrill from '../legacy/components/modules/QuickDrill';
import Part7SpellingRunner from '../legacy/components/modules/Part7SpellingRunner';
import Spelling from '../legacy/components/modules/Spelling';
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

const dictation = { sounds: ['/voip/ → qux'], wordElements: ['-morphx-'], realWords: ['brindlex'], nonsenseWords: ['splontx'],
  phrases: ['carry zx lantern'], sentences: ['The zx lantern blinked twice.'] };
const part8 = (tab: number, key: string) => <Spelling data={dictation as any} lessonStep="2" lessonSubstep="5" viewMode="list"
  activeTab={tab} sectionOrderVersion={2} revealedItems={{ [`__part8-current__:${key}-0`]: true }} />;
const p8cases = [[0, 'sounds', '/voip/'], [2, 'real-words', 'brindlex'], [5, 'sentences', 'The zx lantern blinked twice.']] as const;

test('Part 8 teacher view shows the next item to dictate when board-safe is off', () => {
  for (const [tab, key, src] of p8cases) assert.ok(wrap(false, part8(tab, key)).includes(src), key);
});
test('Part 8 board-safe keeps Reveal/Next but hides the item to dictate', () => {
  for (const [tab, key, src] of p8cases) {
    const html = wrap(true, part8(tab, key));
    assert.equal(html.includes(src), false, key);
    assert.match(html, /data-part8-board-safe-prompt/);
    assert.match(html, /data-part8-teacher-control/);
  }
});
