import {
  AttendanceStatus,
  GroupProfile,
  Lesson,
  MissionRecord,
  StudentHistoryEntry,
  StudentMissionResult,
  StudentProfile,
  WordlistScore
} from './types';

export const createMissionId = () => {
  const randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  return randomUUID
    ? randomUUID()
    : `mission-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const todayAsInputDate = (date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

interface BuildMissionRecordInput {
  id: string;
  status?: 'started' | 'completed';
  teacherId: string;
  date?: string;
  lesson: Lesson;
  group: GroupProfile;
  students: StudentProfile[];
  studentIds: string[];
  scores: WordlistScore[];
  notes?: string;
}

export const buildMissionRecord = ({
  id,
  status = 'completed',
  teacherId,
  date,
  lesson,
  group,
  students,
  studentIds,
  scores,
  notes = ''
}: BuildMissionRecordInput): MissionRecord => {
  const results: StudentMissionResult[] = students
    .filter(student => studentIds.includes(student.id))
    .map(student => {
      const attempts = scores
        .filter(score => score.studentId === student.id && score.status !== 'none')
        .map(score => ({
          instanceId: score.instanceId,
          wordText: score.wordText,
          status: score.status as 'correct' | 'error'
        }));
      const correctCount = attempts.filter(attempt => attempt.status === 'correct').length;
      const errorCount = attempts.filter(attempt => attempt.status === 'error').length;
      const totalCount = attempts.length;

      return {
        studentId: student.id,
        studentName: student.name,
        correctCount,
        errorCount,
        totalCount,
        accuracy: totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0,
        attempts,
        errors: attempts.filter(attempt => attempt.status === 'error').map(attempt => attempt.wordText)
      };
    });

  const attendance = group.studentIds.map(studentId => {
    const student = students.find(candidate => candidate.id === studentId);
    return {
      studentId,
      studentName: student?.name || 'Unknown Student',
      status: studentIds.includes(studentId) ? 'present' as const : 'absent' as const
    };
  });

  return {
    id,
    status,
    teacherId,
    squadId: group.id,
    squadName: group.name,
    lessonId: lesson.id,
    date: date || todayAsInputDate(),
    step: lesson.step,
    substep: lesson.substep,
    lessonStep: `${lesson.step}.${lesson.substep}`,
    lessonTitle: lesson.title,
    notes,
    timestamp: new Date().toISOString(),
    results,
    attendance
  };
};

export const studentHistoryEntryFromMission = (
  mission: MissionRecord,
  result: StudentMissionResult | undefined,
  attendanceStatus: AttendanceStatus = 'present'
): StudentHistoryEntry => ({
  id: mission.id,
  date: mission.date,
  lessonTitle: mission.lessonTitle,
  step: mission.step,
  substep: mission.substep,
  groupId: mission.squadId,
  groupName: mission.squadName,
  lessonId: mission.lessonId,
  ...(result ? {
    correctCount: result.correctCount,
    errorCount: result.errorCount,
    totalCount: result.totalCount,
    accuracy: result.accuracy,
    attempts: result.attempts,
    errors: result.errors
  } : {}),
  notes: mission.notes,
  attendanceStatus
});

export const addMissionAttendanceToStudent = (
  student: StudentProfile,
  mission: MissionRecord,
  attendanceStatus: AttendanceStatus,
  result?: StudentMissionResult
): StudentProfile => {
  const history = student.history || [];
  const existingEntry = history.find(entry => entry.id === mission.id);
  const previousStatus = existingEntry?.attendanceStatus || (existingEntry ? 'present' : null);
  const nextEntry = studentHistoryEntryFromMission(mission, result, attendanceStatus);
  const attendanceDelta = attendanceStatus === previousStatus
    ? 0
    : attendanceStatus === 'present'
      ? 1
      : previousStatus === 'present'
        ? -1
        : 0;

  return {
    ...student,
    attendanceCount: Math.max(0, (student.attendanceCount || 0) + attendanceDelta),
    lastSeen: attendanceStatus === 'present'
      ? [student.lastSeen, mission.date].filter(Boolean).sort().at(-1)
      : student.lastSeen,
    history: [nextEntry, ...history.filter(entry => entry.id !== mission.id)]
  };
};

export const addMissionToStudent = (
  student: StudentProfile,
  mission: MissionRecord,
  result: StudentMissionResult
): StudentProfile => {
  return addMissionAttendanceToStudent(student, mission, 'present', result);
};

export const addMissionToGroup = (group: GroupProfile, mission: MissionRecord): GroupProfile => ({
  ...group,
  lastLessonDate: mission.date,
  history: [
    {
      id: mission.id,
      lessonId: mission.lessonId,
      title: mission.lessonTitle,
      date: mission.date,
      studentIds: mission.results.map(result => result.studentId),
      absentStudentIds: (mission.attendance || [])
        .filter(entry => entry.status === 'absent')
        .map(entry => entry.studentId),
      attendance: mission.attendance,
      notes: mission.notes,
      results: mission.results
    },
    ...(group.history || []).filter(entry => entry.id !== mission.id)
  ]
});

export const upsertMissionRecord = (missions: MissionRecord[], mission: MissionRecord) => [
  mission,
  ...missions.filter(entry => entry.id !== mission.id)
];
