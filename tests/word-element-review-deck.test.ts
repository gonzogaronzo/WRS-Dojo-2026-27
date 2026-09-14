import assert from 'node:assert/strict';
import test from 'node:test';
import {
  WORD_ELEMENT_REVIEW_CARDS,
  cardElementLabel,
  cardsForWordElementReview,
  substepKey
} from '../legacy/wordElementReviewDeck';

test('word-element mnemonic deck preserves the audited source-row and element counts', () => {
  assert.equal(WORD_ELEMENT_REVIEW_CARDS.length, 83);
  assert.equal(WORD_ELEMENT_REVIEW_CARDS.reduce((sum, card) => sum + card.elements.length, 0), 85);
  assert.equal(WORD_ELEMENT_REVIEW_CARDS.filter(card => card.family === 'Latin').length, 62);
  assert.equal(WORD_ELEMENT_REVIEW_CARDS.filter(card => card.family === 'Greek').length, 21);
});

test('every review card carries source-grounded meaning, example, placement, and atlas coordinates', () => {
  for (const card of WORD_ELEMENT_REVIEW_CARDS) {
    assert.ok(card.meaning.trim(), `${card.id} is missing meaning`);
    assert.ok(card.example.trim(), `${card.id} is missing example`);
    assert.ok(card.firstTaught.match(/^\d+\.\d+$/), `${card.id} has invalid first-taught substep`);
    assert.ok(Number.isInteger(card.atlasCol) && card.atlasCol >= 0 && card.atlasCol < 10);
    assert.ok(Number.isInteger(card.atlasRow) && card.atlasRow >= 0 && card.atlasRow < 9);
  }
});

test('cumulative filtering never exposes elements from a later verified Substep', () => {
  const through73 = cardsForWordElementReview({ scope: 'through', targetSubstep: '7.3' });
  assert.ok(through73.length > 0);
  assert.ok(through73.every(card => substepKey(card.firstTaught) <= substepKey('7.3')));
  assert.ok(!through73.some(card => cardElementLabel(card).includes('-meter-')));
  assert.ok(!through73.some(card => cardElementLabel(card).includes('-therm-')));
  assert.ok(!through73.some(card => cardElementLabel(card).includes('hydro-')));
});

test('source-audited Greek placement uses 8.3 for meter/metry and therm', () => {
  const meter = WORD_ELEMENT_REVIEW_CARDS.find(card => card.elements.includes('-meter-'));
  const therm = WORD_ELEMENT_REVIEW_CARDS.find(card => card.elements.includes('-therm-'));
  assert.equal(meter?.firstTaught, '8.3');
  assert.equal(therm?.firstTaught, '8.3');
});

test('shared Notebook rows remain one review card rather than fake duplicate cards', () => {
  const tendTent = WORD_ELEMENT_REVIEW_CARDS.filter(card => card.elements.includes('-tend-') || card.elements.includes('-tent-'));
  const meterMetry = WORD_ELEMENT_REVIEW_CARDS.filter(card => card.elements.includes('-meter-') || card.elements.includes('-metry'));
  assert.equal(tendTent.length, 1);
  assert.deepEqual(tendTent[0].elements, ['-tend-', '-tent-']);
  assert.equal(meterMetry.length, 1);
  assert.deepEqual(meterMetry[0].elements, ['-meter-', '-metry']);
});
