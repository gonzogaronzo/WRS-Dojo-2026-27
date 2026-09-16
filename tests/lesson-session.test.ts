import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyLocalLessonSessionChange,
  createInitialLessonSession,
  lessonSessionFromCloud,
  lessonSessionsMatch,
  lessonSessionToCloud,
  touchLessonSessionState
} from '../legacy/useLessonSession';
import { Lesson, LessonPart } from '../legacy/types';
import {
  shouldApplyIncomingLessonState,
  shouldResetQuickDrillForPartChange
} from '../legacy/lessonSessionSync';
import { createPresenterSnapshot } from '../legacy/presenterMode';

const lesson: Lesson = {
  id: 'lesson-2-3', title: 'Closed Syllable Exceptions', step: '2', substep: '3',
  conceptNotes: '', slides: [], quickDrill: ['a', 'i'], wordCards: [], sentences: [],
  dictation: { sounds: [], realWords: [], wordElements: [], nonsenseWords: [], phrases: [], sentences: [] },
  hfwList: [], affixPractice: []
};

test('creates a complete, independent default session', () => {
  const first = createInitialLessonSession();
  const second = createInitialLessonSession();

  assert.equal(first.syncRevision, 0);
  assert.equal(first.teachConceptsBoardTitle, 'Target Word');
  assert.equal(first.spellingViewMode, 'list');
  assert.deepEqual(first.studentIds, []);
  first.studentIds.push('student-1');
  assert.deepEqual(second.studentIds, []);
});

test('round-trips every active lesson field and sync revision through cloud format', () => {
  const session = {
    ...createInitialLessonSession(),
    syncRevision: 17,
    sessionId: 'mission-123', sessionDate: '2026-08-19',
    studentIds: ['student-1', 'student-2'],
    scores: [{ studentId: 'student-1', instanceId: 'word-1', wordText: 'cold', status: 'correct' as const }],
    notes: 'Watch vowel marking',
    distribution: [[{ id: 'card-1', instanceId: 'word-1', text: 'cold', type: 'regular' as const }]],
    wordlistPage: 2,
    quickDrillIndex: 4, quickDrillRevealed: 7, quickDrillHandwriting: true,
    quickDrillItems: ['o', 'i'], sentenceIndex: 3, teachConceptsMode: 'board',
    wordCards: {
      deck: [{ id: 'card-1', text: 'cold', type: 'regular' as const }], currentIndex: 0,
      filter: 'regular' as const, mode: 'oops' as const, scores: [2, 1], currentPlayerIndex: 1,
      turnScore: 3, isBust: false
    },
    teachConceptsBoardText: 'cold', teachConceptsBoardNotes: 'exception',
    teachConceptsMarks: [{ start: 0, end: 1 }], teachConceptsSlideIndex: 3, teachConceptsCipherIdx: 2,
    teachConceptsCipherResults: { reading: { 0: { text: 'c', type: 'consonant' } } },
    teachConceptsCipherCheckResults: { reading: 'correct' as const },
    teachConceptsSyllabicated: true,
    teachConceptsSlideMarks: { reading: { 0: [{ id: 'mark-1', type: 'breve', x: 1, y: 2, scale: 1 }] } },
    teachConceptsSlideObjectStates: { reading: { 0: { tile: { x: 10, y: 20, scale: 2 } } } },
    teachConceptsSlideFullscreen: { reading: true },
    dictationCompletedIds: ['dict-1'], passageIndex: 5, passageRulerEnabled: true, passageRulerY: 144,
    passagePhase: 'comprehension' as const, passageQuestionIndex: 2,
    spellingViewMode: 'grid' as const, spellingSectionOrderVersion: 2, spellingActiveTab: 2,
    spellingRevealedItems: { cold: true }, spellingCipherWord: 'cold',
    spellingCipherResults: { 0: { text: 'c', type: 'consonant' } }, spellingCipherCheckResult: 'correct' as const,
    spellingGridPage: 2 as const,
    spellingIsSyllabicated: true, spellingMarks: [{ index: 1 }],
    drawings: {
      sentence: [{ id: 'stroke-1', color: '#4338ca', width: 4, points: [{ x: 0.2, y: 0.3 }, { x: 0.4, y: 0.5 }] }]
    }
  };

  const cloud = lessonSessionToCloud(session, lesson, LessonPart.Part4, 'group-1');
  assert.equal(cloud.syncRevision, 17);
  assert.equal(cloud.wordDistribution, JSON.stringify(session.distribution));
  assert.equal(cloud.sessionId, 'mission-123');
  assert.ok(lessonSessionsMatch(lessonSessionFromCloud(cloud), session));
});

test('recovers safely and backward-compatibly from older cloud data without a sync revision', () => {
  const recovered = lessonSessionFromCloud({
    lesson, currentPart: LessonPart.Part1, groupId: 'group-1', studentIds: ['student-1'],
    wordDistribution: '{not-json', spellingViewMode: 'unknown', spellingGridPage: 99
  });

  assert.equal(recovered.syncRevision, 0);
  assert.deepEqual(recovered.distribution, []);
  assert.equal(recovered.spellingViewMode, 'list');
  assert.equal(recovered.spellingGridPage, 1);
  assert.equal(recovered.teachConceptsBoardTitle, 'Target Word');
  assert.equal(recovered.passagePhase, 'reading');
  assert.equal(recovered.spellingSectionOrderVersion, 1);
  assert.deepEqual(recovered.scores, []);
  assert.equal(shouldApplyIncomingLessonState(0, 0, false), true);
});

test('detects meaningful session changes', () => {
  const original = createInitialLessonSession();
  const changed = { ...original, sentenceIndex: 1 };

  assert.ok(lessonSessionsMatch(original, createInitialLessonSession()));
  assert.equal(lessonSessionsMatch(original, changed), false);
});

test('newer teacher state survives stale cloud replay, accepts newer remote state, reloads, and presents current state', () => {
  const originalCloud = lessonSessionToCloud({
    ...createInitialLessonSession(),
    syncRevision: 4,
    sessionId: 'mission-123',
    sessionDate: '2026-09-16',
    studentIds: ['student-1'],
    quickDrillIndex: 0,
    quickDrillRevealed: 0
  }, lesson, LessonPart.Part1, 'group-1');

  let localSession = lessonSessionFromCloud(originalCloud);
  let localPart = LessonPart.Part1;

  // The teacher performs real local actions: advance an item, reveal it, then
  // navigate. Each action advances the one shared lesson-state revision.
  localSession = applyLocalLessonSessionChange(localSession, 'quickDrillIndex', 1);
  localSession = applyLocalLessonSessionChange(localSession, 'quickDrillRevealed', 1);
  localSession = touchLessonSessionState(localSession);
  localPart = LessonPart.Part6;
  assert.equal(localSession.syncRevision, 7);

  // Firestore then emits the older A-state after the local B-state is already
  // visible. Simulate the same reconciliation path used by App.tsx.
  const staleIncoming = lessonSessionFromCloud(originalCloud);
  if (shouldApplyIncomingLessonState(localSession.syncRevision, staleIncoming.syncRevision, true)) {
    localSession = staleIncoming;
    localPart = originalCloud.currentPart as LessonPart;
  }

  assert.equal(localPart, LessonPart.Part6);
  assert.equal(localSession.quickDrillIndex, 1);
  assert.equal(localSession.quickDrillRevealed, 1);
  assert.equal(localSession.syncRevision, 7);

  // A legitimately newer remote revision is still accepted rather than all
  // incoming synchronization being suppressed.
  const newerCloud = lessonSessionToCloud({
    ...localSession,
    syncRevision: 8,
    quickDrillIndex: 2,
    quickDrillRevealed: 2
  }, lesson, LessonPart.Part6, 'group-1');
  const newerIncoming = lessonSessionFromCloud(newerCloud);
  if (shouldApplyIncomingLessonState(localSession.syncRevision, newerIncoming.syncRevision, true)) {
    localSession = newerIncoming;
    localPart = newerCloud.currentPart as LessonPart;
  }

  assert.equal(localPart, LessonPart.Part6);
  assert.equal(localSession.quickDrillIndex, 2);
  assert.equal(localSession.quickDrillRevealed, 2);
  assert.equal(localSession.syncRevision, 8);

  // Save/reload preserves the latest legitimate state and its ordering token.
  const saved = lessonSessionToCloud(localSession, lesson, localPart, 'group-1');
  const restored = lessonSessionFromCloud(saved);
  assert.equal(restored.syncRevision, 8);
  assert.equal(restored.quickDrillIndex, 2);
  assert.equal(restored.quickDrillRevealed, 2);

  // Presenter/student projection receives the current teacher state, not the
  // stale frame that arrived earlier.
  const presenter = createPresenterSnapshot(
    'teacher-123', 'run', lesson, localPart, null, restored, [], true, 9
  );
  assert.equal(presenter.currentPart, LessonPart.Part6);
  assert.equal(presenter.session.quickDrillIndex, 2);
  assert.equal(presenter.session.quickDrillRevealed, 2);
});

test('starts each Quick Drill part with a fresh index and unrevealed prompt', () => {
  assert.equal(shouldResetQuickDrillForPartChange(LessonPart.Part2, LessonPart.Part6), true);
  assert.equal(shouldResetQuickDrillForPartChange(LessonPart.Part6, LessonPart.Part1), true);
  assert.equal(shouldResetQuickDrillForPartChange(LessonPart.Part1, LessonPart.Part1), false);
  assert.equal(shouldResetQuickDrillForPartChange(LessonPart.Part4, LessonPart.Part5), false);
});
