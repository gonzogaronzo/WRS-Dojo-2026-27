import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  canonicalRuntimeFromImportValue,
  canonicalRuntimeFromLesson,
  serializeCanonicalLesson
} from '../legacy/canonicalLesson';
import { normalizeLesson } from '../legacy/dataNormalization';
import { lesson25 } from '../legacy/lessons/step2-5';
import { runtimeLessonToCompatibilityWrsPlan } from '../legacy/runtimeLesson';
import { Lesson, RuntimeLessonPart, WRSRuntimeLessonPlan } from '../legacy/types';

const regression74Url = new URL('../fixtures/canonical/5A-7.4-accuracy-regression.json', import.meta.url);
const regression74 = JSON.parse(readFileSync(regression74Url, 'utf8'));

const runtimePart = (part: RuntimeLessonPart['part'], data: RuntimeLessonPart['data'] = {}): RuntimeLessonPart => ({
  part,
  title: `Part ${part}`,
  teacherDirections: [],
  sourceIds: part === 10 ? [] : ['fixture-source'],
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
  sources: [
    {
      id: 'fixture-source',
      label: 'Test-only source',
      kind: 'teacher-selection',
      locator: 'canonical contract fixture'
    }
  ],
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

const cloneRuntime = () => JSON.parse(JSON.stringify(runtime)) as Record<string, any>;

test('canonical import requires a bare top-level wrs-runtime-v1 object', () => {
  assert.equal(canonicalRuntimeFromImportValue(runtime).id, 'canonical-lesson');
  assert.throws(
    () => canonicalRuntimeFromImportValue({ schemaVersion: 2, runtimePlan: runtime }),
    /top-level wrs-runtime-v1/
  );
});

test('canonical structure rejects hybrid legacy fields instead of choosing a winner', () => {
  const hybrid = cloneRuntime();
  hybrid.quickDrill = ['legacy duplicate'];
  assert.throws(() => canonicalRuntimeFromImportValue(hybrid), /noncanonical fields: quickDrill/);
});

test('canonical structure rejects mixed focus and implicit lesson routing', () => {
  const mixed = cloneRuntime();
  mixed.focus = 'mixed';
  assert.throws(() => canonicalRuntimeFromImportValue(mixed), /focus must be introduction, accuracy, or automaticity-fluency/);

  const mismatchedPath = cloneRuntime();
  mismatchedPath.lessonPath = 'block1+3';
  assert.throws(() => canonicalRuntimeFromImportValue(mismatchedPath), /plannedParts must exactly match lessonPath block1\+3/);
});

test('canonical structure rejects missing and unregistered source references', () => {
  const missing = cloneRuntime();
  missing.parts[3].sourceIds = [];
  assert.throws(() => canonicalRuntimeFromImportValue(missing), /planned Part 4 requires at least one source reference/);

  const unknown = cloneRuntime();
  unknown.parts[0].sourceIds = ['not-in-manifest'];
  assert.throws(() => canonicalRuntimeFromImportValue(unknown), /Part 1 cites unregistered source IDs/);
});

test('canonical structure validates optional source verification metadata', () => {
  const teacherCreated = cloneRuntime();
  teacherCreated.sources[0].verification = 'teacher-created';
  assert.equal(canonicalRuntimeFromImportValue(teacherCreated).sources[0].verification, 'teacher-created');

  const invalid = cloneRuntime();
  invalid.sources[0].verification = 'trust-me';
  assert.throws(() => canonicalRuntimeFromImportValue(invalid), /unsupported verification trust-me/);

  const teacherCreatedWilson = cloneRuntime();
  teacherCreatedWilson.sources[0].kind = 'step-instruction';
  teacherCreatedWilson.sources[0].verification = 'teacher-created';
  assert.throws(
    () => canonicalRuntimeFromImportValue(teacherCreatedWilson),
    /teacher-created verification only with kind teacher-selection/
  );

  const verifiedTeacherSelection = cloneRuntime();
  verifiedTeacherSelection.sources[0].verification = 'verified';
  assert.throws(
    () => canonicalRuntimeFromImportValue(verifiedTeacherSelection),
    /teacher-selection source fixture-source cannot claim verified verification/
  );
});

test('compatibility projection never upgrades an unmarked source to verified', () => {
  const value = cloneRuntime();
  value.sources = [
    { id: 'fixture-source', label: 'Test source', kind: 'step-instruction', locator: 'fixture' }
  ];
  const canonical = canonicalRuntimeFromImportValue(value);
  const plan = runtimeLessonToCompatibilityWrsPlan(canonical);
  assert.equal(plan.sources[0].verification, 'needs-verification');
  assert.equal(plan.verificationStatus, 'draft');
});

test('compatibility verification status reflects explicit source evidence only', () => {
  const canonical = canonicalRuntimeFromImportValue(regression74);
  const partial = runtimeLessonToCompatibilityWrsPlan(canonical);
  assert.equal(partial.verificationStatus, 'partially-verified');
  assert.equal(partial.sources.find(source => source.id === 'DB4-7.4-14-30')?.verification, 'verified');
  assert.equal(partial.sources.find(source => source.id === 'IM-7.4-140-151')?.verification, 'needs-verification');
  assert.equal(partial.sources.find(source => source.id === 'TEACHER-SELECTION')?.verification, 'teacher-created');

  const fullyMarked = JSON.parse(JSON.stringify(regression74));
  for (const source of fullyMarked.sources) {
    source.verification = source.kind === 'teacher-selection' ? 'teacher-created' : 'verified';
  }
  const verified = runtimeLessonToCompatibilityWrsPlan(canonicalRuntimeFromImportValue(fullyMarked));
  assert.equal(verified.verificationStatus, 'source-verified');
});

test('legacy-only lessons are migration inputs, not canonical exports', () => {
  assert.throws(
    () => canonicalRuntimeFromLesson(lesson25),
    /no authoritative runtimePlan/
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

test('canonical JSON re-enters the current loader through runtime projection rather than duplicate legacy fields', () => {
  const canonicalJson = serializeCanonicalLesson(legacyEnvelope);
  const loaded = normalizeLesson(JSON.parse(canonicalJson));

  assert.ok(loaded);
  assert.equal(loaded.schemaVersion, 2);
  assert.equal(loaded.runtimePlan?.schemaVersion, 'wrs-runtime-v1');
  assert.equal(loaded.title, 'Canonical lesson');
  assert.equal(loaded.step, '2');
  assert.equal(loaded.substep, '5');
  assert.deepEqual(loaded.quickDrill, ['a', 'e']);
  assert.deepEqual(loaded.wordCards.map(card => card.text), ['strong']);
  assert.deepEqual(loaded.hfwList, ['also']);
  assert.deepEqual(loaded.wordListPractice, ['strong']);
  assert.deepEqual(loaded.wordListCharting, ['splash']);
  assert.deepEqual(loaded.sentences, ['A sentence.']);
  assert.equal(loaded.passage, 'Controlled text.');
});

test('source-grounded 7.4 regression fixture preserves verified source metadata through canonical round trip', () => {
  const firstRuntime = canonicalRuntimeFromImportValue(regression74);
  const dictationSource = firstRuntime.sources.find(source => source.id === 'DB4-7.4-14-30');
  const nonsenseSource = firstRuntime.sources.find(source => source.id === 'SR7-7.1N-3');
  assert.equal(dictationSource?.verification, 'verified');
  assert.equal(nonsenseSource?.verification, 'verified');

  const part2 = firstRuntime.parts.find(part => part.part === 2);
  const part2Presentation = part2?.data.part2Presentation as { interactiveSteps?: unknown[] } | undefined;
  assert.ok(part2Presentation?.interactiveSteps?.length);

  const loaded = normalizeLesson(regression74);
  assert.ok(loaded);
  assert.deepEqual(loaded.wordListPractice, ['station', 'motion', 'location', 'tension', 'confusion', 'vision']);
  assert.equal(loaded.wordListCharting?.length, 0);
  assert.equal(loaded.sentences.length, 10);
  assert.match(loaded.passage || '', /Peg and Mike had wanted to adopt a kitten/);

  const exported = JSON.parse(serializeCanonicalLesson(loaded));
  const secondRuntime = canonicalRuntimeFromImportValue(exported);
  assert.equal(secondRuntime.sources.find(source => source.id === 'DB4-7.4-14-30')?.verification, 'verified');
  assert.equal(secondRuntime.sources.find(source => source.id === 'SR7-7.1N-3')?.verification, 'verified');
  assert.deepEqual(secondRuntime, firstRuntime);
});
