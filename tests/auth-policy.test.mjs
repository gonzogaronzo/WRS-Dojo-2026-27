import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('teacher auth uses persistent Firebase login and never times out into guest mode', async () => {
  const firebaseSource = await read('legacy/firebase.ts');
  const masterDataSource = await read('legacy/useMasterData.ts');

  assert.match(firebaseSource, /browserLocalPersistence/);
  assert.match(firebaseSource, /setPersistence\(authInstance, browserLocalPersistence\)/);
  assert.match(masterDataSource, /authPersistenceReady/);
  assert.doesNotMatch(masterDataSource, /Firebase Auth timed out\. Entering Guest Mode/);
  assert.doesNotMatch(masterDataSource, /const enterGuestMode/);
  assert.doesNotMatch(masterDataSource, /setUser\(\{ uid: 'guest-sensei'/);
});

test('lesson completion and Daily Log do not invent a guest teacher id', async () => {
  const appSource = await read('legacy/App.tsx');
  const dashboardSource = await read('legacy/components/GroupDashboard.tsx');

  assert.doesNotMatch(appSource, /teacherId=\{user\?\.uid \|\| 'guest-sensei'\}/);
  assert.doesNotMatch(dashboardSource, /user\?\.uid \|\| 'guest-sensei'/);
});
