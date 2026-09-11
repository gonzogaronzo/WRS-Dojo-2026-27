'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { syncCompletedMissionToSheet } = require('./index');

test('unit: deploys sheet reconciliation with one invocation at a time', () => {
  const endpoint = syncCompletedMissionToSheet.__endpoint;
  assert.equal(endpoint.platform, 'gcfv2');
  assert.equal(endpoint.maxInstances, 1);
  assert.equal(endpoint.concurrency, 1);
  assert.equal(endpoint.eventTrigger.retry, true);
});
