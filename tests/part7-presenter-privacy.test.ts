import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { normalizeLesson } from '../legacy/dataNormalization';
import { LessonPart } from '../legacy/types';
import { sanitizePresenterLesson, sanitizePresenterSession } from '../legacy/presenterMode';
import { createInitialLessonSession } from '../legacy/useLessonSession';
import { part7SpellingItemsFromData } from '../legacy/components/modules/Part7SpellingRunner';

const fixtureUrl = new URL('../fixtures/canonical/3A-2.5-accuracy.canonical-v2.json', import.meta.url);
const fixture = JSON.parse(readFileSync(fixtureUrl, 'utf8'));

test('Part 7 presenter lesson strips dictated targets and teacher cues but keeps reveal cards', () => {
  const lesson = normalizeLesson(fixture);
  assert.ok(lesson);

  const studentLesson = sanitizePresenterLesson(lesson, LessonPart.Part7);
  assert.ok(studentLesson?.runtimePlan);

  const serialized = JSON.stringify(studentLesson);
  assert.equal(serialized.includes('"word":"strap"'), false);
  assert.equal(serialized.includes('teacherCue'), false);
  assert.equal(serialized.includes('SI-02-05'), false);
  assert.equal(studentLesson.runtimePlan.sources.length, 0);

  const studentPart7 = studentLesson.runtimePlan.parts.find(part => part.part === 7)?.data;
  const items = part7SpellingItemsFromData(studentPart7);
  assert.ok(items);
  assert.equal((studentPart7 as Record<string, unknown>).studentProjection, true);
  assert.equal(items[4].word, '');
  assert.equal(items[4].representation, 'letter-sound-tiles');
  assert.deepEqual(items[4].units.map(unit => unit.text), ['s', 't', 'r', 'a', 'p']);
});

test('Part 7 presenter session carries only current spelling index/reveal state needed by passive board', () => {
  const session = createInitialLessonSession();
  session.teachConceptsCipherIdx = 4;
  session.teachConceptsCipherResults = {
    reading: { stale: true },
    spelling: { 4: true }
  };
  session.notes = 'private teacher note';
  session.scores = [{ studentId: 's1', instanceId: 'w1', wordText: 'strap', status: 'error' }];

  const studentSession = sanitizePresenterSession(session, true, LessonPart.Part7);
  assert.equal(studentSession.teachConceptsCipherIdx, 4);
  assert.deepEqual(studentSession.teachConceptsCipherResults, { spelling: { 4: true } });
  assert.equal(studentSession.notes, '');
  assert.deepEqual(studentSession.scores, []);
});
