import React from 'react';
import { BookOpen, ClipboardCheck, Headphones } from 'lucide-react';
import type { ListeningComprehensionPlan } from '../../types';

interface Part10ListeningProps {
  plan?: ListeningComprehensionPlan;
  readOnly?: boolean;
  onOpenDossier?: () => void;
}

const Part10Listening: React.FC<Part10ListeningProps> = ({
  plan,
  readOnly = false,
  onOpenDossier
}) => {
  const hasPlan = Boolean(plan && plan.mode === 'teacher-selected' && plan.studentPrompt.trim());

  return (
    <section
      data-part10-status={hasPlan ? 'ready' : 'blocked'}
      className="min-h-full flex flex-col items-center justify-center bg-stone-950 p-8 text-center text-white"
    >
      <div className="w-full max-w-4xl rounded-[2rem] border border-stone-800 bg-stone-900/70 p-8 shadow-2xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-800 text-white">
          <Headphones className="h-8 w-8" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-red-300">Part 10 · Listening comprehension</p>
        {hasPlan ? (
          <>
            {!readOnly ? (
              <>
                <h2 className="mt-4 font-serif text-4xl font-black text-white">{plan?.title || 'Teacher-selected text'}</h2>
                {plan?.teacherDirections.length ? (
                  <ol data-part10-teacher-directions className="mx-auto mt-6 max-w-3xl space-y-3 text-left text-base leading-relaxed text-stone-200">
                    {plan.teacherDirections.map((direction, index) => <li key={index}>{direction}</li>)}
                  </ol>
                ) : null}
              </>
            ) : null}
            <p data-part10-student-prompt className="mx-auto mt-6 max-w-2xl font-serif text-2xl leading-relaxed text-stone-100">
              {plan?.studentPrompt}
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-4 font-serif text-4xl font-black text-white">
              {readOnly ? 'Waiting for the listening text' : 'Part 10 source plan needed'}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-stone-300">
              {readOnly
                ? 'The teacher will begin when a teacher-selected listening text is ready.'
                : 'No Part 10 text or student prompt was supplied for this lesson. Choose a teacher-selected text before beginning Part 10.'}
            </p>
          </>
        )}
        {!readOnly && onOpenDossier ? (
          <button
            type="button"
            data-part10-open-dossier
            onClick={onOpenDossier}
            className="mx-auto mt-8 inline-flex items-center gap-2 rounded-xl border border-stone-600 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-stone-900 shadow-sm hover:bg-stone-100"
          >
            <ClipboardCheck className="h-4 w-4" /> Open session dossier
          </button>
        ) : null}
      </div>
      {!readOnly ? <BookOpen className="mt-6 h-5 w-5 text-stone-600" aria-hidden /> : null}
    </section>
  );
};

export default Part10Listening;
