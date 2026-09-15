import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { lesson25 } from '../legacy/lessons/step2-5.ts';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, cert, getApps, deleteApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const ROOT = process.cwd();
const STATE_PATH = path.join(ROOT, '.issue42-preview-qa-state.json');
const REPORT_PATH = path.join(ROOT, 'issue42-preview-qa-report.json');
const SCREENSHOT_PATH = path.join(ROOT, 'issue42-preview-qa-failure.png');
const PREVIEW_URL = process.env.PREVIEW_URL || 'https://wrs-firebase--issue42-stage-scroll.web.app';
const CONTROL_73_PATH = path.join(ROOT, 'tests', 'fixtures', 'disposable-wrs-runtime-7.3-part2.json');

const serviceAccount = () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_WRS_FIREBASE;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_WRS_FIREBASE is required for preview QA.');
  return JSON.parse(raw);
};

const adminContext = () => {
  const existing = getApps()[0];
  const app = existing || initializeApp({ credential: cert(serviceAccount()), projectId: 'wrs-firebase' });
  return { app, auth: getAuth(app) };
};

const writeReport = report => fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
const readState = () => JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

async function prepare() {
  const runId = String(process.env.GITHUB_RUN_ID || Date.now());
  const uid = `issue42-scroll-qa-${runId}`;
  const studentId = `${uid}-student`;
  const squadId = `${uid}-group`;
  const helperName = `__qa_auth_${randomUUID().replaceAll('-', '')}.html`;
  const { app, auth } = adminContext();
  const token = await auth.createCustomToken(uid, { previewQa: true });
  const state = { uid, studentId, squadId, helperName };
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);

  const q = value => JSON.stringify(value);
  const helper = `<!doctype html><html><head><meta charset="utf-8"><title>Issue 42 QA</title></head><body>
<p id="status">Preparing Issue 42 QA…</p>
<script src="/__/firebase/8.10.1/firebase-app.js"></script>
<script src="/__/firebase/8.10.1/firebase-auth.js"></script>
<script src="/__/firebase/8.10.1/firebase-firestore.js"></script>
<script src="/__/firebase/init.js"></script>
<script>
(async () => {
  const status = document.getElementById('status');
  const uid = ${q(uid)};
  const studentId = ${q(studentId)};
  const squadId = ${q(squadId)};
  const token = ${q(token)};
  try {
    await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    if (!firebase.auth().currentUser || firebase.auth().currentUser.uid !== uid) {
      await firebase.auth().signInWithCustomToken(token);
    }
    const db = firebase.firestore();
    if (new URLSearchParams(location.search).get('cleanup') === '1') {
      await Promise.allSettled([
        db.collection('active_sessions').doc(uid).delete(),
        db.collection('sync_checks').doc(uid).delete(),
        db.collection('students').doc(studentId).delete(),
        db.collection('squads').doc(squadId).delete()
      ]);
      const current = firebase.auth().currentUser;
      if (current) await current.delete();
      status.textContent = 'CLEANUP_OK';
      return;
    }
    await db.collection('students').doc(studentId).set({
      id: studentId, name: 'Issue 42 QA Student', teacherId: uid, active: true,
      schoolYear: '2026-27', masteredSounds: [], masteredHFW: [], attendanceCount: 0, notes: '', history: []
    });
    await db.collection('squads').doc(squadId).set({
      id: squadId, name: 'Issue 42 Scroll QA', teacherId: uid, active: true, schoolYear: '2026-27',
      studentIds: [studentId], inventory: { learnedSounds: [], learnedHFW: [] }, savedLessons: [], history: [],
      instructionalProfile: {
        schemaVersion: 1, currentSubstep: '2.5', lessonFocus: 'accuracy', currentCardRepository: [],
        reviewCardRepository: [], practicedWordElements: [], highFrequencyWords: [], troubleSpots: [],
        conceptsToWeave: [], nextLessonNotes: ''
      }
    });
    status.textContent = 'READY';
    location.replace('/');
  } catch (error) {
    status.textContent = 'QA_HELPER_FAIL: ' + (error && error.message ? error.message : String(error));
  }
})();
</script></body></html>`;
  fs.writeFileSync(path.join(ROOT, 'standalone-dist', helperName), helper);
  await deleteApp(app);
  console.log(`Prepared Issue 42 QA identity ${uid}.`);
}

async function launchBrowser() {
  const { chromium } = await import('playwright-core');
  return chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
}

async function testPreview() {
  const state = readState();
  const control73 = JSON.parse(fs.readFileSync(CONTROL_73_PATH, 'utf8'));
  const browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const checks = {};
  const browserErrors = [];
  page.on('pageerror', error => browserErrors.push(error.message));

  const waitForGroup = async () => page.getByText('Issue 42 Scroll QA', { exact: true }).first().waitFor({ state: 'visible', timeout: 25000 });
  const ensureGroupOpen = async () => {
    const forge = page.getByRole('button', { name: /Forge New Scroll/i });
    if (await forge.isVisible().catch(() => false)) return;
    await waitForGroup();
    await page.getByText('Issue 42 Scroll QA', { exact: true }).first().click();
    await forge.waitFor({ state: 'visible' });
  };
  const openEditor = async () => {
    await ensureGroupOpen();
    await page.getByRole('button', { name: /Forge New Scroll/i }).click();
    await page.getByRole('button', { name: 'Import', exact: true }).waitFor({ state: 'visible' });
  };
  const importLesson = async lesson => {
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await page.getByPlaceholder('Paste here...').fill(JSON.stringify(lesson));
    await page.getByRole('button', { name: 'Process Import', exact: true }).click();
    await page.getByRole('button', { name: 'Run Mission', exact: true }).waitFor({ state: 'visible' });
  };
  const runLesson = async () => {
    await page.getByRole('button', { name: 'Run Mission', exact: true }).click();
    await page.getByRole('button', { name: 'Begin Mission', exact: true }).waitFor({ state: 'visible' });
  };
  const exitDojo = async () => {
    await page.getByRole('button', { name: 'Exit Dojo', exact: true }).click();
    const returnButton = page.getByRole('button', { name: /Return to Dojo/i });
    if (await returnButton.waitFor({ state: 'visible', timeout: 2500 }).then(() => true).catch(() => false)) await returnButton.click();
    await ensureGroupOpen();
  };

  try {
    await page.goto(`${PREVIEW_URL}/${state.helperName}`, { waitUntil: 'domcontentloaded' });
    await waitForGroup();

    // Reproduce the teacher's old manually built 2.5 lesson path and prove the
    // fixed stage itself owns overflow without changing 1280x720 coordinates.
    await openEditor();
    await importLesson(lesson25);
    await runLesson();
    const teacherStage = page.locator('[data-lesson-stage-scroll-owner="teacher"]');
    await teacherStage.waitFor({ state: 'visible' });
    const geometry = await teacherStage.evaluate(el => ({
      width: el.style.width,
      height: el.style.height,
      overflowY: getComputedStyle(el).overflowY,
      overflowX: getComputedStyle(el).overflowX
    }));
    if (geometry.width !== '1280px' || geometry.height !== '720px') throw new Error(`Lesson geometry changed: ${JSON.stringify(geometry)}`);
    if (geometry.overflowY !== 'auto' || geometry.overflowX !== 'hidden') throw new Error(`Teacher stage is not the intended scroll owner: ${JSON.stringify(geometry)}`);
    checks.fixedGeometry = 'PASS';

    await teacherStage.evaluate(el => {
      const probe = document.createElement('div');
      probe.id = 'issue42-tall-probe';
      probe.style.height = '1800px';
      probe.style.width = '1px';
      probe.setAttribute('aria-hidden', 'true');
      el.appendChild(probe);
      el.scrollTop = 0;
    });
    const overflow = await teacherStage.evaluate(el => ({ clientHeight: el.clientHeight, scrollHeight: el.scrollHeight }));
    if (overflow.scrollHeight <= overflow.clientHeight) throw new Error(`Tall teacher content did not create vertical overflow: ${JSON.stringify(overflow)}`);

    await teacherStage.hover();
    await page.mouse.wheel(0, 650);
    await page.waitForTimeout(250);
    const wheelTop = await teacherStage.evaluate(el => el.scrollTop);
    if (wheelTop <= 0) throw new Error('Wheel/trackpad-style scrolling did not move the teacher stage.');
    checks.wheelScroll = 'PASS';

    await teacherStage.evaluate(el => { el.scrollTop = 0; });
    await teacherStage.focus();
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(250);
    const keyboardTop = await teacherStage.evaluate(el => el.scrollTop);
    if (keyboardTop <= 0) throw new Error('Keyboard PageDown did not move the teacher stage.');
    checks.keyboardScroll = 'PASS';

    await teacherStage.evaluate(el => {
      el.querySelector('#issue42-tall-probe')?.remove();
      el.scrollTop = 0;
    });
    checks.legacy25TeacherPath = 'PASS';

    await exitDojo();

    // Known-good 7.3 interactive Part 2 control must still render normally.
    await openEditor();
    await importLesson(control73);
    await runLesson();
    await page.getByRole('button', { name: 'Teach Concepts (Reading)', exact: true }).click();
    await page.locator('[data-part2-runner-controls]').waitFor({ state: 'visible' });
    if (await page.getByText('Instructional display unavailable', { exact: false }).first().isVisible().catch(() => false)) {
      throw new Error('7.3 Part 2 fell back to unavailable state.');
    }
    if (await page.getByText('Quick Practice', { exact: false }).first().isVisible().catch(() => false)) {
      throw new Error('7.3 Part 2 unexpectedly reintroduced Quick Practice.');
    }
    checks.part2_73Control = 'PASS';

    // Open the real passive student display and confirm it remains clipped.
    const popupPromise = context.waitForEvent('page');
    const displayButton = page.getByRole('button', { name: /Open Student Display|Student Display/i }).first();
    await displayButton.click();
    const studentPage = await popupPromise;
    studentPage.setDefaultTimeout(20000);
    const studentStage = studentPage.locator('[data-lesson-stage]');
    await studentStage.waitFor({ state: 'visible', timeout: 20000 });
    const studentScroll = await studentStage.evaluate(el => ({
      owner: el.getAttribute('data-lesson-stage-scroll-owner'),
      overflowY: getComputedStyle(el).overflowY,
      tabIndex: el.getAttribute('tabindex')
    }));
    if (studentScroll.owner !== null || studentScroll.overflowY !== 'hidden' || studentScroll.tabIndex !== null) {
      throw new Error(`Student display became an independent scroll surface: ${JSON.stringify(studentScroll)}`);
    }
    checks.studentDisplayClipped = 'PASS';
    await studentPage.close();

    if (browserErrors.length) throw new Error(`Browser page errors: ${browserErrors.join(' | ')}`);
    writeReport({ status: 'PASS', previewUrl: PREVIEW_URL, headSha: process.env.GITHUB_SHA || null, checks });
    console.log(`Issue 42 deployed-preview QA PASS: ${JSON.stringify(checks)}`);
  } catch (error) {
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true }).catch(() => {});
    writeReport({ status: 'FAIL', previewUrl: PREVIEW_URL, headSha: process.env.GITHUB_SHA || null, checks, browserErrors, error: error instanceof Error ? error.stack || error.message : String(error) });
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function cleanup() {
  if (!fs.existsSync(STATE_PATH)) return;
  const state = readState();
  let clientCleanup = 'not-run';
  try {
    const browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
    try {
      await page.goto(`${PREVIEW_URL}/${state.helperName}?cleanup=1`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.getByText('CLEANUP_OK', { exact: true }).waitFor({ state: 'visible', timeout: 20000 });
      clientCleanup = 'PASS';
    } finally {
      await browser.close();
    }
  } catch (error) {
    clientCleanup = `FAIL: ${error instanceof Error ? error.message : String(error)}`;
  }
  fs.rmSync(path.join(ROOT, 'standalone-dist', state.helperName), { force: true });
  fs.rmSync(STATE_PATH, { force: true });
  console.log(`Issue 42 QA cleanup ${clientCleanup} for ${state.uid}.`);
  if (!clientCleanup.startsWith('PASS')) throw new Error(clientCleanup);
}

const command = process.argv[2];
if (command === 'prepare') await prepare();
else if (command === 'test') await testPreview();
else if (command === 'cleanup') await cleanup();
else throw new Error('Usage: node --import tsx scripts/issue42-preview-e2e.mjs <prepare|test|cleanup>');
