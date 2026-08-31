import { DojoMasterData, GroupProfile, MissionRecord, StudentProfile } from './types';

export interface CloudMigrationInput {
  teacherId: string;
  students: StudentProfile[];
  groups: GroupProfile[];
  missions: MissionRecord[];
  activeSession?: DojoMasterData['activeSession'] | null;
}

export interface CloudMigrationPlan {
  students: StudentProfile[];
  groups: GroupProfile[];
  missions: MissionRecord[];
  activeSession: DojoMasterData['activeSession'] | null;
}

export const teacherScopedId = (id: string, teacherId: string) => {
  const suffix = `-${teacherId.slice(0, 5)}`;
  return id.endsWith(suffix) ? id : `${id}${suffix}`;
};

const remapMissionResult = (result: MissionRecord['results'][number], teacherId: string) => ({
  ...result,
  studentId: teacherScopedId(result.studentId, teacherId)
});

export const buildCloudMigrationPlan = ({
  teacherId,
  students,
  groups,
  missions,
  activeSession = null
}: CloudMigrationInput): CloudMigrationPlan => {
  const remapStudentId = (id: string) => teacherScopedId(id, teacherId);
  const remapGroupId = (id: string) => teacherScopedId(id, teacherId);
  const remapMissionId = (id: string) => teacherScopedId(id, teacherId);

  const mappedStudents = students.map(student => ({
    ...student,
    id: remapStudentId(student.id),
    history: (student.history || []).map(entry => ({
      ...entry,
      id: entry.id ? remapMissionId(entry.id) : entry.id,
      groupId: entry.groupId ? remapGroupId(entry.groupId) : entry.groupId
    }))
  }));

  const mappedGroups = groups.map(group => ({
    ...group,
    id: remapGroupId(group.id),
    studentIds: group.studentIds.map(remapStudentId),
    jobs: group.jobs
      ? Object.fromEntries(
          Object.entries(group.jobs).map(([jobId, studentId]) => [
            jobId,
            studentId ? remapStudentId(studentId) : studentId
          ])
        )
      : group.jobs,
    history: (group.history || []).map(entry => ({
      ...entry,
      id: remapMissionId(entry.id),
      studentIds: entry.studentIds.map(remapStudentId),
      absentStudentIds: entry.absentStudentIds?.map(remapStudentId),
      attendance: entry.attendance?.map(attendance => ({
        ...attendance,
        studentId: remapStudentId(attendance.studentId)
      })),
      results: entry.results?.map(result => remapMissionResult(result, teacherId))
    }))
  }));

  const mappedMissions = missions.map(mission => ({
    ...mission,
    id: remapMissionId(mission.id),
    teacherId,
    squadId: remapGroupId(mission.squadId),
    attendance: mission.attendance?.map(attendance => ({
      ...attendance,
      studentId: remapStudentId(attendance.studentId)
    })),
    results: mission.results.map(result => remapMissionResult(result, teacherId))
  }));

  const mappedSession = activeSession
    ? {
        ...activeSession,
        groupId: remapGroupId(activeSession.groupId),
        studentIds: activeSession.studentIds.map(remapStudentId),
        scores: activeSession.scores?.map(score => ({
          ...score,
          studentId: remapStudentId(score.studentId)
        }))
      }
    : null;

  return {
    students: mappedStudents,
    groups: mappedGroups,
    missions: mappedMissions,
    activeSession: mappedSession
  };
};
