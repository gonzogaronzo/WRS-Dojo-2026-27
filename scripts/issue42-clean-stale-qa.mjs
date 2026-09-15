import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, cert, getApps, deleteApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const ROOT = process.cwd();
const HELPER_NAME = '__qa_issue42_stale_cleanup.html';
const STALE_UID = 'issue42-scroll-qa-34915345848';
const STALE_STUDENT_ID = `${STALE_UID}-student`;
const STALE_SQUAD_ID = `${STALE_UID}-group`;

const serviceAccount = () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_WRS_FIREBASE;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_WRS_FIREBASE is required.');
  return JSON.parse(raw);
};

async function prepare() {
  const existing = getApps()[0];
  const app = existing || initializeApp({ credential: cert(serviceAccount()), projectId: 'wrs-firebase' });
  const auth = getAuth(app);
  const token = await auth.createCustomToken(STALE_UID, { previewQa: true });
  const q = value => JSON.stringify(value);
  const helper = `<!doctype html><html><head><meta charset="utf-8"><title>Issue 42 stale QA cleanup</title></head><body>
<p id="status">CLEANING</p>
<script src="/__/firebase/8.10.1/firebase-app.js"></script>
<script src="/__/firebase/8.10.1/firebase-auth.js"></script>
<script src="/__/firebase/8.10.1/firebase-firestore.js"></script>
<script src="/__/firebase/init.js"></script>
<script>
(async () => {
  const status = document.getElementById('status');
  try {
    await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);
    await firebase.auth().signInWithCustomToken(${q(token)});
    const db = firebase.firestore();
    await Promise.allSettled([
      db.collection('active_sessions').doc(${q(STALE_UID)}).delete(),
      db.collection('sync_checks').doc(${q(STALE_UID)}).delete(),
      db.collection('students').doc(${q(STALE_STUDENT_ID)}).delete(),
      db.collection('squads').doc(${q(STALE_SQUAD_ID)}).delete()
    ]);
    const current = firebase.auth().currentUser;
    if (current) await current.delete();
    status.textContent = 'CLEANUP_OK';
  } catch (error) {
    status.textContent = 'CLEANUP_FAIL: ' + (error && error.message ? error.message : String(error));
  }
})();
</script></body></html>`;
  fs.writeFileSync(path.join(ROOT, 'standalone-dist', HELPER_NAME), helper);
  await deleteApp(app);
}

async function run() {
  const previewUrl = process.env.PREVIEW_URL;
  if (!previewUrl) throw new Error('PREVIEW_URL is required.');
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
    await page.goto(`${previewUrl}/${HELPER_NAME}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.getByText('CLEANUP_OK', { exact: true }).waitFor({ state: 'visible', timeout: 20000 });
    console.log(`Removed stale Issue 42 QA identity ${STALE_UID}.`);
  } finally {
    await browser.close();
    fs.rmSync(path.join(ROOT, 'standalone-dist', HELPER_NAME), { force: true });
  }
}

const command = process.argv[2];
if (command === 'prepare') await prepare();
else if (command === 'run') await run();
else throw new Error('Usage: node scripts/issue42-clean-stale-qa.mjs <prepare|run>');
