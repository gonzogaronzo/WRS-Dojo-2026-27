import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  createInitialLessonSession,
  lessonSessionFromCloud,
  lessonSessionsMatch,
  lessonSessionToCloud
} from '../legacy/useLessonSession';
import { Lesson, LessonPart } from '../legacy/types';

const lesson: Lesson = {
  id: 'lesson-2-3', title: 'Closed Syllable Exceptions', step: '2', substep: '3',
  conceptNotes: '', slides: [], quickDrill: ['a', 'i'], wordCards: [], sentences: [],
  dictation: { sounds: [], realWords: [], wordElements: [], nonsenseWords: [], phrases: [], sentences: [] },
  hfwList: [], affixPractice: []
};

test('creates a complete, independent default session', () => {
  const first = createInitialLessonSession();
  const second = createInitialLessonSession();

  assert.equal(first.teachConceptsBoardTitle, 'Target Word');
  assert.equal(first.spellingViewMode, 'list');
  assert.deepEqual(first.studentIds, []);
  first.studentIds.push('student-1');
  assert.deepEqual(second.studentIds, []);
});

test('round-trips every active lesson field through cloud format', () => {
  const session = {
    ...createInitialLessonSession(),
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
    spellingViewMode: 'grid' as const, spellingActiveTab: 2,
    spellingRevealedItems: { cold: true }, spellingCipherWord: 'cold',
    spellingCipherResults: { 0: { text: 'c', type: 'consonant' } }, spellingCipherCheckResult: 'correct' as const,
    spellingGridPage: 2 as const,
    spellingIsSyllabicated: true, spellingMarks: [{ index: 1 }],
    drawings: {
      sentence: [{ id: 'stroke-1', color: '#4338ca', width: 4, points: [{ x: 0.2, y: 0.3 }, { x: 0.4, y: 0.5 }] }]
    }
  };

  const cloud = lessonSessionToCloud(session, lesson, LessonPart.Part4, 'group-1');
  assert.equal(cloud.wordDistribution, JSON.stringify(session.distribution));
  assert.equal(cloud.sessionId, 'mission-123');
  assert.ok(lessonSessionsMatch(lessonSessionFromCloud(cloud), session));
});

test('recovers safely from malformed or incomplete older cloud data', () => {
  const recovered = lessonSessionFromCloud({
    lesson, currentPart: LessonPart.Part1, groupId: 'group-1', studentIds: ['student-1'],
    wordDistribution: '{not-json', spellingViewMode: 'unknown', spellingGridPage: 99
  });

  assert.deepEqual(recovered.distribution, []);
  assert.equal(recovered.spellingViewMode, 'list');
  assert.equal(recovered.spellingGridPage, 1);
  assert.equal(recovered.teachConceptsBoardTitle, 'Target Word');
  assert.deepEqual(recovered.scores, []);
});

test('detects meaningful session changes', () => {
  const original = createInitialLessonSession();
  const changed = { ...original, sentenceIndex: 1 };

  assert.ok(lessonSessionsMatch(original, createInitialLessonSession()));
  assert.equal(lessonSessionsMatch(original, changed), false);
});

test('Run Mission from the editor clears prior recoverable and lesson runtime state', () => {
  const appSource = readFileSync(new URL('../legacy/App.tsx', import.meta.url), 'utf8');
  const onSaveStart = appSource.indexOf('onSave={async (l, run = false) => {');
  assert.notEqual(onSaveStart, -1, 'LessonForm onSave launch path should exist');

  const onSaveEnd = appSource.indexOf('\n          />', onSaveStart);
  assert.notEqual(onSaveEnd, -1, 'LessonForm onSave launch path should be bounded');
  const onSaveBlock = appSource.slice(onSaveStart, onSaveEnd);

  assert.match(
    onSaveBlock,
    /if \(run\) \{[\s\S]*discardRecoverableSession\(\);[\s\S]*resetLessonSession\(\);[\s\S]*setMode\('run'\);[\s\S]*setCurrentPart\(LessonPart\.Briefing\);/,
    'Running a newly saved/imported lesson must clear the previous lesson session before opening the briefing'
  );
});
