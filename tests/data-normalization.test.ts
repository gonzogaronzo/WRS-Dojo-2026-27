import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeActiveSession,
  normalizeGroupProfile,
  normalizeStoredStudents
} from '../legacy/dataNormalization';

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
