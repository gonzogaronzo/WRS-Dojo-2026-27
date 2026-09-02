import { Lesson, LessonSourceReference, StudentHistoryEntry, WordAttemptRecord } from './types';

export type Part4Phase = 'practice' | 'charting';
export type Part4ChartingType = 'real' | 'nonsense' | 'other' | 'unspecified';

export interface Part4SourceList {
  listId: string;
  phase: Part4Phase;
  words: string[];
  chartingType: Part4ChartingType;
  sourceId: string;
  sourceLabel: string;
  sourceKind: 'student-reader';
  edition?: string;
  locator?: string;
}

export interface Part4SourceContext {
  practiceLists: Part4SourceList[];
  chartingLists: Part4SourceList[];
  gap?: string;
}

export interface Part4ScoredItem {
  instanceId: string;
  index: number;
  wordText: string;
  status: 'correct' | 'error';
  errorNote?: string;
}

export interface Part4ChartingAttempt {
  id: string;
  recordType: 'part4-charting';
  teacherId: string;
  studentId: string;
  studentName: string;
  groupId: string;
  groupName: string;
  date: string;
  completedAt: string;
  step: string;
  substep: string;
  lessonId: string;
  lessonTitle: string;
  sessionId: string;
  chartingType: Part4ChartingType;
  sourceId: string;
  sourceLabel: string;
  sourceKind: 'student-reader';
  sourceEdition?: string;
  sourceLocator?: string;
  listId: string;
  totalItems: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  itemResults: Part4ScoredItem[];
  incorrectItems: string[];
  teacherNotes: string;
}

const cleanWords = (value: unknown) => Array.isArray(value)
  ? value.filter((entry): entry is string => typeof entry === 'string').map(word => word.trim()).filter(Boolean)
  : [];

const hashText = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const sourceFor = (lesson: Lesson, sourceIds: string[]): LessonSourceReference | null => {
  const sources = lesson.runtimePlan?.sources || lesson.sourceMetadata || [];
  const eligible = sources.filter(source => source.kind === 'student-reader');
  if (!eligible.length) return null;
  const exact = eligible.find(source => sourceIds.includes(source.id));
  if (exact) return exact;
  return eligible.length === 1 ? eligible[0] : null;
};

const chartingTypeFrom = (value: unknown): Part4ChartingType => (
  value === 'real' || value === 'nonsense' || value === 'other' ? value : 'unspecified'
);

const buildList = (
  phase: Part4Phase,
  words: string[],
  source: LessonSourceReference,
  lesson: Lesson,
  chartingType: Part4ChartingType,
  explicitListId?: string
): Part4SourceList => {
  const stableMaterialKey = `${source.id}|${lesson.step}.${lesson.substep}|${phase}|${words.join('|')}`;
  return {
    listId: explicitListId || `${source.id}:${lesson.step}.${lesson.substep}:${phase}:${hashText(stableMaterialKey)}`,
    phase,
    words,
    chartingType,
    sourceId: source.id,
    sourceLabel: source.label || source.id,
    sourceKind: 'student-reader',
    edition: source.edition,
    locator: source.locator
  };
};

const futureLists = (
  value: unknown,
  phase: Part4Phase,
  lesson: Lesson,
  fallbackSourceIds: string[],
  fallbackType: Part4ChartingType
): Part4SourceList[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap(candidate => {
    if (!candidate || typeof candidate !== 'object') return [];
    const record = candidate as Record<string, unknown>;
    const words = cleanWords(record.words);
    const sourceId = typeof record.sourceId === 'string' ? record.sourceId : '';
    const source = sourceFor(lesson, sourceId ? [sourceId] : fallbackSourceIds);
    if (!source || !words.length) return [];
    return [buildList(
      phase,
      words,
      source,
      lesson,
      chartingTypeFrom(record.chartingType || fallbackType),
      typeof record.listId === 'string' && record.listId.trim() ? record.listId.trim() : undefined
    )];
  });
};

export const resolvePart4SourceContext = (lesson: Lesson): Part4SourceContext => {
  const part4 = lesson.runtimePlan?.parts.find(part => part.part === 4);
  const sourceIds = part4?.sourceIds || [];
  const chartingType = chartingTypeFrom(part4?.data.chartingType || lesson.wrsPlan?.wordTypesToChart?.[0]);
  const source = sourceFor(lesson, sourceIds);

  const partData = part4?.data as (typeof part4.data & {
    practiceLists?: unknown;
    chartingLists?: unknown;
  }) | undefined;
  const explicitPracticeLists = futureLists(partData?.practiceLists, 'practice', lesson, sourceIds, chartingType);
  const explicitChartingLists = futureLists(partData?.chartingLists, 'charting', lesson, sourceIds, chartingType);

  const practiceWords = cleanWords(part4?.data.practiceWords?.length ? part4.data.practiceWords : lesson.wordListPractice);
  const chartingWords = cleanWords(part4?.data.chartingWords?.length ? part4.data.chartingWords : lesson.wordListCharting);

  const practiceLists = explicitPracticeLists.length
    ? explicitPracticeLists
    : source && practiceWords.length
      ? [buildList('practice', practiceWords, source, lesson, chartingType)]
      : [];
  const chartingLists = explicitChartingLists.length
    ? explicitChartingLists
    : source && chartingWords.length
      ? [buildList('charting', chartingWords, source, lesson, chartingType)]
      : [];

  if (!source && !practiceLists.length && !chartingLists.length) {
    return {
      practiceLists: [],
      chartingLists: [],
      gap: 'No Student Reader provenance is attached to Part 4. Source-backed Part 4 material is required.'
    };
  }
  if (!practiceLists.length || !chartingLists.length) {
    return {
      practiceLists,
      chartingLists,
      gap: 'This lesson does not yet contain both a source-backed Part 4 practice list and a separate source-backed charting list.'
    };
  }
  if (practiceLists.every(list => list.words.length < 5 || list.words.length > 6)) {
    return {
      practiceLists,
      chartingLists,
      gap: 'The attached Part 4 practice material is not a 5–6 word practice selection. Verify the Student Reader selection before use.'
    };
  }
  if (chartingLists.every(list => list.words.length !== 15)) {
    return {
      practiceLists,
      chartingLists,
      gap: 'The attached Part 4 charting material is not a 15-item list. Verify the Student Reader selection before charting.'
    };
  }
  const exactDuplicate = practiceLists.some(practice =>
    chartingLists.some(charting => practice.words.join('\u0000') === charting.words.join('\u0000'))
  );
  if (exactDuplicate) {
    return {
      practiceLists,
      chartingLists,
      gap: 'Practice and charting currently resolve to the same word list. Part 4 requires separate material for charting.'
    };
  }
  return { practiceLists, chartingLists };
};

export const chartingInstanceId = (listId: string, index: number) => `part4:${hashText(listId)}:${index + 1}`;

export const createPart4AttemptId = (
  sessionId: string,
  studentId: string,
  listId: string
) => `part4_${hashText(sessionId)}_${hashText(studentId)}_${hashText(listId)}`;

export const buildPart4ChartingAttempt = (input: {
  teacherId: string;
  studentId: string;
  studentName: string;
  groupId: string;
  groupName: string;
  lesson: Lesson;
  sessionId: string;
  completedAt: string;
  list: Part4SourceList;
  itemResults: Part4ScoredItem[];
  teacherNotes?: string;
}): Part4ChartingAttempt => {
  const ordered = [...input.itemResults].sort((left, right) => left.index - right.index);
  if (ordered.length !== input.list.words.length || ordered.some((item, index) => item.wordText !== input.list.words[index])) {
    throw new Error('The scored Part 4 items do not exactly match the selected source list.');
  }
  const correctCount = ordered.filter(item => item.status === 'correct').length;
  const incorrectCount = ordered.length - correctCount;
  return {
    id: createPart4AttemptId(input.sessionId, input.studentId, input.list.listId),
    recordType: 'part4-charting',
    teacherId: input.teacherId,
    studentId: input.studentId,
    studentName: input.studentName,
    groupId: input.groupId,
    groupName: input.groupName,
    date: input.completedAt.slice(0, 10),
    completedAt: input.completedAt,
    step: input.lesson.step,
    substep: input.lesson.substep,
    lessonId: input.lesson.id,
    lessonTitle: input.lesson.title,
    sessionId: input.sessionId,
    chartingType: input.list.chartingType,
    sourceId: input.list.sourceId,
    sourceLabel: input.list.sourceLabel,
    sourceKind: 'student-reader',
    sourceEdition: input.list.edition,
    sourceLocator: input.list.locator,
    listId: input.list.listId,
    totalItems: ordered.length,
    correctCount,
    incorrectCount,
    accuracy: ordered.length ? Math.round((correctCount / ordered.length) * 100) : 0,
    itemResults: ordered,
    incorrectItems: ordered.filter(item => item.status === 'error').map(item => item.wordText),
    teacherNotes: input.teacherNotes?.trim() || ''
  };
};

export const historyEntryFromPart4Attempt = (attempt: Part4ChartingAttempt): StudentHistoryEntry => {
  const sourceDescription = [
    `Part 4 ${attempt.chartingType} charting`,
    `Source: ${attempt.sourceLabel}${attempt.sourceLocator ? ` (${attempt.sourceLocator})` : ''}`,
    `List: ${attempt.listId}`,
    attempt.teacherNotes ? `Teacher note: ${attempt.teacherNotes}` : ''
  ].filter(Boolean).join(' · ');
  const attempts: WordAttemptRecord[] = attempt.itemResults.map(item => ({
    instanceId: item.instanceId,
    wordText: item.wordText,
    status: item.status
  }));
  return {
    id: attempt.id,
    date: attempt.date,
    lessonTitle: `Part 4 Charting · ${attempt.lessonTitle}`,
    step: attempt.step,
    substep: attempt.substep,
    groupId: attempt.groupId,
    groupName: attempt.groupName,
    lessonId: attempt.lessonId,
    correctCount: attempt.correctCount,
    errorCount: attempt.incorrectCount,
    totalCount: attempt.totalItems,
    accuracy: attempt.accuracy,
    attempts,
    errors: attempt.incorrectItems,
    notes: sourceDescription,
    attendanceStatus: 'present'
  };
};

export const upsertPart4History = (
  history: StudentHistoryEntry[] | undefined,
  entry: StudentHistoryEntry
) => [entry, ...(history || []).filter(existing => existing.id !== entry.id)];
