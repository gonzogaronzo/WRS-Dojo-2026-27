import test from 'node:test';
import assert from 'node:assert/strict';
import {
  part6ResponseGroups,
  part6RevealAction,
  part6WordElementRole,
  phonemesMatch
} from '../legacy/part6Tiles';
import { parseAuditoryDrillItem } from '../legacy/components/modules/QuickDrill';
import { WRS_PHONEME_MAP } from '../legacy/wrsKnowledgeBase';

const roles = (phoneme: string, responses: string[]) => (
  part6ResponseGroups(phoneme, responses).map(group => group.tiles.map(tile => `${tile.role}:${tile.text}`))
);

test('/ā/ → a-e is one group of three tiles with a blank middle', () => {
  const groups = part6ResponseGroups('ā', ['a-e']);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].tiles, [
    { role: 'vowel', text: 'a' },
    { role: 'consonant', text: '' },
    { role: 'vowel', text: 'e' }
  ]);
});

test('/k/ → c, k, ck is three groups and ck is one digraph tile', () => {
  const groups = part6ResponseGroups('k', ['c', 'k', 'ck']);
  assert.deepEqual(groups.map(g => g.text), ['c', 'k', 'ck']);
  assert.deepEqual(groups[2].tiles, [{ role: 'consonant-digraph', text: 'ck' }]);
});

test('doubled consonants collapse and de-duplicate', () => {
  assert.deepEqual(part6ResponseGroups('s', ['s', 'ss']).map(g => g.text), ['s']);
  assert.deepEqual(part6ResponseGroups('f', ['f', 'ff']).map(g => g.text), ['f']);
  assert.deepEqual(part6ResponseGroups('l', ['l', 'll']).map(g => g.text), ['l']);
  assert.deepEqual(part6ResponseGroups('z', ['zz', 'z', 's']).map(g => g.text), ['z', 's']);
});

test('y is a vowel for vowel sounds and a consonant for /y/', () => {
  assert.deepEqual(roles('ī', ['i', 'y', 'i-e'])[1], ['vowel:y']);
  assert.deepEqual(roles('y', ['y']), [['consonant:y']]);
});

test('welded, r-controlled, vowel-team, and consonant-length roles', () => {
  assert.deepEqual(roles('ȯl', ['all']), [['welded:all']]);
  assert.deepEqual(roles('kw', ['qu']), [['consonant-digraph:qu']]);
  assert.deepEqual(roles('ar', ['ar']), [['r-controlled:ar']]);
  assert.deepEqual(roles('ā', ['ai', 'ay']), [['vowel-team:ai'], ['vowel-team:ay']]);
  assert.deepEqual(roles('ch', ['ch', 'tch']), [['consonant-digraph:ch'], ['consonant-trigraph:tch']]);
});

test('responses are NFC-normalized, trimmed, and empties dropped', () => {
  const groups = part6ResponseGroups('ā', ['  ai ', '', '   ']);
  assert.deepEqual(groups.map(g => g.text), ['ai']);
  assert.deepEqual(part6ResponseGroups('x', ['ü']).map(g => g.text), ['ü']);
});

test('unmapped responses fall back by letter and length', () => {
  assert.deepEqual(roles('q', ['o', 'zq', 'zqx']), [['vowel:o'], ['consonant-digraph:zq'], ['consonant-trigraph:zqx']]);
});

test('fallback phoneme matcher finds /ȯl/ → all', () => {
  assert.ok(phonemesMatch('ȯl', 'ôl'));
  assert.ok(phonemesMatch('ôl', 'ȯl'));
  assert.ok(!phonemesMatch('ăl', 'ôl'));
  const lessonPhoneme = parseAuditoryDrillItem('/ȯl/').phoneme;
  const matches = Object.values(WRS_PHONEME_MAP).flat().filter(entry => phonemesMatch(entry.phoneme, lessonPhoneme));
  assert.deepEqual(matches.flatMap(entry => entry.graphemes), ['all']);
});

test('reveal action: Part 6 reveals everything once, then advances', () => {
  assert.equal(part6RevealAction(true, 0, 3), 'reveal-all');
  assert.equal(part6RevealAction(true, 1, 3), 'advance');
  assert.equal(part6RevealAction(false, 0, 3), 'reveal-next');
  assert.equal(part6RevealAction(false, 3, 3), 'advance');
});

test('word-element roles follow the dashes', () => {
  assert.equal(part6WordElementRole('-s'), 'suffix');
  assert.equal(part6WordElementRole('un-'), 'prefix');
  assert.equal(part6WordElementRole('-struct-'), 'base-element');
  assert.equal(part6WordElementRole('port'), 'base-element');
});
