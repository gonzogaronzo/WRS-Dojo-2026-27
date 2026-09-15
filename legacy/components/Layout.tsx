import React from 'react';
import LayoutLegacy from './LayoutLegacy';
import { LessonRuntimeProvider } from './lessonRuntimeContext';
import { serializeCanonicalLesson } from '../canonicalLesson';

type LayoutProps = React.ComponentProps<typeof LayoutLegacy>;

const downloadCanonicalLesson = (lesson: LayoutProps['lesson']) => {
  const json = serializeCanonicalLesson(lesson);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `wrs_runtime_${lesson.step}_${lesson.substep}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const Layout: React.FC<LayoutProps> = (props) => (
  <LessonRuntimeProvider lesson={props.lesson}>
    <div className="relative h-full w-full">
      {!props.isStudentView && props.lesson.runtimePlan ? (
        <button
          type="button"
          data-canonical-export
          onClick={() => downloadCanonicalLesson(props.lesson)}
          className="fixed right-5 top-4 z-[90] rounded-xl border border-stone-300 bg-white/95 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-stone-600 shadow-lg backdrop-blur hover:text-red-800"
          title="Export the authoritative wrs-runtime-v1 lesson JSON"
        >
          Export Canonical JSON
        </button>
      ) : null}
      <LayoutLegacy {...props} />
    </div>
  </LessonRuntimeProvider>
);

export default Layout;
