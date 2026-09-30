import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as groupSpotsModule from '../legacy/groupSpots';
import * as spotStoreModule from '../legacy/spotStore';
import {
  GROUP_SPOT_BYTE_LIMIT,
  GroupSpot,
  buildSpot,
  conflictPrompt,
  discardCancelled,
  discardConfirmed,
  discardPrompt,
  discardRequested,
  groupSpotId,
  isStale,
  launchDecision,
  mergeSpotMaps,
  migrateLegacySpots,
  newerSpot,
  noDiscardPending,
  normalizeSpot,
  readLocalSpots,
  resolveSpotLesson,
  resumeSession,
  spotBytes,
  spotDateStarted,
  spotListKey,
  spotRows
} from '../legacy/groupSpots';
import { SpotRemote, clearSpotEverywhere, saveSpotEverywhere } from '../legacy/spotStore';
import UnfinishedLessons from '../legacy/components/UnfinishedLessons';
import { createInitialLessonSession, lessonSessionToCloud } from '../legacy/useLessonSession';
import type { LessonSessionState } from '../legacy/useLessonSession';
import { applyLibrarySnapshot, libraryLessonId, normalizeLibraryRecord, readLessonFile } from '../legacy/lessonLibrary';
import { buildMissionRecord } from '../legacy/missionArchive';
import { LessonPart } from '../legacy/types';
import type { GroupProfile, StudentProfile } from '../legacy/types';

const fixtureText = readFileSync(new URL('../fixtures/canonical/5A-7.4-accuracy-regression.json', import.meta.url), 'utf8');
const reading = readLessonFile('WRS_2026-09-14_5A_Substep7-4.json', fixtureText);
assert.ok(reading.ok && reading.lesson, 'the canonical fixture must load');
const lessonA = { ...reading.lesson!, id: 'lesson-a', title: 'Group 5A · Step 7.4' };
const lessonB = { ...reading.lesson!, id: 'lesson-b', title: 'Group 2 · Step 3.2' };
const lessonA2 = { ...reading.lesson!, id: 'lesson-a-next', title: 'Group 5A · Step 7.5' };

const teacherId = 'teacher-abc';
const group5A = { id: 'group-5a', name: 'Group 5A' };
const group2 = { id: 'group-2', name: 'Group 2' };

const memoryStorage = () => {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => { items.set(key, value); }
  };
};

/** Records every cloud call, and behaves like a tiny Firestore keyed by collection + id. */
const recordingRemote = () => {
  const calls: Array<{ op: 'set' | 'remove'; collection: string; id: string }> = [];
  const docs = new Map<string, Record<string, unknown>>();
  const remote: SpotRemote = {
    async set(collection, id, data) {
      calls.push({ op: 'set', collection, id });
      // What Firestore stores: plain JSON, nothing shared with the caller.
      docs.set(`${collection}/${id}`, JSON.parse(JSON.stringify({ ...data, teacherId })));
    },
    async remove(collection, id) {
      calls.push({ op: 'remove', collection, id });
      docs.delete(`${collection}/${id}`);
    }
  };
  return { remote, calls, docs };
};

const cloudSpots = (docs: Map<string, Record<string, unknown>>) => {
  const map: Record<string, GroupSpot> = {};
  for (const [key, value] of docs) {
    const spot = normalizeSpot(key.split('/')[1], value);
    if (spot) map[spot.groupId] = spot;
  }
  return map;
};

const richSession = (overrides: Partial<LessonSessionState> = {}): LessonSessionState => ({
  ...createInitialLessonSession(),
  syncRevision: 12,
  sessionId: 'mission-a',
  sessionDate: '2026-09-28',
  studentIds: ['student-1', 'student-2', 'student-3'],
  scores: [
    { studentId: 'student-1', instanceId: 'w-1', wordText: 'cold', status: 'correct' },
    { studentId: 'student-2', instanceId: 'w-2', wordText: 'hold', status: 'error' }
  ],
  notes: 'Watch vowel marking',
  distribution: [
    [{ id: 'c1', instanceId: 'w-1', text: 'cold', type: 'regular' }],
    [{ id: 'c2', instanceId: 'w-2', text: 'hold', type: 'regular' }],
    [{ id: 'c3', instanceId: 'w-3', text: 'bold', type: 'regular' }]
  ],
  wordlistPage: 2,
  quickDrillIndex: 4, quickDrillRevealed: 7, quickDrillItems: ['o', 'i'],
  wordCards: {
    deck: [{ id: 'card-1', text: 'cold', type: 'regular' }, { id: 'card-2', text: 'told', type: 'regular' }],
    currentIndex: 1, filter: 'regular', mode: 'standard', scores: [2, 1], currentPlayerIndex: 1, turnScore: 3, isBust: false
  },
  sentenceIndex: 3,
  dictationCompletedIds: ['dict-1', 'dict-2'],
  passageIndex: 5,
  spellingRevealedItems: { cold: true },
  drawings: { sentence: [{ id: 's1', color: '#4338ca', width: 4, points: [{ x: 0.2, y: 0.3 }, { x: 0.4, y: 0.5 }] }] },
  ...overrides
});

const spotFor = (
  group: { id: string; name: string },
  lesson: typeof lessonA,
  part: number,
  session: LessonSessionState,
  dates: { dateStarted: string; today: string } = { dateStarted: '2026-09-28', today: '2026-09-28' }
) => buildSpot({
  teacherId, group, lesson, lessonSource: 'library', currentPart: part, session,
  dateStarted: dates.dateStarted, today: dates.today, now: `${dates.today}T14:00:00.000Z`
});

const afterFirestore = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

// ---------------------------------------------------------------------------
// Each group keeps its own spot
// ---------------------------------------------------------------------------

test("pausing group A and then starting group B keeps A's spot", async () => {
  const storage = memoryStorage();
  const { remote, docs } = recordingRemote();

  const spotA = spotFor(group5A, lessonA, LessonPart.Part5, richSession());
  await saveSpotEverywhere(spotA, remote, storage);

  // Group B's lesson is launched and worked on; A's spot is untouched.
  assert.equal(launchDecision(lessonB.id, undefined), 'start');
  const spotB = spotFor(group2, lessonB, LessonPart.Part2, richSession({ sessionId: 'mission-b', studentIds: ['student-9'], scores: [] }));
  await saveSpotEverywhere(spotB, remote, storage);

  const onDevice = readLocalSpots(teacherId, storage);
  assert.deepEqual(Object.keys(onDevice).sort(), ['group-2', 'group-5a']);
  assert.deepEqual(onDevice['group-5a'], spotA);
  assert.equal(onDevice['group-5a'].currentPart, LessonPart.Part5);

  const inCloud = cloudSpots(docs);
  assert.deepEqual(Object.keys(inCloud).sort(), ['group-2', 'group-5a']);
  assert.equal(inCloud['group-5a'].session.sessionId, 'mission-a');
  assert.equal(inCloud['group-5a'].currentPart, LessonPart.Part5);

  const merged = mergeSpotMaps(onDevice, inCloud);
  assert.deepEqual(Object.keys(merged).sort(), ['group-2', 'group-5a']);
  assert.equal(merged['group-5a'].session.scores?.length, 2);
});

test('saving group B many times never changes group A, and each group has its own document', async () => {
  const storage = memoryStorage();
  const { remote, calls } = recordingRemote();
  const spotA = spotFor(group5A, lessonA, LessonPart.Part5, richSession());
  await saveSpotEverywhere(spotA, remote, storage);
  for (let part = 1; part <= 9; part += 1) {
    await saveSpotEverywhere(spotFor(group2, lessonB, part, richSession({ sessionId: 'mission-b', syncRevision: part })), remote, storage);
  }
  assert.deepEqual(readLocalSpots(teacherId, storage)['group-5a'], spotA);
  const ids = new Set(calls.map(call => call.id));
  assert.deepEqual([...ids].sort(), [groupSpotId(teacherId, 'group-2'), groupSpotId(teacherId, 'group-5a')].sort());
  assert.notEqual(groupSpotId(teacherId, 'group-2'), groupSpotId(teacherId, 'group-5a'));
});

test('resuming A restores the same part, session id and in-part progress, and never re-deals Part 4', () => {
  const original = richSession();
  const spot = afterFirestore(spotFor(group5A, lessonA, LessonPart.Part4, original));
  const restored = resumeSession(spot, lessonA, '2026-09-28');

  assert.equal(spot.currentPart, LessonPart.Part4);
  assert.equal(restored.sessionId, 'mission-a');
  assert.deepEqual(restored.studentIds, original.studentIds);
  assert.deepEqual(restored.scores, original.scores);
  assert.equal(restored.notes, original.notes);
  assert.deepEqual(restored.distribution, original.distribution);
  assert.deepEqual(restored.wordCards, original.wordCards);
  assert.equal(restored.wordlistPage, 2);
  assert.equal(restored.quickDrillIndex, 4);
  assert.deepEqual(restored.dictationCompletedIds, ['dict-1', 'dict-2']);
  assert.equal(restored.passageIndex, 5);
  assert.deepEqual(restored.spellingRevealedItems, { cold: true });
  assert.deepEqual(restored.drawings, original.drawings);
  // A resume is newer than everything it replaces, so the cloud can't pull the screen back.
  assert.ok(restored.syncRevision > original.syncRevision);
  assert.ok(resumeSession(spot, lessonA, '2026-09-28', 40).syncRevision > 40);
});

test('the saved lesson session is the same shape the running lesson already stores in active_sessions', () => {
  const session = richSession();
  const spot = spotFor(group5A, lessonA, LessonPart.Part5, session);
  const { lesson: _lesson, ...expected } = lessonSessionToCloud(session, lessonA, LessonPart.Part5, group5A.id);
  assert.deepEqual(spot.session, expected);
  assert.equal('lesson' in spot.session, false);
  assert.equal(spot.embeddedLesson, undefined);
});

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

test('resuming on a later day keeps dateStarted while notes carry the new day', () => {
  const day1 = spotFor(group5A, lessonA, LessonPart.Part5, richSession(), { dateStarted: '2026-09-28', today: '2026-09-28' });
  const stored = afterFirestore(day1);

  const restored = resumeSession(stored, lessonA, '2026-09-30');
  assert.equal(restored.sessionDate, '2026-09-30');
  assert.equal(restored.sessionId, 'mission-a');

  // The quick-note payload App builds copies the session's date, which the Sheets mirror reads.
  const noteWrittenToday = { content: 'Needed a reminder about closed syllables', sessionId: restored.sessionId, sessionDate: restored.sessionDate };
  assert.equal(noteWrittenToday.sessionDate, '2026-09-30');
  assert.notEqual(noteWrittenToday.sessionDate, stored.dateStarted);

  // Saving again on day 2 keeps the start day and moves "last worked".
  const dateStarted = spotDateStarted(stored, lessonA.id, restored.sessionId, restored.sessionDate, '2026-09-30');
  assert.equal(dateStarted, '2026-09-28');
  const day2 = spotFor(group5A, lessonA, LessonPart.Part6, restored, { dateStarted, today: '2026-09-30' });
  assert.equal(day2.dateStarted, '2026-09-28');
  assert.equal(day2.lastWorkedOn, '2026-09-30');

  // A different lesson (or a new session) for the same group starts its own clock.
  assert.equal(spotDateStarted(stored, lessonA2.id, 'mission-new', '2026-10-02', '2026-10-02'), '2026-10-02');
  assert.equal(spotDateStarted(null, lessonA.id, 'mission-a', '2026-09-28', '2026-09-28'), '2026-09-28');
});

// ---------------------------------------------------------------------------
// Completing a lesson clears only that group's spot
// ---------------------------------------------------------------------------

const student = (id: string, name: string): StudentProfile => ({
  id, name, masteredSounds: [], masteredHFW: [], attendanceCount: 0, notes: '', history: []
});
const profile = (id: string, name: string, studentIds: string[]): GroupProfile => ({
  id, name, studentIds, inventory: { learnedSounds: [], learnedHFW: [] }, savedLessons: [], history: []
});

test('completing A clears only A, and the mission has date = finish day plus dateStarted and dateFinished', async () => {
  const storage = memoryStorage();
  const { remote, docs, calls } = recordingRemote();
  await saveSpotEverywhere(spotFor(group5A, lessonA, LessonPart.Part10, richSession()), remote, storage);
  await saveSpotEverywhere(spotFor(group2, lessonB, LessonPart.Part3, richSession({ sessionId: 'mission-b' })), remote, storage);

  await clearSpotEverywhere(teacherId, group5A.id, remote, storage);

  assert.deepEqual(Object.keys(readLocalSpots(teacherId, storage)), ['group-2']);
  assert.deepEqual(Object.keys(cloudSpots(docs)), ['group-2']);
  assert.deepEqual(calls.filter(call => call.op === 'remove'), [
    { op: 'remove', collection: 'lessons', id: groupSpotId(teacherId, 'group-5a') }
  ]);

  const mission = buildMissionRecord({
    id: 'mission-a',
    teacherId,
    date: '2026-09-30',
    dateStarted: '2026-09-28',
    dateFinished: '2026-09-30',
    lesson: lessonA,
    group: profile('group-5a', 'Group 5A', ['student-1', 'student-2', 'student-3']),
    students: [student('student-1', 'Alex'), student('student-2', 'Ben'), student('student-3', 'Cy')],
    studentIds: ['student-1', 'student-3'],
    scores: richSession().scores,
    notes: 'ok'
  });
  assert.equal(mission.id, 'mission-a');
  assert.equal(mission.date, '2026-09-30');
  assert.equal(mission.dateStarted, '2026-09-28');
  assert.equal(mission.dateFinished, '2026-09-30');
  // Attendance still records who was and was not present.
  assert.deepEqual(mission.attendance?.map(entry => [entry.studentId, entry.status]), [
    ['student-1', 'present'], ['student-2', 'absent'], ['student-3', 'present']
  ]);

  // Without the new fields the record is exactly what it was before.
  const plain = buildMissionRecord({
    id: 'm', teacherId, date: '2026-09-30', lesson: lessonA, group: profile('group-5a', 'Group 5A', []),
    students: [], studentIds: [], scores: []
  });
  assert.equal('dateStarted' in plain, false);
  assert.equal('dateFinished' in plain, false);
});

// ---------------------------------------------------------------------------
// Asking before replacing, and discarding
// ---------------------------------------------------------------------------

test('launching a different lesson for a group with a saved spot asks first', () => {
  const spot = spotFor(group5A, lessonA, LessonPart.Part5, richSession(), { dateStarted: '2026-09-28', today: '2026-09-29' });
  assert.equal(launchDecision(lessonA.id, spot), 'resume');
  assert.equal(launchDecision(lessonA2.id, spot), 'ask');
  assert.equal(launchDecision(lessonA2.id, null), 'start');

  const prompt = conflictPrompt(spot);
  assert.ok(prompt.startsWith('Group 5A has an unfinished lesson: Group 5A · Step 7.4, Part 5, started '));
  assert.ok(prompt.endsWith('Resume it, or start the new lesson?'));
});

test('App asks through the same rule at launch and when the Briefing picks a group that has a spot', () => {
  const app = readFileSync(new URL('../legacy/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /launchDecision\(lesson\.id, spot\)/);
  assert.match(app, /decision === 'ask' && spot/);
  assert.match(app, /startNewOverGroupSpot/);
  // An answer of "start the new lesson" at launch is remembered, so the Briefing does not ask again.
  assert.match(app, /replaceSpotApprovedRef\.current = \{ groupId: spot\.groupId/);
  assert.match(app, /alreadyApproved/);
  // Launching never throws away a saved spot.
  const launch = app.slice(app.indexOf('const launchLesson'), app.indexOf('const discardGroupSpot'));
  assert.doesNotMatch(launch, /clearSpot|discard|clearRecoverableSession/);
});

test('Discard asks for confirmation before anything is cleared', () => {
  const spot = spotFor(group5A, lessonA, LessonPart.Part5, richSession());
  const cleared: string[] = [];
  const clear = (target: GroupSpot) => { cleared.push(target.groupId); };

  assert.equal(discardPrompt('Group 5A'), "Discard Group 5A's unfinished lesson? This can't be undone.");

  // Tapping Discard only opens the question.
  let state = discardRequested(spot);
  assert.equal(state.pending, spot);
  assert.deepEqual(cleared, []);

  // Cancelling clears nothing, and a confirm with nothing pending clears nothing.
  state = discardCancelled();
  assert.deepEqual(state, noDiscardPending);
  discardConfirmed(state, clear);
  assert.deepEqual(cleared, []);

  // Only the confirm clears, and only that group's spot.
  state = discardConfirmed(discardRequested(spot), clear);
  assert.deepEqual(cleared, ['group-5a']);
  assert.deepEqual(state, noDiscardPending);
});

test('the unfinished list shows one row per group and only opens a question for Discard', () => {
  const spots = {
    'group-2': spotFor(group2, lessonB, LessonPart.Part3, richSession({ sessionId: 'mission-b' }), { dateStarted: '2026-09-29', today: '2026-09-29' }),
    'group-5a': spotFor(group5A, lessonA, LessonPart.Part5, richSession(), { dateStarted: '2026-09-28', today: '2026-09-29' })
  };
  const html = renderToStaticMarkup(React.createElement(UnfinishedLessons, {
    spots, onResume: () => { throw new Error('rendering must not resume'); }, onDiscard: () => { throw new Error('rendering must not discard'); },
    today: '2026-09-30'
  }));
  assert.match(html, /Unfinished lessons/);
  assert.match(html, /Group 5A/);
  assert.match(html, /Group 2/);
  assert.match(html, /Group 5A · Step 7\.4/);
  assert.match(html, /Part 5/);
  assert.match(html, /Part 3/);
  assert.match(html, /Started/);
  assert.match(html, /Last worked/);
  assert.equal((html.match(/>Resume</g) || []).length + (html.match(/Resume<\/button>/g) || []).length > 0, true);
  assert.equal((html.match(/Discard<\/button>/g) || []).length, 2);
  // The confirmation is not showing until Discard is tapped.
  assert.doesNotMatch(html, /This can(&#x27;|')t be undone/);
});

// ---------------------------------------------------------------------------
// Nothing is removed automatically
// ---------------------------------------------------------------------------

test('a spot older than 7 days is flagged amber but never removed', () => {
  const old = spotFor(group5A, lessonA, LessonPart.Part5, richSession(), { dateStarted: '2026-08-01', today: '2026-08-05' });
  assert.equal(isStale(old, '2026-08-12'), false);
  assert.equal(isStale(old, '2026-08-13'), true);
  assert.equal(isStale(old, '2027-01-01'), true);

  const rows = spotRows({ 'group-5a': old }, '2026-10-30');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].stale, true);

  const html = renderToStaticMarkup(React.createElement(UnfinishedLessons, {
    spots: { 'group-5a': old }, onResume: () => {}, onDiscard: () => {}, today: '2026-10-30'
  }));
  assert.match(html, /data-stale="true"/);
  assert.match(html, /amber/);

  // Loading, merging and reading back an old spot keeps it.
  const storage = memoryStorage();
  storage.setItem('wrs_dojo_group_spots_v1', JSON.stringify({ 'group-5a': old }));
  assert.ok(readLocalSpots(teacherId, storage)['group-5a']);
  assert.ok(mergeSpotMaps({ 'group-5a': old }, {})['group-5a']);
  assert.ok(mergeSpotMaps({}, { 'group-5a': old })['group-5a']);
});

test('no function in the spot modules removes a spot on a timer or by age', () => {
  const names = [...Object.keys(groupSpotsModule), ...Object.keys(spotStoreModule)];
  assert.deepEqual(names.filter(name => /prune|expire|purge|cleanup|sweep|autoclear|evict/i.test(name)), []);
  const app = readFileSync(new URL('../legacy/App.tsx', import.meta.url), 'utf8');
  // The only callers that clear a spot are the lesson's own completion and the confirmed Discard.
  assert.equal((app.match(/clearSpot\(/g) || []).length, 2);
});

test('newer copy wins per group: same run by revision, different runs by time', () => {
  const older = spotFor(group5A, lessonA, LessonPart.Part2, richSession({ syncRevision: 3 }));
  const newer = spotFor(group5A, lessonA, LessonPart.Part3, richSession({ syncRevision: 9 }));
  assert.equal(newerSpot(older, newer), newer);
  assert.equal(newerSpot(newer, older), newer);
  assert.equal(newerSpot(null, older), older);

  const otherRun = buildSpot({
    teacherId, group: group5A, lesson: lessonA2, lessonSource: 'library', currentPart: 1,
    session: richSession({ sessionId: 'mission-z', syncRevision: 1 }),
    dateStarted: '2026-10-02', today: '2026-10-02', now: '2026-10-02T09:00:00.000Z'
  });
  assert.equal(newerSpot(newer, otherRun), otherRun);
});

// ---------------------------------------------------------------------------
// Pausing writes only the spot, never missions or notes
// ---------------------------------------------------------------------------

test('saving, resuming and clearing a spot write only to the lesson library collection', async () => {
  const storage = memoryStorage();
  const { remote, calls } = recordingRemote();
  const spot = spotFor(group5A, lessonA, LessonPart.Part5, richSession());
  await saveSpotEverywhere(spot, remote, storage);
  await saveSpotEverywhere({ ...spot, currentPart: 6 }, remote, storage);
  resumeSession(afterFirestore(spot), lessonA, '2026-09-30');
  await clearSpotEverywhere(teacherId, group5A.id, remote, storage);

  assert.ok(calls.length >= 3);
  for (const call of calls) assert.equal(call.collection, 'lessons');
  assert.equal(calls.some(call => call.collection === 'missions' || call.collection === 'daily_notes' || call.collection === 'group_notes'), false);
});

test('starting a lesson writes nothing to missions/', () => {
  const app = readFileSync(new URL('../legacy/App.tsx', import.meta.url), 'utf8');
  const start = app.slice(app.indexOf('const handleBriefingStart'), app.indexOf('const handleUpdateLessonPerpetually'));
  assert.ok(start.length > 200, 'found handleBriefingStart');
  assert.doesNotMatch(start, /archiveMission/);
  assert.doesNotMatch(start, /buildMissionRecord/);
  assert.doesNotMatch(start, /missions|daily_notes|group_notes/);
  // The Briefing check-in still decides who is in the session.
  assert.match(start, /studentIds: data\.studentIds/);
  assert.match(start, /resetLessonSession\(\{ \.\.\.sessionIdentity, studentIds: data\.studentIds \}\)/);

  // The mission is written in one place only: when the lesson is completed, from the dossier.
  const uses = app.match(/archiveMission/g) || [];
  assert.equal(uses.length, 2, 'archiveMission is read from useMasterData and handed to SessionDossier, nothing else');
  assert.match(app, /onArchiveMission=\{archiveMission\}/);

  // Saving a spot goes through the store, whose only collection is the lesson library's.
  const store = readFileSync(new URL('../legacy/spotStore.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(store, /'missions'|'daily_notes'|'group_notes'/);
  const hook = readFileSync(new URL('../legacy/useGroupSpots.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(hook, /'missions'|'daily_notes'|'group_notes'/);
});

// ---------------------------------------------------------------------------
// Keeping spots out of the lesson library (and out of its re-renders)
// ---------------------------------------------------------------------------

const libraryDoc = (id: string, groupId = 'group-5a') => ({
  id,
  data: {
    teacherId, groupId, groupName: 'Group 5A', lessonDate: '2026-09-28', title: id, step: '7', substep: '4',
    savedAt: '2026-09-28T10:00:00.000Z', lesson: { id: 'x', title: id }
  }
});

test('a paused spot is never read as a library lesson', () => {
  const spot = spotFor(group5A, lessonA, LessonPart.Part5, richSession());
  assert.equal(normalizeLibraryRecord(spot.id, afterFirestore(spot)), null);
  // Even a spot that embeds its lesson stays out of the library.
  const embedded = buildSpot({
    teacherId, group: group5A, lesson: lessonA, lessonSource: 'embedded', currentPart: 3, session: richSession(),
    dateStarted: '2026-09-28', today: '2026-09-28', now: '2026-09-28T10:00:00.000Z'
  });
  assert.ok(embedded.embeddedLesson);
  assert.equal(normalizeLibraryRecord(embedded.id, afterFirestore(embedded)), null);
  assert.equal(normalizeSpot(embedded.id, afterFirestore(embedded))?.embeddedLesson?.id, lessonA.id);
});

test('a snapshot with only paused-spot changes leaves the library records unchanged', () => {
  const doc1 = libraryDoc('teacher__group-5a__lesson-1');
  const current = applyLibrarySnapshot([], () => [doc1], [doc1], true);
  assert.equal(current.length, 1);

  const spotDoc = { id: groupSpotId(teacherId, 'group-5a'), data: afterFirestore(spotFor(group5A, lessonA, LessonPart.Part5, richSession())) };
  let docsRead = 0;
  const readDocs = () => { docsRead += 1; return [doc1, spotDoc]; };

  // A spot saved every second: same array back, and the documents are not even read.
  for (let save = 0; save < 5; save += 1) {
    assert.equal(applyLibrarySnapshot(current, readDocs, [spotDoc], false), current);
  }
  assert.equal(docsRead, 0);
  // Also when a spot is removed.
  assert.equal(applyLibrarySnapshot(current, readDocs, [spotDoc, spotDoc], false), current);
  // A snapshot with no document changes (metadata only) changes nothing.
  assert.equal(applyLibrarySnapshot(current, readDocs, [], false), current);

  // A real lesson change still updates the library, and never includes a spot.
  const doc2 = libraryDoc('teacher__group-5a__lesson-2');
  const updated = applyLibrarySnapshot(current, () => [doc1, doc2, spotDoc], [doc2, spotDoc], false);
  assert.notEqual(updated, current);
  assert.deepEqual(updated.map(record => record.id), [doc1.id, doc2.id]);

  // The first snapshot always builds the list, even when only spots exist.
  const first = applyLibrarySnapshot([], () => [spotDoc], [spotDoc], true);
  assert.deepEqual(first, []);
  assert.notEqual(first, current);
});

test('the lesson library listener uses the snapshot helper and skips spots before normalizing', () => {
  const hook = readFileSync(new URL('../legacy/useLessonLibrary.ts', import.meta.url), 'utf8');
  assert.match(hook, /applyLibrarySnapshot\(/);
  assert.match(hook, /docChanges\(\)/);
  assert.doesNotMatch(hook, /normalizeLibraryRecord\(snapshotDoc/);
});

test('saving a spot each second does not change the dashboard list, but a new part does', () => {
  const base = spotFor(group5A, lessonA, LessonPart.Part5, richSession());
  const key = spotListKey({ 'group-5a': base });
  const resaved = { ...base, savedAt: '2026-09-28T14:00:09.000Z', syncRevision: 99, session: { ...base.session, notes: 'more notes', sentenceIndex: 8 } };
  assert.equal(spotListKey({ 'group-5a': resaved }), key);
  assert.notEqual(spotListKey({ 'group-5a': { ...base, currentPart: 6 } }), key);
  assert.notEqual(spotListKey({ 'group-5a': { ...base, lastWorkedOn: '2026-09-29' } }), key);
});

// ---------------------------------------------------------------------------
// Existing single unfinished lessons are carried over
// ---------------------------------------------------------------------------

test('an unfinished lesson saved the old way becomes that group\'s spot, without duplicates or resurrection', () => {
  const legacy = {
    ...lessonSessionToCloud(richSession(), lessonA, LessonPart.Part6, 'group-5a'),
    savedAt: '2026-09-27T15:30:00.000Z'
  };
  const base = {
    teacherId,
    groups: [group5A, group2],
    existing: {},
    migratedSessionIds: [] as string[],
    today: '2026-09-30',
    now: '2026-09-30T08:00:00.000Z'
  };

  const created = migrateLegacySpots({ ...base, candidates: [{ session: legacy, lessonSource: 'embedded' }, { session: legacy, lessonSource: 'embedded' }] });
  assert.equal(created.length, 1, 'the device slot and active_sessions describe one lesson');
  assert.equal(created[0].groupId, 'group-5a');
  assert.equal(created[0].currentPart, LessonPart.Part6);
  assert.equal(created[0].session.sessionId, 'mission-a');
  assert.equal(created[0].dateStarted, '2026-09-28');
  assert.equal(created[0].lastWorkedOn, '2026-09-27');
  assert.equal(resolveSpotLesson(created[0], [], null)?.id, 'lesson-a');

  // An existing spot for the group is never overwritten.
  const existing = spotFor(group5A, lessonA2, LessonPart.Part2, richSession({ sessionId: 'mission-other' }));
  assert.deepEqual(migrateLegacySpots({ ...base, existing: { 'group-5a': existing }, candidates: [{ session: legacy, lessonSource: 'embedded' }] }), []);

  // A discarded spot's session id is remembered, so it stays discarded.
  assert.deepEqual(migrateLegacySpots({ ...base, migratedSessionIds: ['mission-a'], candidates: [{ session: legacy, lessonSource: 'embedded' }] }), []);

  // A lesson still on the Briefing, or for a group that no longer exists, is not a spot.
  const briefing = { ...legacy, currentPart: LessonPart.Briefing };
  assert.deepEqual(migrateLegacySpots({ ...base, candidates: [{ session: briefing, lessonSource: 'embedded' }] }), []);
  assert.deepEqual(migrateLegacySpots({ ...base, groups: [group2], candidates: [{ session: legacy, lessonSource: 'embedded' }] }), []);
  assert.deepEqual(migrateLegacySpots({ ...base, candidates: [{ session: null, lessonSource: 'embedded' }] }), []);
});

test('a spot finds its lesson by id: library first, then the group, then the embedded copy', () => {
  const byId = spotFor(group5A, lessonA, LessonPart.Part2, richSession());
  assert.equal(byId.embeddedLesson, undefined);
  const record = { id: 'lesson-a', lesson: { ...lessonA, title: 'Edited since' } } as any;
  assert.equal(resolveSpotLesson(byId, [record], null)?.title, 'Edited since');
  assert.equal(resolveSpotLesson(byId, [], { savedLessons: [lessonA] })?.id, 'lesson-a');
  assert.equal(resolveSpotLesson(byId, [], { savedLessons: [] }), null);
  const embedded = { ...byId, lessonSource: 'embedded' as const, embeddedLesson: lessonA };
  assert.equal(resolveSpotLesson(embedded, [], { savedLessons: [] })?.id, 'lesson-a');
});

// ---------------------------------------------------------------------------
// Size
// ---------------------------------------------------------------------------

const strokes = (count: number, pointsEach: number) => Array.from({ length: count }, (_, index) => ({
  id: `stroke-${index}`, color: '#4338ca', width: 4,
  points: Array.from({ length: pointsEach }, (_, point) => ({ x: 0.1234 + point / 1000, y: 0.5678 - point / 1000 }))
}));

const wordList = (student: number) => Array.from({ length: 15 }, (_, word) => ({
  id: `card-${student}-${word}`, instanceId: `card-${student}-${word}-${student}-${word}`, text: `word${student}${word}`, type: 'regular' as const
}));

test('a realistic saved spot stays well under the cloud document limit', () => {
  const students = ['s1', 's2', 's3', 's4'];
  const distribution = students.map((_, index) => wordList(index));
  const scores = distribution.flatMap((list, index) => list.map(word => ({
    studentId: students[index], instanceId: word.instanceId, wordText: word.text, status: 'correct' as const
  })));
  const session = richSession({
    studentIds: students,
    distribution,
    scores,
    notes: 'A note about how the group did. '.repeat(20),
    drawings: {
      sentence: strokes(20, 150), passage: strokes(20, 150), teach: strokes(15, 150), spelling: strokes(15, 150)
    }
  });

  const byId = spotFor(group5A, lessonA, LessonPart.Part5, session);
  const embedded = buildSpot({
    teacherId, group: group5A, lesson: lessonA, lessonSource: 'embedded', currentPart: 5, session,
    dateStarted: '2026-09-28', today: '2026-09-28', now: '2026-09-28T10:00:00.000Z'
  });
  const bytesById = spotBytes(byId);
  const bytesEmbedded = spotBytes(embedded);
  console.log(`spot size, lesson by id: ${Math.round(bytesById / 1024)} KB; lesson embedded: ${Math.round(bytesEmbedded / 1024)} KB (limit ${Math.round(GROUP_SPOT_BYTE_LIMIT / 1024)} KB)`);

  assert.ok(bytesById < GROUP_SPOT_BYTE_LIMIT / 2, `by id: ${bytesById}`);
  assert.ok(bytesEmbedded < GROUP_SPOT_BYTE_LIMIT / 2, `embedded: ${bytesEmbedded}`);
  assert.ok(bytesEmbedded > bytesById, 'the lesson is what makes a spot big, so it is stored by id');
});

test('a spot too big for the cloud sheds its drawings there but keeps everything on the device', async () => {
  const storage = memoryStorage();
  const { remote, docs } = recordingRemote();
  const huge = richSession({
    drawings: Object.fromEntries(Array.from({ length: 6 }, (_, index) => [`surface-${index}`, strokes(60, 400)]))
  });
  const spot = spotFor(group5A, lessonA, LessonPart.Part5, huge);
  assert.ok(spotBytes(spot) > GROUP_SPOT_BYTE_LIMIT);

  const result = await saveSpotEverywhere(spot, remote, storage);
  assert.equal(result.cloud, true);
  assert.match(result.message, /drawings/i);
  const inCloud = cloudSpots(docs)['group-5a'];
  assert.deepEqual(inCloud.session.drawings, {});
  assert.deepEqual(inCloud.session.scores, spot.session.scores);
  assert.deepEqual(readLocalSpots(teacherId, storage)['group-5a'].session.drawings, huge.drawings);

  // Too big even without drawings: cloud is skipped with a plain message; the device copy stays.
  const monstrous = richSession({ notes: 'x'.repeat(GROUP_SPOT_BYTE_LIMIT + 10) });
  const failed = await saveSpotEverywhere(spotFor(group2, lessonB, 2, monstrous), remote, storage);
  assert.equal(failed.cloud, false);
  assert.equal(failed.device, true);
  assert.match(failed.message, /KB/);
  assert.ok(readLocalSpots(teacherId, storage)['group-2']);
});

test('a cloud failure never loses the device copy and reports why', async () => {
  const storage = memoryStorage();
  const failing: SpotRemote = {
    async set() { throw Object.assign(new Error('nope'), { code: 'permission-denied' }); },
    async remove() { throw new Error('nope'); }
  };
  const spot = spotFor(group5A, lessonA, LessonPart.Part5, richSession());
  const result = await saveSpotEverywhere(spot, failing, storage, error => `described: ${(error as Error).message}`);
  assert.equal(result.device, true);
  assert.equal(result.cloud, false);
  assert.equal(result.message, 'described: nope');
  assert.deepEqual(readLocalSpots(teacherId, storage)['group-5a'], spot);
  // With no cloud at all (guest), the spot is kept on the device.
  const guest = await saveSpotEverywhere(spot, null, storage);
  assert.equal(guest.device, true);
  assert.equal(guest.cloud, false);
});

test('spot ids never collide with library lesson ids for the same group', () => {
  assert.notEqual(groupSpotId(teacherId, 'group-5a'), libraryLessonId(teacherId, 'group-5a', 'WRS_2026-09-28_5A_Substep7-4'));
});
