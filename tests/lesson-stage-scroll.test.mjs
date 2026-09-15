import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sourceUrl = new URL('../legacy/components/LessonStage.tsx', import.meta.url);
const source = readFileSync(sourceUrl, 'utf8');

test('teacher lesson stage owns vertical overflow without changing fixed stage geometry', () => {
  assert.match(source, /width:\s*LESSON_STAGE_WIDTH/);
  assert.match(source, /height:\s*LESSON_STAGE_HEIGHT/);
  assert.match(source, /transform:\s*`scale\(/);
  assert.match(source, /transformOrigin:\s*'top left'/);
  assert.match(source, /data-lesson-stage-scroll-owner=\{isStudentDisplay \? undefined : 'teacher'\}/);
  assert.match(source, /overflow-x-hidden overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar/);
  assert.match(source, /tabIndex=\{isStudentDisplay \? undefined : 0\}/);
});

test('teacher wheel input reaches stage overflow while preserving usable inner scroll regions', () => {
  assert.match(source, /stage\.addEventListener\('wheel', handleWheel, \{ passive: false \}\)/);
  assert.match(source, /while \(node && node !== stage\)/);
  assert.match(source, /if \(canScrollVertically\(node, logicalDelta\)\) return/);
  assert.match(source, /event\.preventDefault\(\)/);
  assert.match(source, /stage\.scrollTop \+= logicalDelta/);
});

test('student display remains clipped and does not become an independent scroll surface', () => {
  assert.match(source, /isStudentDisplayRequest\(window\.location\.search\)/);
  assert.match(source, /isStudentDisplay\s*\?\s*'overflow-hidden'/);
  assert.doesNotMatch(source, /data-lesson-stage-scroll-owner=['\"]student['\"]/);
});
