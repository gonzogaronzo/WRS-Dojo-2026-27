import React from 'react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import PassageReadingLegacy from './PassageReadingLegacy';
import { useLessonRuntime } from '../lessonRuntimeContext';

type LegacyPassageProps = React.ComponentProps<typeof PassageReadingLegacy>;
export type PassagePhase = 'reading' | 'comprehension';
type UnknownRecord = Record<string, unknown>;

export interface PassageReadingProps extends LegacyPassageProps {
  phase?: PassagePhase;
  onUpdatePhase?: (phase: PassagePhase) => void;
  questionIndex?: number;
  onUpdateQuestionIndex?: (index: number) => void;
}

const asRecord = (value: unknown): UnknownRecord | null => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : null
);

const PassageReading: React.FC<PassageReadingProps> = (props) => {
  const {
    phase: syncedPhase,
    onUpdatePhase,
    questionIndex: syncedQuestionIndex,
    onUpdateQuestionIndex,
    ...legacyProps
  } = props;
  const lesson = useLessonRuntime();
  const [localPhase, setLocalPhase] = React.useState<PassagePhase>('reading');
  const [localQuestionIndex, setLocalQuestionIndex] = React.useState(0);
  const phase = syncedPhase || localPhase;
  const questionIndex = syncedQuestionIndex ?? localQuestionIndex;
  const part9Data = lesson?.runtimePlan?.parts.find(part => part.part === 9)?.data as UnknownRecord | undefined;
  const runtimeQuestions = Array.isArray(part9Data?.questions)
    ? part9Data.questions.flatMap(candidate => {
        const question = asRecord(candidate)?.question;
        return typeof question === 'string' && question.trim() ? [question] : [];
      })
    : [];

  const title = legacyProps.title || (typeof part9Data?.passageTitle === 'string' ? part9Data.passageTitle : undefined);
  const runtimeSourceLabel = [part9Data?.studentReader, part9Data?.page]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' • ');
  const sourceLabel = legacyProps.sourceLabel || runtimeSourceLabel || undefined;
  const questions = legacyProps.questions?.length ? legacyProps.questions : runtimeQuestions;
  const historyNote = legacyProps.historyNote || (
    part9Data?.historyStatus === 'uncertain-flagged' && typeof part9Data?.historyNote === 'string'
      ? part9Data.historyNote
      : undefined
  );
  const safeQuestionIndex = questions.length
    ? Math.max(0, Math.min(questionIndex, questions.length - 1))
    : 0;

  const updatePhase = (next: PassagePhase) => {
    if (onUpdatePhase) onUpdatePhase(next);
    else setLocalPhase(next);
  };
  const updateQuestionIndex = (next: number) => {
    if (onUpdateQuestionIndex) onUpdateQuestionIndex(next);
    else setLocalQuestionIndex(next);
  };

  React.useEffect(() => {
    if (syncedPhase === undefined) setLocalPhase('reading');
    if (syncedQuestionIndex === undefined) setLocalQuestionIndex(0);
  }, [legacyProps.text, title, sourceLabel, syncedPhase, syncedQuestionIndex]);

  if (phase === 'comprehension') {
    const currentQuestion = questions[safeQuestionIndex];
    return (
      <div className="min-h-full flex flex-col bg-[#fcfbf9] text-stone-900" data-part9-reading-flow="comprehension">
        <header className="flex shrink-0 items-center justify-between border-b border-stone-100 bg-white px-8 py-5 shadow-sm">
          <div className="min-w-0">
            <h2 className="flex items-center gap-3 font-serif text-xl font-bold uppercase tracking-wider text-stone-900">
              <FileText className="h-5 w-5 text-red-800" />
              {title || 'Passage Reading'}
            </h2>
            {sourceLabel ? <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-stone-400">{sourceLabel}</p> : null}
          </div>
          {!legacyProps.readOnly ? (
            <button
              type="button"
              data-part9-return-to-passage
              onClick={() => updatePhase('reading')}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-stone-600 shadow-sm hover:border-stone-400"
            >
              Return to passage
            </button>
          ) : null}
        </header>
        <main className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          {!legacyProps.readOnly && historyNote ? (
            <aside data-part9-teacher-history className="mb-6 w-full max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-left text-sm font-semibold leading-relaxed text-amber-950">
              {historyNote}
            </aside>
          ) : null}
          {currentQuestion ? (
            <section data-part9-comprehension-question className="w-full max-w-4xl rounded-[2rem] border border-stone-100 bg-white px-8 py-12 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-stone-400">
                Comprehension question {safeQuestionIndex + 1} of {questions.length}
              </p>
              <p className="mt-6 font-serif text-3xl font-bold leading-relaxed text-stone-900">{currentQuestion}</p>
            </section>
          ) : (
            <section data-part9-comprehension-unavailable className="w-full max-w-3xl rounded-[2rem] border border-dashed border-stone-300 bg-white px-8 py-12 text-stone-500">
              No source-provided comprehension questions are available for this passage.
            </section>
          )}
          {!legacyProps.readOnly && questions.length > 1 ? (
            <div className="mt-8 flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateQuestionIndex(Math.max(0, safeQuestionIndex - 1))}
                disabled={safeQuestionIndex === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-stone-700 shadow-sm disabled:opacity-35"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                type="button"
                onClick={() => updateQuestionIndex(Math.min(questions.length - 1, safeQuestionIndex + 1))}
                disabled={safeQuestionIndex === questions.length - 1}
                className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-stone-700 shadow-sm disabled:opacity-35"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </main>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-0" data-part9-reading-flow="passage">
      <PassageReadingLegacy
        {...legacyProps}
        title={title}
        sourceLabel={sourceLabel}
        questions={[]}
        historyNote={undefined}
      />
      {!legacyProps.readOnly && (questions.length > 0 || Boolean(historyNote)) ? (
        <button
          type="button"
          data-part9-begin-comprehension
          onClick={() => {
            updateQuestionIndex(0);
            updatePhase('comprehension');
          }}
          className="absolute right-6 top-5 z-[70] rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-amber-900 shadow-sm hover:bg-amber-100"
        >
          Begin comprehension
        </button>
      ) : null}
    </div>
  );
};

export default PassageReading;
