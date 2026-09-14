import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { initializeApp, cert, getApps, deleteApp } = require('../functions/node_modules/firebase-admin/app');
const { getAuth } = require('../functions/node_modules/firebase-admin/auth');
const { getFirestore } = require('../functions/node_modules/firebase-admin/firestore');

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
  const app = existing || initializeApp({
    credential: cert(serviceAccount()),
    projectId: 'wrs-firebase'
  });
  return { app, auth: getAuth(app), db: getFirestore(app) };
};

const writeReport = (report) => fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
const readState = () => JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

async function deleteTeacherQuery(db, collectionName, uid) {
  const snapshot = await db.collection(collectionName).where('teacherId', '==', uid).get();
  if (snapshot.empty) return 0;
  const batch = db.batch();
  snapshot.docs.forEach(docSnapshot => batch.delete(docSnapshot.ref));
  await batch.commit();
  return snapshot.size;
}

async function cleanup() {
  if (!fs.existsSync(STATE_PATH)) return;
  const state = readState();
  const { app, auth, db } = adminContext();
  const counts = {};
  for (const collectionName of ['missions', 'group_notes', 'presenter_sessions']) {
    counts[collectionName] = await deleteTeacherQuery(db, collectionName, state.uid);
  }
  await Promise.allSettled([
    db.collection('active_sessions').doc(state.uid).delete(),
    db.collection('sync_checks').doc(state.uid).delete(),
    db.collection('students').doc(state.studentId).delete(),
    db.collection('squads').doc(state.squadId).delete()
  ]);
  try { await auth.deleteUser(state.uid); } catch (error) {
    if (!String(error?.code || error).includes('user-not-found')) throw error;
  }
  fs.rmSync(path.join(ROOT, 'standalone-dist', '__qa_auth.html'), { force: true });
  fs.rmSync(STATE_PATH, { force: true });
  if (!getApps().length || getApps()[0] !== app) return;
  await deleteApp(app);
  console.log(`QA cleanup complete for ${state.uid}: ${JSON.stringify(counts)}`);
}

async function prepare() {
  const { app, auth, db } = adminContext();
  const runId = String(process.env.GITHUB_RUN_ID || Date.now());
  const uid = `pr40-preview-qa-${runId}`;
  const studentId = `${uid}-student-1`;
  const squadId = `${uid}-group`;
  const teacherId = uid;

  try { await auth.getUser(uid); } catch {
    await auth.createUser({ uid, displayName: 'PR40 Preview QA' });
  }

  await db.collection('students').doc(studentId).set({
    id: studentId,
    name: 'QA Student 1',
    teacherId,
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
    teacherId,
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

  const token = await auth.createCustomToken(uid, { previewQa: true });
  const escapedToken = JSON.stringify(token);
  const helper = `<!doctype html>
<html><head><meta charset="utf-8"><title>PR40 preview QA auth</title></head>
<body><p id="status">Signing in preview QA…</p>
<script src="/__/firebase/8.10.1/firebase-app.js"></script>
<script src="/__/firebase/8.10.1/firebase-auth.js"></script>
<script src="/__/firebase/init.js"></script>
<script>
(async () => {
  try {
    await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    await firebase.auth().signInWithCustomToken(${escapedToken});
    document.getElementById('status').textContent = 'AUTH_OK';
    location.replace('/');
  } catch (error) {
    document.getElementById('status').textContent = 'AUTH_FAIL: ' + (error && error.message ? error.message : String(error));
  }
})();
</script></body></html>`;

  fs.writeFileSync(path.join(ROOT, 'standalone-dist', '__qa_auth.html'), helper);
  fs.writeFileSync(STATE_PATH, `${JSON.stringify({ uid, studentId, squadId }, null, 2)}\n`);
  if (!getApps().length || getApps()[0] !== app) return;
  await deleteApp(app);
  console.log(`Prepared isolated preview QA identity ${uid}.`);
}

const partData = (lesson, number) => lesson.parts.find(part => part.part === number)?.data || {};
const strings = value => Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
const cardTexts = value => Array.isArray(value)
  ? value.flatMap(item => typeof item === 'string' ? [item] : item && typeof item.text === 'string' ? [item.text] : [])
  : [];

async function testPreview() {
  const state = readState();
  const { app, db } = adminContext();
  const { chromium } = await import('playwright-core');
  const lessons = LESSON_PATHS.map(file => JSON.parse(fs.readFileSync(file, 'utf8')));
  const control = JSON.parse(fs.readFileSync(CONTROL_PATH, 'utf8'));
  const results = [];
  const errors = [];

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(15000);
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));

  const textVisible = async text => page.getByText(text, { exact: false }).first().isVisible().catch(() => false);
  const assertVisibleText = async (text, label = text) => {
    if (!(await textVisible(text))) throw new Error(`Expected visible text for ${label}: ${text}`);
  };
  const assertAbsentText = async text => {
    if (await textVisible(text)) throw new Error(`Unexpected visible text: ${text}`);
  };
  const sidebarPart = title => page.getByRole('button', { name: title, exact: true });
  const navigatePart = async title => {
    await sidebarPart(title).click();
    await page.waitForTimeout(250);
  };

  const waitForDashboardGroup = async () => {
    await page.getByText('PR40 QA Group', { exact: true }).first().waitFor({ state: 'visible', timeout: 20000 });
  };

  const openNewLessonEditor = async () => {
    await waitForDashboardGroup();
    await page.getByText('PR40 QA Group', { exact: true }).first().click();
    const forge = page.getByRole('button', { name: /Forge New Scroll/i });
    await forge.waitFor({ state: 'visible' });
    await forge.click();
    await page.getByRole('button', { name: 'Import', exact: true }).waitFor({ state: 'visible' });
  };

  const importLesson = async lesson => {
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    const input = page.getByPlaceholder('Paste here...');
    await input.fill(JSON.stringify(lesson));
    await page.getByRole('button', { name: 'Process Import', exact: true }).click();
    await page.getByRole('button', { name: 'Run Mission', exact: true }).waitFor({ state: 'visible' });
    await assertVisibleText(lesson.title, 'imported lesson title');
  };

  const runMissionToBriefing = async () => {
    await page.getByRole('button', { name: 'Run Mission', exact: true }).click();
    await page.getByRole('button', { name: 'Begin Mission', exact: true }).waitFor({ state: 'visible' });
    await assertVisibleText('Briefing');
  };

  const verifyPreBriefingPart4Reset = async lesson => {
    const expected = new Set(strings(partData(lesson, 4).practiceWords));
    if (!expected.size) throw new Error(`${lesson.id}: Part 4 has no practiceWords to verify.`);
    await navigatePart('Wordlist Reading');
    const onePlayer = page.getByRole('button', { name: '1', exact: true });
    if (await onePlayer.isVisible().catch(() => false)) await onePlayer.click();
    await assertVisibleText('Targeted Word Practice', 'Part 4 practice mode');
    const labels = await page.locator('[aria-label^="Student 1:"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label') || ''));
    if (!labels.length) throw new Error(`${lesson.id}: Part 4 did not render a practice deck before briefing.`);
    const visibleWords = labels.map(label => label.split(': ').slice(1).join(': ').split(', ')[0]).filter(Boolean);
    const wrong = visibleWords.filter(word => !expected.has(word));
    if (wrong.length) throw new Error(`${lesson.id}: Part 4 leaked words outside this lesson: ${wrong.join(', ')}`);
    return visibleWords;
  };

  const beginMission = async () => {
    await navigatePart('Briefing');
    await page.getByRole('button', { name: 'Begin Mission', exact: true }).click();
    await page.getByText('Quick Drill', { exact: false }).first().waitFor({ state: 'visible' });
    await page.waitForTimeout(1200);
  };

  const verifyAllParts = async lesson => {
    const p2 = partData(lesson, 2);
    const p3 = partData(lesson, 3);
    const p4 = partData(lesson, 4);
    const p5 = partData(lesson, 5);
    const p7 = partData(lesson, 7);
    const p8 = partData(lesson, 8);
    const p9 = partData(lesson, 9);

    for (const title of ['Quick Drill (Sounds)', 'Teach Concepts (Reading)', 'Word Cards', 'Wordlist Reading', 'Sentence Reading', 'Quick Drill (Rev)', 'Teach Concepts (Spelling)', 'Written Work (Dictation)', 'Passage Reading', 'Listening Comp']) {
      if (!(await sidebarPart(title).isVisible().catch(() => false))) throw new Error(`${lesson.id}: missing sidebar part ${title}`);
    }

    await navigatePart('Teach Concepts (Reading)');
    await page.locator('[data-part2-runner-controls]').waitFor({ state: 'visible' });
    await assertAbsentText('Instructional display unavailable');
    await assertAbsentText('Quick Practice');
    const p2Expected = p2.part2Presentation?.interactiveSteps?.[0]?.objects?.[0]?.text;
    if (p2Expected) await assertVisibleText(p2Expected, 'Part 2 source object');

    await navigatePart('Word Cards');
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await page.waitForTimeout(200);
    const p3Words = new Set([...cardTexts(p3.wordCards), ...strings(p3.hfwList)]);
    if (!p3Words.size) throw new Error(`${lesson.id}: no Part 3 words to verify.`);
    const bodyText = await page.locator('body').innerText();
    if (![...p3Words].some(word => bodyText.includes(word))) throw new Error(`${lesson.id}: Part 3 displayed no intended Word Card/HFW content.`);

    await navigatePart('Wordlist Reading');
    const p4Expected = new Set(strings(p4.practiceWords));
    const p4Labels = await page.locator('[aria-label^="QA Student 1:"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label') || ''));
    if (!p4Labels.length) throw new Error(`${lesson.id}: Part 4 did not render the active roster practice deck.`);
    const p4Words = p4Labels.map(label => label.split(': ').slice(1).join(': ').split(', ')[0]).filter(Boolean);
    const p4Wrong = p4Words.filter(word => !p4Expected.has(word));
    if (p4Wrong.length) throw new Error(`${lesson.id}: Part 4 rendered words from another lesson: ${p4Wrong.join(', ')}`);
    await page.locator('[aria-label^="QA Student 1:"]').first().click();

    await navigatePart('Sentence Reading');
    const firstSentence = strings(p5.sentences)[0];
    const firstWeave = strings(p5.weaveQuestions)[0];
    if (firstSentence) await assertVisibleText(firstSentence, 'Part 5 sentence');
    if (firstWeave) await assertVisibleText(firstWeave, 'Part 5 weave question');

    await navigatePart('Quick Drill (Rev)');
    await assertVisibleText('Auditory Quick Drill', 'Part 6 auditory drill');

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
      await page.getByRole('button', { name: category, exact: true }).click();
      await assertVisibleText(`Dictate next • ${category}`);
      await assertVisibleText(expectedItems[0], `Part 8 ${category} first item`);
    }

    await navigatePart('Passage Reading');
    if (p9.passageTitle) await assertVisibleText(p9.passageTitle, 'Part 9 title');
    const passageText = typeof p9.passage === 'string' ? p9.passage : '';
    const firstPassageWords = passageText.split(/\s+/).slice(0, 6).join(' ');
    if (firstPassageWords) await assertVisibleText(firstPassageWords, 'Part 9 passage');
    const questions = Array.isArray(p9.comprehensionQuestions) ? p9.comprehensionQuestions : [];
    if (questions.length !== 10) throw new Error(`${lesson.id}: expected 10 Part 9 questions, found ${questions.length}.`);
    await page.getByRole('button', { name: 'Questions (10)', exact: true }).click();
    const questionText = item => typeof item === 'string' ? item : item?.question;
    if (questionText(questions[0])) await assertVisibleText(questionText(questions[0]), 'Part 9 first question');
    if (questionText(questions[9])) await assertVisibleText(questionText(questions[9]), 'Part 9 tenth question');

    await navigatePart('Listening Comp');
    await assertAbsentText('Instructional display unavailable');

    await navigatePart('Passage Reading');
    await page.waitForTimeout(1400);
  };

  const verifyReload = async lesson => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText(lesson.title, { exact: false }).first().waitFor({ state: 'visible', timeout: 20000 });
    const p9 = partData(lesson, 9);
    if (p9.passageTitle) await assertVisibleText(p9.passageTitle, 'reopened Part 9 title');
    await assertAbsentText('Instructional display unavailable');
  };

  const returnToDashboard = async () => {
    await db.collection('active_sessions').doc(state.uid).delete();
    await page.waitForTimeout(400);
    const exitButton = page.getByRole('button', { name: 'Exit Dojo', exact: true });
    if (await exitButton.isVisible().catch(() => false)) await exitButton.click();
    await waitForDashboardGroup();
  };

  const verifySevenThreeControl = async () => {
    await openNewLessonEditor();
    await importLesson(control);
    await runMissionToBriefing();
    await beginMission();
    await navigatePart('Teach Concepts (Reading)');
    await page.locator('[data-part2-runner-controls]').waitFor({ state: 'visible' });
    await assertAbsentText('Instructional display unavailable');
    await assertAbsentText('Quick Practice');
    const nextButtons = page.locator('[data-part2-runner-controls] [aria-label="Next"]');
    if (await nextButtons.count() !== 1) throw new Error(`7.3 control expected one runner-owned Next button, found ${await nextButtons.count()}.`);
    const notebookImage = page.locator('[data-part2-notebook-page-image] img');
    let sawNotebookImage = false;
    for (let step = 0; step < 20; step += 1) {
      if (await notebookImage.isVisible().catch(() => false)) {
        sawNotebookImage = true;
        const src = await notebookImage.getAttribute('src');
        if (!src || !src.includes('/notebook-assets/wrs-notebook-7-12-answer-key-page-')) throw new Error(`7.3 control notebook used unexpected image source: ${src}`);
        break;
      }
      const next = page.locator('[data-part2-runner-controls] [aria-label="Next"]');
      if (!(await next.isEnabled().catch(() => false))) break;
      await next.click();
      await page.waitForTimeout(80);
    }
    if (!sawNotebookImage) throw new Error('7.3 control did not reach a real notebook page image in the Part 2 runner.');
    await returnToDashboard();
  };

  try {
    await page.goto(`${PREVIEW_URL}/__qa_auth.html`, { waitUntil: 'domcontentloaded' });
    await waitForDashboardGroup();

    let previousPreBriefingWords = [];
    for (const lesson of lessons) {
      await openNewLessonEditor();
      await importLesson(lesson);
      await runMissionToBriefing();
      const preBriefingWords = await verifyPreBriefingPart4Reset(lesson);
      if (previousPreBriefingWords.length && preBriefingWords.every(word => previousPreBriefingWords.includes(word))) {
        throw new Error(`${lesson.id}: Part 4 pre-briefing deck is indistinguishable from the prior lesson; possible runtime state leakage.`);
      }
      previousPreBriefingWords = preBriefingWords;
      await beginMission();
      await verifyAllParts(lesson);
      await verifyReload(lesson);
      results.push({ lesson: lesson.id, status: 'PASS', preBriefingPart4Words: preBriefingWords });
      await returnToDashboard();
    }

    await verifySevenThreeControl();
    results.push({ lesson: '7.3-control', status: 'PASS' });

    const report = {
      status: 'PASS',
      previewUrl: PREVIEW_URL,
      headSha: process.env.GITHUB_SHA || null,
      lessons: results,
      browserErrors: errors
    };
    writeReport(report);
    if (errors.some(error => /uncaught|pageerror/i.test(error))) throw new Error(`Browser emitted runtime errors: ${errors.join(' | ')}`);
    console.log(`PR40 preview E2E PASS: ${JSON.stringify(results)}`);
  } catch (error) {
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true }).catch(() => {});
    writeReport({
      status: 'FAIL',
      previewUrl: PREVIEW_URL,
      headSha: process.env.GITHUB_SHA || null,
      lessons: results,
      browserErrors: errors,
      error: error instanceof Error ? error.stack || error.message : String(error)
    });
    throw error;
  } finally {
    await browser.close();
    if (!getApps().length || getApps()[0] !== app) return;
    await deleteApp(app);
  }
}

const command = process.argv[2];
if (command === 'prepare') await prepare();
else if (command === 'test') await testPreview();
else if (command === 'cleanup') await cleanup();
else throw new Error('Usage: node scripts/pr40-preview-e2e.mjs <prepare|test|cleanup>');
