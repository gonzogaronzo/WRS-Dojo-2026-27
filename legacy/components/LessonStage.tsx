import React from 'react';
import {
  fitLessonStage,
  LESSON_STAGE_HEIGHT,
  LESSON_STAGE_WIDTH,
  LessonStageFit
} from '../lessonStage';
import { isStudentDisplayRequest } from '../presenterMode';

interface LessonStageProps {
  children: React.ReactNode;
}

const LessonStageScaleContext = React.createContext(1);

export const useLessonStageScale = () => React.useContext(LessonStageScaleContext);

const EMPTY_FIT: LessonStageFit = {
  scale: 0,
  offsetX: 0,
  offsetY: 0,
  displayWidth: 0,
  displayHeight: 0
};

const canScrollVertically = (element: HTMLElement, deltaY: number) => {
  if (element.scrollHeight <= element.clientHeight + 1) return false;
  const overflowY = window.getComputedStyle(element).overflowY;
  if (overflowY !== 'auto' && overflowY !== 'scroll') return false;
  if (deltaY < 0) return element.scrollTop > 0;
  if (deltaY > 0) return element.scrollTop < element.scrollHeight - element.clientHeight - 1;
  return false;
};

const wheelPixels = (event: WheelEvent, pageHeight: number) => {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 40;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * pageHeight;
  return event.deltaY;
};

const LessonStage: React.FC<LessonStageProps> = ({ children }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const [fit, setFit] = React.useState<LessonStageFit>(EMPTY_FIT);
  const isStudentDisplay = typeof window !== 'undefined' && isStudentDisplayRequest(window.location.search);

  const measure = React.useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    setFit(fitLessonStage(container.clientWidth, container.clientHeight));
  }, []);

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(container);
    window.addEventListener('resize', measure);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  React.useEffect(() => {
    if (isStudentDisplay) return;
    const stage = stageRef.current;
    if (!stage) return;

    const handleWheel = (event: WheelEvent) => {
      const logicalDelta = wheelPixels(event, stage.clientHeight) / Math.max(fit.scale || 1, 0.01);
      if (!logicalDelta) return;

      // Preserve purpose-built inner scroll regions when they can still move.
      let node = event.target instanceof HTMLElement ? event.target : null;
      while (node && node !== stage) {
        if (canScrollVertically(node, logicalDelta)) return;
        node = node.parentElement;
      }

      if (!canScrollVertically(stage, logicalDelta)) return;
      event.preventDefault();
      event.stopPropagation();
      stage.scrollTop += logicalDelta;
    };

    stage.addEventListener('wheel', handleWheel, { passive: false });
    return () => stage.removeEventListener('wheel', handleWheel);
  }, [fit.scale, isStudentDisplay]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-stone-100"
      data-lesson-stage-viewport
    >
      <div
        ref={stageRef}
        className={`absolute bg-[#fcfbf9] ${
          isStudentDisplay
            ? 'overflow-hidden'
            : 'overflow-x-hidden overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar'
        }`}
        data-lesson-stage
        data-lesson-stage-scroll-owner={isStudentDisplay ? undefined : 'teacher'}
        tabIndex={isStudentDisplay ? undefined : 0}
        aria-label={isStudentDisplay ? undefined : 'Scrollable lesson content'}
        style={{
          width: LESSON_STAGE_WIDTH,
          height: LESSON_STAGE_HEIGHT,
          left: fit.offsetX,
          top: fit.offsetY,
          opacity: fit.scale > 0 ? 1 : 0,
          transform: `scale(${fit.scale || 1})`,
          transformOrigin: 'top left'
        }}
      >
        <LessonStageScaleContext.Provider value={fit.scale || 1}>
          {children}
        </LessonStageScaleContext.Provider>
      </div>
    </div>
  );
};

export default LessonStage;
