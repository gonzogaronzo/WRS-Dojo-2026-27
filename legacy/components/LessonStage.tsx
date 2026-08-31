import React from 'react';
import {
  fitLessonStage,
  LESSON_STAGE_HEIGHT,
  LESSON_STAGE_WIDTH,
  LessonStageFit
} from '../lessonStage';

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

const LessonStage: React.FC<LessonStageProps> = ({ children }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [fit, setFit] = React.useState<LessonStageFit>(EMPTY_FIT);

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

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-stone-100"
      data-lesson-stage-viewport
    >
      <div
        className="absolute overflow-hidden bg-[#fcfbf9]"
        data-lesson-stage
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
