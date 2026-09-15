import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { canonicalRuntimeFromImportValue, serializeCanonicalLesson } from '../legacy/canonicalLesson';
import { normalizeLesson } from '../legacy/dataNormalization';
import { part7SpellingItemsFromData } from '../legacy/components/modules/Part7SpellingRunner';

const fixtureUrl = new URL('../fixtures/canonical/3A-2.5-accuracy.canonical-v2.json', import.meta.url);
const fixture = JSON.parse(readFileSync(fixtureUrl, 'utf8'));

test('canonical 2.5 v2 carries an explicit Part 7 dictate/reveal representation packet', () => {
  const runtime = canonicalRuntimeFromImportValue(fixture);
  const part7 = runtime.parts.find(part => part.part === 7);
  const items = part7SpellingItemsFromData(part7?.data);

  assert.ok(items);
  assert.equal(items.length, 16);
  assert.deepEqual(items.slice(0, 4).map(item => item.word), ['flask', 'trend', 'grant', 'crunch']);
  assert.deepEqual(items.slice(4, 11).map(item => item.word), ['strap', 'splash', 'string', 'split', 'scrub', 'scrap', 'spring']);
  assert.deepEqual(items.slice(11).map(item => item.word), ['-struct-', '-tract-', '-spect-', '-dict-', '-ject-']);
  assert.equal(items.slice(0, 11).every(item => item.representation === 'letter-sound-tiles'), true);
  assert.equal(items.slice(11).every(item => item.representation === 'word-element-cards'), true);

  const stringItem = items.find(item => item.word === 'string');
  assert.deepEqual(stringItem?.units.map(unit => [unit.text, unit.role]), [
    ['s', 'consonant'], ['t', 'consonant'], ['r', 'consonant'], ['ing', 'welded']
  ]);
});

test('canonical 2.5 v2 survives current projection, canonical export, and re-import', () => {
  const firstLesson = normalizeLesson(fixture);
  assert.ok(firstLesson);
  assert.equal(firstLesson.sentences.length, 10);
  assert.equal(firstLesson.wordListReading?.length, 6);
  assert.match(firstLesson.passage || '', /Spring is coming!/);

  const json = serializeCanonicalLesson(firstLesson);
  const exported = JSON.parse(json);
  const secondRuntime = canonicalRuntimeFromImportValue(exported);
  const part7 = secondRuntime.parts.find(part => part.part === 7);
  assert.ok(part7SpellingItemsFromData(part7?.data));
  assert.deepEqual(secondRuntime, firstLesson.runtimePlan);
});
