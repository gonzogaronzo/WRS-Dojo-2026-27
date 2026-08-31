import { StudentHistoryEntry, StudentProfile } from './types';

export interface StudentReportFilters {
  fromDate?: string;
  toDate?: string;
  stepKey?: string;
}

export interface StudentReportSession {
  id: string;
  date: string;
  lessonTitle: string;
  step: string;
  substep?: string;
  stepKey: string;
  groupName?: string;
  correctCount: number;
  errorCount: number;
  totalCount: number;
  accuracy: number | null;
  errors: string[];
  notes?: string;
  hasWordDetail: boolean;
  attendanceStatus: 'present' | 'absent' | 'not-recorded';
}

export interface StudentReportStepSummary {
  stepKey: string;
  sessions: number;
  correctCount: number;
  totalCount: number;
  accuracy: number | null;
  presentSessions: number;
  absentSessions: number;
}

export interface StudentReportData {
  studentId: string;
  studentName: string;
  sessions: StudentReportSession[];
  totalSessions: number;
  attendanceTrackedSessions: number;
  presentSessions: number;
  absentSessions: number;
  attendanceRate: number | null;
  scoredSessions: number;
  detailedSessions: number;
  totalCorrect: number;
  totalErrors: number;
  totalAttempts: number;
  overallAccuracy: number | null;
  latestAccuracy: number | null;
  previousAccuracy: number | null;
  accuracyChange: number | null;
  topErrors: Array<{ word: string; count: number }>;
  stepBreakdown: StudentReportStepSummary[];
}

const stepKeyFor = (entry: Pick<StudentHistoryEntry, 'step' | 'substep'>) => (
  entry.substep ? `${entry.step}.${entry.substep}` : entry.step
);

const normalizeSession = (entry: StudentHistoryEntry, index: number): StudentReportSession => {
  const attendanceStatus = entry.attendanceStatus || 'not-recorded';
  const isAbsent = attendanceStatus === 'absent';
  const attempts = entry.attempts || [];
  const attemptCorrect = attempts.filter(attempt => attempt.status === 'correct').length;
  const attemptErrors = attempts.filter(attempt => attempt.status === 'error');
  const errors = entry.errors?.length
    ? entry.errors
    : attemptErrors.map(attempt => attempt.wordText);
  const correctCount = isAbsent ? 0 : entry.correctCount ?? attemptCorrect;
  const errorCount = isAbsent ? 0 : entry.errorCount ?? (attempts.length ? attemptErrors.length : errors.length);
  const totalCount = isAbsent ? 0 : entry.totalCount ?? (attempts.length || correctCount + errorCount);
  const accuracy = isAbsent
    ? null
    : typeof entry.accuracy === 'number'
    ? entry.accuracy
    : totalCount > 0
      ? Math.round((correctCount / totalCount) * 100)
      : null;

  return {
    id: entry.id || `${entry.date}-${entry.lessonId || entry.lessonTitle}-${index}`,
    date: entry.date,
    lessonTitle: entry.lessonTitle,
    step: entry.step,
    substep: entry.substep,
    stepKey: stepKeyFor(entry),
    groupName: entry.groupName,
    correctCount,
    errorCount,
    totalCount,
    accuracy,
    errors: isAbsent ? [] : errors,
    notes: entry.notes,
    hasWordDetail: !isAbsent && (attempts.length > 0 || errors.length > 0),
    attendanceStatus
  };
};

const inDateRange = (date: string, fromDate?: string, toDate?: string) => (
  (!fromDate || date >= fromDate) && (!toDate || date <= toDate)
);

export const getStudentStepOptions = (student: StudentProfile) => (
  Array.from(new Set((student.history || []).map(stepKeyFor)))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
);

export const buildStudentReport = (
  student: StudentProfile,
  filters: StudentReportFilters = {}
): StudentReportData => {
  const sessions = (student.history || [])
    .map(normalizeSession)
    .filter(session => inDateRange(session.date, filters.fromDate, filters.toDate))
    .filter(session => !filters.stepKey || session.stepKey === filters.stepKey)
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalCorrect = sessions.reduce((sum, session) => sum + session.correctCount, 0);
  const totalErrors = sessions.reduce((sum, session) => sum + session.errorCount, 0);
  const totalAttempts = sessions.reduce((sum, session) => sum + session.totalCount, 0);
  const scoredSessions = sessions.filter(session => session.totalCount > 0);
  const attendanceTrackedSessions = sessions.filter(session => session.attendanceStatus !== 'not-recorded');
  const presentSessions = attendanceTrackedSessions.filter(session => session.attendanceStatus === 'present');
  const absentSessions = attendanceTrackedSessions.filter(session => session.attendanceStatus === 'absent');
  const chronologicalScores = [...scoredSessions].reverse();
  const latestAccuracy = chronologicalScores.at(-1)?.accuracy ?? null;
  const previousAccuracy = chronologicalScores.at(-2)?.accuracy ?? null;

  const errorFrequency = new Map<string, { word: string; count: number }>();
  sessions.flatMap(session => session.errors).forEach(word => {
    const normalized = word.trim().toLocaleLowerCase();
    if (!normalized) return;
    const existing = errorFrequency.get(normalized);
    errorFrequency.set(normalized, {
      word: existing?.word || word.trim(),
      count: (existing?.count || 0) + 1
    });
  });

  const stepMap = new Map<string, StudentReportStepSummary>();
  sessions.forEach(session => {
    const existing = stepMap.get(session.stepKey) || {
      stepKey: session.stepKey,
      sessions: 0,
      correctCount: 0,
      totalCount: 0,
      accuracy: null,
      presentSessions: 0,
      absentSessions: 0
    };
    existing.sessions += 1;
    if (session.attendanceStatus === 'present') existing.presentSessions += 1;
    if (session.attendanceStatus === 'absent') existing.absentSessions += 1;
    existing.correctCount += session.correctCount;
    existing.totalCount += session.totalCount;
    existing.accuracy = existing.totalCount > 0
      ? Math.round((existing.correctCount / existing.totalCount) * 100)
      : null;
    stepMap.set(session.stepKey, existing);
  });

  return {
    studentId: student.id,
    studentName: student.name,
    sessions,
    totalSessions: sessions.length,
    attendanceTrackedSessions: attendanceTrackedSessions.length,
    presentSessions: presentSessions.length,
    absentSessions: absentSessions.length,
    attendanceRate: attendanceTrackedSessions.length > 0
      ? Math.round((presentSessions.length / attendanceTrackedSessions.length) * 100)
      : null,
    scoredSessions: scoredSessions.length,
    detailedSessions: sessions.filter(session => session.hasWordDetail).length,
    totalCorrect,
    totalErrors,
    totalAttempts,
    overallAccuracy: totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : null,
    latestAccuracy,
    previousAccuracy,
    accuracyChange: latestAccuracy !== null && previousAccuracy !== null
      ? latestAccuracy - previousAccuracy
      : null,
    topErrors: Array.from(errorFrequency.values())
      .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
      .slice(0, 12),
    stepBreakdown: Array.from(stepMap.values())
      .sort((a, b) => a.stepKey.localeCompare(b.stepKey, undefined, { numeric: true }))
  };
};

const csvCell = (value: string | number | null | undefined) => {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
};

export const studentReportToCsv = (report: StudentReportData) => {
  const rows = [
    ['Student', 'Date', 'Attendance', 'Step/Substep', 'Lesson', 'Correct', 'Errors', 'Attempted', 'Accuracy', 'Missed Words', 'Teacher Notes'],
    ...report.sessions.map(session => [
      report.studentName,
      session.date,
      session.attendanceStatus === 'not-recorded' ? 'Not tracked' : session.attendanceStatus === 'present' ? 'Present' : 'Absent',
      session.stepKey,
      session.lessonTitle,
      session.correctCount,
      session.errorCount,
      session.totalCount,
      session.accuracy === null ? '' : `${session.accuracy}%`,
      session.errors.join('; '),
      session.notes || ''
    ])
  ];

  return rows.map(row => row.map(csvCell).join(',')).join('\n');
};
