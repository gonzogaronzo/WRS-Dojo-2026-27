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

  return (
    <PassageReadingLegacy
      {...props}
      title={title}
      sourceLabel={sourceLabel}
      questions={questions}
      historyNote={historyNote}
    />
  );
};

export default PassageReading;
