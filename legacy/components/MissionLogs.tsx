
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { MissionRecord, GroupProfile, StudentProfile } from '../types';
import { ScrollText, Calendar, Users, ChevronRight, ChevronDown, Trophy, AlertCircle, RefreshCw, Activity, ShieldCheck } from 'lucide-react';

interface MissionLogsProps {
  teacherId: string;
  groups: GroupProfile[];
  students: StudentProfile[];
}

const studentWasRecorded = (mission: MissionRecord, studentId: string) => (
  mission.results.some(result => result.studentId === studentId)
  || (mission.attendance || []).some(entry => entry.studentId === studentId)
);

const presentCount = (mission: MissionRecord) => (
  mission.attendance?.length
    ? mission.attendance.filter(entry => entry.status === 'present').length
    : mission.results.length
);

const absentCount = (mission: MissionRecord) => (
  (mission.attendance || []).filter(entry => entry.status === 'absent').length
);

const MissionLogs: React.FC<MissionLogsProps> = ({ teacherId, groups, students }) => {
  const [missions, setMissions] = useState<MissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterSquad, setFilterSquad] = useState<string>('all');
  const [filterStudent, setFilterStudent] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'report'>('list');

  useEffect(() => {
    fetchMissions();
  }, [teacherId]);

  const fetchMissions = async () => {
    if (!teacherId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (teacherId === 'guest-sensei') {
        const saved = localStorage.getItem('wrs_dojo_missions');
        setMissions(saved ? JSON.parse(saved) : []);
        return;
      }

      const q = query(
        collection(db, 'missions'),
        where('teacherId', '==', teacherId),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MissionRecord));
      
      // Sort in memory to avoid index requirement
      data.sort((a, b) => {
        const timeA = a.timestamp?.toMillis?.() || Date.parse(a.timestamp || a.date || '') || 0;
        const timeB = b.timestamp?.toMillis?.() || Date.parse(b.timestamp || b.date || '') || 0;
        return timeB - timeA;
      });

      setMissions(data);
    } catch (err: any) {
      console.error("Failed to fetch missions:", err);
      setError(err.message || "Failed to consult the archives.");
    } finally {
      setLoading(false);
    }
  };

  const filteredMissions = missions.filter(m => {
    const squadMatch = filterSquad === 'all' || m.squadId === filterSquad;
    const studentMatch = filterStudent === 'all' || studentWasRecorded(m, filterStudent);
    return squadMatch && studentMatch;
  });

  // Aggregate stats for reporting
  const getReportData = () => {
    if (filterStudent !== 'all') {
      const studentMissions = missions.filter(m => studentWasRecorded(m, filterStudent));
      const studentResults = studentMissions.flatMap(m => {
        const result = m.results.find(candidate => candidate.studentId === filterStudent);
        return result ? [result] : [];
      });
      const totalCorrect = studentResults.reduce((sum, r) => sum + r.correctCount, 0);
      const totalWords = studentResults.reduce((sum, r) => sum + r.totalCount, 0);
      const allErrors = studentResults.flatMap(r => r.errors);
      const errorFrequency = allErrors.reduce((acc, err) => {
        acc[err] = (acc[err] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return {
        type: 'student',
        name: students.find(s => s.id === filterStudent)?.name || 'Unknown Student',
        totalMissions: studentMissions.length,
        avgAccuracy: totalWords > 0 ? Math.round((totalCorrect / totalWords) * 100) : 0,
        topErrors: Object.entries(errorFrequency).sort((a, b) => b[1] - a[1]).slice(0, 10),
        history: studentMissions.flatMap(m => {
          const result = m.results.find(candidate => candidate.studentId === filterStudent);
          if (!result) return [];
          return [{
            date: m.date || m.timestamp?.toDate?.()?.toLocaleDateString() || 'Recent',
            accuracy: result.accuracy ?? (result.totalCount > 0
              ? Math.round((result.correctCount / result.totalCount) * 100)
              : 0)
          }];
        }).reverse()
      };
    }

    if (filterSquad !== 'all') {
      const squadMissions = missions.filter(m => m.squadId === filterSquad);
      const allResults = squadMissions.flatMap(m => m.results);
      const totalCorrect = allResults.reduce((sum, r) => sum + r.correctCount, 0);
      const totalWords = allResults.reduce((sum, r) => sum + r.totalCount, 0);
      
      return {
        type: 'squad',
        name: groups.find(g => g.id === filterSquad)?.name || 'Unknown Group',
        totalMissions: squadMissions.length,
        avgAccuracy: totalWords > 0 ? Math.round((totalCorrect / totalWords) * 100) : 0,
        ninjaCount: groups.find(g => g.id === filterSquad)?.studentIds.length || 0,
        history: squadMissions.map(m => {
          const squadCorrect = m.results.reduce((sum, r) => sum + r.correctCount, 0);
          const squadTotal = m.results.reduce((sum, r) => sum + r.totalCount, 0);
          return {
            date: m.date || m.timestamp?.toDate?.()?.toLocaleDateString() || 'Recent',
            accuracy: squadTotal > 0 ? Math.round((squadCorrect / squadTotal) * 100) : 0
          };
        }).reverse()
      };
    }

    return null;
  };

  const report = getReportData();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <RefreshCw className="w-10 h-10 text-red-800 animate-spin mb-4" />
        <p className="text-stone-500 font-black uppercase text-[10px] tracking-widest">Consulting the Archives...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 bg-red-900/20 rounded-[2rem] border-4 border-dashed border-red-900/30">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h3 className="text-xl font-black font-serif uppercase tracking-widest text-white">Archives Unreachable</h3>
        <p className="text-red-400 text-sm max-w-md">{error}</p>
        <button onClick={fetchMissions} className="mt-4 px-6 py-2 bg-red-900 text-white rounded-xl font-black uppercase text-[10px] flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  if (missions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 bg-stone-800/30 rounded-[2rem] border-4 border-dashed border-stone-700">
        <ScrollText className="w-12 h-12 text-stone-600" />
        <h3 className="text-xl font-black font-serif uppercase tracking-widest text-white">No Missions Recorded</h3>
        <p className="text-stone-500 text-sm max-w-md">Complete a lesson and its full word-by-word record will appear here automatically.</p>
        {teacherId === 'guest-sensei' && <p className="text-amber-500 text-[10px] font-black uppercase tracking-widest">Guest records stay on this device</p>}
        <p className="text-stone-700 text-[8px] font-mono mt-4">ID: {teacherId}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 text-stone-900">
      <div className="bg-stone-800/50 p-6 rounded-3xl border border-stone-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
            <h3 className="text-white font-black uppercase tracking-widest text-xs">Mission Archives</h3>
            <p className="text-stone-500 text-[10px] font-bold uppercase tracking-widest mt-1">Intelligence & Performance Analytics</p>
         </div>
         
         <div className="flex flex-wrap items-center gap-2">
            <select 
              value={filterSquad} 
              onChange={(e) => { setFilterSquad(e.target.value); setFilterStudent('all'); }}
              className="bg-stone-900 text-stone-300 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border border-stone-700 focus:outline-none focus:border-red-800"
            >
              <option value="all">All Groups</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>

            <select 
              value={filterStudent} 
              onChange={(e) => { setFilterStudent(e.target.value); if(e.target.value !== 'all') setFilterSquad('all'); }}
              className="bg-stone-900 text-stone-300 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border border-stone-700 focus:outline-none focus:border-red-800"
            >
              <option value="all">All Students</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <div className="h-8 w-px bg-stone-700 mx-1 hidden md:block"></div>

            <button 
              onClick={() => setViewMode(viewMode === 'list' ? 'report' : 'list')}
              disabled={filterSquad === 'all' && filterStudent === 'all'}
              className={`px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 ${
                viewMode === 'report' 
                  ? 'bg-red-800 text-white shadow-lg shadow-red-900/20' 
                  : 'bg-stone-700 text-stone-300 hover:bg-stone-600 disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            >
              <Activity className="w-3 h-3" />
              {viewMode === 'report' ? 'Exit Report' : 'Run Report'}
            </button>

            <button onClick={fetchMissions} className="p-2 text-stone-400 hover:text-white transition-colors">
               <RefreshCw className="w-4 h-4" />
            </button>
         </div>
      </div>

      {viewMode === 'report' && report ? (
        <div className="space-y-6 animate-in zoom-in-95 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#fdf6e3] p-6 rounded-[2rem] border-4 border-stone-800 shadow-xl">
              <span className="text-[9px] font-black uppercase text-stone-400 tracking-widest">Subject</span>
              <h4 className="text-2xl font-black font-serif text-stone-900 uppercase">{report.name}</h4>
              <p className="text-stone-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                {report.type === 'student' ? 'Individual Student Profile' : 'Group Performance'}
              </p>
            </div>
            
            <div className="bg-[#fdf6e3] p-6 rounded-[2rem] border-4 border-stone-800 shadow-xl flex flex-col justify-center items-center text-center">
              <span className="text-[9px] font-black uppercase text-stone-400 tracking-widest mb-1">Avg Accuracy</span>
              <div className="text-4xl font-black font-mono text-red-800">{report.avgAccuracy}%</div>
              <div className="w-full bg-stone-200 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-red-800 h-full transition-all duration-1000" style={{ width: `${report.avgAccuracy}%` }}></div>
              </div>
            </div>

            <div className="bg-[#fdf6e3] p-6 rounded-[2rem] border-4 border-stone-800 shadow-xl flex flex-col justify-center items-center text-center">
              <span className="text-[9px] font-black uppercase text-stone-400 tracking-widest mb-1">Missions Completed</span>
              <div className="text-4xl font-black font-mono text-stone-900">{report.totalMissions}</div>
              <p className="text-stone-500 text-[10px] font-bold uppercase tracking-widest mt-1">Archived Records</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Accuracy Trend */}
            <div className="bg-stone-900/40 p-8 rounded-[2.5rem] border-2 border-stone-800">
              <h5 className="text-white font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                <Activity className="w-4 h-4 text-red-600" /> Performance Trend
              </h5>
              <div className="h-48 flex items-end gap-2">
                {report.history.map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center group relative">
                    <div 
                      className="w-full bg-red-800/40 border-t-2 border-red-600 rounded-t-lg transition-all hover:bg-red-600"
                      style={{ height: `${h.accuracy}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {h.accuracy}%
                      </div>
                    </div>
                    <span className="text-[7px] text-stone-600 font-bold uppercase tracking-tighter mt-2 rotate-45 origin-left">{h.date}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Error Analysis */}
            <div className="bg-stone-900/40 p-8 rounded-[2.5rem] border-2 border-stone-800">
              <h5 className="text-white font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" /> Phonetic Hurdles
              </h5>
              {report.type === 'student' && 'topErrors' in report && report.topErrors ? (
                <div className="space-y-3">
                  {report.topErrors.length > 0 ? (
                    report.topErrors.map(([word, count], i) => (
                      <div key={i} className="flex items-center justify-between bg-stone-800/50 p-3 rounded-xl border border-stone-700">
                        <span className="text-stone-200 font-serif font-bold">{word}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-stone-500 uppercase">Encountered</span>
                          <span className="bg-red-900/50 text-red-200 px-2 py-0.5 rounded-lg font-mono text-xs">{count}x</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10">
                      <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
                      <p className="text-stone-500 text-[10px] font-black uppercase tracking-widest">No recurring errors found</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <Users className="w-10 h-10 text-stone-700 mb-3" />
                  <p className="text-stone-500 text-[10px] font-black uppercase tracking-widest">Group-wide error aggregation coming soon</p>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Data Table */}
          <div className="bg-[#fdf6e3] rounded-[2.5rem] border-4 border-stone-800 shadow-xl overflow-hidden">
            <div className="bg-stone-900 p-6 flex items-center justify-between">
              <h5 className="text-white font-black uppercase tracking-widest text-xs flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-red-600" /> Granular Mission Data
              </h5>
              <span className="text-stone-500 text-[9px] font-black uppercase tracking-widest">
                {filteredMissions.length} Source Records
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-100 border-b-2 border-stone-200">
                  <tr>
                    <th className="px-6 py-4 font-black uppercase text-stone-500 tracking-widest">Date</th>
                    <th className="px-6 py-4 font-black uppercase text-stone-500 tracking-widest">Mission</th>
                    <th className="px-6 py-4 font-black uppercase text-stone-500 tracking-widest">Accuracy</th>
                    <th className="px-6 py-4 font-black uppercase text-stone-500 tracking-widest">
                      {report.type === 'student' ? 'Specific Errors' : 'Attendance'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {filteredMissions.map((m, idx) => {
                    const ts = m.timestamp?.toDate ? m.timestamp.toDate() : (m.timestamp?.seconds ? new Date(m.timestamp.seconds * 1000) : null);
                    const dateStr = m.date || ts?.toLocaleDateString() || 'Recent';
                    
                    if (report.type === 'student') {
                      const res = m.results.find(r => r.studentId === filterStudent);
                      const attendance = (m.attendance || []).find(entry => entry.studentId === filterStudent);
                      if (!res && attendance?.status !== 'absent') return null;
                      if (!res) {
                        return (
                          <tr key={idx} className="bg-red-50/50">
                            <td className="px-6 py-4 font-mono font-bold text-stone-400">{dateStr}</td>
                            <td className="px-6 py-4">
                              <div className="font-black text-stone-900">{m.lessonTitle}</div>
                              <div className="text-[9px] font-bold text-red-800 uppercase">Step {m.lessonStep}</div>
                            </td>
                            <td className="px-6 py-4 font-black text-stone-400">—</td>
                            <td className="px-6 py-4 font-black text-red-800">Absent</td>
                          </tr>
                        );
                      }
                      const acc = res.accuracy ?? (res.totalCount > 0 ? Math.round((res.correctCount / res.totalCount) * 100) : 0);
                      return (
                        <tr key={idx} className="hover:bg-white transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-stone-400">{dateStr}</td>
                          <td className="px-6 py-4">
                            <div className="font-black text-stone-900">{m.lessonTitle}</div>
                            <div className="text-[9px] font-bold text-red-800 uppercase">Step {m.lessonStep}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`font-mono font-black text-sm ${acc >= 80 ? 'text-emerald-600' : 'text-red-600'}`}>{acc}%</span>
                              <span className="text-stone-400 text-[10px]">({res.correctCount}/{res.totalCount})</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-stone-500 italic max-w-xs truncate">
                            {res.errors.length > 0 ? res.errors.join(', ') : 'Perfect Reading'}
                          </td>
                        </tr>
                      );
                    } else {
                      const squadCorrect = m.results.reduce((sum, r) => sum + r.correctCount, 0);
                      const squadTotal = m.results.reduce((sum, r) => sum + r.totalCount, 0);
                      const acc = squadTotal > 0 ? Math.round((squadCorrect / squadTotal) * 100) : 0;
                      return (
                        <tr key={idx} className="hover:bg-white transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-stone-400">{dateStr}</td>
                          <td className="px-6 py-4">
                            <div className="font-black text-stone-900">{m.lessonTitle}</div>
                            <div className="text-[9px] font-bold text-red-800 uppercase">Step {m.lessonStep}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`font-mono font-black text-sm ${acc >= 80 ? 'text-emerald-600' : 'text-red-600'}`}>{acc}%</span>
                              <span className="text-stone-400 text-[10px]">Avg</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-stone-400" />
                              <span className="font-bold text-stone-600">{presentCount(m)} present{absentCount(m) ? `, ${absentCount(m)} absent` : ''}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMissions.map(mission => {
          const isExpanded = expandedId === mission.id;
          const absentStudents = (mission.attendance || []).filter(entry => entry.status === 'absent');
          
          // Safe timestamp handling
          let date = "Recent";
          let time = "";
          if (mission.date) date = mission.date;
          if (mission.timestamp && typeof mission.timestamp !== 'string') {
            const ts = mission.timestamp.toDate ? mission.timestamp.toDate() : new Date(mission.timestamp.seconds * 1000);
            date = ts.toLocaleDateString();
            time = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
          
          return (
            <div key={mission.id} className="bg-[#fdf6e3] text-stone-900 rounded-[2rem] border-4 border-stone-800 shadow-xl overflow-hidden transition-all">
              <div 
                onClick={() => setExpandedId(isExpanded ? null : mission.id)}
                className="p-6 cursor-pointer flex items-center justify-between hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-stone-900 rounded-2xl flex items-center justify-center text-red-600 shadow-lg">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-black uppercase text-red-800 bg-red-50 px-2 py-0.5 rounded-full">Step {mission.lessonStep}</span>
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {date} {time}
                      </span>
                    </div>
                    <h4 className="text-lg font-black font-serif leading-tight">{mission.lessonTitle}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Users className="w-3 h-3 text-stone-400" />
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">{mission.squadName} • {presentCount(mission)} Present{absentStudents.length ? ` • ${absentStudents.length} Absent` : ''}</span>
                    </div>
                  </div>
                </div>
                {isExpanded ? <ChevronDown className="w-6 h-6 text-stone-300" /> : <ChevronRight className="w-6 h-6 text-stone-300" />}
              </div>

              {isExpanded && (
                <div className="px-6 pb-6 pt-2 border-t border-stone-200/50 animate-in slide-in-from-top-2 duration-300">
                  <div className="bg-white rounded-2xl border-2 border-stone-100 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-50 border-b border-stone-100">
                        <tr>
                          <th className="px-4 py-2 font-black uppercase text-stone-400 tracking-widest">Student</th>
                          <th className="px-4 py-2 font-black uppercase text-stone-400 tracking-widest">Score</th>
                          <th className="px-4 py-2 font-black uppercase text-stone-400 tracking-widest">Word-by-word Record</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-50">
                        {mission.results.map((res, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3 font-bold text-stone-800">{res.studentName}</td>
                            <td className="px-4 py-3">
                              <span className={`font-mono font-bold ${res.correctCount === res.totalCount ? 'text-emerald-600' : 'text-red-600'}`}>
                                {res.correctCount}/{res.totalCount}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {res.attempts?.length ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {res.attempts.map((attempt, attemptIndex) => (
                                    <span key={`${attempt.instanceId}-${attemptIndex}`} className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${attempt.status === 'correct' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                      {attempt.wordText} {attempt.status === 'correct' ? '✓' : '×'}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-stone-500 italic">{res.errors?.length > 0 ? res.errors.join(', ') : 'No word attempts recorded'}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {absentStudents.length > 0 && (
                    <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-left">
                      <div className="mb-1 text-[9px] font-black uppercase tracking-widest text-red-700">Absent</div>
                      <p className="text-xs font-bold text-red-900">{absentStudents.map(student => student.studentName).join(', ')}</p>
                    </div>
                  )}
                  {mission.notes && (
                    <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-left">
                      <div className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1">Teacher Notes</div>
                      <p className="text-xs text-stone-700 whitespace-pre-wrap">{mission.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}
    </div>
  );
};

export default MissionLogs;
