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
  const currentQuestion = questions[safeQuestionIndex];
  const hasComprehensionMaterial = questions.length > 0 || Boolean(historyNote);
  const questionsVisible = phase === 'comprehension';

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

  return (
    <div
      className="flex h-full min-h-0 flex-col bg-[#fcfbf9] text-stone-900"
      data-part9-reading-flow={questionsVisible ? 'comprehension' : 'passage'}
    >
      {!legacyProps.readOnly && hasComprehensionMaterial ? (
        <div
          data-part9-question-controls
          className="flex shrink-0 justify-end border-b border-stone-100 bg-white px-6 py-3"
        >
          <button
            type="button"
            data-part9-question-toggle={questionsVisible ? 'hide' : 'show'}
            onClick={() => {
              if (!questionsVisible) updateQuestionIndex(0);
              updatePhase(questionsVisible ? 'reading' : 'comprehension');
            }}
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-amber-900 shadow-sm hover:bg-amber-100"
          >
            {questionsVisible ? 'Hide Questions' : 'Show Questions'}
          </button>
        </div>
      ) : null}

      <div
        className={`flex min-h-0 flex-1 ${questionsVisible ? 'flex-col lg:flex-row' : ''}`}
        data-part9-layout={questionsVisible ? 'passage-and-questions' : 'passage-only'}
      >
        <section
          data-part9-passage-region
          className="h-full min-h-[24rem] min-w-0 flex-1"
        >
          <PassageReadingLegacy
            {...legacyProps}
            title={title}
            sourceLabel={sourceLabel}
            questions={[]}
            historyNote={undefined}
          />
        </section>

        {questionsVisible ? (
          <aside
            data-part9-question-panel
            data-part9-panel-placement="sibling"
            className="w-full shrink-0 overflow-y-auto border-t border-stone-200 bg-stone-50 p-6 lg:h-full lg:w-[380px] lg:border-l lg:border-t-0"
          >
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-stone-500">
              <FileText className="h-4 w-4 text-red-800" />
              Comprehension
            </div>
            {!legacyProps.readOnly && historyNote ? (
              <div
                data-part9-teacher-history
                className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-relaxed text-amber-950"
              >
                {historyNote}
              </div>
            ) : null}
            {currentQuestion ? (
              <section
                data-part9-comprehension-question
                className="mt-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
              >
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">
                  Question {safeQuestionIndex + 1} of {questions.length}
                </p>
                <p className="mt-4 font-serif text-2xl font-bold leading-relaxed text-stone-900">
                  {currentQuestion}
                </p>
              </section>
            ) : (
              <section
                data-part9-comprehension-unavailable
                className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-500"
              >
                No source-provided comprehension questions are available for this passage.
              </section>
            )}
            {!legacyProps.readOnly && questions.length > 1 ? (
              <div className="mt-5 flex items-center gap-3">
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
          </aside>
        ) : null}
      </div>
    </div>
  );
};

export default PassageReading;
