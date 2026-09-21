import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  PLANNING_STATE_COLLECTION,
  planningStateDocId,
  planningStateForExport,
  readPlanningOperationalStates,
  savePlanningOperationalState,
  validateSelectionHistory,
  validateValidatedArtifact
} from '../functions/planningOperationalState.js';

const HASH = `sha256:${'a'.repeat(64)}`;

const historyFor = groupId => ({
  schemaVersion: 'wrs-group-selection-history-v1',
  schoolYear: '2026-27',
  groupId,
  updatedAt: '2026-09-21T18:00:00.000Z',
  lessons: []
});

const artifact = {
  currentFingerprint: HASH,
  validatedFingerprint: HASH,
  runtimeRef: 'runtime:synthetic',
  teacherPlanRef: 'teacher-plan:synthetic',
  lastValidatedAt: '2026-09-21T18:00:00.000Z'
};

const fakeFirestore = () => {
  const docs = new Map();
  return {
    docs,
    client: {
      collection(name) {
        assert.equal(name, PLANNING_STATE_COLLECTION);
        return {
          doc(id) {
            return {
              async get() {
                return docs.has(id)
                  ? { exists: true, data: () => docs.get(id) }
                  : { exists: false, data: () => undefined };
              },
              async set(patch, options) {
                assert.deepEqual(options, { merge: true });
                const previous = docs.get(id) || {};
                const next = { ...previous, ...patch };
                if (previous.validatedArtifacts && patch.validatedArtifacts) {
                  next.validatedArtifacts = {
                    ...previous.validatedArtifacts,
                    ...patch.validatedArtifacts
                  };
                }
                docs.set(id, next);
              }
            };
          }
        };
      }
    }
  };
};

test('planning operational state is fixed to the supported live group IDs', () => {
  assert.equal(planningStateDocId('teacher-synthetic', '5A'), 'teacher-synthetic__5A');
  assert.throws(
    () => planningStateDocId('teacher-synthetic', 'Other'),
    /Unsupported planning group/
  );
});

test('selection history and validated fingerprints fail closed on bad state', () => {
  assert.equal(validateSelectionHistory(historyFor('5A'), '5A').groupId, '5A');
  assert.throws(
    () => validateSelectionHistory(historyFor('5A'), '5B'),
    /does not match/
  );

  assert.equal(validateValidatedArtifact(artifact, '2026-09-21').validatedFingerprint, HASH);
  assert.throws(
    () => validateValidatedArtifact({
      ...artifact,
      validatedFingerprint: `sha256:${'b'.repeat(64)}`
    }, '2026-09-21'),
    /must match/
  );
});

test('durable planning state persists group history and validated artifact metadata', async () => {
  const fake = fakeFirestore();

  await savePlanningOperationalState({
    firestore: fake.client,
    teacherId: 'teacher-synthetic',
    groupId: '5A',
    selectionHistory: historyFor('5A'),
    updatedAt: '2026-09-21T18:01:00.000Z'
  });

  await savePlanningOperationalState({
    firestore: fake.client,
    teacherId: 'teacher-synthetic',
    groupId: '5A',
    plannedDate: '2026-09-22',
    validatedArtifact: artifact,
    updatedAt: '2026-09-21T18:02:00.000Z'
  });

  const states = await readPlanningOperationalStates({
    firestore: fake.client,
    teacherId: 'teacher-synthetic'
  });

  assert.equal(states['5A'].selectionHistory.groupId, '5A');
  assert.equal(states['5A'].validatedArtifacts['2026-09-22'].validatedFingerprint, HASH);
  assert.equal(states['5B'].selectionHistory, null);
  assert.deepEqual(states['5B'].validatedArtifacts, {});

  const exported = planningStateForExport(states);
  assert.equal(exported.groups['5A'].selectionHistory.groupId, '5A');
  assert.equal(
    exported.validatedArtifacts['5A:2026-09-22'].validatedFingerprint,
    HASH
  );
});

test('corrupt persisted selection history is omitted instead of influencing planning', async () => {
  const fake = fakeFirestore();
  const docId = planningStateDocId('teacher-synthetic', '5A');
  fake.docs.set(docId, {
    schemaVersion: 'wrs-planning-operational-state-v1',
    schoolYear: '2026-27',
    teacherId: 'teacher-synthetic',
    groupId: '5A',
    selectionHistory: {
      ...historyFor('5A'),
      schoolYear: '2025-26'
    },
    validatedArtifacts: {},
    updatedAt: '2026-09-21T18:03:00.000Z'
  });

  const states = await readPlanningOperationalStates({
    firestore: fake.client,
    teacherId: 'teacher-synthetic'
  });

  assert.equal(states['5A'].selectionHistory, null);
});

test('corrupt persisted validation metadata is omitted instead of reused', () => {
  const exported = planningStateForExport({
    '5A': {
      selectionHistory: null,
      validatedArtifacts: {
        '2026-09-22': {
          ...artifact,
          validatedFingerprint: `sha256:${'b'.repeat(64)}`
        }
      }
    }
  });

  assert.deepEqual(exported.validatedArtifacts, {});
});

test('planning operational state is callable-only and does not open direct Firestore client access', async () => {
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
  const functionsSource = await readFile(new URL('../functions/index.js', import.meta.url), 'utf8');

  assert.doesNotMatch(rules, /match \/planning_group_state\//);
  assert.match(functionsSource, /savePlanningOperationalStateCallable/);
  assert.match(functionsSource, /teacherId:\s*request\.auth\.uid/);
  assert.doesNotMatch(functionsSource, /teacherId:\s*request\.data/);
});

test('planning operational state tests contain no current real-student names', () => {
  const source = JSON.stringify({ history: historyFor('5A'), artifact });
  for (const name of ['Oliver', 'Ethan', 'Alex', 'Finn', 'Maya', 'Enrique', 'Levi', 'Nora', 'Eleanor', 'Alice', 'Izzy', 'Juliana', 'Carolyn', 'Elise', 'Charlotte', 'Bennett', 'Ben', 'Xavier', 'Uffarren']) {
    assert.equal(source.includes(name), false);
  }
});
