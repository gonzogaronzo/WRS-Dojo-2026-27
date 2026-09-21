import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildWeeklyQueue,
  discoverPacketRegistry
} from '../scripts/wrs-build-weekly-queue.mjs';

const activeSubsteps = ['1.6', '2.5', '3.1', '5.2', '5.5', '7.5'];

const snapshotFor = (groupId, substep) => ({
  schemaVersion: 'wrs-group-planning-snapshot-v1',
  snapshotId: `snapshot-${groupId.toLowerCase()}-synthetic`,
  schoolYear: '2026-27',
  asOf: '2026-09-21',
  group: {
    groupId,
    displayName: groupId,
    schedule: '',
    roster: ['Synthetic Student']
  },
  students: [{
    studentId: `${groupId.toLowerCase()}-synthetic`,
    name: 'Synthetic Student',
    officialPlacement: {
      substep,
      status: 'official',
      sourceRef: 'synthetic'
    },
    instructionalTarget: {
      substep,
      relationshipToPlacement: 'current',
      sourceRef: 'synthetic'
    },
    lessonFocus: ['5.5', '7.5'].includes(substep) ? 'introduction' : 'accuracy',
    latestData: {
      realWordCharting: null,
      nonsenseWordCharting: null,
      spellingDictation: null,
      fluencyAssessment: null
    },
    troubleSpots: [],
    recommendedInstructionalResponse: [],
    hfwStatus: null,
    notebookStatus: null
  }],
  lessonContinuity: {
    lastInstructionDate: '2026-09-18',
    lastSubstep: substep,
    partsCompleted: [],
    unfinishedWork: [],
    passageHistory: [],
    selectionHistoryRef: null
  },
  groupTroubleSpots: [],
  materialsAndFollowUps: [],
  advancement: {
    status: 'continue',
    currentSubstep: substep,
    nextSubstep: null,
    condition: null,
    authorityRef: 'synthetic'
  },
  unresolvedConflicts: [],
  stateSources: [],
  planningReady: true,
  planningBlockers: []
});

test('all currently active instructional paths have verified reusable source packets', () => {
  const registry = discoverPacketRegistry('curriculum/source-packets');

  for (const substep of activeSubsteps) {
    assert.ok(registry[substep], `Missing packet for ${substep}`);
    assert.equal(registry[substep].verified, true, `Packet for ${substep} is not verified`);
  }

  const snapshots = activeSubsteps.map((substep, index) => snapshotFor(`Synthetic-${index + 1}`, substep));
  const queue = buildWeeklyQueue({
    snapshots,
    weekOf: '2026-09-21',
    packetRegistry: registry,
    generatedAt: '2026-09-21T18:00:00.000Z'
  });

  assert.equal(queue.entries.length, activeSubsteps.length);
  for (const entry of queue.entries) {
    assert.deepEqual(entry.blockers, []);
    assert.equal(entry.status, 'needs-build');
  }
});

test('current-path packet coverage fixture contains no current real-student names', () => {
  const source = [snapshotFor.toString(), activeSubsteps.join(',')].join('\n');
  for (const name of ['Oliver', 'Ethan', 'Alex', 'Finn', 'Maya', 'Enrique', 'Levi', 'Nora', 'Eleanor', 'Alice', 'Izzy', 'Juliana', 'Carolyn', 'Elise', 'Charlotte', 'Bennett', 'Ben', 'Xavier', 'Uffarren']) {
    assert.equal(source.includes(name), false);
  }
});
