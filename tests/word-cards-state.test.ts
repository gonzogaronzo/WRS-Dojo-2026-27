import assert from 'node:assert/strict';
import test from 'node:test';
import { WordCard } from '../legacy/types';
import { createInitialLessonSession } from '../legacy/useLessonSession';
import {
  bankWordCardsTurn,
  buildWordCardsDeck,
  dealWordCard,
  resetWordCardsState
} from '../legacy/wordCardsState';

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
