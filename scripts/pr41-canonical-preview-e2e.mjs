import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, cert, getApps, deleteApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const ROOT = process.cwd();
const STATE_PATH = path.join(ROOT, '.pr41-preview-qa-state.json');
const REPORT_PATH = path.join(ROOT, 'pr41-canonical-preview-qa-report.json');
const SCREENSHOT_PATH = path.join(ROOT, 'pr41-canonical-preview-failure.png');
const PREVIEW_URL = process.env.PREVIEW_URL || 'https://wrs-firebase--pr41-canonical-json-a1azug7b.web.app';
const LESSON_PATH = path.join(ROOT, 'fixtures', 'canonical', '3A-2.5-accuracy.canonical-v2.json');

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
const partData = (lesson, number) => lesson.parts.find(part => part.part === number)?.data || {};
const strings = value => Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];

async function prepare() {
  const runId = String(process.env.GITHUB_RUN_ID || Date.now());
  const uid = `pr41-canonical-qa-${runId}`;
  const studentId = `${uid}-student-1`;
  const squadId = `${uid}-group`;
  const helperName = `__qa_auth_${randomUUID().replaceAll('-', '')}.html`;
  const { app, auth } = adminContext();

  const token = await auth.createCustomToken(uid, { previewQa: true });
  const state = { uid, studentId, squadId, helperName };
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);

  const q = value => JSON.stringify(value);
  const helper = `<!doctype html>
<html><head><meta charset="utf-8"><title>PR41 canonical preview QA auth</title></head>
<body><p id="status">Preparing isolated preview QA…</p>
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
      document.body.dataset.qaStatus = 'cleanup-ok';
      return;
    }
    await db.collection('students').doc(studentId).set({
      id: studentId,
      name: 'Canonical QA Student',
      teacherId: uid,
      active: true,
      schoolYear: '2026-27',
      masteredSounds: [],
      masteredHFW: [],
      attendanceCount: 0,
      notes: '',
      history: []
    });
    await db.collection('squads').doc(squadId).set({
      id: squadId,
      name: 'PR41 Canonical QA Group',
      teacherId: uid,
      active: true,
      schoolYear: '2026-27',
      studentIds: [studentId],
      inventory: { learnedSounds: [], learnedHFW: [] },
      savedLessons: [],
      history: [],
      instructionalProfile: {
        schemaVersion: 1,
        currentSubstep: '2.5',
        lessonFocus: 'accuracy',
        currentCardRepository: [],
        reviewCardRepository: [],
        practicedWordElements: [],
        highFrequencyWords: [],
        troubleSpots: [],
        conceptsToWeave: [],
        nextLessonNotes: ''
      }
    });
    status.textContent = 'READY';
    document.body.dataset.qaStatus = 'ready';
    location.replace('/');
  } catch (error) {
    status.textContent = 'QA_HELPER_FAIL: ' + (error && error.message ? error.message : String(error));
    document.body.dataset.qaStatus = 'fail';
  }
})();
</script></body></html>`;

  fs.writeFileSync(path.join(ROOT, 'standalone-dist', helperName), helper);
  await deleteApp(app);
  console.log(`Prepared isolated canonical preview QA identity ${uid}.`);
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
  const lesson = JSON.parse(fs.readFileSync(LESSON_PATH, 'utf8'));
  const browserErrors = [];
  const checks = {};
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
  page.setDefaultTimeout(20000);
  page.on('console', message => {
    if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', error => browserErrors.push(`pageerror: ${error.message}`));

  const main = () => page.locator('main');
  const partTitles = ['Quick Drill (Sounds)', 'Teach Concepts (Reading)', 'Word Cards', 'Wordlist Reading', 'Sentence Reading', 'Quick Drill (Rev)', 'Teach Concepts (Spelling)', 'Written Work (Dictation)', 'Passage Reading', 'Listening Comp'];
  const sidebarPart = title => page.getByRole('button', { name: title, exact: true });
  const textVisible = async text => page.getByText(text, { exact: false }).first().isVisible().catch(() => false);
  const assertVisibleText = async (text, label = text) => {
    const locator = page.getByText(text, { exact: false }).first();
    if (!(await locator.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false))) {
      throw new Error(`Expected visible text for ${label}: ${text}`);
    }
  };
  const assertAbsentText = async text => {
    if (await textVisible(text)) throw new Error(`Unexpected visible text: ${text}`);
  };
  const navigatePart = async title => {
    const partNumber = partTitles.indexOf(title) + 1;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await sidebarPart(title).click();
      await page.waitForTimeout(250);
      if (await page.getByText(`${partNumber} / 10`, { exact: true }).isVisible().catch(() => false)) {
        await page.waitForTimeout(500);
        if (await page.getByText(`${partNumber} / 10`, { exact: true }).isVisible().catch(() => false)) return;
      }
    }
    throw new Error(`Navigation did not remain on Part ${partNumber}: ${title}`);
  };
  const waitForDashboardGroup = async () => {
    await page.getByText('PR41 Canonical QA Group', { exact: true }).first().waitFor({ state: 'visible', timeout: 25000 });
  };
  const ensureGroupOpen = async () => {
    const forge = page.getByRole('button', { name: /Forge New Scroll/i });
    if (await forge.isVisible().catch(() => false)) return;
    await waitForDashboardGroup();
    await page.getByText('PR41 Canonical QA Group', { exact: true }).first().click();
    await forge.waitFor({ state: 'visible' });
  };
  const openNewLessonEditor = async () => {
    await ensureGroupOpen();
    await page.getByRole('button', { name: /Forge New Scroll/i }).click();
    await page.getByRole('button', { name: 'Import', exact: true }).waitFor({ state: 'visible' });
  };
  const importLesson = async value => {
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    const input = page.getByPlaceholder('Paste here...');
    await input.fill(JSON.stringify(value));
    await page.getByRole('button', { name: 'Process Import', exact: true }).click();
    await page.getByRole('button', { name: 'Run Mission', exact: true }).waitFor({ state: 'visible' });
    const importedTitlePresent = await page.locator('input').evaluateAll((nodes, title) => nodes.some(node => node.value === title), value.title);
    if (!importedTitlePresent) throw new Error('Imported editor title did not match canonical source lesson.');
  };
  const runMissionToBriefing = async () => {
    await page.getByRole('button', { name: 'Run Mission', exact: true }).click();
    await page.getByRole('button', { name: 'Begin Mission', exact: true }).waitFor({ state: 'visible' });
    await assertVisibleText('Mission Briefing');
  };
  const exitDojo = async () => {
    await page.getByRole('button', { name: 'Exit Dojo', exact: true }).click();
    const returnToDojo = page.getByRole('button', { name: /Return to Dojo/i });
    await returnToDojo.waitFor({ state: 'visible' });
    await returnToDojo.click();
    await ensureGroupOpen();
  };
  const deploySavedLesson = async titleText => {
    await ensureGroupOpen();
    const title = page.getByText(titleText, { exact: true }).first();
    await title.waitFor({ state: 'visible' });
    const card = title.locator('xpath=ancestor::div[.//button[contains(normalize-space(.), "Deploy Mission")]][1]');
    await card.getByRole('button', { name: 'Deploy Mission', exact: true }).click();
    await page.getByRole('button', { name: 'Begin Mission', exact: true }).waitFor({ state: 'visible' });
  };

  const verifyPart2 = async () => {
    await navigatePart('Teach Concepts (Reading)');
    await page.locator('[data-part2-runner-controls]').waitFor({ state: 'visible' });
    await assertAbsentText('Instructional display unavailable');
    await assertAbsentText('Quick Practice');
    checks.part2 = 'PASS';
  };

  const verifyPart4 = async () => {
    await navigatePart('Wordlist Reading');
    const expected = new Set(strings(partData(lesson, 4).practiceWords));
    const oneReader = main().getByRole('button', { name: '1', exact: true });
    if (await oneReader.isVisible().catch(() => false)) await oneReader.click();
    let labels = [];
    for (let attempt = 0; attempt < 30; attempt += 1) {
      labels = await main().locator('[aria-label]').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label') || ''));
      if (labels.some(label => [...expected].some(word => label.includes(`: ${word},`)))) break;
      await page.waitForTimeout(100);
    }
    const visibleWords = labels.filter(label => /: .+, (none|correct|error)$/.test(label))
      .map(label => label.split(': ').slice(1).join(': ').split(', ')[0]).filter(Boolean);
    if (!visibleWords.length) throw new Error('Part 4 practice words did not render.');
    const wrong = visibleWords.filter(word => !expected.has(word));
    if (wrong.length) throw new Error(`Part 4 rendered unexpected words: ${wrong.join(', ')}`);
    checks.part4 = 'PASS';
  };

  const verifyPart5 = async () => {
    const p5 = partData(lesson, 5);
    await navigatePart('Sentence Reading');
    await page.locator('[data-part5-teacher-weave]').waitFor({ state: 'visible' });
    await assertVisibleText(strings(p5.sentences)[0], 'Part 5 sentence');
    await assertVisibleText(strings(p5.weaveQuestions)[0], 'Part 5 teacher weave question');
    checks.part5TeacherQuestion = 'PASS';
  };

  const verifyPart7 = async () => {
    await navigatePart('Teach Concepts (Spelling)');
    await page.locator('[data-part7-spelling-runner]').waitFor({ state: 'visible' });
    await page.locator('[data-part7-target-private]').waitFor({ state: 'visible' });
    await assertVisibleText('flask', 'Part 7 first private target');
    await assertVisibleText('Listen', 'Part 7 hidden student state');
    await assertAbsentText('Cipher');
    await assertAbsentText('Quick Practice');

    await page.getByRole('button', { name: 'Reveal', exact: true }).click();
    await page.locator('[data-part7-revealed="true"]').waitFor({ state: 'visible' });
    const roles = await page.locator('[data-part7-revealed="true"] [data-part2-role]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-part2-role')));
    if (!roles.includes('consonant') || !roles.includes('vowel')) throw new Error(`Part 7 reveal did not use expected Letter-Sound Tile roles: ${roles.join(', ')}`);

    await page.getByRole('button', { name: 'Next spelling item', exact: true }).click();
    await assertVisibleText('trend', 'Part 7 next private target');
    await page.locator('[data-part7-revealed="false"]').waitFor({ state: 'visible' });
    checks.part7DictateReveal = 'PASS';
  };

  const verifyPart8 = async () => {
    await navigatePart('Written Work (Dictation)');
    await assertVisibleText('Written Work');
    checks.part8 = 'PASS';
  };

  const verifyPart9 = async () => {
    const p9 = partData(lesson, 9);
    await navigatePart('Passage Reading');
    await page.locator('[data-part9-teacher-questions]').waitFor({ state: 'visible' });
    await assertVisibleText(p9.passageTitle, 'Part 9 title');
    const questions = Array.isArray(p9.questions) ? p9.questions : [];
    if (questions.length !== 10) throw new Error(`Expected 10 Part 9 questions, found ${questions.length}.`);
    await assertVisibleText(questions[0].question, 'Part 9 first teacher question');
    await assertVisibleText(questions[9].question, 'Part 9 tenth teacher question');
    await assertVisibleText(p9.historyNote, 'Part 9 teacher history note');
    checks.part9TeacherQuestions = 'PASS';
  };

  const verifyPart10 = async () => {
    await navigatePart('Listening Comp');
    await assertAbsentText('Instructional display unavailable');
    checks.part10 = 'PASS';
  };

  const exportCanonical = async () => {
    const exportButton = page.getByRole('button', { name: 'Export Canonical JSON', exact: true });
    await exportButton.waitFor({ state: 'visible' });
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();
    const download = await downloadPromise;
    const filePath = await download.path();
    if (!filePath) throw new Error('Canonical export download had no readable path.');
    const exported = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (exported.schemaVersion !== 'wrs-runtime-v1') throw new Error('Canonical export did not emit wrs-runtime-v1.');
    for (const forbidden of ['runtimePlan', 'slides', 'wrsPlan', 'quickDrill']) {
      if (Object.prototype.hasOwnProperty.call(exported, forbidden)) throw new Error(`Canonical export leaked legacy field ${forbidden}.`);
    }
    if (!Array.isArray(exported.parts) || exported.parts.length !== 10) throw new Error('Canonical export lost Parts 1-10.');
    if (strings(partData(exported, 5).weaveQuestions).length !== 10) throw new Error('Canonical export lost Part 5 weave questions.');
    if (!Array.isArray(partData(exported, 7).spellingItems) || partData(exported, 7).spellingItems.length !== 16) throw new Error('Canonical export lost Part 7 spellingItems.');
    if (!Array.isArray(partData(exported, 9).questions) || partData(exported, 9).questions.length !== 10) throw new Error('Canonical export lost Part 9 questions.');
    checks.canonicalExport = 'PASS';
    return exported;
  };

  try {
    await page.goto(`${PREVIEW_URL}/${state.helperName}`, { waitUntil: 'domcontentloaded' });
    await waitForDashboardGroup();

    await openNewLessonEditor();
    await importLesson(lesson);
    await runMissionToBriefing();

    for (const title of partTitles) {
      if (!(await sidebarPart(title).isVisible().catch(() => false))) throw new Error(`Missing sidebar lesson part: ${title}`);
    }
    checks.parts1to10 = 'PASS';

    await verifyPart2();
    await verifyPart4();
    await verifyPart5();
    await verifyPart7();
    await verifyPart8();
    await verifyPart9();
    await verifyPart10();
    const exported = await exportCanonical();

    await exitDojo();

    // Full browser reload, then reopen the Firestore-backed saved lesson.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForDashboardGroup();
    await deploySavedLesson(lesson.title);
    await verifyPart5();
    await verifyPart7();
    await verifyPart9();
    checks.saveReloadReopen = 'PASS';
    await exitDojo();

    // Prove the canonical export itself can be imported and run again.
    await openNewLessonEditor();
    await importLesson(exported);
    await runMissionToBriefing();
    await verifyPart2();
    await verifyPart7();
    await verifyPart9();
    checks.exportReimport = 'PASS';

    const fatalBrowserErrors = browserErrors.filter(error => error.startsWith('pageerror:'));
    if (fatalBrowserErrors.length) throw new Error(`Browser page errors: ${fatalBrowserErrors.join(' | ')}`);

    writeReport({
      status: 'PASS',
      previewUrl: PREVIEW_URL,
      headSha: process.env.GITHUB_SHA || null,
      qaUid: state.uid,
      checks,
      browserErrors
    });
    console.log(`PR41 canonical deployed-preview QA PASS: ${JSON.stringify(checks)}`);
  } catch (error) {
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true }).catch(() => {});
    writeReport({
      status: 'FAIL',
      previewUrl: PREVIEW_URL,
      headSha: process.env.GITHUB_SHA || null,
      qaUid: state.uid,
      checks,
      browserErrors,
      error: error instanceof Error ? error.stack || error.message : String(error)
    });
    throw error;
  } finally {
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
  console.log(`Canonical preview QA cleanup ${clientCleanup} for ${state.uid}.`);
  if (!clientCleanup.startsWith('PASS')) throw new Error(clientCleanup);
}

const command = process.argv[2];
if (command === 'prepare') await prepare();
else if (command === 'test') await testPreview();
else if (command === 'cleanup') await cleanup();
else throw new Error('Usage: node scripts/pr41-canonical-preview-e2e.mjs <prepare|test|cleanup>');
