import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import WordCards from '../legacy/components/modules/WordCards';
import { LessonRuntimeProvider } from '../legacy/components/lessonRuntimeContext';
import { Lesson, LessonPart } from '../legacy/types';
import {
  WORD_ELEMENT_CARDS,
  WORD_ELEMENT_SUBSTEPS
} from '../legacy/wordElementMnemonics';
import {
  ElementReviewSessionState,
  createReviewState,
  flipReviewCard,
  jumpToReviewCard,
  moveReviewCard,
  normalizeReviewState,
  runningSubstep,
  selectReviewCards,
  setReviewFamily,
  setReviewSubstep,
  setReviewTab,
  shuffleReviewCards,
  substepKey
} from '../legacy/wordElementReview';
import {
  createInitialLessonSession,
  lessonSessionFromCloud,
  lessonSessionToCloud
} from '../legacy/useLessonSession';
import { resetWordCardsState } from '../legacy/wordCardsState';

const source = JSON.parse(fs.readFileSync(path.join('tests', 'fixtures', 'word-element-deck-v1.2.source.json'), 'utf8'));

const lesson: Lesson = {
  id: 'lesson-2-5', title: 'Test', step: '2', substep: '5',
  conceptNotes: '', slides: [], quickDrill: [], wordCards: [], sentences: [],
  dictation: { sounds: [], realWords: [], wordElements: [], nonsenseWords: [], phrases: [], sentences: [] },
  hfwList: [], affixPractice: []
};

const reviewState = (patch: Partial<ElementReviewSessionState> = {}): ElementReviewSessionState => ({
  ...createReviewState(null), tab: 'review', ...patch
});

const render = (state: ElementReviewSessionState, readOnly: boolean, runtimeLesson: Lesson | null = lesson) => {
  const wordCards = { ...createInitialLessonSession().wordCards, elementReview: state };
  return renderToStaticMarkup(
    createElement(LessonRuntimeProvider, { lesson: runtimeLesson as Lesson },
      createElement(WordCards, { cards: [], state: wordCards, readOnly }))
  );
};

// --- Data -----------------------------------------------------------------

test('element review deck has 83 cards, 85 element forms, and unique ids', () => {
  assert.equal(WORD_ELEMENT_CARDS.length, 83);
  assert.equal(WORD_ELEMENT_CARDS.reduce((sum, card) => sum + card.elements.length, 0), 85);
  assert.equal(new Set(WORD_ELEMENT_CARDS.map(card => card.id)).size, 83);
  assert.equal(WORD_ELEMENT_SUBSTEPS.length, 63);
});

test('every card image exists under public/ at the rewritten path', () => {
  for (const card of WORD_ELEMENT_CARDS) {
    assert.match(card.image, /^\/word-element-mnemonics\/[\w-]+\.png$/);
    assert.ok(fs.existsSync(path.join('public', card.image)), `missing ${card.image}`);
  }
  assert.equal(fs.readdirSync(path.join('public', 'word-element-mnemonics')).length, 83);
});

test('card fields are verbatim from the standalone deck; only image paths change', () => {
  assert.equal(source.cards.length, WORD_ELEMENT_CARDS.length);
  source.cards.forEach((original: Record<string, unknown>, index: number) => {
    const { image, ...rest } = original;
    const { image: converted, ...convertedRest } = WORD_ELEMENT_CARDS[index] as unknown as Record<string, unknown>;
    assert.deepEqual(convertedRest, rest);
    assert.equal(converted, `/word-element-mnemonics/${String(image).replace(/^assets\//, '')}`);
  });
  assert.deepEqual([...WORD_ELEMENT_SUBSTEPS], source.substeps);
});

// --- Filtering ------------------------------------------------------------

test('cumulative filter never returns a card first taught after the target substep', () => {
  for (const target of WORD_ELEMENT_SUBSTEPS) {
    for (const family of ['All', 'Latin', 'Greek'] as const) {
      for (const card of selectReviewCards(family, 'through', target)) {
        assert.ok(substepKey(card.firstTaught)! <= substepKey(target)!, `${card.id} (${card.firstTaught}) leaked into ${target}`);
      }
    }
  }
  assert.equal(selectReviewCards('All', 'through', '1.1').length, 0);
  assert.equal(selectReviewCards('All', 'through', '12.6').length, 83);
  assert.equal(selectReviewCards('Latin', 'all', null).length + selectReviewCards('Greek', 'all', null).length, 83);
  assert.ok(selectReviewCards('All', 'current', '2.4').every(card => card.firstTaught === '2.4'));
});

test('running substep joins step and substep, or accepts an already-dotted substep', () => {
  assert.equal(runningSubstep({ step: '2', substep: '5' }), '2.5');
  assert.equal(runningSubstep({ step: '2', substep: '2.5' }), '2.5');
  assert.equal(runningSubstep({ step: '', substep: '' }), null);
  assert.equal(runningSubstep(null), null);
});

test('review transitions rebuild order, reset flip, and keep id-only state', () => {
  const start = createReviewState('2.5');
  assert.equal(start.scope, 'through');
  assert.ok(start.order.every(id => typeof id === 'string'));
  const flipped = flipReviewCard(start);
  assert.equal(flipped.flipped, true);
  assert.equal(moveReviewCard(flipped, 1).flipped, false);
  const picked = setReviewSubstep(start, '7.3');
  assert.equal(picked.scope, 'through');
  assert.ok(picked.order.length > start.order.length);
  const latin = setReviewFamily(picked, 'Latin', '2.5');
  assert.ok(latin.order.every(id => id.startsWith('latin_')));
  const shuffled = shuffleReviewCards(picked, () => 0.3);
  assert.deepEqual([...shuffled.order].sort(), [...picked.order].sort());
  const target = picked.order[5];
  assert.equal(jumpToReviewCard({ ...picked, view: 'browse' }, target).view, 'study');
});

// --- Student view privacy ------------------------------------------------

test('student view shows only the front before flip: no back face, answers, or teacher info', () => {
  const fess = WORD_ELEMENT_CARDS.find(card => card.id === 'latin_26_01')!;
  const state = reviewState({ order: [fess.id], index: 0, flipped: false });
  const html = render(state, true);
  assert.ok(html.includes('What does this Latin base mean?'));
  assert.ok(html.includes(fess.elements[0]));
  assert.ok(!html.includes(fess.meaning), 'meaning leaked before flip');
  assert.ok(!html.includes(fess.example), 'example leaked before flip');
  assert.ok(!html.includes(fess.image), 'picture leaked before flip');
  assert.ok(!html.includes('Teacher source details'));
  assert.ok(!html.includes(fess.notebookCategory));
  for (const control of ['Shuffle', 'Random', 'Reset order', 'Browse', 'Study', 'Family', 'Word Cards', 'No student data']) {
    assert.ok(!html.includes(control), `student screen shows ${control}`);
  }
});

test('student view keeps the front while the teacher is in Browse, and reveals the back only after flip', () => {
  const fess = WORD_ELEMENT_CARDS.find(card => card.id === 'latin_26_01')!;
  const browsing = render(reviewState({ order: [fess.id], index: 0, flipped: false, view: 'browse' }), true);
  assert.ok(browsing.includes('What does this Latin base mean?'));
  assert.ok(!browsing.includes(fess.meaning));
  assert.ok(!browsing.includes('Find an element'));
  const flippedHtml = render(reviewState({ order: [fess.id], index: 0, flipped: true }), true);
  assert.ok(flippedHtml.includes(fess.meaning));
  assert.ok(flippedHtml.includes(fess.example));
  assert.ok(!flippedHtml.includes('Teacher source details'));
});

test('picture prompt on the student front does not leak the element through alt text', () => {
  const fess = WORD_ELEMENT_CARDS.find(card => card.id === 'latin_26_01')!;
  const html = render(reviewState({ order: [fess.id], promptMode: 'picture' }), true);
  assert.ok(html.includes(fess.image));
  assert.ok(!html.includes(fess.elements[0]));
});

test('teacher screen shows controls, source details, and the footer note; empty state still renders', () => {
  const fess = WORD_ELEMENT_CARDS.find(card => card.id === 'latin_26_01')!;
  const html = render(reviewState({ order: [fess.id] }), false);
  for (const text of ['Word Cards', 'Element Review', 'Shuffle', 'Browse', 'Teacher source details', 'Wilson-source content', 'No student data']) {
    assert.ok(html.includes(text), `teacher screen missing ${text}`);
  }
  const empty = render(reviewState({ order: [] }), false);
  assert.ok(empty.includes('No illustrated cards match those filters.'));
  assert.ok(render(reviewState({ order: [] }), true).includes('No illustrated cards match those filters.'));
});

test('without review state the student sees the word-card deck, not the review tab', () => {
  const html = renderToStaticMarkup(createElement(WordCards, { cards: [], state: createInitialLessonSession().wordCards, readOnly: true }));
  assert.ok(!html.includes('No illustrated cards'));
  assert.ok(html.includes('This lesson has no Part 3 word cards.'));
});

// --- Session compatibility ----------------------------------------------

test('old Part 3 session state without the new field loads unchanged', () => {
  const base = createInitialLessonSession();
  const cloud = lessonSessionToCloud(base, lesson, LessonPart.Part3, 'group-1');
  assert.ok(!('wordCardsElementReview' in cloud));
  const loaded = lessonSessionFromCloud(cloud);
  assert.ok(!('elementReview' in loaded.wordCards));
  assert.deepEqual(loaded.wordCards, base.wordCards);

  const legacyCloud = { ...cloud, wordCardsMode: 'oops', wordCardsFilter: 'hfw', wordCardsCurrentIndex: 4, wordCardsScores: [2, 1] };
  delete (legacyCloud as Record<string, unknown>).wordCardsElementReview;
  const legacy = lessonSessionFromCloud(legacyCloud);
  assert.equal(legacy.wordCards.mode, 'oops');
  assert.equal(legacy.wordCards.filter, 'hfw');
  assert.equal(legacy.wordCards.currentIndex, 4);
  assert.deepEqual(legacy.wordCards.scores, [2, 1]);
  assert.equal(legacy.wordCards.elementReview, undefined);
});

test('element review state round-trips through cloud sync and malformed values are dropped', () => {
  const review = reviewState({ order: WORD_ELEMENT_CARDS.slice(0, 5).map(card => card.id), index: 3, flipped: true, promptMode: 'meaning', family: 'Latin' });
  const session = { ...createInitialLessonSession(), wordCards: { ...createInitialLessonSession().wordCards, elementReview: review } };
  const cloud = lessonSessionToCloud(session, lesson, LessonPart.Part3, 'group-1');
  const viaJson = JSON.parse(JSON.stringify(cloud));
  assert.deepEqual(lessonSessionFromCloud(viaJson).wordCards.elementReview, review);

  assert.equal(normalizeReviewState('nope'), undefined);
  assert.equal(normalizeReviewState([]), undefined);
  const repaired = normalizeReviewState({ tab: 'x', order: ['latin_26_01', 'bogus', 'latin_26_01'], index: 99, flipped: true, substep: '99.9' })!;
  assert.deepEqual(repaired.order, ['latin_26_01']);
  assert.equal(repaired.index, 0);
  assert.equal(repaired.tab, 'cards');
  assert.equal(repaired.substep, null);
});

test('switching tabs and reviewing never alters the word-card deck fields', () => {
  const base = resetWordCardsState(createInitialLessonSession().wordCards, [{ id: 'a', text: 'cat', type: 'regular' }], 2);
  const dealt = { ...base, currentIndex: 0, mode: 'oops' as const, filter: 'hfw' as const };
  const toggled = { ...dealt, elementReview: setReviewTab(createReviewState('2.5'), 'review') };
  for (const key of ['deck', 'currentIndex', 'mode', 'filter', 'scores', 'currentPlayerIndex', 'turnScore', 'isBust'] as const) {
    assert.deepEqual(toggled[key], dealt[key]);
  }
  assert.ok(toggled.elementReview);
  const reset = resetWordCardsState(toggled, dealt.deck, 2);
  assert.deepEqual(reset.elementReview, toggled.elementReview);
});
