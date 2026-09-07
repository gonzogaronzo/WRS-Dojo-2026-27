import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildWordDistribution,
  chartingWordCardsForLesson,
  hasCompleteWordDistribution,
  normalizeWordDistribution,
  targetWordCount,
  uniqueWordCards
} from '../legacy/wordDistribution';
import { WordCard } from '../legacy/types';

const cards = (count: number): WordCard[] => Array.from({ length: count }, (_, index) => ({
  id: `card-${index + 1}`, text: `word-${index + 1}`, type: 'regular'
}));

const identityShuffle = (items: WordCard[]) => items;
const sequentialIds = () => {
  let current = 0;
  return () => `instance-${++current}`;
};

test('removes blank and case-insensitive duplicate source words', () => {
  const unique = uniqueWordCards([
    { id: '1', text: 'Cold', type: 'regular' },
    { id: '2', text: ' cold ', type: 'regular' },
    { id: '3', text: '', type: 'regular' },
    { id: '4', text: 'wild', type: 'regular' }
  ]);
  assert.deepEqual(unique.map(card => card.text), ['Cold', 'wild']);
});

test('gives each student 15 unique words when at least 15 are available', () => {
  const distribution = buildWordDistribution(cards(18), 5, 15, identityShuffle, sequentialIds());
  assert.equal(distribution.length, 5);
  distribution.forEach(studentWords => {
    assert.equal(studentWords.length, 15);
    assert.equal(new Set(studentWords.map(card => card.text.toLocaleLowerCase())).size, 15);
  });
});

test('always charts exactly 15 words even when the source pool is larger', () => {
  assert.equal(targetWordCount(cards(50)), 15);
  assert.equal(buildWordDistribution(cards(50), 1, targetWordCount(cards(50)), identityShuffle, sequentialIds())[0].length, 15);
});

test('uses an imported lesson explicit charting list instead of its larger word-card deck', () => {
  const selected = chartingWordCardsForLesson({
    id: 'runtime-3-1',
    title: '3.1 charting',
    step: '3',
    substep: '1',
    conceptNotes: '',
    slides: [],
    quickDrill: [],
    wordCards: cards(30),
    wordListCharting: Array.from({ length: 15 }, (_, index) => `chart-${index + 1}`),
    wordListReadingAuto: true,
    sentences: [],
    dictation: { sounds: [], realWords: [], wordElements: [], nonsenseWords: [], phrases: [], sentences: [] },
    hfwList: [],
    affixPractice: []
  });

  assert.deepEqual(selected.map(card => card.text), Array.from({ length: 15 }, (_, index) => `chart-${index + 1}`));
});

test('staggered students begin at different positions', () => {
  const distribution = buildWordDistribution(cards(18), 5, 15, identityShuffle, sequentialIds());
  assert.equal(new Set(distribution.map(studentWords => studentWords[0].text)).size, 5);
});

test('repeats only after exhausting a short source list', () => {
  const distribution = buildWordDistribution(cards(3), 1, 5, identityShuffle, sequentialIds());
  assert.deepEqual(distribution[0].slice(0, 3).map(card => card.text), ['word-1', 'word-2', 'word-3']);
  assert.deepEqual(distribution[0].map(card => card.text), ['word-1', 'word-2', 'word-3', 'word-1', 'word-2']);
});

test('creates a unique instance identity for every assignment', () => {
  const distribution = buildWordDistribution(cards(15), 5, 15, identityShuffle, sequentialIds());
  const ids = distribution.flat().map(card => card.instanceId);
  assert.equal(new Set(ids).size, ids.length);
});

test('normalizes malformed restored lists instead of crashing the reading screen', () => {
  const distribution = normalizeWordDistribution([
    [null, { id: 'card-1', instanceId: 'instance-1', text: 'cold', type: 'regular' }],
    'not-a-student-list',
    [{ text: 'wild' }]
  ]);
  assert.equal(distribution.length, 2);
  assert.deepEqual(distribution[0].map(card => card.text), ['cold']);
  assert.equal(distribution[1][0].text, 'wild');
  assert.ok(distribution[1][0].instanceId);
});

test('recognizes one complete teacher-authored list for the transition', () => {
  const source = cards(18);
  const wordsPerStudent = targetWordCount(source);
  const distribution = buildWordDistribution(source, 3, wordsPerStudent, identityShuffle, sequentialIds());
  assert.equal(hasCompleteWordDistribution([], 3, wordsPerStudent), false);
  assert.equal(hasCompleteWordDistribution(distribution, 3, wordsPerStudent), true);
});
