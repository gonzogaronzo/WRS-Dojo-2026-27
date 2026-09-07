const text = value => value == null ? '' : String(value);

const lessonStep = mission => {
  if (mission?.lessonStep) return text(mission.lessonStep);
  const step = text(mission?.step);
  const substep = text(mission?.substep);
  return step && substep ? `${step}.${substep}` : step || substep;
};

const missionAttendance = mission => Array.isArray(mission?.attendance) ? mission.attendance : [];
const missionResults = mission => Array.isArray(mission?.results) ? mission.results : [];

export const studentDataSourcePrefix = missionId => `WRS Dojo mission:${missionId} `;
export const missionDailySource = missionId => `WRS Dojo mission:${missionId}`;
export const dailyNoteSource = noteId => `WRS Dojo daily_note:${noteId}`;
export const groupNoteSource = noteId => `WRS Dojo group_note:${noteId}`;

export const missionToStudentDataRows = (mission, missionId = mission?.id) => {
  if (!mission) return [];
  const id = text(missionId || mission.id);
  const results = missionResults(mission);
  const attendance = missionAttendance(mission);
  const entries = attendance.length > 0
    ? attendance
    : results.map(result => ({
        studentId: result.studentId,
        studentName: result.studentName,
        status: 'present'
      }));

  return entries.map(entry => {
    const result = results.find(candidate => text(candidate?.studentId) === text(entry?.studentId));
    const status = entry?.status === 'absent' ? 'absent' : 'present';
    const total = Number(result?.totalCount || 0);
    const correct = Number(result?.correctCount || 0);
    const accuracy = Number(result?.accuracy || 0);
    const errors = Array.isArray(result?.errors) ? result.errors.filter(Boolean).map(text) : [];
    const hasCharting = status === 'present' && total > 0;

    return [
      text(mission.date),
      text(entry?.studentName || result?.studentName),
      text(mission.squadName),
      lessonStep(mission),
      text(mission.lessonTitle),
      status === 'absent' ? 'Attendance' : hasCharting ? 'Wordlist Charting' : 'Lesson Attendance',
      status === 'absent' ? 'Absent' : hasCharting ? `${correct}/${total} (${accuracy}%)` : 'Present',
      errors.join(', '),
      '',
      status === 'absent' ? 'Absent' : 'Present',
      `${studentDataSourcePrefix(id)}student:${text(entry?.studentId || result?.studentId)}`,
      ''
    ];
  });
};

export const missionToDailyLogRows = (mission, missionId = mission?.id) => {
  if (!mission) return [];
  const id = text(missionId || mission.id);
  const results = missionResults(mission);
  const attendance = missionAttendance(mission);
  const presentNames = attendance
    .filter(entry => entry?.status !== 'absent')
    .map(entry => text(entry?.studentName))
    .filter(Boolean);
  const absentNames = attendance
    .filter(entry => entry?.status === 'absent')
    .map(entry => text(entry?.studentName))
    .filter(Boolean);
  const scoreSummaries = results
    .filter(result => Number(result?.totalCount || 0) > 0)
    .map(result => `${text(result?.studentName)} ${Number(result.correctCount || 0)}/${Number(result.totalCount || 0)}`);

  const details = [
    text(mission.lessonTitle) ? `Completed ${text(mission.lessonTitle)}` : 'Lesson completed',
    scoreSummaries.length ? `Charting: ${scoreSummaries.join('; ')}` : '',
    absentNames.length ? `Absent: ${absentNames.join(', ')}` : '',
    text(mission.notes) ? `Notes: ${text(mission.notes)}` : ''
  ].filter(Boolean).join('. ');

  const studentNames = attendance.length
    ? attendance.map(entry => text(entry?.studentName)).filter(Boolean)
    : results.map(result => text(result?.studentName)).filter(Boolean);

  return [[
    text(mission.date),
    text(mission.squadName),
    studentNames.join(', '),
    'Instructional / Student Data',
    'WRS Lesson',
    lessonStep(mission),
    details,
    '',
    missionDailySource(id)
  ]];
};

export const dailyNoteToDailyLogRows = (note, noteId) => {
  if (!note) return [];
  return [[
    text(note.date),
    '',
    '',
    'WRS Dojo Observation',
    'Daily Log',
    '',
    text(note.content),
    '',
    dailyNoteSource(text(noteId || note.id))
  ]];
};

export const groupNoteToDailyLogRows = (note, noteId) => {
  if (!note) return [];
  const rawDate = text(note.sessionDate || note.createdAt);
  const date = /^\d{4}-\d{2}-\d{2}/.test(rawDate) ? rawDate.slice(0, 10) : rawDate;
  const names = Array.isArray(note.studentNames) ? note.studentNames.filter(Boolean).map(text) : [];
  const substep = note.step && note.substep ? `${text(note.step)}.${text(note.substep)}` : text(note.substep || note.step);

  return [[
    date,
    text(note.groupName),
    names.join(', '),
    'Instructional Observation',
    'Quick Note',
    substep,
    text(note.content),
    '',
    groupNoteSource(text(noteId || note.id))
  ]];
};
