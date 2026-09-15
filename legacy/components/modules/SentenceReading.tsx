import React from 'react';
import SentenceReadingLegacy from './SentenceReadingLegacy';
import { useLessonRuntime } from '../lessonRuntimeContext';

type SentenceReadingProps = React.ComponentProps<typeof SentenceReadingLegacy>;

const SentenceReading: React.FC<SentenceReadingProps> = (props) => {
  const lesson = useLessonRuntime();
  const part5Data = lesson?.runtimePlan?.parts.find(part => part.part === 5)?.data as Record<string, unknown> | undefined;
  const runtimeQuestions = Array.isArray(part5Data?.weaveQuestions)
    ? part5Data.weaveQuestions.filter((value): value is string => typeof value === 'string')
    : [];
  const weaveQuestions = props.weaveQuestions?.length ? props.weaveQuestions : runtimeQuestions;
  return <SentenceReadingLegacy {...props} weaveQuestions={weaveQuestions} />;
};

export default SentenceReading;
