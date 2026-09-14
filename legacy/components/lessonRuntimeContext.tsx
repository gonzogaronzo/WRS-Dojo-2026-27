import React from 'react';
import type { Lesson } from '../types';

const LessonRuntimeContext = React.createContext<Lesson | null>(null);

export const LessonRuntimeProvider: React.FC<{ lesson: Lesson; children: React.ReactNode }> = ({ lesson, children }) => (
  <LessonRuntimeContext.Provider value={lesson}>{children}</LessonRuntimeContext.Provider>
);

export const useLessonRuntime = () => React.useContext(LessonRuntimeContext);
