import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  createNativeActivationGuard,
  hasShortcutModifier,
  isTypingTarget,
  lastPlacedCardIndex,
  lessonPartDelta,
  nextUnplacedCardIndex,
  resolvePart2Key,
  resolvePassageKey,
  shortcutsAllowed,
  stepLessonPart,
  type Part2KeyState
} from '../legacy/keyboardShortcuts';
import { part2BuildFit, part2LineLayout } from '../legacy/components/modules/Part2InteractiveRunner';
import { LessonPart } from '../legacy/types';

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const element = (tagName: string, extra: Record<string, unknown> = {}) => ({ tagName, ...extra });

test('isTypingTarget flags input, textarea, select and contenteditable only', () => {
  assert.equal(isTypingTarget({ target: element('INPUT') }), true);
  assert.equal(isTypingTarget({ target: element('textarea') }), true);
  assert.equal(isTypingTarget({ target: element('SELECT') }), true);
  assert.equal(isTypingTarget({ target: element('DIV', { isContentEditable: true }) }), true);
  assert.equal(isTypingTarget({ target: element('DIV', { getAttribute: (name: string) => name === 'contenteditable' ? 'true' : null }) }), true);
  assert.equal(isTypingTarget({ target: element('DIV', { getAttribute: () => 'false' }) }), false);
  assert.equal(isTypingTarget({ target: element('DIV', { isContentEditable: false, getAttribute: () => null }) }), false);
  assert.equal(isTypingTarget({ target: element('BUTTON') }), false);
  assert.equal(isTypingTarget({ target: null }), false);
  assert.equal(isTypingTarget({}), false);
});

test('shortcuts ignore Ctrl, Meta and Alt but allow Shift', () => {
  assert.equal(hasShortcutModifier({ ctrlKey: true }), true);
  assert.equal(hasShortcutModifier({ metaKey: true }), true);
  assert.equal(hasShortcutModifier({ altKey: true }), true);
  assert.equal(shortcutsAllowed({ key: 's', metaKey: true, target: element('BODY') }), false);
  assert.equal(shortcutsAllowed({ key: '?', target: element('BODY') }), true);
  assert.equal(shortcutsAllowed({ key: ' ', target: element('INPUT') }), false);
});

const state = (overrides: Partial<Part2KeyState> = {}): Part2KeyState => ({
  pullStack: true, unplacedCount: 3, placedCount: 0, readOnly: false, ...overrides
});

test('resolvePart2Key: stack with cards places one card; Enter lays out the word', () => {
  assert.equal(resolvePart2Key(' ', state()), 'place-next-card');
  assert.equal(resolvePart2Key('ArrowRight', state()), 'place-next-card');
  assert.equal(resolvePart2Key('Enter', state()), 'lay-out-all');
});

test('resolvePart2Key: empty stack and non-stack moves advance; Enter does nothing', () => {
  assert.equal(resolvePart2Key(' ', state({ unplacedCount: 0, placedCount: 3 })), 'next-move');
  assert.equal(resolvePart2Key('ArrowRight', state({ unplacedCount: 0, placedCount: 3 })), 'next-move');
  assert.equal(resolvePart2Key('Enter', state({ unplacedCount: 0, placedCount: 3 })), null);
  assert.equal(resolvePart2Key(' ', state({ pullStack: false })), 'next-move');
  assert.equal(resolvePart2Key('Enter', state({ pullStack: false })), null);
});

test('resolvePart2Key: ArrowLeft returns a placed card, else goes back', () => {
  assert.equal(resolvePart2Key('ArrowLeft', state({ placedCount: 1, unplacedCount: 2 })), 'return-card');
  assert.equal(resolvePart2Key('ArrowLeft', state({ placedCount: 0 })), 'previous-move');
  assert.equal(resolvePart2Key('ArrowLeft', state({ pullStack: false, placedCount: 2 })), 'previous-move');
});

test('resolvePart2Key: readOnly handles nothing, and other keys are ignored', () => {
  for (const key of [' ', 'ArrowRight', 'ArrowLeft', 'Enter']) {
    assert.equal(resolvePart2Key(key, state({ readOnly: true })), null);
  }
  assert.equal(resolvePart2Key('a', state()), null);
  assert.equal(resolvePart2Key('Space', state()), null);
  assert.equal(resolvePart2Key('PageDown', state()), null);
});

test('next card is the lowest unplaced stagingOrder; return is the highest placed', () => {
  const cards = [
    { stagingOrder: 3, placed: false },
    { stagingOrder: 1, placed: true },
    { stagingOrder: 2, placed: false },
    { stagingOrder: 4, placed: true }
  ];
  assert.equal(nextUnplacedCardIndex(cards), 2);
  assert.equal(lastPlacedCardIndex(cards), 3);
  assert.equal(nextUnplacedCardIndex(cards.map(card => ({ ...card, placed: true }))), -1);
  assert.equal(lastPlacedCardIndex(cards.map(card => ({ ...card, placed: false }))), -1);
});

test('a placed card lands where layOutWord() would put it, and the runner wires the same path', () => {
  const objects = [
    { role: 'consonant' as const, text: 'sh' },
    { role: 'vowel' as const, text: 'i' },
    { role: 'consonant' as const, text: 'p' }
  ];
  const positions = part2LineLayout(objects, part2BuildFit(objects));
  assert.equal(positions.length, 3);
  const runner = source('legacy/components/modules/Part2InteractiveRunner.tsx');
  assert.match(runner, /part2LineLayout\(orderedObjects, buildFit\)\[index\]/);
  assert.match(runner, /updateCurrentState\(key, \{ \.\.\.position, placed: true \}\)/);
  assert.match(runner, /placed: false\s*\n\s*\}\);/);
  assert.match(runner, /layOutWord\(\);/);
  assert.match(runner, /navigate\(action === 'next-move' \? 'next' : 'back'\)/);
});

test('Part navigation clamps at Part 1 and Part 10 and never touches the Briefing', () => {
  assert.equal(stepLessonPart(LessonPart.Part1, 1), LessonPart.Part2);
  assert.equal(stepLessonPart(LessonPart.Part2, -1), LessonPart.Part1);
  assert.equal(stepLessonPart(LessonPart.Part9, 1), LessonPart.Part10);
  assert.equal(stepLessonPart(LessonPart.Part10, 1), null);
  assert.equal(stepLessonPart(LessonPart.Part1, -1), null);
  assert.equal(stepLessonPart(LessonPart.Briefing, 1), null);
  assert.equal(stepLessonPart(LessonPart.Briefing, -1), null);
  assert.equal(lessonPartDelta('PageDown'), 1);
  assert.equal(lessonPartDelta('PageUp'), -1);
  assert.equal(lessonPartDelta('ArrowDown'), null);
});

test('App wires Part keys through changeLessonPart for the teacher window only', () => {
  const app = source('legacy/App.tsx');
  assert.match(app, /const teacherShortcutsActive = mode === 'run' && Boolean\(currentLesson\) && !isStudentView && !isStudentDisplayWindow/);
  assert.match(app, /changeLessonPart\(nextPart\)/);
  assert.match(app, /teacherShortcutsActive && isCheatSheetOpen && \(/);
  assert.doesNotMatch(app, /Digit[0-9]|case '[0-9]'/);
});

test('PassageReadingLegacy: Space (event.key " ") advances, guarded and prevented', () => {
  assert.equal(resolvePassageKey(' '), 'next');
  assert.equal(resolvePassageKey('ArrowRight'), 'next');
  assert.equal(resolvePassageKey('ArrowLeft'), 'previous');
  assert.equal(resolvePassageKey('Space'), null);
  const passage = source('legacy/components/modules/PassageReadingLegacy.tsx');
  assert.doesNotMatch(passage, /'Space'/);
  assert.match(passage, /resolvePassageKey\(e\.key\)/);
  assert.match(passage, /shortcutsAllowed\(e\)/);
  assert.match(passage, /guard\.handled\(e\)/);
});

test('one key press = one action: a handled Space/Enter cancels the focused button\'s native click', () => {
  const calls: string[] = [];
  const guard = createNativeActivationGuard();
  const press = (key: string) => ({ key, preventDefault: () => calls.push(`prevent:${key}`) });

  // Enter activates on keydown, so preventDefault on the handled keydown is enough.
  guard.handled(press('Enter'));
  assert.deepEqual(calls, ['prevent:Enter']);
  assert.equal(guard.onKeyUp(press('Enter')), false);

  // Space activates on keyup, so the keyup after a handled Space keydown is cancelled once.
  calls.length = 0;
  guard.handled(press(' '));
  assert.equal(guard.onKeyUp(press(' ')), true);
  assert.deepEqual(calls, ['prevent: ', 'prevent: ']);
  assert.equal(guard.onKeyUp(press(' ')), false);

  // A Space keyup whose keydown was not ours (e.g. typing) is left alone.
  calls.length = 0;
  assert.equal(createNativeActivationGuard().onKeyUp(press(' ')), false);
  assert.deepEqual(calls, []);
});

test('runner and passage register the keyup guard alongside keydown', () => {
  for (const path of ['legacy/components/modules/Part2InteractiveRunner.tsx', 'legacy/components/modules/PassageReadingLegacy.tsx']) {
    const text = source(path);
    assert.match(text, /createNativeActivationGuard\(\)/);
    assert.match(text, /addEventListener\('keyup'/);
    assert.match(text, /removeEventListener\('keyup'/);
  }
});
