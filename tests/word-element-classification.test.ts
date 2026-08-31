import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyWordElements } from '../legacy/cumulativeWrsScope';

test('classifies current cumulative source items without changing their stored values', () => {
  const stored = ['-s', '-es', 'mid-', 'mis-', 'non-', 'trans-', 'un-', '-fess-', '-dict-'];

  assert.deepEqual(classifyWordElements(stored), {
    affixes: ['-s', '-es', 'mid-', 'mis-', 'non-', 'trans-', 'un-'],
    baseElements: ['-fess-', '-dict-'],
    other: []
  });
  assert.deepEqual(stored, ['-s', '-es', 'mid-', 'mis-', 'non-', 'trans-', 'un-', '-fess-', '-dict-']);
});

test('uses legacy metadata fallback and preserves unknown word elements', () => {
  const legacyItems = [
    { value: 'scrib', type: 'root' },
    { value: 're-', type: 'prefix' },
    { value: '-ing', type: 'suffix' },
    { value: 'linking-vowel', category: 'connective' },
    { value: 'teacher note' }
  ];

  assert.deepEqual(classifyWordElements(legacyItems), {
    affixes: ['re-', '-ing', 'linking-vowel'],
    baseElements: ['scrib'],
    other: ['teacher note']
  });
});
