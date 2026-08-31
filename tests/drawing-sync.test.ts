import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendDrawingStroke,
  DrawingStroke,
  projectDrawingPoint,
  updateDrawingSurface
} from '../legacy/drawingSync';
import { fitLessonStage, LESSON_STAGE_HEIGHT, LESSON_STAGE_WIDTH } from '../legacy/lessonStage';

const stroke: DrawingStroke = {
  id: 'stroke-1',
  color: '#4338ca',
  width: 4,
  points: [{ x: 0.1, y: 0.2 }, { x: 0.5, y: 0.7 }]
};

test('stores resolution-independent drawing points on a named lesson surface', () => {
  const next = updateDrawingSurface({}, 'sentence', appendDrawingStroke([], stroke));
  assert.deepEqual(next.sentence, [stroke]);
  assert.equal(next.sentence[0].points[1].x, 0.5);
});

test('updating one drawing surface preserves drawings on other lesson parts', () => {
  const original = { passage: [stroke] };
  const next = updateDrawingSurface(original, 'spelling-grid', []);
  assert.deepEqual(next.passage, [stroke]);
  assert.deepEqual(next['spelling-grid'], []);
  assert.notEqual(next, original);
});

test('projects normalized drawing points into the shared logical lesson stage', () => {
  assert.deepEqual(
    projectDrawingPoint({ x: 0.25, y: 0.75 }, LESSON_STAGE_WIDTH, LESSON_STAGE_HEIGHT),
    { x: 320, y: 540 }
  );
});

test('fits the lesson stage with one uniform scale and centered letterboxing', () => {
  const teacherFit = fitLessonStage(1000, 700);
  const studentFit = fitLessonStage(1366, 768);

  assert.equal(teacherFit.scale, 1000 / LESSON_STAGE_WIDTH);
  assert.equal(teacherFit.displayWidth, 1000);
  assert.equal(teacherFit.displayHeight, LESSON_STAGE_HEIGHT * teacherFit.scale);
  assert.equal(teacherFit.offsetX, 0);
  assert.equal(teacherFit.offsetY, (700 - teacherFit.displayHeight) / 2);

  assert.equal(studentFit.scale, 768 / LESSON_STAGE_HEIGHT);
  assert.equal(studentFit.displayHeight, 768);
  assert.equal(studentFit.offsetY, 0);
  assert.equal(studentFit.offsetX, (1366 - studentFit.displayWidth) / 2);
});
