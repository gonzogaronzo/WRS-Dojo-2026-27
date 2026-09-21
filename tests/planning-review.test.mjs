import test from 'node:test';
import assert from 'node:assert/strict';

import { planningReviewLines, renderPlanningReview } from '../scripts/wrs-render-planning-review.mjs';

const snapshots = [
  {
    group: { groupId: 'A', displayName: 'Group A' },
    students: [{ lessonFocus: '5.5 Accuracy', troubleSpots: ['Synthetic accuracy issue.'] }],
    lessonContinuity: { unfinishedWork: ['Finish one synthetic dictation item.'] },
    groupTroubleSpots: [],
    advancement: { currentSubstep: '5.5' }
  },
  {
    group: { groupId: 'B', displayName: 'Group B' },
    students: [{ lessonFocus: '2.5 Accuracy', troubleSpots: [] }],
    lessonContinuity: { unfinishedWork: [] },
    groupTroubleSpots: [],
    advancement: { currentSubstep: '2.5', nextSubstep: '3.1' }
  },
  {
    group: { groupId: 'C', displayName: 'Group C' },
    students: [{ lessonFocus: '1.6 Accuracy', troubleSpots: [] }],
    lessonContinuity: { unfinishedWork: [] },
    groupTroubleSpots: [],
    advancement: { currentSubstep: '1.6' }
  }
];

const queue = {
  entries: [
    {
      groupId: 'A',
      displayName: 'Group A',
      sourcePacketRef: 'wrs-5.5-source-packet-v1',
      status: 'needs-build',
      entryConditionStatus: 'not-applicable',
      blockers: []
    },
    {
      groupId: 'B',
      displayName: 'Group B',
      sourcePacketRef: 'wrs-3.1-source-packet-v1',
      status: 'awaiting-condition',
      entryCondition: 'Complete synthetic charting before beginning 3.1.',
      entryConditionStatus: 'pending',
      blockers: []
    },
    {
      groupId: 'C',
      displayName: 'Group C',
      sourcePacketRef: 'wrs-1.6-source-packet-v1',
      status: 'blocked',
      entryConditionStatus: 'blocked',
      blockers: ['Synthetic source packet conflict.']
    }
  ]
};

test('planning review produces one concise line per group', () => {
  const lines = planningReviewLines({ snapshots, queue });
  assert.equal(lines.length, 3);
  assert.match(lines[0], /^Group A → 5\.5 Accuracy → BUILD/);
  assert.match(lines[0], /Finish one synthetic dictation item/);
  assert.match(lines[1], /^Group B → 3\.1 Introduction → WAIT:/);
  assert.match(lines[1], /Complete synthetic charting/);
  assert.match(lines[2], /^Group C → 1\.6 Accuracy → BLOCKED:/);
});

test('planning review markdown carries week and state dates', () => {
  const rendered = renderPlanningReview({
    snapshots,
    queue,
    weekOf: '2026-09-21',
    asOf: '2026-09-18'
  });
  assert.match(rendered, /# WRS Weekly Planning Review/);
  assert.match(rendered, /Week of: 2026-09-21/);
  assert.match(rendered, /State through: 2026-09-18/);
  assert.equal((rendered.match(/^- /gm) || []).length, 3);
});

test('planning review fixtures contain no current real-student names', () => {
  const source = JSON.stringify({ snapshots, queue });
  for (const name of ['Oliver', 'Ethan', 'Alex', 'Finn', 'Maya', 'Enrique', 'Levi', 'Nora', 'Eleanor', 'Alice', 'Izzy', 'Juliana', 'Carolyn', 'Elise', 'Charlotte', 'Bennett', 'Ben', 'Xavier', 'Uffarren']) {
    assert.equal(source.includes(name), false);
  }
});
