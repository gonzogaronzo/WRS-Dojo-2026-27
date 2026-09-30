import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  LibraryLessonRecord, applyLibrarySnapshot, libraryLessonId, normalizeLibraryRecord, planLessonWrite, readLessonFile,
  TAUGHT_MARKS_KIND
} from '../legacy/lessonLibrary';
import {
  LessonStatusContext, arrangeByStatus, buildTaughtMarksDoc, deriveLessonStatus, mergeTaughtMarks,
  normalizeTaughtMarks, readLocalTaughtMarks, runwayAlerts, runwayFor, runwaysByGroup, setLessonTaught, taughtMarksId
} from '../legacy/lessonStatus';
import { addMissionToGroup } from '../legacy/missionArchive';
import { RunwayChip, RunwayNotice } from '../legacy/components/Runway';
import { LessonLibraryProvider } from '../legacy/useLessonLibrary';
import { LessonStatusProvider } from '../legacy/useLessonStatus';
import type { GroupProfile, Lesson } from '../legacy/types';

const teacherId = 'teacher-abc';
const today = '2026-09-30';
const fixtureText = readFileSync(new URL('../fixtures/canonical/5A-7.4-accuracy-regression.json', import.meta.url), 'utf8');

const record = (id: string, lessonDate: string, groupId = 'g1'): LibraryLessonRecord => ({
  id, teacherId, groupId, groupName: groupId, lessonDate, sourceFileName: `${id}.json`, runtimeId: id,
  title: `Lesson ${id}`, step: '7', substep: '4', savedAt: '2026-09-20T00:00:00.000Z',
  lesson: { id, title: `Lesson ${id}` } as Lesson
});

const context = (over: Partial<LessonStatusContext> = {}): LessonStatusContext => ({
  completedLessonIds: new Set(), markedTaughtIds: new Set(), ...over
});

const recordingRemote = () => {
  const calls: Array<{ op: string; collection: string; id: string; data?: Record<string, unknown> }> = [];
  return {
    calls,
    remote: {
      set: async (collection: string, id: string, data: Record<string, unknown>) => { calls.push({ op: 'set', collection, id, data }); },
      remove: async (collection: string, id: string) => { calls.push({ op: 'remove', collection, id }); }
    }
  };
};
const memoryStorage = () => {
  const map = new Map<string, string>();
  return { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
};
const SHEET_COLLECTIONS = ['missions', 'daily_notes', 'group_notes'];

test('a finished mission means Taught; a saved spot means In progress; otherwise On deck', () => {
  const a = record('a', '2026-10-01');
  assert.equal(deriveLessonStatus(a, context()), 'on-deck');
  assert.equal(deriveLessonStatus(a, context({ spotLessonId: 'a' })), 'in-progress');
  assert.equal(deriveLessonStatus(a, context({ spotLessonId: 'other' })), 'on-deck');
  assert.equal(deriveLessonStatus(a, context({ completedLessonIds: new Set(['a']) })), 'taught');
  assert.equal(deriveLessonStatus(a, context({ markedTaughtIds: new Set(['a']) })), 'taught');
  // Finished wins over a spot that has not been cleared yet.
  assert.equal(deriveLessonStatus(a, context({ completedLessonIds: new Set(['a']), spotLessonId: 'a' })), 'taught');
});

test('an untaught lesson whose date has passed stays On deck, with a planned-for note', () => {
  const past = record('past', '2026-09-14');
  const arranged = arrangeByStatus([past], 'g1', context(), today);
  assert.equal(arranged.onDeck.length, 1);
  assert.equal(arranged.onDeck[0].plannedFor, '2026-09-14');
  assert.equal(arrangeByStatus([record('soon', '2026-10-02')], 'g1', context(), today).onDeck[0].plannedFor, '');
});

test('arranges In progress, On deck in date order (undated last), then Taught', () => {
  const records = [
    record('undated', ''), record('late', '2026-10-09'), record('early', '2026-09-14'),
    record('running', '2026-09-20'), record('done', '2026-09-10'), record('other-group', '2026-09-01', 'g2')
  ];
  const arranged = arrangeByStatus(records, 'g1', context({
    completedLessonIds: new Set(['done']), spotLessonId: 'running'
  }), today);
  assert.deepEqual(arranged.inProgress.map(e => e.record.id), ['running']);
  assert.deepEqual(arranged.onDeck.map(e => e.record.id), ['early', 'late', 'undated']);
  assert.deepEqual(arranged.taught.map(e => e.record.id), ['done']);
});

test('runway counts only On deck lessons, and levels are 0 / 1 / 2+', () => {
  const records = [
    record('a', '2026-10-01'), record('b', '2026-10-02'), record('c', '2026-10-03'),
    record('d', '2026-10-04', 'g2'), record('e', '2026-10-05', 'g2'),
    record('f', '2026-10-06', 'g3'), record('g', '2026-09-01', 'g3')
  ];
  const contexts: Record<string, LessonStatusContext> = {
    g1: context({ spotLessonId: 'a', completedLessonIds: new Set(['b']) }), // only c is on deck
    g2: context({ markedTaughtIds: new Set(['d', 'e']) }), // none on deck
    g3: context(), // two on deck (one past-dated)
    g4: context() // no lessons at all
  };
  const runways = runwaysByGroup(records, ['g1', 'g2', 'g3', 'g4'], id => contexts[id], today);
  assert.deepEqual(['g1', 'g2', 'g3', 'g4'].map(id => [runways[id].count, runways[id].level]),
    [[1, 'last'], [0, 'none'], [2, 'ok'], [0, 'none']]);
  assert.equal(runwayFor(0).warning, 'Nothing on deck');
  assert.equal(runwayFor(1).warning, 'Last one on deck');
  assert.equal(runwayFor(2).warning, '');
  assert.equal(runwayFor(3).countLabel, 'On deck: 3');
});

test('the top line lists groups at 0 or 1, fewest first, and nothing when all have 2+', () => {
  const groups = [{ id: 'g1', name: 'Group 1' }, { id: 'g2', name: 'Group 2' }, { id: 'g3', name: 'Group 3' }];
  const alerts = runwayAlerts(groups, { g1: runwayFor(1), g2: runwayFor(0), g3: runwayFor(5) });
  assert.deepEqual(alerts.map(a => a.groupId), ['g2', 'g1']);
  assert.deepEqual(runwayAlerts(groups, { g1: runwayFor(2), g2: runwayFor(3), g3: runwayFor(9) }), []);
});

test('the runway chip and top line say it in words with an icon, not color alone', () => {
  const none = renderToStaticMarkup(React.createElement(RunwayChip, { runway: runwayFor(0) }));
  assert.match(none, /On deck: 0/);
  assert.match(none, /Nothing on deck/);
  assert.match(none, /<svg/);
  const last = renderToStaticMarkup(React.createElement(RunwayChip, { runway: runwayFor(1) }));
  assert.match(last, /Last one on deck/);
  const ok = renderToStaticMarkup(React.createElement(RunwayChip, { runway: runwayFor(4) }));
  assert.match(ok, /On deck: 4/);
  assert.doesNotMatch(ok, /Nothing on deck|Last one/);

  const groups = [{ id: 'g1', name: 'Group 1' }, { id: 'g2', name: 'Group 2' }] as GroupProfile[];
  const render = (records: LibraryLessonRecord[]) => renderToStaticMarkup(
    React.createElement(
      LessonLibraryProvider,
      { value: { records, status: 'ready' } as never },
      React.createElement(
        LessonStatusProvider,
        { value: { ready: true, contextFor: () => context() } as never },
        React.createElement(RunwayNotice, { groups })
      )
    )
  );
  const low = render([record('a', '2026-10-01', 'g1'), record('b', '2026-10-02', 'g1'), record('c', '2026-10-03', 'g2')]);
  assert.match(low, /Group 2 — Last one on deck/);
  assert.doesNotMatch(low, /Group 1/);
  const fine = render([
    record('a', '2026-10-01', 'g1'), record('b', '2026-10-02', 'g1'),
    record('c', '2026-10-03', 'g2'), record('d', '2026-10-04', 'g2')
  ]);
  assert.equal(fine, '');
});

test('Mark as taught writes only its own document in the lesson library, never missions, daily_notes or group_notes', async () => {
  const { calls, remote } = recordingRemote();
  const storage = memoryStorage();
  const result = await setLessonTaught(teacherId, 'g1', [], 'lesson-1', true, '2026-09-30T10:00:00.000Z', remote, storage);
  assert.equal(result.cloud, true);
  assert.deepEqual(result.marks.lessonIds, ['lesson-1']);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].collection, 'lessons');
  assert.equal(calls[0].id, taughtMarksId(teacherId, 'g1'));
  assert.equal(calls[0].data?.kind, TAUGHT_MARKS_KIND);
  for (const call of calls) assert.ok(!SHEET_COLLECTIONS.includes(call.collection));

  await setLessonTaught(teacherId, 'g1', ['lesson-1'], 'lesson-1', false, '2026-09-30T10:05:00.000Z', remote, storage);
  assert.ok(calls.every(call => call.collection === 'lessons' && call.op === 'set'));
  // It is not a mission record: no lessonId, squadId or results, so nothing a mission trigger could read.
  const doc = calls[0].data as Record<string, unknown>;
  assert.equal(doc.lessonId, undefined);
  assert.equal(doc.results, undefined);
});

test('the code that reads or marks taught lessons never touches the Sheets-mirrored collections', () => {
  for (const file of ['../legacy/lessonStatus.ts', '../legacy/useLessonStatus.ts', '../legacy/components/Runway.tsx', '../legacy/components/LoadedLessons.tsx']) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8')
      .split('\n').filter(line => !/^\s*(\/\/|\/?\*)/.test(line)).join('\n');
    assert.doesNotMatch(source, /daily_notes|group_notes|archiveMission/, file);
    assert.doesNotMatch(source, /setDoc\(doc\(db,\s*'missions'|addDoc|updateDoc|writeBatch/, file);
  }
  // The only mention of `missions` is the read-only listener.
  const hook = readFileSync(new URL('../legacy/useLessonStatus.ts', import.meta.url), 'utf8');
  assert.equal((hook.match(/'missions'/g) || []).length, 1);
  assert.match(hook, /onSnapshot\(\s*query\(collection\(db, 'missions'\)/);
});

test('Put back on deck restores the lesson', async () => {
  const { remote } = recordingRemote();
  const storage = memoryStorage();
  const lesson = record('lesson-1', '2026-09-14');
  const marked = await setLessonTaught(teacherId, 'g1', [], 'lesson-1', true, '2026-09-30T10:00:00.000Z', remote, storage);
  const taught = arrangeByStatus([lesson], 'g1', context({ markedTaughtIds: new Set(marked.marks.lessonIds) }), today);
  assert.equal(taught.taught.length, 1);
  assert.equal(taught.taught[0].manuallyTaught, true);
  const back = await setLessonTaught(teacherId, 'g1', marked.marks.lessonIds, 'lesson-1', false, '2026-09-30T10:05:00.000Z', remote, storage);
  const restored = arrangeByStatus([lesson], 'g1', context({ markedTaughtIds: new Set(back.marks.lessonIds) }), today);
  assert.equal(restored.taught.length, 0);
  assert.equal(restored.onDeck.length, 1);
  // The device copy agrees, and the newer copy wins a merge.
  assert.deepEqual(readLocalTaughtMarks(teacherId, storage).g1.lessonIds, []);
  const merged = mergeTaughtMarks({ g1: back.marks }, { g1: marked.marks });
  assert.deepEqual(merged.g1.lessonIds, []);
});

test('reloading the same lesson file keeps the manual flag', async () => {
  const group = { id: 'group-5a', name: 'Group 5A' } as GroupProfile;
  const reading = readLessonFile('WRS_2026-09-14_5A_Substep7-4.json', fixtureText);
  const first = planLessonWrite(reading, group, teacherId, new Set(), '2026-09-27T00:00:00.000Z');
  const lessonId = first.record!.id;
  const { remote } = recordingRemote();
  const marked = await setLessonTaught(teacherId, group.id, [], lessonId, true, '2026-09-28T00:00:00.000Z', remote, null);

  // Loading the file again overwrites the same lesson document (same id)...
  const again = planLessonWrite(readLessonFile('WRS_2026-09-14_5A_Substep7-4 (1).json', fixtureText), group, teacherId, new Set([lessonId]), '2026-09-29T00:00:00.000Z');
  assert.equal(again.status, 'replace');
  assert.equal(again.record!.id, lessonId);
  // ...and the mark is stored under a different document, keyed by that id, so it is untouched.
  assert.notEqual(taughtMarksId(teacherId, group.id), lessonId);
  assert.equal(again.record!.lesson.id, lessonId);
  const status = arrangeByStatus([again.record!], group.id, context({ markedTaughtIds: new Set(marked.marks.lessonIds) }), today);
  assert.equal(status.taught.length, 1);
});

test('the taught-marks document never becomes a library lesson and never re-renders the library', () => {
  const doc = buildTaughtMarksDoc(teacherId, { groupId: 'g1', lessonIds: ['a'], savedAt: 'now' });
  assert.equal(normalizeLibraryRecord(doc.id, doc), null);
  assert.deepEqual(normalizeTaughtMarks(doc), { groupId: 'g1', lessonIds: ['a'], savedAt: 'now' });
  const current = [record('a', '2026-10-01')];
  const same = applyLibrarySnapshot(current, () => { throw new Error('should not rebuild'); }, [{ id: doc.id, data: doc }], false);
  assert.equal(same, current);
  const rebuilt = applyLibrarySnapshot(current, () => [{ id: doc.id, data: doc }], [{ id: doc.id, data: doc }], true);
  assert.deepEqual(rebuilt, []);
  assert.equal(doc.id, libraryLessonId(teacherId, 'g1', TAUGHT_MARKS_KIND));
});

test('completing a lesson through the normal flow moves it to Taught', () => {
  const lesson = record('lesson-1', '2026-10-01');
  const group = { id: 'g1', name: 'Group 1', studentIds: [], history: [] } as unknown as GroupProfile;
  const before = arrangeByStatus([lesson], 'g1', context({ spotLessonId: 'lesson-1' }), today);
  assert.equal(before.inProgress.length, 1);

  // Finishing adds a history entry with lessonId = lesson.id (and a mission with the same lessonId).
  const finished = addMissionToGroup(group, {
    id: 'session-1', lessonId: 'lesson-1', title: lesson.title, date: today, studentIds: [], results: []
  } as never);
  const completed = new Set((finished.history || []).map(entry => entry.lessonId));
  const after = arrangeByStatus([lesson], 'g1', context({ completedLessonIds: completed, spotLessonId: 'lesson-1' }), today);
  assert.equal(after.taught.length, 1);
  assert.equal(after.inProgress.length, 0);
  assert.equal(after.onDeck.length, 0);

  // The dashboard hook gets it without a refresh: history comes with the live group, missions via a read-only listener.
  const hook = readFileSync(new URL('../legacy/useLessonStatus.ts', import.meta.url), 'utf8');
  assert.match(hook, /group\.history/);
  assert.match(hook, /where\('teacherId', '==', teacherId\)/);
  const app = readFileSync(new URL('../legacy/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /useLessonStatusData\(user, groups, groupSpots\.spots\)/);
  assert.match(app, /<LessonStatusProvider value=\{lessonStatus\}>/);
});
