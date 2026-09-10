import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPresenterSnapshot,
  createPresenterCode,
  createStudentDisplayUrl,
  deserializePresenterSnapshot,
  isPresenterCode,
  isNewerPresenterSnapshot,
  isPresenterSnapshot,
  isStudentDisplayRequest,
  normalizePresenterCode,
  presenterSnapshotOrder,
  sanitizePresenterLesson,
  sanitizePresenterSession,
  serializePresenterSnapshot
} from '../legacy/presenterMode';
import { presenterHealth } from '../legacy/useCloudPresenter';
import { createInitialLessonSession } from '../legacy/useLessonSession';
import { LessonPart } from '../legacy/types';
import { part2InteractivePresentationFromData } from '../legacy/part2Presentation';
import fixture73 from './fixtures/part2-7.3-wilson-visual.json';

test('recognizes only the dedicated student display query', () => {
  assert.equal(isStudentDisplayRequest('?display=student'), true);
  assert.equal(isStudentDisplayRequest('?display=teacher'), false);
  assert.equal(isStudentDisplayRequest(''), false);
});

test('creates a same-origin student display URL without losing other parameters', () => {
  const result = new URL(createStudentDisplayUrl('https://example.com/dojo?lesson=4#notes', 'teacher-123'));
  assert.equal(result.origin, 'https://example.com');
  assert.equal(result.searchParams.get('lesson'), '4');
  assert.equal(result.searchParams.get('display'), 'student');
  assert.equal(result.searchParams.get('presenter'), 'teacher-123');
  assert.equal(result.hash, '');
});

test('creates and normalizes readable cross-device pairing codes', () => {
  const code = createPresenterCode(new Uint32Array([0, 1, 2, 3, 4, 5, 6, 7]));
  assert.equal(code, 'ABCD-EFGH');
  assert.equal(normalizePresenterCode('abcd efgh'), 'ABCD-EFGH');
  assert.equal(normalizePresenterCode('abc'), '');
  assert.equal(isPresenterCode('ABCD-EFGH'), true);
  assert.equal(isPresenterCode('teacher-123'), false);
});

test('removes private teacher scores and notes from the student payload', () => {
  const session = {
    ...createInitialLessonSession(),
    notes: 'private observation',
    scores: [{ studentId: 's1', instanceId: 'w1', wordText: 'cold', status: 'error' as const }],
    wordlistPage: 2
  };
  const sanitized = sanitizePresenterSession(session);
  assert.deepEqual(sanitized.scores, []);
  assert.equal(sanitized.notes, '');
  assert.equal(sanitized.wordlistPage, 2);
});

test('lets the teacher reveal or hide drawings without deleting teacher annotations', () => {
  const session = {
    ...createInitialLessonSession(),
    drawings: {
      sentence: [{ id: 'stroke-1', color: '#4338ca', width: 4, points: [{ x: 0.1, y: 0.2 }] }]
    },
    teachConceptsMarks: [{ id: 'mark-1' }],
    spellingMarks: [{ id: 'mark-2' }]
  };

  const visible = sanitizePresenterSession(session, true);
  const hidden = sanitizePresenterSession(session, false);

  assert.deepEqual(visible.drawings, session.drawings);
  assert.deepEqual(visible.teachConceptsMarks, session.teachConceptsMarks);
  assert.deepEqual(hidden.drawings, {});
  assert.deepEqual(hidden.teachConceptsMarks, []);
  assert.deepEqual(hidden.spellingMarks, []);
  assert.deepEqual(session.drawings.sentence[0].points, [{ x: 0.1, y: 0.2 }]);
});

test('sends only the current drawing surface to keep presenter frames bounded', () => {
  const session = {
    ...createInitialLessonSession(),
    drawings: {
      sentence: [{ id: 'sentence-stroke', color: '#4338ca', width: 4, points: [{ x: 0.1, y: 0.2 }] }],
      passage: [{ id: 'passage-stroke', color: '#4338ca', width: 4, points: [{ x: 0.4, y: 0.5 }] }]
    }
  };
  const sanitized = sanitizePresenterSession(session, true, LessonPart.Part5);
  assert.deepEqual(Object.keys(sanitized.drawings), ['sentence']);
});

test('sends only the state needed by the lesson part students are viewing', () => {
  const session = {
    ...createInitialLessonSession(),
    wordCards: {
      ...createInitialLessonSession().wordCards,
      deck: [{ id: 'card-1', text: 'melt', type: 'regular' as const }]
    },
    sentenceIndex: 3,
    passageIndex: 2,
    passageRulerEnabled: true,
    passageRulerY: 0.45
  };
  const sanitized = sanitizePresenterSession(session, true, LessonPart.Part9);
  assert.equal(sanitized.passageIndex, 2);
  assert.equal(sanitized.passageRulerEnabled, true);
  assert.equal(sanitized.passageRulerY, 0.45);
  assert.deepEqual(sanitized.wordCards.deck, []);
  assert.equal(sanitized.sentenceIndex, 0);
});

test('sends only current-part lesson content and strips slide notes', () => {
  const lesson = {
    id: 'lesson-1', title: 'Lesson 4.2', step: '4', substep: '2',
    conceptNotes: 'private teacher plan', conceptNotes7: 'private spelling plan',
    slides: [{ id: 'slide-1', type: 'text' as const, title: 'Closed syllables', content: 'mark the vowel', notes: 'private prompt' }],
    quickDrill: Array.from({ length: 100 }, (_, index) => `sound-${index}`),
    wordCards: [], sentences: ['The cat sat.'],
    dictation: { sounds: [], realWords: [], wordElements: [], nonsenseWords: [], phrases: [], sentences: [] },
    hfwList: [], affixPractice: [], passage: 'A long passage students are not currently viewing.'
  };
  const passageFrame = sanitizePresenterLesson(lesson, LessonPart.Part9)!;
  assert.equal(passageFrame.passage, lesson.passage);
  assert.deepEqual(passageFrame.quickDrill, []);
  assert.deepEqual(passageFrame.slides, []);

  const slideFrame = sanitizePresenterLesson(lesson, LessonPart.Part2)!;
  assert.equal(slideFrame.slides[0].content, 'mark the vowel');
  assert.equal(slideFrame.slides[0].notes, undefined);
  assert.equal(slideFrame.conceptNotes, '');
  assert.equal(slideFrame.passage, undefined);
});

test('projects the interactive Part 2 runner to students without teacher-private source fields', () => {
  const emptyPart = (part: number) => ({ part, title: `Part ${part}`, teacherDirections: ['private'], sourceIds: ['private-source'], data: {} });
  const lesson = {
    id: 'interactive-lesson', title: 'Lesson 7.3', step: '7', substep: '3', conceptNotes: 'private', conceptNotes7: '',
    slides: [], quickDrill: [], wordCards: [], sentences: [],
    dictation: { sounds: [], realWords: [], wordElements: [], nonsenseWords: [], phrases: [], sentences: [] },
    hfwList: [], affixPractice: [],
    runtimePlan: {
      schemaVersion: 'wrs-runtime-v1', id: 'interactive-lesson', title: 'Lesson 7.3', step: '7', substep: '3',
      focus: 'introduction', sources: [{ id: 'SI-07', label: 'private source', kind: 'step-instruction' }],
      parts: Array.from({ length: 10 }, (_, index) => index + 1).map(part => part === 2
        ? { ...emptyPart(part), data: { part2Presentation: fixture73 } }
        : emptyPart(part))
    }
  } as unknown as import('../legacy/types').Lesson;
  const studentLesson = sanitizePresenterLesson(lesson, LessonPart.Part2)!;
  const serialized = JSON.stringify(studentLesson);
  assert.equal(serialized.includes('Build the supplied catch example'), false);
  assert.equal(serialized.includes('SI-07'), false);
  assert.equal(serialized.includes('Common Greek Bases'), false);
  assert.equal(serialized.includes('sourceContext'), false);
  assert.equal(serialized.includes('"meaning":"small"'), true);
  assert.equal(studentLesson.runtimePlan?.sources.length, 0);

  const studentPart2 = studentLesson.runtimePlan?.parts.find(part => part.part === 2)?.data;
  const projection = part2InteractivePresentationFromData(studentPart2);
  assert.ok(projection);
  assert.equal(projection?.studentProjection, true);
  assert.equal(projection?.steps[2].kind, 'step');
});

test('builds a valid presenter snapshot with student names but no student records', () => {
  const snapshot = createPresenterSnapshot(
    'teacher-123', 'run', null, LessonPart.Part4, null, createInitialLessonSession(),
    [{ id: 's1', name: 'Levi', masteredSounds: ['a'], masteredHFW: ['the'], attendanceCount: 9, notes: 'private', history: [] }]
  );
  assert.equal(isPresenterSnapshot(snapshot), true);
  assert.equal(snapshot.students[0].name, 'Levi');
  assert.equal(snapshot.drawingsVisible, true);
  assert.equal(snapshot.students[0].notes, '');
  assert.deepEqual(snapshot.students[0].masteredSounds, []);
});

test('rejects an older presenter frame after a newer one has arrived', () => {
  const session = createInitialLessonSession();
  const first = createPresenterSnapshot('teacher-123', 'run', null, LessonPart.Part1, null, session, [], true, 4);
  const stale = { ...first, revision: 3, updatedAt: first.updatedAt + 1000 };
  assert.equal(presenterSnapshotOrder(first), 4);
  assert.equal(isNewerPresenterSnapshot(first, 3), true);
  assert.equal(isNewerPresenterSnapshot(stale, 4), false);
});

test('serializes nested word-list rows into one Firestore-safe presenter value', () => {
  const session = {
    ...createInitialLessonSession(),
    distribution: [
      [{ id: 'card-1', instanceId: 'student-1-word-1', text: 'cold', type: 'regular' as const }],
      [{ id: 'card-2', instanceId: 'student-2-word-1', text: 'wild', type: 'regular' as const }]
    ]
  };
  const snapshot = createPresenterSnapshot(
    'teacher-123', 'run', null, LessonPart.Part4, null, session, [], true, 8
  );
  const storedValue = serializePresenterSnapshot(snapshot);
  assert.equal(typeof storedValue, 'string');
  const restored = deserializePresenterSnapshot(storedValue);
  assert.deepEqual(restored?.session.distribution, session.distribution);
  assert.equal(restored?.revision, 8);
});

test('still accepts presenter frames written by the older object format', () => {
  const snapshot = createPresenterSnapshot(
    'teacher-123', 'run', null, LessonPart.Part1, null, createInitialLessonSession(), [], true, 3
  );
  assert.equal(deserializePresenterSnapshot(snapshot)?.revision, 3);
  assert.equal(deserializePresenterSnapshot('{broken-json'), null);
});

test('reports delayed and acknowledged student-screen health truthfully', () => {
  const now = 100_000;
  assert.equal(presenterHealth(0, 0, 4, now), 'connecting');
  assert.equal(presenterHealth(now - 20_000, 4, 4, now), 'connected');
  assert.equal(presenterHealth(now - 30_000, 4, 4, now), 'lagging');
  assert.equal(presenterHealth(now - 1000, 0, 4, now), 'connecting');
  assert.equal(presenterHealth(now - 1000, 3, 4, now), 'connected');
  assert.equal(presenterHealth(now - 1000, 4, 4, now), 'connected');
  assert.equal(presenterHealth(now - 1000, 3, 4, now, now - 30_000), 'lagging');
  assert.equal(presenterHealth(now - 1000, 4, 4, now, now - 30_000), 'connected');
  assert.equal(presenterHealth(now - 1000, 4, 4, now, now, 3), 'lagging');
});
