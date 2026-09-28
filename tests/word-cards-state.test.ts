import assert from 'node:assert/strict';
import test from 'node:test';
import { WordCard } from '../legacy/types';
import { createInitialLessonSession } from '../legacy/useLessonSession';
import {
  bankWordCardsTurn,
  buildWordCardsDeck,
  dealWordCard,
  part3WordCardsForLesson,
  resetWordCardsState
} from '../legacy/wordCardsState';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import WordCards from '../legacy/components/modules/WordCards';
import { normalizeRuntimeLessonPlan, runtimeLessonToLegacyLesson } from '../legacy/runtimeLesson';
import { chartingWordCardsForLesson } from '../legacy/wordDistribution';
import noRunner25 from './fixtures/3A-2.5-no-runner.json';
import canonical25 from '../fixtures/canonical/3A-2.5-accuracy.canonical-v2.json';

const cards: WordCard[] = [
  { id: 'one', text: 'cat', type: 'regular' },
  { id: 'two', text: 'ship', type: 'regular' }
];

test('builds one serializable deck that both displays can share', () => {
  const deck = buildWordCardsDeck(cards, ['the'], 'all', 'standard', () => 0);
  assert.equal(deck.length, 3);
  assert.deepEqual(new Set(deck.map(card => card.id)), new Set(['one', 'two', 'hfw-0']));
});

test('deals, scores, banks, and completes from shared state only', () => {
  const initial = resetWordCardsState(createInitialLessonSession().wordCards, cards, 2);
  const first = dealWordCard(initial, 2);
  const second = dealWordCard({ ...first, mode: 'oops', turnScore: 2 }, 2);
  const banked = bankWordCardsTurn(second, 2);
  const completed = dealWordCard({ ...banked, currentIndex: cards.length - 1 }, 2);

  assert.equal(first.currentIndex, 0);
  assert.equal(banked.scores[0], second.turnScore);
  assert.equal(banked.currentPlayerIndex, 1);
  assert.equal(completed.currentIndex, cards.length);
});

const runtimeLesson = (fixture: unknown) => {
  const runtime = normalizeRuntimeLessonPlan(fixture);
  assert.ok(runtime);
  return runtimeLessonToLegacyLesson(runtime!);
};

const authoredPart3Words = (fixture: { parts: { part: number; data: { wordCards?: { text: string }[] } }[] }) =>
  (fixture.parts.find(part => part.part === 3)?.data.wordCards || []).map(card => card.text);

test('Part 3 deals the runtime lesson\'s own word cards, not the Part 4 pool', () => {
  [noRunner25, canonical25].forEach(fixture => {
    const lesson = runtimeLesson(fixture);
    const part3 = part3WordCardsForLesson(lesson).map(card => card.text);
    assert.deepEqual(part3, authoredPart3Words(fixture as never));
    assert.notDeepEqual(part3, chartingWordCardsForLesson(lesson).map(card => card.text));
  });
});

test('Part 3 says so when a lesson has no Part 3 word cards', () => {
  const html = renderToStaticMarkup(createElement(WordCards, { cards: [], state: createInitialLessonSession().wordCards }));
  assert.match(html, /This lesson has no Part 3 word cards/);
  assert.doesNotMatch(html, /Preparing the shared deck/);
});
