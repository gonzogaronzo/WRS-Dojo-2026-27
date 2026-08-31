
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Lesson, StudentProfile, GroupProfile, WordlistScore, MissionRecord } from '../types';
import { CheckCircle, RefreshCw, Trophy, ShieldCheck, Home, Terminal, ClipboardList, ScrollText, WifiOff, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { buildMissionRecord, createMissionId } from '../missionArchive';

interface SessionDossierProps {
  lesson: Lesson;
  activeGroup: GroupProfile;
  students: StudentProfile[];
  sessionStudentIds: string[];
  sessionScores: WordlistScore[];
  sessionNotes?: string;
  sessionId?: string;
  sessionDate?: string;
  teacherId: string;
  onArchiveMission: (mission: MissionRecord) => Promise<'local' | 'cloud'>;
  onComplete: () => void;
  onUpdateGroup: (group: GroupProfile) => Promise<void | boolean>;
  gasUrl: string; // Deprecated but kept for type compatibility
}

const SessionDossier: React.FC<SessionDossierProps> = ({ 
  lesson, activeGroup, students, sessionStudentIds, sessionScores, sessionNotes = '', 
  sessionId = '', sessionDate = '', teacherId, onArchiveMission, onComplete, onUpdateGroup
}) => {
  const [syncStatus, setSyncStatus] = useState<'saving' | 'success-local' | 'success-cloud' | 'error'>('saving');
  const [journalStatus, setJournalStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [debugLog, setDebugLog] = useState<string>("");
  const [manualLogData, setManualLogData] = useState<string>("");
  const [copied, setCopied] = useState(false);
  
  const logEndRef = useRef<HTMLDivElement>(null);
  const missionIdRef = useRef(sessionId || createMissionId());
  const autoSaveStartedRef = useRef(false);
  const activeStudents = useMemo(
    () => students.filter(s => sessionStudentIds.includes(s.id)),
    [students, sessionStudentIds]
  );
  const missionRecord = useMemo(() => buildMissionRecord({
    id: missionIdRef.current,
    teacherId,
    date: sessionDate,
    lesson,
    group: activeGroup,
    students,
    studentIds: sessionStudentIds,
    scores: sessionScores,
    notes: sessionNotes
  }), [activeGroup, lesson, sessionDate, sessionNotes, sessionScores, sessionStudentIds, students, teacherId]);

  useEffect(() => {
    const date = sessionDate || new Date().toLocaleDateString();
    const rows = activeStudents.map(s => {
      const studentScores = sessionScores.filter(score => score.studentId === s.id);
      const correct = studentScores.filter(sc => sc.status === 'correct').length;
      const errors = studentScores.filter(sc => sc.status === 'error');
      const totalGraded = correct + errors.length;
      const accuracy = totalGraded > 0 ? `${Math.round((correct / totalGraded) * 100)}%` : 'N/A';
      const scoreStr = totalGraded > 0 ? `${correct}/${totalGraded} (${accuracy})` : "Mission Complete";
      const missedWords = errors.length > 0 ? `Missed: ${errors.map(e => e.wordText).join(', ')}` : "";
      return `${date}\t${activeGroup.name}\t${s.name}\t${lesson.title}\t${lesson.step}.${lesson.substep}\t${scoreStr}\t${missedWords}`;
    });
    setManualLogData(rows.join('\n'));
  }, [lesson, activeGroup, activeStudents, sessionDate, sessionScores]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [debugLog]);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setDebugLog(prev => prev + `[${timestamp}] ${msg}\n`);
  };

  const saveMission = useCallback(async () => {
    setSyncStatus('saving');
    addLog('Saving the complete word-by-word record...');
    try {
      const destination = await onArchiveMission(missionRecord);
      setSyncStatus(destination === 'cloud' ? 'success-cloud' : 'success-local');
      addLog(destination === 'cloud'
        ? 'Record saved to the cloud and each student history.'
        : 'Record saved on this device and each student history.');
    } catch (error) {
      console.error(error);
      setSyncStatus('error');
      addLog('Save failed. The record is still here—use Retry before leaving.');
    }
  }, [missionRecord, onArchiveMission]);

  useEffect(() => {
    if (autoSaveStartedRef.current) return;
    autoSaveStartedRef.current = true;
    void saveMission();
  }, [saveMission]);

  const handleCopy = () => {
    navigator.clipboard.writeText(manualLogData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const logToJournal = async () => {
    setJournalStatus('saving');
    try {
      const date = new Date().toLocaleDateString();
      const summary = `\n--- Mission Log: ${date} ---\n` + 
        `Lesson: ${lesson.title} (Step ${lesson.step}.${lesson.substep})\n` +
        activeStudents.map(s => {
          const studentScores = sessionScores.filter(score => score.studentId === s.id);
          const correct = studentScores.filter(sc => sc.status === 'correct').length;
          const total = studentScores.length;
          const pct = total > 0 ? Math.round((correct / total) * 100) : 100;
          return `- ${s.name}: ${correct}/${total} (${pct}%)`;
        }).join('\n') + 
        (sessionNotes ? `\n\nNotes:\n${sessionNotes}` : '') + '\n';

      const updatedGroup = {
        ...activeGroup,
        notes: (activeGroup.notes || '') + summary
      };

      await onUpdateGroup(updatedGroup);
      setJournalStatus('success');
      addLog("📝 Lesson summary appended to the group record.");
    } catch (err) {
      console.error(err);
      setJournalStatus('idle');
    }
  };

  const isSaved = syncStatus === 'success-local' || syncStatus === 'success-cloud';

  return (
    <div className="h-full flex flex-col items-center justify-start p-8 bg-stone-950 text-white text-center relative overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl w-full z-10 space-y-8 animate-in zoom-in duration-700 py-10">
        <div className="relative">
           <div className="absolute inset-0 bg-red-600 blur-[100px] opacity-20 rounded-full animate-pulse"></div>
           <div className="bg-stone-900 p-8 rounded-full border-4 border-stone-800 shadow-2xl inline-block relative">
              <Trophy className="w-16 h-16 text-red-600" />
           </div>
        </div>
        
        <h2 className="text-5xl font-black font-serif uppercase tracking-widest text-white">Mission Complete</h2>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-2xl">
           <table className="w-full text-left">
              <thead className="bg-stone-800/50 border-b border-stone-800">
                 <tr>
                    <th className="px-6 py-3 text-[10px] font-black uppercase text-stone-500 tracking-widest">Student</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase text-stone-500 tracking-widest">Accuracy</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase text-stone-500 tracking-widest">Missed Words</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/50">
                 {activeStudents.map(s => {
                    const studentScores = sessionScores.filter(score => score.studentId === s.id);
                    const correct = studentScores.filter(sc => sc.status === 'correct').length;
                    const errors = studentScores.filter(sc => sc.status === 'error');
                    const total = correct + errors.length;
                    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
                    return (
                       <tr key={s.id} className="hover:bg-stone-800/20 transition-colors">
                          <td className="px-6 py-4 font-bold text-stone-200">{s.name}</td>
                          <td className="px-6 py-4"><span className={`font-mono text-sm ${pct >= 80 ? 'text-emerald-400' : 'text-red-400'}`}>{total > 0 ? `${correct}/${total}` : '-'}</span></td>
                          <td className="px-6 py-4 text-xs text-stone-500 italic truncate max-w-xs">{errors.map(e => e.wordText).join(', ') || 'Perfect Reading'}</td>
                       </tr>
                    );
                 })}
              </tbody>
           </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div className="space-y-4">
             <button onClick={syncStatus === 'error' ? saveMission : undefined} disabled={syncStatus !== 'error'} className={`w-full py-8 rounded-2xl font-black uppercase tracking-widest flex flex-col items-center justify-center gap-2 transition-all ${syncStatus === 'saving' ? 'bg-stone-800 text-stone-400' : isSaved ? 'bg-emerald-900 text-emerald-200 border-2 border-emerald-500' : 'bg-red-800 hover:bg-red-700 text-white shadow-xl active:scale-95'}`}>
               {syncStatus === 'saving' && <><RefreshCw className="w-8 h-8 animate-spin" /><span>Saving Record...</span></>}
               {syncStatus === 'success-cloud' && <><ShieldCheck className="w-8 h-8" /><span>Saved to Cloud</span></>}
               {syncStatus === 'success-local' && <><WifiOff className="w-8 h-8" /><span>Saved on This Device</span></>}
               {syncStatus === 'error' && <><AlertTriangle className="w-8 h-8" /><span>Retry Save</span></>}
             </button>
             <div className="bg-stone-800 rounded-xl overflow-hidden text-left border border-stone-700 shadow-xl">
                <div className="bg-stone-900 px-4 py-2 flex items-center gap-2 border-b border-stone-700"><Terminal className="w-3 h-3 text-stone-500" /><span className="text-[10px] font-black uppercase text-stone-500 tracking-widest">Automatic Save Log</span></div>
                <div className="p-3 h-24 overflow-y-auto font-mono text-[10px] text-stone-400 bg-stone-900/50 whitespace-pre-wrap">{debugLog || "Preparing the record..."}<div ref={logEndRef} /></div>
             </div>
           </div>
           <div className="space-y-4">
             <button onClick={logToJournal} disabled={journalStatus === 'saving' || journalStatus === 'success'} className={`w-full py-8 rounded-2xl font-black uppercase tracking-widest flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${journalStatus === 'saving' ? 'bg-stone-800 text-stone-500' : journalStatus === 'success' ? 'bg-amber-900 text-amber-200 border-2 border-amber-500' : 'bg-stone-900 hover:bg-stone-800 text-white shadow-xl border border-stone-800'}`}>
               {journalStatus === 'saving' ? <><RefreshCw className="w-8 h-8 animate-spin" /><span>Logging...</span></> : journalStatus === 'success' ? <><CheckCircle2 className="w-8 h-8" /><span>Logged to Journal</span></> : <><ScrollText className="w-8 h-8 text-amber-500" /><span>Log to Journal</span></>}
             </button>
           </div>
           <div className="bg-stone-900/50 border-2 border-dashed border-stone-800 rounded-2xl p-6 text-left flex flex-col">
              <div className="flex items-center gap-2 text-stone-500 font-black uppercase text-[10px] tracking-widest mb-4"><ClipboardList className="w-4 h-4" /> Manual Export Record</div>
              <div className="relative flex-1">
                 <textarea readOnly value={manualLogData} className="w-full h-32 bg-stone-950 border border-stone-800 rounded-lg p-3 font-mono text-[10px] text-stone-500 focus:outline-none" />
                 <button onClick={handleCopy} className="absolute top-2 right-2 bg-stone-800 hover:bg-stone-700 text-white px-3 py-1 rounded text-[10px] font-bold uppercase border border-stone-600">{copied ? "Copied" : "Copy"}</button>
              </div>
           </div>
        </div>
        <button onClick={onComplete} disabled={!isSaved} className="w-full py-5 rounded-2xl bg-white hover:bg-stone-200 disabled:bg-stone-800 disabled:text-stone-500 disabled:cursor-not-allowed text-stone-900 font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-2xl active:scale-95"><Home className="w-6 h-6" /> {isSaved ? 'Return to Temple' : 'Saving Before Return...'}</button>
      </div>
    </div>
  );
};

export default SessionDossier;
