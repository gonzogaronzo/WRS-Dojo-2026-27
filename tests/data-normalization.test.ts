import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeActiveSession,
  normalizeGroupProfile,
  normalizeLesson,
  normalizeStoredStudents
} from '../legacy/dataNormalization';
import { normalizeRuntimeLessonPlan, runtimeLessonToLegacyLesson } from '../legacy/runtimeLesson';
import { part2InteractivePresentationFromData } from '../legacy/part2Presentation';
import disposableRuntime73 from './fixtures/disposable-wrs-runtime-7.3-part2.json';

test('drops null nested records while preserving the usable group data', () => {
  const group = normalizeGroupProfile('group-1', {
    name: 'Group 1',
    studentIds: ['student-1', null, ''],
    savedLessons: [null, {
      id: 'lesson-1',
      title: 'Lesson 1',
      slides: [null, { id: 'slide-1', title: 'Slide', elements: [null, { id: 'element-1', type: 'word', content: 'cat' }] }],
      wordCards: [null, { id: 'card-1', text: 'cat', type: 'regular' }]
    }]
  });

  assert.deepEqual(group.studentIds, ['student-1']);
  assert.equal(group.savedLessons.length, 1);
  assert.deepEqual(group.savedLessons[0].slides.map(slide => slide.id), ['slide-1']);
  assert.deepEqual(group.savedLessons[0].slides[0].elements?.map(element => element.id), ['element-1']);
  assert.deepEqual(group.savedLessons[0].wordCards.map(card => card.id), ['card-1']);
  assert.equal(group.instructionalProfile?.currentSubstep, '');
  assert.deepEqual(group.instructionalProfile?.currentCardRepository, []);
});

test('projects semantic Part 2 slides when a runtime lesson is imported at the top level', () => {
  const parts = Array.from({ length: 10 }, (_, index) => ({
    part: index + 1,
    title: `Part ${index + 1}`,
    teacherDirections: [],
    sourceIds: [],
    data: index === 1 ? {
      part2Presentation: {
        version: 1,
        focus: 'introduction',
        frames: [
          {
            id: 'ph-intro',
            kind: 'tile-row',
            title: 'What sound does ph make?',
            tiles: [{ text: 'ph', role: 'consonant-digraph' }],
            annotation: 'ph → /f/',
            teacherCue: 'Teacher-only cue.',
            provenance: 'source-paraphrase',
            sourceIds: ['SI-07']
          }
        ]
      }
    } : {}
  }));

  const lesson = normalizeLesson({
    schemaVersion: 'wrs-runtime-v1',
    id: 'runtime-7-3',
    title: '7.3 semantic import',
    step: '7',
    substep: '3',
    focus: 'introduction',
    lessonPath: 'full',
    plannedParts: [1,2,3,4,5,6,7,8,9,10],
    sources: [],
    parts
  });

  assert.ok(lesson);
  assert.equal(lesson.slides.length, 1);
  assert.equal(lesson.slides[0].id, 'part2-ph-intro');
  assert.equal(lesson.slides[0].type, 'template');
  assert.match(lesson.slides[0].content, /§p2:consonant-digraph:ph/);
  assert.equal(lesson.slides[0].notes, 'Teacher-only cue.');
  assert.equal(lesson.runtimePlan?.schemaVersion, 'wrs-runtime-v1');
});

test('preserves the group instructional profile while rejecting malformed profile values', () => {
  const group = normalizeGroupProfile('group-1', {
    name: 'Group 1',
    instructionalProfile: {
      currentSubstep: '1.6',
      lessonFocus: 'accuracy',
      currentCardRepository: ['vowel cards', null, 'welded sounds'],
      reviewCardRepository: ['closed syllable review'],
      practicedWordElements: ['un-', 7],
      highFrequencyWords: ['said'],
      troubleSpots: ['vowel confusion'],
      conceptsToWeave: ['closed syllables'],
      nextLessonNotes: 'Keep charting real words.',
      updatedAt: '2026-08-30T12:00:00.000Z'
    }
  });

  assert.deepEqual(group.instructionalProfile, {
    schemaVersion: 1,
    currentSubstep: '1.6',
    lessonFocus: 'accuracy',
    currentCardRepository: ['vowel cards', 'welded sounds'],
    reviewCardRepository: ['closed syllable review'],
    practicedWordElements: ['un-'],
    highFrequencyWords: ['said'],
    troubleSpots: ['vowel confusion'],
    conceptsToWeave: ['closed syllables'],
    nextLessonNotes: 'Keep charting real words.',
    updatedAt: '2026-08-30T12:00:00.000Z'
  });
});

test('drops null local roster entries instead of crashing on their ids', () => {
  const students = normalizeStoredStudents([
    null,
    { id: 'student-1', name: 'Maya', history: [null, { date: '2026-08-20', lessonTitle: 'Lesson' }] }
  ], []);

  assert.equal(students.length, 1);
  assert.equal(students[0].id, 'student-1');
  assert.equal(students[0].history.length, 1);
});

test('repairs a usable unfinished lesson and rejects one without a lesson id', () => {
  const recovered = normalizeActiveSession({
    lesson: { id: 'lesson-1', title: 'Lesson 1', wordCards: [null, { id: 'card-1', text: 'cat' }] },
    currentPart: 4,
    groupId: 'group-1',
    studentIds: ['student-1', null],
    teachConceptsMarks: [null, { id: 'mark-1', type: 'breve' }],
    spellingMarks: [null, { id: 'mark-2', type: 'star' }],
    drawings: {
      sentence: [null, { id: 'stroke-1', color: '#000', width: 4, points: [null, { x: 0.25, y: 0.5 }] }]
    }
  });

  assert.ok(recovered);
  assert.equal(recovered.lesson.wordCards.length, 1);
  assert.deepEqual(recovered.studentIds, ['student-1']);
  assert.deepEqual(recovered.teachConceptsMarks?.map(mark => mark.id), ['mark-1']);
  assert.deepEqual(recovered.spellingMarks?.map(mark => mark.id), ['mark-2']);
  assert.equal(recovered.drawings?.sentence.length, 1);
  assert.equal(normalizeActiveSession({ lesson: null, currentPart: 4 }), null);
});


test('imports the disposable 7.3 runtime fixture through the authoritative runtime adapter without dropping Part 2 steps', () => {
  const runtime = normalizeRuntimeLessonPlan(disposableRuntime73);
  assert.ok(runtime);
  assert.equal(runtime?.schemaVersion, 'wrs-runtime-v1');
  assert.deepEqual(runtime?.parts.map(part => part.part), [1,2,3,4,5,6,7,8,9,10]);

  const lesson = runtimeLessonToLegacyLesson(runtime!);
  assert.equal(lesson.id, 'disposable-test-7-3-part2-interactive');
  assert.equal(lesson.runtimePlan?.parts.length, 10);

  const presentation = part2InteractivePresentationFromData(
    lesson.runtimePlan?.parts.find(part => part.part === 2)?.data
  );
  assert.ok(presentation);
  assert.equal(presentation?.steps.filter(step => step.kind === 'step').length, 18);
  assert.deepEqual(
    presentation?.steps.filter(step => step.kind === 'step').map(step => step.id),
    [
      'previous-substep-review', 'known-digraph-review', 'ph-card', 'phone-build',
      'phase-reading-practice', 'graph-reading-practice', 'trophy-reading-practice',
      'dolphin-reading-practice', 'dge-review-card', 'tch-card', 'catch-build',
      'stretch-reading-practice', 'scratch-reading-practice', 'tch-short-vowel-check',
      'ph-notebook', 'tch-notebook', 'latch-affix-manipulation', 'greek-word-element-build'
    ]
  );
  for (const [id, pageNumber, targetRow] of [
    ['ph-notebook', 2, 'ph-entry'],
    ['tch-notebook', 3, 'tch-entry']
  ] as const) {
    const step = presentation?.steps.find(candidate => candidate.id === id);
    assert.equal(step?.kind, 'step');
    if (!step || step.kind !== 'step') throw new Error(`Missing ${id} after runtime adaptation.`);
    assert.equal(step.notebookVisual?.pageNumber, pageNumber);
    assert.ok(step.notebookVisual?.rows.some(row => row.id === targetRow && row.target));
  }
});

test('rejects an incomplete runtime envelope before it can silently become an empty lesson', () => {
  const malformed = { ...disposableRuntime73, parts: [] };
  const runtime = normalizeRuntimeLessonPlan(malformed);
  assert.ok(runtime);
  assert.throws(
    () => runtimeLessonToLegacyLesson(runtime!),
    /must contain exactly Parts 1-10 once each/
  );
});
