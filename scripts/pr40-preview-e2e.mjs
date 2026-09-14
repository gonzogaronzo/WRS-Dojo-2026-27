import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, cert, getApps, deleteApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const ROOT = process.cwd();
const STATE_PATH = path.join(ROOT, '.pr40-preview-qa-state.json');
const REPORT_PATH = path.join(ROOT, 'pr40-preview-qa-report.json');
const SCREENSHOT_PATH = path.join(ROOT, 'pr40-preview-failure.png');
const PREVIEW_URL = process.env.PREVIEW_URL || 'https://wrs-firebase--pr40-runtime-qa-tdzhj3n1.web.app';
const LESSON_PATHS = [1, 2, 3, 4, 5].map(number => path.join(ROOT, 'curriculum', '5a-week-2026-09-14', `5a-7.4-lesson-${number}.json`));
const CONTROL_PATH = path.join(ROOT, 'tests', 'fixtures', 'disposable-wrs-runtime-7.3-part2.json');

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
const cardTexts = value => Array.isArray(value)
  ? value.flatMap(item => typeof item === 'string' ? [item] : item && typeof item.text === 'string' ? [item.text] : [])
  : [];

async function prepare() {
  const runId = String(process.env.GITHUB_RUN_ID || Date.now());
  const uid = `pr40-preview-qa-${runId}`;
  const studentId = `${uid}-student-1`;
  const squadId = `${uid}-group`;
  const helperName = `__qa_auth_${randomUUID().replaceAll('-', '')}.html`;
  const { app, auth } = adminContext();

  // Best effort cleanup of the one synthetic Auth user left by the abandoned
  // Firestore-admin attempt. It never had classroom records.
  try { await auth.deleteUser('pr40-preview-qa-34804487004'); } catch {}

  const token = await auth.createCustomToken(uid, { previewQa: true });
  const state = { uid, studentId, squadId, helperName };
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);

  const q = value => JSON.stringify(value);
  const helper = `<!doctype html>
<html><head><meta charset="utf-8"><title>PR40 preview QA auth</title></head>
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
      name: 'QA Student 1',
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
      name: 'PR40 QA Group',
      teacherId: uid,
      active: true,
      schoolYear: '2026-27',
      studentIds: [studentId],
      inventory: { learnedSounds: [], learnedHFW: [] },
      savedLessons: [],
      history: [],
      instructionalProfile: {
        schemaVersion: 1,
        currentSubstep: '7.4',
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
  console.log(`Prepared isolated client-owned preview QA identity ${uid} with helper ${helperName}.`);
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
  const lessons = LESSON_PATHS.map(file => JSON.parse(fs.readFileSync(file, 'utf8')));
  const control = JSON.parse(fs.readFileSync(CONTROL_PATH, 'utf8'));
  const results = [];
  const browserErrors = [];
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(18000);
  page.on('console', message => {
    if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', error => browserErrors.push(`pageerror: ${error.message}`));

  const main = () => page.locator('main');
  const textVisible = async text => page.getByText(text, { exact: false }).first().isVisible().catch(() => false);
  const assertVisibleText = async (text, label = text) => {
    if (!(await textVisible(text))) throw new Error(`Expected visible text for ${label}: ${text}`);
  };
  const assertAbsentText = async text => {
    if (await textVisible(text)) throw new Error(`Unexpected visible text: ${text}`);
  };
  const partTitles = ['Quick Drill (Sounds)', 'Teach Concepts (Reading)', 'Word Cards', 'Wordlist Reading', 'Sentence Reading', 'Quick Drill (Rev)', 'Teach Concepts (Spelling)', 'Written Work (Dictation)', 'Passage Reading', 'Listening Comp'];
  const sidebarPart = title => page.getByRole('button', { name: title, exact: true });
  const navigatePart = async title => {
    const partNumber = partTitles.indexOf(title) + 1;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await sidebarPart(title).click();
      await page.waitForTimeout(300);
      if (await page.getByText(`${partNumber} / 10`, { exact: true }).isVisible().catch(() => false)) return;
    }
    throw new Error(`Navigation did not remain on Part ${partNumber}: ${title}`);
  };
  const waitForDashboardGroup = async () => {
    await page.getByText('PR40 QA Group', { exact: true }).first().waitFor({ state: 'visible', timeout: 25000 });
  };
  const ensureGroupOpen = async () => {
    const forge = page.getByRole('button', { name: /Forge New Scroll/i });
    if (await forge.isVisible().catch(() => false)) return;
    await waitForDashboardGroup();
    await page.getByText('PR40 QA Group', { exact: true }).first().click();
    await forge.waitFor({ state: 'visible' });
  };
  const openNewLessonEditor = async () => {
    await ensureGroupOpen();
    await page.getByRole('button', { name: /Forge New Scroll/i }).click();
    await page.getByRole('button', { name: 'Import', exact: true }).waitFor({ state: 'visible' });
  };
  const importLesson = async lesson => {
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    const input = page.getByPlaceholder('Paste here...');
    await input.fill(JSON.stringify(lesson));
    await page.getByRole('button', { name: 'Process Import', exact: true }).click();
    await page.getByRole('button', { name: 'Run Mission', exact: true }).waitFor({ state: 'visible' });
    const importedTitlePresent = await page.locator('input').evaluateAll((nodes, title) => nodes.some(node => node.value === title), lesson.title);
    if (!importedTitlePresent) throw new Error(`${lesson.id}: imported editor title did not match the source lesson.`);
  };
  const runMissionToBriefing = async () => {
    await page.getByRole('button', { name: 'Run Mission', exact: true }).click();
    await page.getByRole('button', { name: 'Begin Mission', exact: true }).waitFor({ state: 'visible' });
    await assertVisibleText('Mission Briefing');
  };
  const verifyPart4ResetAndPractice = async lesson => {
    const expected = new Set(strings(partData(lesson, 4).practiceWords));
    if (!expected.size) throw new Error(`${lesson.id}: Part 4 has no practiceWords to verify.`);
    await navigatePart('Wordlist Reading');
    let labels = page.locator('[aria-label^="Student 1:"]');
    if (await labels.count() === 0) {
      const onePlayer = main().getByRole('button', { name: '1', exact: true });
      await onePlayer.waitFor({ state: 'visible' });
      await onePlayer.click();
      labels = page.locator('[aria-label^="Student 1:"]');
      await labels.first().waitFor({ state: 'visible' });
    }
    await assertVisibleText('Targeted Word Practice', 'Part 4 practice mode');
    const rawLabels = await labels.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label') || ''));
    const visibleWords = rawLabels.map(label => label.split(': ').slice(1).join(': ').split(', ')[0]).filter(Boolean);
    const wrong = visibleWords.filter(word => !expected.has(word));
    if (wrong.length) throw new Error(`${lesson.id}: Part 4 leaked words outside this lesson: ${wrong.join(', ')}`);
    await page.waitForTimeout(700);
    const settledLabels = await page.locator('[aria-label^="Student 1:"]').count();
    if (!settledLabels) throw new Error(`${lesson.id}: Part 4 vanished or auto-navigated without a teacher click.`);
    return visibleWords;
  };

  const verifyAllParts = async lesson => {
    const p2 = partData(lesson, 2);
    const p3 = partData(lesson, 3);
    const p4 = partData(lesson, 4);
    const p5 = partData(lesson, 5);
    const p7 = partData(lesson, 7);
    const p8 = partData(lesson, 8);
    const p9 = partData(lesson, 9);

    for (const title of partTitles) {
      if (!(await sidebarPart(title).isVisible().catch(() => false))) throw new Error(`${lesson.id}: missing sidebar part ${title}`);
    }

    await navigatePart('Teach Concepts (Reading)');
    await page.locator('[data-part2-runner-controls]').waitFor({ state: 'visible' });
    await assertAbsentText('Instructional display unavailable');
    await assertAbsentText('Quick Practice');
    const p2Expected = p2.part2Presentation?.interactiveSteps?.[0]?.objects?.[0]?.text;
    if (p2Expected) await assertVisibleText(p2Expected, 'Part 2 source object');
    await page.waitForTimeout(700);
    if (!(await page.locator('[data-part2-runner-controls]').isVisible())) throw new Error(`${lesson.id}: Part 2 auto-navigated away.`);

    await navigatePart('Word Cards');
    const p3Words = new Set([...cardTexts(p3.wordCards), ...strings(p3.hfwList)]);
    if (!p3Words.size) throw new Error(`${lesson.id}: no Part 3 words to verify.`);
    let bodyText = '';
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const startButton = main().getByRole('button', { name: 'Start', exact: true });
      if (await startButton.isVisible().catch(() => false)) {
        // Roster/session hydration can reset the deck once after Part 3 opens.
        // If that happens, start the newly hydrated deck as well.
        await startButton.click({ timeout: 1000 }).catch(() => {});
      }
      bodyText = await main().innerText();
      if ([...p3Words].some(word => bodyText.includes(word))) break;
      await page.waitForTimeout(100);
    }
    if (![...p3Words].some(word => bodyText.includes(word))) throw new Error(`${lesson.id}: Part 3 displayed no intended Word Card/HFW content.`);

    await navigatePart('Wordlist Reading');
    const p4Expected = new Set(strings(p4.practiceWords));
    const p4Labels = page.locator('[aria-label^="Student 1:"]');
    if (!await p4Labels.count()) throw new Error(`${lesson.id}: Part 4 practice deck disappeared after navigation.`);
    const p4Words = (await p4Labels.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label') || '')))
      .map(label => label.split(': ').slice(1).join(': ').split(', ')[0]).filter(Boolean);
    const p4Wrong = p4Words.filter(word => !p4Expected.has(word));
    if (p4Wrong.length) throw new Error(`${lesson.id}: Part 4 rendered words from another lesson: ${p4Wrong.join(', ')}`);

    await navigatePart('Sentence Reading');
    const firstSentence = strings(p5.sentences)[0];
    const firstWeave = strings(p5.weaveQuestions)[0];
    if (firstSentence) await assertVisibleText(firstSentence, 'Part 5 sentence');
    if (firstWeave) await assertVisibleText(firstWeave, 'Part 5 weave question');

    await navigatePart('Quick Drill (Rev)');
    await assertVisibleText('Auditory Drill', 'Part 6 auditory drill');

    await navigatePart('Teach Concepts (Spelling)');
    await assertVisibleText('Part 7 spelling packet');
    const firstCurrent = strings(p7.currentWords)[0];
    if (firstCurrent) await assertVisibleText(firstCurrent, 'Part 7 exact current spelling word');

    await navigatePart('Written Work (Dictation)');
    await assertVisibleText('Written Work');
    const dictation = p8.dictation || {};
    const categoryChecks = [
      ['Sounds', dictation.sounds],
      ['Real Words', dictation.realWords],
      ['Word Elements', dictation.wordElements],
      ['Nonsense Words', dictation.nonsenseWords],
      ['Phrases', dictation.phrases],
      ['Sentences', dictation.sentences]
    ];
    for (const [category, items] of categoryChecks) {
      const expectedItems = strings(items);
      if (!expectedItems.length) throw new Error(`${lesson.id}: Part 8 ${category} is empty.`);
      await main().getByRole('button', { name: category, exact: true }).click();
      await assertVisibleText(`Dictate next • ${category}`);
      await assertVisibleText(expectedItems[0], `Part 8 ${category} first item`);
    }

    await navigatePart('Passage Reading');
    if (p9.passageTitle) await assertVisibleText(p9.passageTitle, 'Part 9 title');
    const passageText = typeof p9.passage === 'string' ? p9.passage : '';
    const firstPassageWords = passageText.split(/\s+/).slice(0, 6).join(' ');
    if (firstPassageWords) await assertVisibleText(firstPassageWords, 'Part 9 passage');
    const questions = Array.isArray(p9.questions) ? p9.questions : [];
    if (questions.length !== 10) throw new Error(`${lesson.id}: expected 10 Part 9 questions, found ${questions.length}.`);
    await main().getByRole('button', { name: 'Questions (10)', exact: true }).click();
    const questionText = item => typeof item === 'string' ? item : item?.question;
    if (questionText(questions[0])) await assertVisibleText(questionText(questions[0]), 'Part 9 first question');
    if (questionText(questions[9])) await assertVisibleText(questionText(questions[9]), 'Part 9 tenth question');

    await navigatePart('Listening Comp');
    await assertAbsentText('Instructional display unavailable');
  };

  const exitDojo = async () => {
    await page.getByRole('button', { name: 'Exit Dojo', exact: true }).click();
    await page.getByRole('button', { name: /Forge New Scroll/i }).waitFor({ state: 'visible' });
  };

  const deploySavedLesson = async lesson => {
    await ensureGroupOpen();
    const title = page.getByText(lesson.title, { exact: true }).first();
    await title.waitFor({ state: 'visible' });
    const card = title.locator('xpath=ancestor::div[.//button[contains(normalize-space(.), "Deploy Mission")]][1]');
    await card.getByRole('button', { name: 'Deploy Mission', exact: true }).click();
    await page.getByRole('button', { name: 'Begin Mission', exact: true }).waitFor({ state: 'visible' });
  };

  const verifyReloadedLesson = async lesson => {
    const p4 = partData(lesson, 4);
    const p7 = partData(lesson, 7);
    const p9 = partData(lesson, 9);
    await verifyPart4ResetAndPractice(lesson);
    await navigatePart('Teach Concepts (Spelling)');
    const current = strings(p7.currentWords)[0];
    if (current) await assertVisibleText(current, 'reopened Part 7 word');
    await navigatePart('Passage Reading');
    if (p9.passageTitle) await assertVisibleText(p9.passageTitle, 'reopened Part 9 title');
    const questions = Array.isArray(p9.questions) ? p9.questions : [];
    if (questions.length !== 10) throw new Error(`${lesson.id}: reopened lesson lost Part 9 questions.`);
    await main().getByRole('button', { name: 'Questions (10)', exact: true }).click();
    const lastQuestion = typeof questions[9] === 'string' ? questions[9] : questions[9]?.question;
    if (lastQuestion) await assertVisibleText(lastQuestion, 'reopened Part 9 tenth question');
    await navigatePart('Teach Concepts (Reading)');
    await page.locator('[data-part2-runner-controls]').waitFor({ state: 'visible' });
    await assertAbsentText('Instructional display unavailable');
    return { practiceCount: strings(p4.practiceWords).length };
  };

  const verifySevenThreeControl = async () => {
    await openNewLessonEditor();
    await importLesson(control);
    await runMissionToBriefing();
    await navigatePart('Teach Concepts (Reading)');
    await page.locator('[data-part2-runner-controls]').waitFor({ state: 'visible' });
    await assertAbsentText('Instructional display unavailable');
    await assertAbsentText('Quick Practice');
    const nextButtons = page.locator('[data-part2-runner-controls] [aria-label="Next"]');
    if (await nextButtons.count() !== 1) throw new Error(`7.3 control expected one runner-owned Next button, found ${await nextButtons.count()}.`);
    const seenNotebookSources = new Set();
    for (let step = 0; step < 80; step += 1) {
      const image = page.locator('[data-part2-notebook-page-image] img');
      if (await image.isVisible().catch(() => false)) {
        const src = await image.getAttribute('src');
        const loaded = await image.evaluate(node => node.complete && node.naturalWidth > 0).catch(() => false);
        if (!loaded) throw new Error(`7.3 control notebook image failed to load: ${src}`);
        if (src) seenNotebookSources.add(src);
      }
      if ([...seenNotebookSources].some(src => src.includes('page-002.png')) && [...seenNotebookSources].some(src => src.includes('page-003.png'))) break;
      const next = page.locator('[data-part2-runner-controls] [aria-label="Next"]');
      if (!(await next.isEnabled().catch(() => false))) break;
      await next.click();
      await page.waitForTimeout(90);
    }
    const sources = [...seenNotebookSources];
    if (!sources.some(src => src.includes('page-002.png')) || !sources.some(src => src.includes('page-003.png'))) {
      throw new Error(`7.3 control did not render both real notebook page images. Seen: ${sources.join(', ') || 'none'}`);
    }
    return sources;
  };

  try {
    await page.goto(`${PREVIEW_URL}/${state.helperName}`, { waitUntil: 'domcontentloaded' });
    await waitForDashboardGroup();

    // First pass is deliberately sequential with no browser reload between lessons.
    // This reproduces the exact state-leak path that failed in Codex QA.
    for (const lesson of lessons) {
      await openNewLessonEditor();
      await importLesson(lesson);
      await runMissionToBriefing();
      const preBriefingPart4Words = await verifyPart4ResetAndPractice(lesson);
      await verifyAllParts(lesson);
      results.push({ lesson: lesson.id, sequentialRuntime: 'PASS', preBriefingPart4Words });
      await exitDojo();
    }

    // Full browser reload, then reopen every saved lesson from Firestore-backed group state.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForDashboardGroup();
    for (const lesson of lessons) {
      await deploySavedLesson(lesson);
      const reopened = await verifyReloadedLesson(lesson);
      const result = results.find(item => item.lesson === lesson.id);
      Object.assign(result, { saveReloadReopen: 'PASS', ...reopened });
      await exitDojo();
    }

    const notebookSources = await verifySevenThreeControl();
    results.push({ lesson: '7.3-control', status: 'PASS', notebookSources });

    const fatalBrowserErrors = browserErrors.filter(error => error.startsWith('pageerror:'));
    if (fatalBrowserErrors.length) throw new Error(`Browser page errors: ${fatalBrowserErrors.join(' | ')}`);

    const report = {
      status: 'PASS',
      previewUrl: PREVIEW_URL,
      headSha: process.env.GITHUB_SHA || null,
      qaUid: state.uid,
      lessons: results,
      browserErrors
    };
    writeReport(report);
    console.log(`PR40 deployed-preview browser QA PASS: ${JSON.stringify(results)}`);
  } catch (error) {
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true }).catch(() => {});
    writeReport({
      status: 'FAIL',
      previewUrl: PREVIEW_URL,
      headSha: process.env.GITHUB_SHA || null,
      qaUid: state.uid,
      lessons: results,
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
  console.log(`Preview QA cleanup ${clientCleanup} for ${state.uid}.`);
  if (!clientCleanup.startsWith('PASS')) throw new Error(clientCleanup);
}

const command = process.argv[2];
if (command === 'prepare') await prepare();
else if (command === 'test') await testPreview();
else if (command === 'cleanup') await cleanup();
else throw new Error('Usage: node scripts/pr40-preview-e2e.mjs <prepare|test|cleanup>');
