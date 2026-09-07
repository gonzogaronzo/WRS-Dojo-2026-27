'use strict';

const clean = value => typeof value === 'string' ? value.trim() : '';

const scoreText = result => {
  if (!result || !Number.isFinite(result.totalCount) || result.totalCount === 0) return 'No scored words';
  return `${result.correctCount}/${result.totalCount} (${result.accuracy}%)`;
};

const missionRows = mission => {
  if (!mission || mission.status !== 'completed') return [];

  const results = Array.isArray(mission.results) ? mission.results : [];
  const attendance = Array.isArray(mission.attendance) && mission.attendance.length > 0
    ? mission.attendance
    : results.map(result => ({
        studentId: result.studentId,
        studentName: result.studentName,
        status: 'present'
      }));

  return attendance.map(entry => {
    const result = results.find(candidate => candidate.studentId === entry.studentId);
    const isAbsent = entry.status === 'absent';
    const errors = result && Array.isArray(result.errors) ? result.errors.filter(Boolean) : [];
    const syncKey = `${mission.id}:${entry.studentId}`;

    return [
      clean(mission.date),
      clean(entry.studentName || result?.studentName),
      clean(mission.squadName),
      clean(mission.lessonStep || [mission.step, mission.substep].filter(Boolean).join('.')),
      clean(mission.lessonTitle),
      isAbsent ? 'Attendance' : 'Word charting',
      isAbsent ? 'Absent' : scoreText(result),
      errors.join(', '),
      '',
      isAbsent ? 'Absent' : 'Present',
      `WRS Dojo automatic session sync · ${mission.id}`,
      errors.length > 0 ? 'Yes' : 'No',
      syncKey,
      clean(mission.id)
    ];
  });
};

module.exports = { missionRows, scoreText };
