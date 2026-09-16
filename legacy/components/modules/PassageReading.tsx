import React from 'react';
import PassageReadingLegacy from './PassageReadingLegacy';
import { useLessonRuntime } from '../lessonRuntimeContext';

type PassageReadingProps = React.ComponentProps<typeof PassageReadingLegacy>;
type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : null
);

const PassageReading: React.FC<PassageReadingProps> = (props) => {
  const lesson = useLessonRuntime();
  const [showComprehension, setShowComprehension] = React.useState(false);
  const part9Data = lesson?.runtimePlan?.parts.find(part => part.part === 9)?.data as UnknownRecord | undefined;
  const runtimeQuestions = Array.isArray(part9Data?.questions)
    ? part9Data.questions.flatMap(candidate => {
        const question = asRecord(candidate)?.question;
        return typeof question === 'string' && question.trim() ? [question] : [];
      })
    : [];

  const title = props.title || (typeof part9Data?.passageTitle === 'string' ? part9Data.passageTitle : undefined);
  const runtimeSourceLabel = [part9Data?.studentReader, part9Data?.page]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' • ');
  const sourceLabel = props.sourceLabel || runtimeSourceLabel || undefined;
  const questions = props.questions?.length ? props.questions : runtimeQuestions;
  const historyNote = props.historyNote || (
    part9Data?.historyStatus === 'uncertain-flagged' && typeof part9Data?.historyNote === 'string'
      ? part9Data.historyNote
      : undefined
  );
  const hasTeacherComprehension = !props.readOnly && (questions.length > 0 || Boolean(historyNote));

  React.useEffect(() => {
    setShowComprehension(false);
  }, [props.text, title, sourceLabel]);

  return (
    <div className="relative h-full min-h-0" data-part9-reading-flow={showComprehension ? 'comprehension' : 'passage'}>
      <PassageReadingLegacy
        {...props}
        title={title}
        sourceLabel={sourceLabel}
        questions={showComprehension ? questions : []}
        historyNote={showComprehension ? historyNote : undefined}
      />
      {hasTeacherComprehension ? (
        <button
          type="button"
          data-part9-comprehension-toggle
          aria-pressed={showComprehension}
          onClick={() => setShowComprehension(value => !value)}
          className="absolute right-6 top-5 z-[70] rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-amber-900 shadow-sm hover:bg-amber-100"
        >
          {showComprehension ? 'Hide Questions' : 'Comprehension Questions'}
        </button>
      ) : null}
    </div>
  );
};

export default PassageReading;
