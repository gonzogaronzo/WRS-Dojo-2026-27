import { useCallback, useEffect, useRef, useState } from 'react';

export interface DrawingPoint {
  x: number;
  y: number;
}

export interface DrawingStroke {
  id: string;
  color: string;
  width: number;
  points: DrawingPoint[];
}

export type DrawingMap = Record<string, DrawingStroke[]>;
export type DrawingTool = 'cursor' | 'pen' | 'pen-blue' | 'pen-red';

const MAX_STROKES_PER_SURFACE = 60;
const MAX_POINTS_PER_STROKE = 400;

export const appendDrawingStroke = (strokes: DrawingStroke[], stroke: DrawingStroke) =>
  [...strokes, { ...stroke, points: stroke.points.slice(0, MAX_POINTS_PER_STROKE) }]
    .slice(-MAX_STROKES_PER_SURFACE);

export const updateDrawingSurface = (
  drawings: DrawingMap,
  surface: string,
  strokes: DrawingStroke[]
): DrawingMap => ({
  ...drawings,
  [surface]: strokes
});

export const projectDrawingPoint = (point: DrawingPoint, width: number, height: number) => ({
  x: point.x * width,
  y: point.y * height
});

const colorForTool = (tool: DrawingTool) => {
  if (tool === 'pen-blue') return '#4338ca';
  return '#b91c1c';
};

const drawStroke = (
  context: CanvasRenderingContext2D,
  stroke: DrawingStroke,
  width: number,
  height: number
) => {
  if (!stroke.points.length) return;
  context.beginPath();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = stroke.width;
  context.strokeStyle = stroke.color;
  const first = projectDrawingPoint(stroke.points[0], width, height);
  context.moveTo(first.x, first.y);
  if (stroke.points.length === 1) context.lineTo(first.x, first.y);
  stroke.points.slice(1).forEach(point => {
    const projected = projectDrawingPoint(point, width, height);
    context.lineTo(projected.x, projected.y);
  });
  context.stroke();
};

interface UseSyncedDrawingCanvasOptions {
  strokes?: DrawingStroke[];
  onUpdateStrokes?: (strokes: DrawingStroke[]) => void;
  tool: DrawingTool;
  lineWidth?: number;
  readOnly?: boolean;
}

export const useSyncedDrawingCanvas = ({
  strokes: syncedStrokes,
  onUpdateStrokes,
  tool,
  lineWidth = 4,
  readOnly = false
}: UseSyncedDrawingCanvasOptions) => {
  const [localStrokes, setLocalStrokes] = useState<DrawingStroke[]>([]);
  const strokes = (syncedStrokes ?? localStrokes).filter((stroke): stroke is DrawingStroke => (
    Boolean(stroke?.id) && Array.isArray(stroke?.points)
  ));
  const strokesRef = useRef(strokes);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const logicalSizeRef = useRef({ width: 0, height: 0 });
  const activeStrokeRef = useRef<DrawingStroke | null>(null);
  const isDrawingRef = useRef(false);
  const lastPartialSyncRef = useRef(0);
  strokesRef.current = strokes;

  const setStrokes = useCallback((next: DrawingStroke[]) => {
    if (onUpdateStrokes) onUpdateStrokes(next);
    else setLocalStrokes(next);
  }, [onUpdateStrokes]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    if (!width || !height) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    strokesRef.current.forEach(stroke => drawStroke(context, stroke, width, height));
    logicalSizeRef.current = { width, height };
    rectRef.current = canvas.getBoundingClientRect();
  }, []);

  useEffect(() => {
    redraw();
  }, [redraw, strokes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!parent) return;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(redraw);
    observer?.observe(parent);
    window.addEventListener('resize', redraw);
    const frame = window.requestAnimationFrame(redraw);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', redraw);
      window.cancelAnimationFrame(frame);
    };
  }, [redraw]);

  const pointForEvent = (event: React.PointerEvent): DrawingPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    rectRef.current = rect;
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    };
  };

  const drawLatestSegment = (stroke: DrawingStroke) => {
    const canvas = canvasRef.current;
    const logicalSize = logicalSizeRef.current;
    const context = canvas?.getContext('2d');
    if (!context || !logicalSize.width || !logicalSize.height || !stroke.points.length) return;
    const points = stroke.points;
    const from = projectDrawingPoint(
      points[Math.max(0, points.length - 2)],
      logicalSize.width,
      logicalSize.height
    );
    const to = projectDrawingPoint(
      points[points.length - 1],
      logicalSize.width,
      logicalSize.height
    );
    context.beginPath();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = stroke.width;
    context.strokeStyle = stroke.color;
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (readOnly || tool === 'cursor') return;
    const point = pointForEvent(event);
    if (!point) return;
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    const stroke: DrawingStroke = {
      id: globalThis.crypto?.randomUUID?.() || `stroke-${Date.now()}-${Math.random()}`,
      color: colorForTool(tool),
      width: lineWidth,
      points: [point]
    };
    activeStrokeRef.current = stroke;
    isDrawingRef.current = true;
    drawLatestSegment(stroke);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const stroke = activeStrokeRef.current;
    if (!isDrawingRef.current || !stroke) return;
    const point = pointForEvent(event);
    if (!point) return;
    const previous = stroke.points[stroke.points.length - 1];
    if (Math.hypot(point.x - previous.x, point.y - previous.y) < 0.0015) return;
    if (stroke.points.length < MAX_POINTS_PER_STROKE) stroke.points.push(point);
    drawLatestSegment(stroke);
    const now = Date.now();
    if (now - lastPartialSyncRef.current >= 120) {
      lastPartialSyncRef.current = now;
      const next = [
        ...strokesRef.current.filter(existing => existing.id !== stroke.id),
        { ...stroke, points: [...stroke.points] }
      ].slice(-MAX_STROKES_PER_SURFACE);
      strokesRef.current = next;
      setStrokes(next);
    }
  };

  const finishStroke = (event: React.PointerEvent) => {
    if (!isDrawingRef.current) return;
    if ((event.currentTarget as Element).hasPointerCapture?.(event.pointerId)) {
      (event.currentTarget as Element).releasePointerCapture(event.pointerId);
    }
    const stroke = activeStrokeRef.current;
    activeStrokeRef.current = null;
    isDrawingRef.current = false;
    if (stroke) {
      const withoutPartial = strokesRef.current.filter(existing => existing.id !== stroke.id);
      const next = appendDrawingStroke(withoutPartial, stroke);
      strokesRef.current = next;
      setStrokes(next);
    }
  };

  const clear = useCallback(() => {
    strokesRef.current = [];
    setStrokes([]);
  }, [setStrokes]);

  return {
    canvasRef,
    clear,
    onPointerDown,
    onPointerMove,
    onPointerUp: finishStroke,
    onPointerCancel: finishStroke
  };
};
