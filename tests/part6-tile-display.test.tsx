import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import QuickDrill from '../legacy/components/modules/QuickDrill';
import { LessonRuntimeProvider } from '../legacy/components/lessonRuntimeContext';
import type { Lesson } from '../legacy/types';

const lessonWith = (wordElements: string[]): Lesson => ({
  schemaVersion: 2, id: 'part6-tiles', title: 'Part 6 tiles', step: '2', substep: '5', conceptNotes: '', slides: [],
  quickDrill: [], wordCards: [], sentences: [],
  dictation: { sounds: [], realWords: [], wordElements: [], nonsenseWords: [], phrases: [], sentences: [] },
  hfwList: [], affixPractice: [],
  runtimePlan: {
    schemaVersion: 'wrs-runtime-v1', id: 'part6-tiles', title: 'Part 6 tiles', step: '2', substep: '5', focus: 'accuracy',
    lessonPath: 'full', plannedParts: [6], sources: [],
    parts: [{ part: 6, title: '', teacherDirections: [], sourceIds: [], data: { wordElements } }]
  }
} as unknown as Lesson);

const render = (
  sounds: string[],
  opts: { index?: number; revealed?: number; readOnly?: boolean; wordElements?: string[]; items?: string[]; step?: string; substep?: string } = {}
) => renderToStaticMarkup(
  <LessonRuntimeProvider lesson={lessonWith(opts.wordElements ?? [])}>
    <QuickDrill
      sounds={sounds}
      isReverse
      step={opts.step}
      substep={opts.substep}
      currentIndex={opts.index ?? 0}
      revealedCount={opts.revealed ?? 0}
      shuffledItems={opts.items}
      readOnly={opts.readOnly}
    />
  </LessonRuntimeProvider>
);

const groupsIn = (markup: string) => [...markup.matchAll(/data-part6-group="([^"]*)"/g)].map(m => m[1]);
const tileCount = (markup: string) => (markup.match(/data-part2-role=/g) ?? []).length;

test('before reveal the LISTEN state is unchanged and shows no answers', () => {
  const markup = render(['/k/ → c, k, ck']);
  assert.match(markup, /data-part6-student-state="listen"/);
  assert.match(markup, />LISTEN<\/span>/);
  assert.equal(groupsIn(markup).length, 0);
  assert.doesNotMatch(markup, /data-part6-pronunciation/);
});

test('one reveal shows the pronunciation and every spelling group', () => {
  const markup = render(['/k/ → c, k, ck'], { revealed: 1 });
  assert.match(markup, /data-part6-student-state="revealed"/);
  assert.match(markup, /data-part6-pronunciation[^>]*>\/k\/</);
  assert.deepEqual(groupsIn(markup), ['c', 'k', 'ck']);
  assert.equal(tileCount(markup), 3);
  assert.match(markup, /data-part2-role="consonant-digraph"/);
});

test('groups are counted separately from tiles (a-e is one group of three tiles)', () => {
  const markup = render(['/ā/ → a-e, a'], { revealed: 1 });
  assert.deepEqual(groupsIn(markup), ['a-e', 'a']);
  assert.equal(tileCount(markup), 4);
  const vce = markup.match(/data-part6-group="a-e"[\s\S]*?(?=data-part6-group="a")/)![0];
  assert.equal((vce.match(/data-part2-role=/g) ?? []).length, 3);
  assert.match(vce, /data-part2-role="consonant"[^>]*><span[^>]*><\/span>/);
  assert.match(markup, /\/ā\//);
});

test('doubled consonants show one group', () => {
  assert.deepEqual(groupsIn(render(['/s/ → s, ss'], { revealed: 1 })), ['s']);
});

test('fallback answers use the normalized matcher (/ȯl/ finds all)', () => {
  const markup = render(['/ȯl/'], { revealed: 1, step: '2', substep: '5' });
  assert.deepEqual(groupsIn(markup), ['all']);
  assert.match(markup, /data-part2-role="welded"/);
  assert.match(markup, /\/ȯl\//);
});

test('no answers shows the pronunciation and a muted note', () => {
  const markup = render(['/zq/'], { revealed: 1 });
  assert.match(markup, /\/zq\//);
  assert.match(markup, /No answer listed for this sound\./);
  assert.equal(groupsIn(markup).length, 0);
});

test('Answer Check panel is gone in Part 6 but kept in Part 1', () => {
  assert.doesNotMatch(render(['/k/ → c'], { revealed: 1 }), /Answer Check/);
  const part1 = renderToStaticMarkup(<QuickDrill sounds={['a']} step="1" substep="1" />);
  assert.match(part1, /Answer Check/);
});

test('word elements render as Wilson cards by dash role', () => {
  const items = ['/k/ → c', 'word-element::-s', 'word-element::-struct-'];
  const suffix = render(['/k/ → c'], { wordElements: ['-s', '-struct-'], items, index: 1, revealed: 1 });
  assert.match(suffix, /data-part2-role="suffix"/);
  assert.match(suffix, />-s<\/span>/);
  assert.doesNotMatch(suffix, /data-part6-pronunciation/);
  const base = render(['/k/ → c'], { wordElements: ['-s', '-struct-'], items, index: 2, revealed: 1 });
  assert.match(base, /data-part2-role="base-element"/);
  assert.match(base, />-struct-<\/span>/);
});

test('progress counter moves to the header and keeps its attribute', () => {
  const markup = render(['/k/ → c', '/s/ → s'], { index: 1 });
  assert.match(markup, /data-part6-section-progress[^>]*>2 \/ 2</);
  assert.ok(markup.indexOf('data-part6-section-progress') < markup.indexOf('data-part6-section="sounds"') + 400);
  assert.doesNotMatch(render(['/k/ → c'], { readOnly: true }), /data-part6-section-progress/);
});
