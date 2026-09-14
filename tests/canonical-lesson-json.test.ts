import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalRuntimeFromImportValue,
  canonicalRuntimeFromLesson,
  serializeCanonicalLesson
} from '../legacy/canonicalLesson';
import { Lesson, RuntimeLessonPart, WRSRuntimeLessonPlan } from '../legacy/types';

const runtimePart = (part: RuntimeLessonPart['part'], data: RuntimeLessonPart['data'] = {}): RuntimeLessonPart => ({
  part,
  title: `Part ${part}`,
  teacherDirections: [],
  sourceIds: [],
  data
});

const runtime: WRSRuntimeLessonPlan = {
  schemaVersion: 'wrs-runtime-v1',
  id: 'canonical-lesson',
  title: 'Canonical lesson',
  step: '2',
  substep: '5',
  focus: 'accuracy',
  lessonPath: 'full',
  plannedParts: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  planningContext: {
    conceptsToWeave: 'cumulative review',
    troubleSpots: 'three-letter blends'
  },
  sources: [],
  parts: [
    runtimePart(1, { quickDrill: ['a', 'e'] }),
    runtimePart(2, { reviewWords: ['review'], currentWords: ['current'] }),
    runtimePart(3, { wordCards: [{ id: 'w1', text: 'strong', type: 'regular' }], hfwList: ['also'] }),
    runtimePart(4, { practiceWords: ['strong'], chartingWords: ['splash'], chartingType: 'real' }),
    runtimePart(5, { sentences: ['A sentence.'] }),
    runtimePart(6, { quickDrillReverse: ['/ă/ → a'], wordElements: [] }),
    runtimePart(7, { reviewWords: ['review'], currentWords: ['current'], wordElements: [] }),
    runtimePart(8, { dictation: { sounds: [], realWords: [], wordElements: [], nonsenseWords: [], phrases: [], sentences: [] } }),
    runtimePart(9, { studentReader: 'Student Reader 2', page: '122-123', passageTitle: 'Passage', passage: 'Controlled text.' }),
    runtimePart(10, {})
  ]
};

const legacyEnvelope: Lesson = {
  schemaVersion: 2,
  id: 'legacy-envelope-id',
  title: 'Legacy envelope title',
  step: '9',
  substep: '9',
  conceptNotes: 'stale legacy value',
  slides: [],
  quickDrill: ['stale'],
  wordCards: [],
  sentences: [],
  dictation: { sounds: [], realWords: [], wordElements: [], nonsenseWords: [], phrases: [], sentences: [] },
  hfwList: [],
  affixPractice: [],
  runtimePlan: runtime
};

test('canonical import requires a top-level wrs-runtime-v1 object', () => {
  assert.equal(canonicalRuntimeFromImportValue(runtime).id, 'canonical-lesson');
  assert.throws(
    () => canonicalRuntimeFromImportValue({ schemaVersion: 2, runtimePlan: runtime }),
    /top-level wrs-runtime-v1/
  );
});

test('canonical export ignores stale legacy envelope fields', () => {
  const canonical = canonicalRuntimeFromLesson(legacyEnvelope);
  assert.equal(canonical.id, 'canonical-lesson');
  assert.equal(canonical.title, 'Canonical lesson');
  assert.equal(canonical.step, '2');
  assert.equal(canonical.substep, '5');
});

test('canonical serialization emits only runtime JSON and round-trips structurally', () => {
  const json = serializeCanonicalLesson(legacyEnvelope);
  const parsed = JSON.parse(json) as Record<string, unknown>;

  assert.equal(parsed.schemaVersion, 'wrs-runtime-v1');
  assert.equal(parsed.id, 'canonical-lesson');
  assert.ok(Array.isArray(parsed.parts));
  assert.equal((parsed.parts as unknown[]).length, 10);
  assert.equal('runtimePlan' in parsed, false);
  assert.equal('quickDrill' in parsed, false);
  assert.equal('slides' in parsed, false);
  assert.equal('wrsPlan' in parsed, false);

  assert.deepEqual(canonicalRuntimeFromImportValue(parsed), canonicalRuntimeFromLesson(legacyEnvelope));
});
