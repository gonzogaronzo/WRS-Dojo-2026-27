import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, BarChart3, CalendarRange, CheckCircle2, Download, FileText,
  Printer, Target, TrendingDown, TrendingUp, UserRound, XCircle
} from 'lucide-react';
import { GroupProfile, StudentProfile } from '../types';
import { buildStudentReport, getStudentStepOptions, studentReportToCsv } from '../studentReport';

interface StudentReportsProps {
  students: StudentProfile[];
  groups: GroupProfile[];
  initialStudentId?: string | null;
}

const displayAccuracy = (value: number | null) => value === null ? '—' : `${value}%`;

const StudentReports: React.FC<StudentReportsProps> = ({ students, groups, initialStudentId }) => {
  const [studentId, setStudentId] = useState(initialStudentId || students[0]?.id || '');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [stepKey, setStepKey] = useState('');

  useEffect(() => {
    if (initialStudentId && students.some(student => student.id === initialStudentId)) {
      setStudentId(initialStudentId);
    }
  }, [initialStudentId, students]);

  const student = students.find(candidate => candidate.id === studentId) || null;
  const stepOptions = student ? getStudentStepOptions(student) : [];
  const report = useMemo(() => student ? buildStudentReport(student, {
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    stepKey: stepKey || undefined
  }) : null, [fromDate, stepKey, student, toDate]);
  const squadNames = student
    ? groups.filter(group => group.studentIds.includes(student.id)).map(group => group.name)
    : [];
  const trendSessions = report
    ? [...report.sessions].filter(session => session.accuracy !== null).reverse().slice(-12)
    : [];

  const clearFilters = () => {
    setFromDate('');
    setToDate('');
    setStepKey('');
  };

  const downloadCsv = () => {
    if (!report) return;
    const blob = new Blob([studentReportToCsv(report)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const safeName = report.studentName.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    anchor.href = url;
    anchor.download = `${safeName || 'student'}-wrs-report.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  if (!students.length) {
    return (
      <div className="rounded-[2rem] border-2 border-dashed border-stone-300 bg-white p-12 text-center">
        <UserRound className="mx-auto mb-3 h-10 w-10 text-stone-300" />
        <p className="text-sm font-black text-stone-600">Add a student before generating reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in">
      <section className="no-print rounded-[2rem] border border-stone-200 bg-stone-900 p-5 text-white shadow-sm" aria-label="Report controls">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-red-400">Student Analytics</p>
            <h3 className="font-serif text-2xl font-black">Performance & Attendance Reports</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!report || report.totalSessions === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-700 bg-stone-800 px-4 py-2.5 text-[9px] font-black uppercase tracking-widest hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Printer className="h-4 w-4" /> Print / Save PDF
            </button>
            <button
              type="button"
              onClick={downloadCsv}
              disabled={!report || report.totalSessions === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-4 w-4" /> Download CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <label className="md:col-span-2">
            <span className="mb-1.5 block text-[8px] font-black uppercase tracking-widest text-stone-500">Student</span>
            <select
              value={studentId}
              onChange={event => { setStudentId(event.target.value); setStepKey(''); }}
              className="w-full rounded-xl border border-stone-700 bg-stone-800 px-3 py-2.5 text-xs font-bold text-white"
            >
              {students.slice().sort((a, b) => a.name.localeCompare(b.name)).map(candidate => (
                <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-[8px] font-black uppercase tracking-widest text-stone-500">From</span>
            <input type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} className="w-full rounded-xl border border-stone-700 bg-stone-800 px-3 py-2.5 text-xs font-bold text-white" />
          </label>
          <label>
            <span className="mb-1.5 block text-[8px] font-black uppercase tracking-widest text-stone-500">Through</span>
            <input type="date" value={toDate} onChange={event => setToDate(event.target.value)} className="w-full rounded-xl border border-stone-700 bg-stone-800 px-3 py-2.5 text-xs font-bold text-white" />
          </label>
          <label>
            <span className="mb-1.5 block text-[8px] font-black uppercase tracking-widest text-stone-500">Step/Substep</span>
            <select value={stepKey} onChange={event => setStepKey(event.target.value)} className="w-full rounded-xl border border-stone-700 bg-stone-800 px-3 py-2.5 text-xs font-bold text-white">
              <option value="">All Steps</option>
              {stepOptions.map(option => <option key={option} value={option}>Step {option}</option>)}
            </select>
          </label>
        </div>
        {(fromDate || toDate || stepKey) && (
          <button type="button" onClick={clearFilters} className="mt-3 text-[9px] font-black uppercase tracking-widest text-stone-400 hover:text-white">Clear filters</button>
        )}
      </section>

      {student && report && (
        <article className="student-report-print-root space-y-5 rounded-[2rem] bg-[#fcfbf9] text-stone-900" aria-labelledby="student-report-title">
          <header className="rounded-[2rem] border-4 border-stone-900 bg-[#fdf6e3] p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-red-800">WRS Student Progress & Attendance Report</p>
                <h2 id="student-report-title" className="mt-1 font-serif text-3xl font-black">{student.name}</h2>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                  {squadNames.length ? squadNames.join(' · ') : 'No current group'}
                  {fromDate || toDate ? ` · ${fromDate || 'Beginning'} to ${toDate || 'Present'}` : ' · Complete history'}
                  {stepKey ? ` · Step ${stepKey}` : ''}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-[8px] font-black uppercase tracking-widest text-stone-400">Generated</p>
                <p className="text-xs font-bold">{new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date())}</p>
              </div>
            </div>
          </header>

          {report.totalSessions === 0 ? (
            <div className="rounded-[2rem] border-2 border-dashed border-stone-300 bg-white p-12 text-center">
              <CalendarRange className="mx-auto mb-3 h-10 w-10 text-stone-300" />
              <h3 className="font-serif text-xl font-black">No sessions match these filters.</h3>
              <p className="mt-1 text-xs font-bold text-stone-400">Clear the date or step filters to see more history.</p>
            </div>
          ) : (
            <>
              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Performance and attendance summary">
                {[
                  { label: 'Lesson Records', value: report.totalSessions, detail: `${report.scoredSessions} with scores`, icon: FileText },
                  {
                    label: 'Attendance',
                    value: report.attendanceRate === null ? '—' : `${report.attendanceRate}%`,
                    detail: report.attendanceTrackedSessions
                      ? `${report.presentSessions} present · ${report.absentSessions} absent`
                      : 'Begins with newly run lessons',
                    icon: CheckCircle2
                  },
                  { label: 'Overall Accuracy', value: displayAccuracy(report.overallAccuracy), detail: `${report.totalCorrect}/${report.totalAttempts} words`, icon: Target },
                  { label: 'Latest Score', value: displayAccuracy(report.latestAccuracy), detail: report.accuracyChange === null ? 'Need two scores for change' : `${report.accuracyChange >= 0 ? '+' : ''}${report.accuracyChange} points vs. prior`, icon: report.accuracyChange !== null && report.accuracyChange < 0 ? TrendingDown : TrendingUp },
                  { label: 'Recorded Errors', value: report.totalErrors, detail: `${report.topErrors.length} distinct recurring words`, icon: XCircle }
                ].map(metric => (
                  <div key={metric.label} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                    <metric.icon className="mb-4 h-5 w-5 text-red-800" />
                    <p className="text-[8px] font-black uppercase tracking-widest text-stone-400">{metric.label}</p>
                    <p className="mt-1 font-mono text-3xl font-black">{metric.value}</p>
                    <p className="mt-1 text-[9px] font-bold text-stone-400">{metric.detail}</p>
                  </div>
                ))}
              </section>

              {report.detailedSessions < report.scoredSessions && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="text-[10px] font-bold leading-relaxed">
                    Exact word-level detail is available for {report.detailedSessions} of {report.scoredSessions} scored sessions. Older imported records may show only their summary score.
                  </p>
                </div>
              )}

              <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-red-800" />
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest">Score Trend</h3>
                      <p className="text-[9px] font-bold text-stone-400">Up to the 12 most recent scored sessions</p>
                    </div>
                  </div>
                  {trendSessions.length ? (
                    <div className="flex h-52 items-end gap-2 border-b border-stone-200 px-1 pt-5">
                      {trendSessions.map(session => (
                        <div key={session.id} className="group flex min-w-0 flex-1 flex-col items-center justify-end self-stretch">
                          <span className="mb-1 text-[8px] font-black text-stone-500">{session.accuracy}%</span>
                          <div
                            className={`w-full max-w-10 rounded-t-md ${session.accuracy !== null && session.accuracy >= 80 ? 'bg-emerald-600' : 'bg-red-700'}`}
                            style={{ height: `${Math.max(5, session.accuracy || 0)}%` }}
                            title={`${session.date}: ${session.accuracy}%`}
                          />
                          <span className="mt-2 truncate text-[7px] font-bold text-stone-400">{session.date.slice(5)}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="py-16 text-center text-xs font-bold text-stone-400">No scored sessions yet.</p>}
                </div>

                <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-800" />
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest">Frequently Missed Words</h3>
                      <p className="text-[9px] font-bold text-stone-400">Repeated errors across the selected sessions</p>
                    </div>
                  </div>
                  {report.topErrors.length ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {report.topErrors.map(error => (
                        <div key={error.word.toLocaleLowerCase()} className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">
                          <span className="font-serif text-sm font-black text-stone-900">{error.word}</span>
                          <span className="rounded-lg bg-red-800 px-2 py-1 font-mono text-[9px] font-black text-white">{error.count}×</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <CheckCircle2 className="mx-auto mb-2 h-9 w-9 text-emerald-600" />
                      <p className="text-xs font-black text-stone-500">No recorded word errors in this range.</p>
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-xs font-black uppercase tracking-widest">Performance by Step/Substep</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {report.stepBreakdown.map(step => (
                    <div key={step.stepKey} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-stone-400">Step</p>
                          <p className="font-serif text-xl font-black">{step.stepKey}</p>
                        </div>
                        <p className={`font-mono text-xl font-black ${(step.accuracy || 0) >= 80 ? 'text-emerald-700' : 'text-red-800'}`}>{displayAccuracy(step.accuracy)}</p>
                      </div>
                      <p className="mt-2 text-[9px] font-bold text-stone-400">{step.sessions} lesson record{step.sessions === 1 ? '' : 's'} · {step.correctCount}/{step.totalCount} words</p>
                      {(step.presentSessions > 0 || step.absentSessions > 0) && (
                        <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-stone-400">{step.presentSessions} present · {step.absentSessions} absent</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section className="overflow-hidden rounded-[2rem] border-4 border-stone-900 bg-[#fdf6e3] shadow-sm">
                <div className="border-b-2 border-stone-900 bg-stone-900 px-6 py-4 text-white">
                  <h3 className="text-xs font-black uppercase tracking-widest">Lesson Attendance, Scores, and Errors</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-xs">
                    <thead className="border-b border-stone-200 bg-stone-100">
                      <tr>
                        <th className="px-5 py-3 text-[8px] font-black uppercase tracking-widest text-stone-500">Date</th>
                        <th className="px-5 py-3 text-[8px] font-black uppercase tracking-widest text-stone-500">Attendance</th>
                        <th className="px-5 py-3 text-[8px] font-black uppercase tracking-widest text-stone-500">Lesson</th>
                        <th className="px-5 py-3 text-[8px] font-black uppercase tracking-widest text-stone-500">Score</th>
                        <th className="px-5 py-3 text-[8px] font-black uppercase tracking-widest text-stone-500">Missed Words</th>
                        <th className="px-5 py-3 text-[8px] font-black uppercase tracking-widest text-stone-500">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {report.sessions.map(session => (
                        <tr key={session.id} className="align-top">
                          <td className="whitespace-nowrap px-5 py-4 font-mono font-bold text-stone-500">{session.date}</td>
                          <td className="whitespace-nowrap px-5 py-4">
                            <span className={`inline-flex rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-widest ${
                              session.attendanceStatus === 'present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : session.attendanceStatus === 'absent'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-stone-200 text-stone-600'
                            }`}>
                              {session.attendanceStatus === 'not-recorded' ? 'Not tracked' : session.attendanceStatus}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-black">{session.lessonTitle}</p>
                            <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-red-800">Step {session.stepKey}</p>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4">
                            <p className={`font-mono text-sm font-black ${(session.accuracy || 0) >= 80 ? 'text-emerald-700' : 'text-red-800'}`}>{displayAccuracy(session.accuracy)}</p>
                            <p className="text-[8px] font-bold text-stone-400">{session.attendanceStatus === 'absent' ? 'Not present' : session.totalCount ? `${session.correctCount}/${session.totalCount}` : 'Summary only'}</p>
                          </td>
                          <td className="max-w-xs px-5 py-4 font-bold text-red-800">{session.errors.length ? session.errors.join(', ') : '—'}</td>
                          <td className="max-w-xs whitespace-pre-wrap px-5 py-4 text-stone-600">{session.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </article>
      )}
    </div>
  );
};

export default StudentReports;
