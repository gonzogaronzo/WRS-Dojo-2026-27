from pathlib import Path
import json

p = Path('legacy/presenterMode.ts')
text = p.read_text()
marker = '// TASK 8: live presenter privacy gate'

if marker not in text:
    url_start = text.index('export const createStudentDisplayUrl')
    url_end = text.index('\n};', url_start) + 3
    helper = r'''

// TASK 8: live presenter privacy gate
const PART8_SECTION_KEYS = ['sounds', 'word-elements', 'real-words', 'nonsense-words', 'phrases', 'sentences'] as const;
const PART8_LEGACY_TO_CURRENT: number[] = [0, 2, 1, 3, 4, 5];
type Part8SectionKey = typeof PART8_SECTION_KEYS[number];

const part8RevealState = (session: LessonSessionState) => {
  const activeIndex = session.spellingSectionOrderVersion < 2
    ? (PART8_LEGACY_TO_CURRENT[session.spellingActiveTab] ?? 0)
    : session.spellingActiveTab;
  const boundedIndex = Math.max(0, Math.min(activeIndex, PART8_SECTION_KEYS.length - 1));
  const sectionKey: Part8SectionKey = PART8_SECTION_KEYS[boundedIndex];
  const currentPrefix = `__part8-current__:${sectionKey}-`;
  const currentEntry = Object.entries(session.spellingRevealedItems || {}).find(
    ([key, value]) => Boolean(value) && key.startsWith(currentPrefix)
  );
  const parsedIndex = currentEntry ? Number.parseInt(currentEntry[0].slice(currentPrefix.length), 10) : 0;
  const itemIndex = Number.isFinite(parsedIndex) && parsedIndex >= 0 ? parsedIndex : 0;
  const currentMarker = `${currentPrefix}${itemIndex}`;
  const answerMarker = `${sectionKey}-${itemIndex}`;
  return {
    sectionKey,
    itemIndex,
    currentMarker,
    answerMarker,
    revealed: Boolean(session.spellingRevealedItems?.[currentMarker] && session.spellingRevealedItems?.[answerMarker])
  };
};
'''
    text = text[:url_end] + helper + text[url_end:]

    start = text.index('  if (currentPart === LessonPart.Part1 || currentPart === LessonPart.Part6) {')
    end_marker = '  } else if (currentPart === LessonPart.Part2 || currentPart === LessonPart.Part7) {'
    end = text.index(end_marker, start)
    replacement = '''  if (currentPart === LessonPart.Part1) {
    compact.quickDrillIndex = session.quickDrillIndex;
    compact.quickDrillRevealed = session.quickDrillRevealed;
    compact.quickDrillHandwriting = session.quickDrillHandwriting;
    compact.quickDrillItems = session.quickDrillItems;
  } else if (currentPart === LessonPart.Part6) {
    const revealed = session.quickDrillRevealed > 0;
    compact.quickDrillIndex = revealed ? session.quickDrillIndex : 0;
    compact.quickDrillRevealed = session.quickDrillRevealed;
    compact.quickDrillHandwriting = revealed ? session.quickDrillHandwriting : false;
    compact.quickDrillItems = revealed ? session.quickDrillItems : [];
    if (!revealed) compact.drawings = {};
'''
    text = text[:start] + replacement + text[end:]

    start = text.index('  } else if (currentPart === LessonPart.Part8) {', text.index('export const sanitizePresenterSession'))
    end_marker = '  } else if (currentPart === LessonPart.Part9) {'
    end = text.index(end_marker, start)
    replacement = '''  } else if (currentPart === LessonPart.Part8) {
    const revealState = part8RevealState(session);
    compact.dictationCompletedIds = session.dictationCompletedIds;
    compact.spellingViewMode = 'list';
    compact.spellingSectionOrderVersion = session.spellingSectionOrderVersion;
    compact.spellingActiveTab = session.spellingActiveTab;
    compact.spellingRevealedItems = {
      [revealState.currentMarker]: true,
      ...(revealState.revealed ? { [revealState.answerMarker]: true } : {})
    };
    compact.spellingCipherWord = null;
    compact.spellingCipherResults = {};
    compact.spellingCipherCheckResult = null;
    compact.spellingGridPage = session.spellingGridPage;
    compact.spellingIsSyllabicated = session.spellingIsSyllabicated;
    compact.spellingMarks = revealState.revealed && showDrawings ? session.spellingMarks : [];
    if (!revealState.revealed) compact.drawings = {};
'''
    text = text[:start] + replacement + text[end:]

    empty_start = text.index("const emptyDictation = (): Lesson['dictation'] => ({")
    empty_end = text.index('\n});', empty_start) + 4
    part8_helper = r'''

const studentPart8Dictation = (lesson: Lesson, session: LessonSessionState): Lesson['dictation'] => {
  const redacted: Lesson['dictation'] = {
    sounds: lesson.dictation.sounds.map(() => ''),
    realWords: lesson.dictation.realWords.map(() => ''),
    wordElements: lesson.dictation.wordElements.map(() => ''),
    nonsenseWords: lesson.dictation.nonsenseWords.map(() => ''),
    phrases: lesson.dictation.phrases.map(() => ''),
    sentences: lesson.dictation.sentences.map(() => '')
  };
  const revealState = part8RevealState(session);
  if (!revealState.revealed) return redacted;
  const index = revealState.itemIndex;
  if (revealState.sectionKey === 'sounds' && lesson.dictation.sounds[index] !== undefined) redacted.sounds[index] = lesson.dictation.sounds[index];
  if (revealState.sectionKey === 'word-elements' && lesson.dictation.wordElements[index] !== undefined) redacted.wordElements[index] = lesson.dictation.wordElements[index];
  if (revealState.sectionKey === 'real-words' && lesson.dictation.realWords[index] !== undefined) redacted.realWords[index] = lesson.dictation.realWords[index];
  if (revealState.sectionKey === 'nonsense-words' && lesson.dictation.nonsenseWords[index] !== undefined) redacted.nonsenseWords[index] = lesson.dictation.nonsenseWords[index];
  if (revealState.sectionKey === 'phrases' && lesson.dictation.phrases[index] !== undefined) redacted.phrases[index] = lesson.dictation.phrases[index];
  if (revealState.sectionKey === 'sentences' && lesson.dictation.sentences[index] !== undefined) redacted.sentences[index] = lesson.dictation.sentences[index];
  return redacted;
};
'''
    text = text[:empty_end] + part8_helper + text[empty_end:]

    old_sig = "export const sanitizePresenterLesson = (\n  lesson: Lesson | null,\n  currentPart: LessonPart\n): Lesson | null => {"
    new_sig = "export const sanitizePresenterLesson = (\n  lesson: Lesson | null,\n  currentPart: LessonPart,\n  session?: LessonSessionState\n): Lesson | null => {"
    assert old_sig in text
    text = text.replace(old_sig, new_sig, 1)

    lesson_start = text.index('export const sanitizePresenterLesson')
    start = text.index('  } else if (currentPart === LessonPart.Part6) {', lesson_start)
    end = text.index('  } else if (currentPart === LessonPart.Part9) {', start)
    replacement = '''  } else if (currentPart === LessonPart.Part6) {
    const revealed = !session || session.quickDrillRevealed > 0;
    compact.quickDrill = revealed ? lesson.quickDrill : ['LISTEN'];
    compact.quickDrillReverse = revealed ? lesson.quickDrillReverse : ['LISTEN'];
    const part6 = lesson.runtimePlan?.parts.find(part => part.part === 6);
    if (lesson.runtimePlan && part6) {
      compact.runtimePlan = studentRuntimeForPart(lesson.runtimePlan, 6, {
        wordElements: revealed && Array.isArray(part6.data.wordElements)
          ? part6.data.wordElements.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          : []
      });
    }
  } else if (currentPart === LessonPart.Part8) {
    compact.dictation = session ? studentPart8Dictation(lesson, session) : lesson.dictation;
'''
    text = text[:start] + replacement + text[end:]

    old_call = 'lesson: sanitizePresenterLesson(lesson, currentPart),'
    assert old_call in text
    text = text.replace(old_call, 'lesson: sanitizePresenterLesson(lesson, currentPart, session),', 1)
    p.write_text(text)

quick = Path('legacy/components/modules/QuickDrill.tsx')
q = quick.read_text()
q = q.replace('>Listen</span>', '>LISTEN</span>')
quick.write_text(q)

test_path = Path('tests/part6-part8-preview-privacy.test.tsx')
test_path.write_text(r'''import assert from 'node:assert/strict';
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
    assert.equal(shown.markup.includes(item.answer), true, `${item.key} missing after reveal`);
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
''')

pkg = Path('package.json')
data = json.loads(pkg.read_text())
needle = 'tests/canonical-lesson-surfaces.test.tsx tests/export-placement.test.tsx'
inserted = 'tests/canonical-lesson-surfaces.test.tsx tests/part6-part8-preview-privacy.test.tsx tests/export-placement.test.tsx'
if inserted not in data['scripts']['test']:
    assert needle in data['scripts']['test']
    data['scripts']['test'] = data['scripts']['test'].replace(needle, inserted, 1)
    pkg.write_text(json.dumps(data, indent=2) + '\n')
