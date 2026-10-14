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
  lessonSessionToCloud,
  lessonSessionsMatch
} from '../legacy/useLessonSession';
import { bankWordCardsTurn, dealWordCard, resetWordCardsState } from '../legacy/wordCardsState';
import { createPresenterSnapshot, sanitizePresenterSession } from '../legacy/presenterMode';

const source = JSON.parse(fs.readFileSync(path.join('tests', 'fixtures', 'word-element-deck-v1.2.source.json'), 'utf8'));
const affixSource = JSON.parse(fs.readFileSync(path.join('tests', 'fixtures', 'affix-deck-v1.1.source.json'), 'utf8'));
const affixOriginal = JSON.parse(fs.readFileSync(path.join('tests', 'fixtures', 'affix-deck-v1.0.source.json'), 'utf8'));

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

test('element review deck has 158 cards, 170 element forms, and unique ids', () => {
  assert.equal(WORD_ELEMENT_CARDS.length, 158);
  assert.equal(WORD_ELEMENT_CARDS.reduce((sum, card) => sum + card.elements.length, 0), 170);
  assert.equal(new Set(WORD_ELEMENT_CARDS.map(card => card.id)).size, 158);
  assert.equal(WORD_ELEMENT_SUBSTEPS.length, 63);
  assert.deepEqual(WORD_ELEMENT_CARDS.map(card => card.order), Array.from({ length: 158 }, (_, i) => i + 1));
});

test('family counts add up to 158 (83 Latin + Greek, 32 Prefix, 43 Suffix)', () => {
  const count = (family: string) => WORD_ELEMENT_CARDS.filter(card => card.family === family).length;
  assert.equal(count('Latin') + count('Greek') + count('Prefix') + count('Suffix'), 158);
  assert.equal(count('Latin') + count('Greek'), 83);
  assert.equal(count('Prefix'), 32);
  assert.equal(count('Suffix'), 43);
});

test('every Prefix element ends with a dash and every Suffix element starts with one', () => {
  for (const card of WORD_ELEMENT_CARDS.filter(card => card.family === 'Prefix')) {
    for (const element of card.elements) assert.ok(element.endsWith('-') && !element.startsWith('-'), `${card.id}: ${element}`);
  }
  for (const card of WORD_ELEMENT_CARDS.filter(card => card.family === 'Suffix')) {
    for (const element of card.elements) assert.ok(element.startsWith('-'), `${card.id}: ${element}`);
  }
});

test("every Latin card's first element has a dash on both sides", () => {
  const latin = WORD_ELEMENT_CARDS.filter(card => card.family === 'Latin');
  assert.ok(latin.length > 0);
  for (const card of latin) {
    const element = card.elements[0];
    assert.ok(element.startsWith('-') && element.endsWith('-'), `${card.id}: ${element}`);
  }
});

test('every card image exists under public/ at the rewritten path', () => {
  for (const card of WORD_ELEMENT_CARDS) {
    assert.match(card.image, /^\/word-element-mnemonics\/[\w-]+\.png$/);
    assert.ok(fs.existsSync(path.join('public', card.image)), `missing ${card.image}`);
  }
  assert.equal(fs.readdirSync(path.join('public', 'word-element-mnemonics')).length, 158);
});

test('card fields are verbatim from the standalone deck; only image paths change', () => {
  assert.equal(source.cards.length, 83);
  source.cards.forEach((original: Record<string, unknown>, index: number) => {
    const { image, ...rest } = original;
    const { image: converted, ...convertedRest } = WORD_ELEMENT_CARDS[index] as unknown as Record<string, unknown>;
    assert.deepEqual(convertedRest, rest);
    assert.equal(converted, `/word-element-mnemonics/${String(image).replace(/^assets\//, '')}`);
  });
  assert.deepEqual([...WORD_ELEMENT_SUBSTEPS], source.substeps);
});

test('cards 84-158 are verbatim from the affix deck, image paths included', () => {
  assert.equal(affixSource.cards.length, 75);
  assert.deepEqual(WORD_ELEMENT_CARDS.slice(83), affixSource.cards);
  assert.equal(affixSource.version, '1.1');
  assert.deepEqual(affixSource.counts, { rows: 75, forms: 85, prefixRows: 32, suffixRows: 43, teacherChosenExamples: 46 });
});

test('affix v1.1 differs from the printed-Notebook v1.0 only in teacher-chosen examples and meanings', () => {
  const MEANING_CHANGES: Record<string, string> = {
    prefix_hypo: 'under, too little', prefix_hyper: 'over, too much', prefix_anti: 'against'
  };
  assert.equal(affixOriginal.cards.length, affixSource.cards.length);
  let changedExamples = 0;
  affixSource.cards.forEach((card: Record<string, unknown>, index: number) => {
    const before = affixOriginal.cards[index] as Record<string, unknown>;
    for (const key of Object.keys(before)) {
      if (['example', 'meaning', 'auditFlags', 'sourceBasis'].includes(key)) continue;
      assert.deepEqual(card[key], before[key], `${String(card.id)}.${key} changed`);
    }
    const exampleChanged = card.example !== before.example;
    if (exampleChanged) changedExamples += 1;
    assert.equal(card.meaning, MEANING_CHANGES[String(card.id)] ?? before.meaning, `${String(card.id)} meaning`);
    const flags = card.auditFlags as string[];
    assert.equal(flags.includes('TEACHER_CHOSEN_EXAMPLE'), exampleChanged, `${String(card.id)} flag`);
    assert.equal(flags.includes('TEACHER_CHOSEN_MEANING'), String(card.id) in MEANING_CHANGES);
    assert.deepEqual(flags.filter(flag => !flag.startsWith('TEACHER_CHOSEN')), before.auditFlags);
  });
  assert.equal(changedExamples, 46);
});

test('familiar example words appear on the affix cards that were changed', () => {
  const example = (id: string) => WORD_ELEMENT_CARDS.find(card => card.id === id)!.example;
  assert.equal(example('prefix_hypo'), 'hypothermia');
  assert.equal(example('prefix_hyper'), 'hyperactive');
  assert.equal(example('prefix_anti'), 'antifreeze');
  assert.equal(example('suffix_ly'), 'quickly');
  assert.equal(example('suffix_ent'), 'difference, emergency, different');
  // -ite keeps the Wilson words: the long "ite" in graphite and the short "it" in favorite.
  assert.equal(example('suffix_ite'), 'graphite, favorite');
});

// --- Filtering ------------------------------------------------------------

test('cumulative filter never returns a card first taught after the target substep', () => {
  for (const target of WORD_ELEMENT_SUBSTEPS) {
    for (const family of ['All', 'Latin', 'Greek', 'Prefix', 'Suffix'] as const) {
      for (const card of selectReviewCards(family, 'through', target)) {
        assert.ok(substepKey(card.firstTaught)! <= substepKey(target)!, `${card.id} (${card.firstTaught}) leaked into ${target}`);
      }
    }
  }
  assert.equal(selectReviewCards('All', 'through', '1.1').length, 0);
  assert.equal(selectReviewCards('All', 'through', '12.6').length, 158);
  assert.equal(
    (['Latin', 'Greek', 'Prefix', 'Suffix'] as const).reduce((sum, family) => sum + selectReviewCards(family, 'all', null).length, 0),
    158
  );
  assert.equal(selectReviewCards('Prefix', 'all', null).length, 32);
  assert.equal(selectReviewCards('Suffix', 'all', null).length, 43);
  assert.ok(selectReviewCards('All', 'current', '2.4').every(card => card.firstTaught === '2.4'));
});

test('Prefix and Suffix families filter to their own cards', () => {
  const prefixes = setReviewFamily(createReviewState(null), 'Prefix', null);
  assert.equal(prefixes.order.length, 32);
  assert.ok(prefixes.order.every(id => id.startsWith('prefix_')));
  const suffixes = setReviewFamily(createReviewState(null), 'Suffix', null);
  assert.equal(suffixes.order.length, 43);
  assert.ok(suffixes.order.every(id => id.startsWith('suffix_')));
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

// --- Affix prompts and layout --------------------------------------------

test('Prefix and Suffix cards use their own element prompts and labels', () => {
  const suffix = WORD_ELEMENT_CARDS.find(card => card.family === 'Suffix')!;
  const prefix = WORD_ELEMENT_CARDS.find(card => card.family === 'Prefix')!;
  const suffixHtml = render(reviewState({ order: [suffix.id], family: 'Suffix' }), true);
  assert.ok(suffixHtml.includes('What does this suffix mean?'));
  assert.ok(suffixHtml.includes(suffix.elements[0]));
  assert.ok(!suffixHtml.includes('Latin base'));
  assert.ok(render(reviewState({ order: [prefix.id], family: 'Prefix' }), true).includes('What does this prefix mean?'));
  const back = render(reviewState({ order: [suffix.id], flipped: true }), true);
  assert.ok(back.includes('>Suffix<'));
  assert.ok(render(reviewState({ order: [prefix.id], flipped: true }), true).includes('>Prefix<'));
});

test('teacher screen offers five family buttons, "All word elements", and the affix source note', () => {
  const html = render(reviewState({ order: [WORD_ELEMENT_CARDS[0].id] }), false);
  for (const family of ['All', 'Latin', 'Greek', 'Prefix', 'Suffix']) assert.ok(html.includes(`>${family}</button>`), `missing ${family} button`);
  assert.ok(html.includes('All word elements'));
  assert.ok(!html.includes('Latin + Greek'));
  assert.ok(html.includes(affixSource.sourceNote.replace(/&/g, '&amp;')));
});

test('three-element cards and long meanings wrap in study, back, and browse views', () => {
  const triple = WORD_ELEMENT_CARDS.find(card => card.elements.length === 3)!;
  const longest = [...WORD_ELEMENT_CARDS].sort((a, b) => b.meaning.length - a.meaning.length)[0];
  for (const card of [triple, longest]) {
    for (const promptMode of ['element', 'meaning'] as const) {
      const html = render(reviewState({ order: [card.id], promptMode }), true);
      assert.ok(html.includes('break-words'), `${card.id} ${promptMode} front does not wrap`);
    }
    const back = render(reviewState({ order: [card.id], flipped: true }), true);
    assert.ok(back.includes(card.elements.join(' / ')));
    assert.ok(back.includes('break-words'));
    const browse = render(reviewState({ order: [card.id], view: 'browse' }), false);
    assert.ok(browse.includes(card.elements.join(' / ')) && browse.includes('min-w-0 break-words'));
  }
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
  const loaded = lessonSessionFromCloud(viaJson);
  assert.deepEqual(loaded.wordCards.elementReview, review);
  assert.equal(JSON.stringify(loaded.wordCards.elementReview), JSON.stringify(review));
  assert.equal(lessonSessionsMatch(session, loaded), true);

  assert.equal(normalizeReviewState('nope'), undefined);
  assert.equal(normalizeReviewState([]), undefined);
  const repaired = normalizeReviewState({ tab: 'x', order: ['latin_26_01', 'bogus', 'latin_26_01'], index: 99, flipped: true, substep: '99.9' })!;
  assert.deepEqual(repaired.order, ['latin_26_01']);
  assert.equal(repaired.index, 0);
  assert.equal(repaired.tab, 'cards');
  assert.equal(repaired.substep, null);

  const affixIds = ['prefix_mid', 'suffix_ness'];
  for (const family of ['Prefix', 'Suffix'] as const) {
    assert.equal(normalizeReviewState({ family, order: affixIds })!.family, family);
  }
  assert.deepEqual(normalizeReviewState({ order: affixIds })!.order, affixIds);
  assert.equal(normalizeReviewState({ family: 'Hebrew' })!.family, 'All');
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

test('dealing and banking preserve elementReview unchanged', () => {
  const review = reviewState({ order: WORD_ELEMENT_CARDS.slice(0, 4).map(card => card.id), index: 2, flipped: true });
  const deck = [{ id: 'a', text: 'cat', type: 'regular' as const }, { id: 'b', text: 'ship', type: 'regular' as const }];
  const start = { ...resetWordCardsState(createInitialLessonSession().wordCards, deck, 2), elementReview: review };
  const dealt = dealWordCard(start, 2);
  assert.equal(dealt.currentIndex, 0);
  assert.equal(dealt.elementReview, review);
  const oops = { ...dealt, mode: 'oops' as const, turnScore: 3 };
  const banked = bankWordCardsTurn(oops, 2);
  assert.equal(banked.scores[0], 3);
  assert.equal(JSON.stringify(banked.elementReview), JSON.stringify(review));
  assert.equal(JSON.stringify(dealWordCard({ ...banked, isBust: true }, 2).elementReview), JSON.stringify(review));
});

test('presenter frames carry elementReview for Part 3 only', () => {
  const review = reviewState({ order: WORD_ELEMENT_CARDS.slice(0, 3).map(card => card.id), index: 1, flipped: true, view: 'browse' });
  const session = { ...createInitialLessonSession(), wordCards: { ...createInitialLessonSession().wordCards, elementReview: review } };

  const part3 = sanitizePresenterSession(session, true, LessonPart.Part3);
  assert.equal(JSON.stringify(part3.wordCards.elementReview), JSON.stringify(review));
  const part3Snapshot = createPresenterSnapshot('teacher-1', 'run', lesson, LessonPart.Part3, null, session, []);
  assert.equal(JSON.stringify(part3Snapshot.session.wordCards.elementReview), JSON.stringify(review));

  const part4 = sanitizePresenterSession(session, true, LessonPart.Part4);
  assert.equal(part4.wordCards.elementReview, undefined);
  assert.ok(!('elementReview' in part4.wordCards));
  const part4Snapshot = createPresenterSnapshot('teacher-1', 'run', lesson, LessonPart.Part4, null, session, []);
  assert.ok(!('elementReview' in part4Snapshot.session.wordCards));
});

test('a malformed elementReview in state cannot break the student screen', () => {
  const broken = { ...createInitialLessonSession().wordCards, elementReview: { tab: 'review', order: 'nope', index: 'x' } as unknown as ElementReviewSessionState };
  assert.doesNotThrow(() => renderToStaticMarkup(createElement(WordCards, { cards: [], state: broken, readOnly: true })));
  const html = renderToStaticMarkup(createElement(WordCards, { cards: [], state: broken, readOnly: true }));
  assert.ok(html.includes('No illustrated cards match those filters.'));
});
