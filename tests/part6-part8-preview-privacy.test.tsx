import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import QuickDrill from '../legacy/components/modules/QuickDrill';
import Spelling from '../legacy/components/modules/Spelling';
import { LessonRuntimeProvider } from '../legacy/components/lessonRuntimeContext';
import { createPresenterSnapshot } from '../legacy/presenterMode';
import { createInitialLessonSession } from '../legacy/useLessonSession';
import { LessonPart } from '../legacy/types';
import type { Lesson } from '../legacy/types';

const dictation = {
  sounds: ['/voip/ → qux'],
  wordElements: ['-morphx-'],
  realWords: ['brindlex'],
  nonsenseWords: ['splontx'],
  phrases: ['carry zx lantern'],
  sentences: ['The zx lantern blinked twice.']
};
const lesson = {
  schemaVersion: 2, id: 'preview-privacy-2.5', title: '3A 2.5 Accuracy privacy fixture', step: '2', substep: '5', conceptNotes: '', slides: [],
  quickDrill: ['/old/ → old'], quickDrillReverse: ['/old/ → old'], wordCards: [], sentences: [], dictation, hfwList: [], affixPractice: [],
  runtimePlan: { schemaVersion: 'wrs-runtime-v1', id: 'preview-privacy-2.5', title: '3A 2.5 Accuracy privacy fixture', step: '2', substep: '5', focus: 'accuracy', lessonPath: 'full', plannedParts: [1,2,3,4,5,6,7,8,9,10], sources: [], parts: Array.from({ length: 10 }, (_, i) => ({ part: i + 1, title: '', teacherDirections: [], sourceIds: [], data: i + 1 === 6 ? { wordElements: ['-struct-'] } : {} })) }
} as unknown as Lesson;
const part6Items = ['/old/ → old', 'word-element::-struct-'];

const renderPart6 = (overrides: Partial<ReturnType<typeof createInitialLessonSession>>) => {
  const session = { ...createInitialLessonSession(), ...overrides };
  const snapshot = createPresenterSnapshot('teacher-task8', 'run', lesson, LessonPart.Part6, null, session, [], true, 10);
  assert.ok(snapshot.lesson);
  const markup = renderToStaticMarkup(<LessonRuntimeProvider lesson={snapshot.lesson}><QuickDrill sounds={snapshot.lesson.quickDrillReverse?.length ? snapshot.lesson.quickDrillReverse : snapshot.lesson.quickDrill} isReverse step={snapshot.lesson.step} substep={snapshot.lesson.substep} currentIndex={snapshot.session.quickDrillIndex} revealedCount={snapshot.session.quickDrillRevealed} isHandwritingMode={snapshot.session.quickDrillHandwriting} shuffledItems={snapshot.session.quickDrillItems} readOnly /></LessonRuntimeProvider>);
  return { snapshot, markup };
};

test('actual presenter path keeps Part 6 answer-bearing data out until Reveal', () => {
  for (const index of [0, 1]) {
    const hidden = renderPart6({ quickDrillIndex: index, quickDrillRevealed: 0, quickDrillItems: part6Items });
    const payload = JSON.stringify(hidden.snapshot);
    assert.match(hidden.markup, />LISTEN<\/span>/);
    assert.equal(payload.includes('/old/'), false);
    assert.equal(payload.includes('word-element::-struct-'), false);
    assert.equal(payload.includes('-struct-'), false);
    assert.equal(hidden.markup.includes('/old/'), false);
    assert.equal(hidden.markup.includes('-struct-'), false);
  }
  assert.match(renderPart6({ quickDrillIndex: 0, quickDrillRevealed: 1, quickDrillItems: part6Items }).markup, />old<\/span>/);
  assert.equal(renderPart6({ quickDrillIndex: 1, quickDrillRevealed: 1, quickDrillItems: part6Items }).markup.includes('-struct-'), true);
});

const cases = [
  { tab: 0, key: 'sounds', answer: 'qux' }, { tab: 1, key: 'word-elements', answer: '-morphx-' },
  { tab: 2, key: 'real-words', answer: 'brindlex' }, { tab: 3, key: 'nonsense-words', answer: 'splontx' },
  { tab: 4, key: 'phrases', answer: 'carry zx lantern' }, { tab: 5, key: 'sentences', answer: 'The zx lantern blinked twice.' }
];
const renderPart8 = (tab: number, revealedItems: Record<string, boolean>, source: Lesson = lesson) => {
  const session = { ...createInitialLessonSession(), spellingViewMode: 'list' as const, spellingSectionOrderVersion: 2, spellingActiveTab: tab, spellingRevealedItems: revealedItems };
  const snapshot = createPresenterSnapshot('teacher-task8', 'run', source, LessonPart.Part8, null, session, [], true, 20 + tab);
  assert.ok(snapshot.lesson);
  const markup = renderToStaticMarkup(<Spelling data={snapshot.lesson.dictation} lessonStep={snapshot.lesson.step} lessonSubstep={snapshot.lesson.substep} viewMode={snapshot.session.spellingViewMode} activeTab={snapshot.session.spellingActiveTab} sectionOrderVersion={snapshot.session.spellingSectionOrderVersion} revealedItems={snapshot.session.spellingRevealedItems} gridPage={snapshot.session.spellingGridPage} isSyllabicated={snapshot.session.spellingIsSyllabicated} readOnly />);
  return { snapshot, markup };
};

test('actual presenter path hides all six Part 8 section answers until Reveal', () => {
  for (const item of cases) {
    const marker = `__part8-current__:${item.key}-0`;
    const hidden = renderPart8(item.tab, { [marker]: true });
    assert.match(hidden.markup, /Listen and write/i);
    assert.equal(JSON.stringify(hidden.snapshot).includes(item.answer), false, `${item.key} leaked in payload`);
    assert.equal(hidden.markup.includes(item.answer), false, `${item.key} leaked in render`);
    const shown = renderPart8(item.tab, { [marker]: true, [`${item.key}-0`]: true });
    assert.equal(JSON.stringify(shown.snapshot).includes(item.answer), true, `${item.key} missing from revealed payload`);
    if (item.key === 'sounds') assert.match(shown.markup, /data-part8-reveal-kind=\"sound\"/);
    else assert.equal(shown.markup.includes(item.answer), true, `${item.key} missing after reveal`);
  }
});

test('Part 8 Next removes the prior answer and starts the next item unrevealed', () => {
  const two = { ...lesson, dictation: { ...dictation, realWords: ['brindlex', 'cavernx'] } } as Lesson;
  const hidden = renderPart8(2, { '__part8-current__:real-words-1': true, 'real-words-0': true }, two);
  assert.match(hidden.markup, /Listen and write/i);
  assert.equal(JSON.stringify(hidden.snapshot).includes('brindlex'), false);
  assert.equal(JSON.stringify(hidden.snapshot).includes('cavernx'), false);
  const shown = renderPart8(2, { '__part8-current__:real-words-1': true, 'real-words-0': true, 'real-words-1': true }, two);
  assert.equal(shown.markup.includes('brindlex'), false);
  assert.equal(shown.markup.includes('cavernx'), true);
});
