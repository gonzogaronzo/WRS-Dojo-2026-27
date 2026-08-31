import React, { useState } from 'react';
import { GroupProfile, StudentProfile } from '../types';
import { Plus, Trash2, User, History, X, Calendar, CheckCircle2, XCircle, BarChart3 } from 'lucide-react';
import MissionCard from './MissionCard';
import ConfirmModal from './ConfirmModal';

interface NinjasViewProps {
  students: StudentProfile[];
  activeGroup: GroupProfile | null;
  onUpdateStudents: (students: StudentProfile[]) => void;
  onAddStudent: (name?: string) => void;
  onDeleteStudent: (id: string) => void;
  onToggleStudentInGroup: (studentId: string) => void;
  onOpenReport?: (studentId: string) => void;
}

const NinjasView: React.FC<NinjasViewProps> = ({
  students, activeGroup, onUpdateStudents, onAddStudent, onDeleteStudent, onToggleStudentInGroup, onOpenReport
}) => {
  const [newName, setNewName] = useState('');
  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAddStudent(newName.trim());
      setNewName('');
    }
  };

  const historyStudent = students.find(student => student.id === historyStudentId) || null;

  return (
    <div className="animate-in slide-in-from-bottom-4">
      <div className="bg-stone-800/50 p-6 rounded-3xl border border-stone-700 flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-white font-black uppercase tracking-widest text-xs">Student Registry</h3>
          <p className="text-stone-500 text-[10px] font-bold uppercase tracking-widest mt-1">Manage your students across all groups</p>
        </div>
        <form onSubmit={handleQuickAdd} className="flex items-center gap-2 w-full sm:w-auto">
          <input 
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New Student Name..."
            className="bg-stone-900 border border-stone-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-red-800 transition-all w-full sm:w-48"
          />
          <button type="submit" className="px-4 py-2 bg-emerald-700 text-white rounded-xl font-black uppercase text-[10px] flex items-center gap-2 shadow-lg hover:bg-emerald-600 transition-all shrink-0">
            <Plus className="w-4 h-4" /> Add
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.map(s => (
          <MissionCard 
            key={s.id}
            title={s.name}
            subtitle={`${s.attendanceCount} Lessons Present`}
            badge={activeGroup?.studentIds.includes(s.id) ? 'In Group' : 'Available'}
            icon={User}
            primaryActionLabel={activeGroup ? (activeGroup.studentIds.includes(s.id) ? 'Remove' : 'Assign to Group') : 'Select Group First'}
            onPrimaryAction={() => activeGroup && onToggleStudentInGroup(s.id)}
            secondaryActions={[
              {
                icon: BarChart3,
                title: 'View Report',
                onClick: () => onOpenReport?.(s.id)
              },
              {
                icon: History,
                title: 'View History',
                onClick: () => setHistoryStudentId(s.id)
              },
              {
                icon: Trash2,
                title: 'Delete Student',
                variant: 'danger',
                onClick: () => {
                  setConfirmConfig({
                    isOpen: true,
                    title: 'Delete Student',
                    message: `Are you sure you want to delete ${s.name}? This will remove all their training records.`,
                    onConfirm: () => onDeleteStudent(s.id)
                  });
                }
              }
            ]}
          />
        ))}
      </div>
      {historyStudent && (
        <div className="fixed inset-0 z-[100] bg-stone-950/80 backdrop-blur-sm p-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="student-history-title">
          <div className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-[2rem] border-4 border-stone-700 bg-stone-900 shadow-2xl flex flex-col">
            <div className="p-6 border-b border-stone-700 flex items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-red-500">Student History</p>
                <h3 id="student-history-title" className="text-2xl font-black font-serif text-white">{historyStudent.name}</h3>
                <p className="text-xs text-stone-500 font-bold mt-1">{historyStudent.history?.length || 0} saved mission records</p>
              </div>
              <button onClick={() => setHistoryStudentId(null)} className="p-3 rounded-xl bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700" aria-label="Close student history">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
              {!historyStudent.history?.length ? (
                <div className="rounded-2xl border-2 border-dashed border-stone-700 p-10 text-center">
                  <History className="w-10 h-10 text-stone-700 mx-auto mb-3" />
                  <p className="text-sm font-bold text-stone-500">No completed lessons have been saved for this student yet.</p>
                </div>
              ) : historyStudent.history.map((entry, index) => (
                <article key={entry.id || `${entry.date}-${index}`} className="rounded-2xl border border-stone-700 bg-stone-800/60 p-5 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-stone-500">
                        <Calendar className="w-3 h-3" /> {entry.date}
                        <span>•</span>
                        <span>Step {entry.step}{entry.substep ? `.${entry.substep}` : ''}</span>
                      </div>
                      <h4 className="text-lg font-black font-serif text-white mt-1">{entry.lessonTitle}</h4>
                      {entry.groupName && <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mt-1">{entry.groupName}</p>}
                    </div>
                    {typeof entry.totalCount === 'number' && (
                      <div className="sm:text-right">
                        <div className={`font-mono text-xl font-black ${(entry.accuracy || 0) >= 80 ? 'text-emerald-400' : 'text-red-400'}`}>{entry.correctCount || 0}/{entry.totalCount}</div>
                        <div className="text-[9px] font-black uppercase tracking-widest text-stone-500">{entry.accuracy || 0}% accuracy</div>
                      </div>
                    )}
                  </div>
                  {entry.attempts?.length ? (
                    <div className="mt-4 flex flex-wrap gap-2" aria-label="Word-by-word results">
                      {entry.attempts.map((attempt, attemptIndex) => (
                        <span key={`${attempt.instanceId}-${attemptIndex}`} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${attempt.status === 'correct' ? 'border-emerald-800 bg-emerald-950/50 text-emerald-300' : 'border-red-800 bg-red-950/50 text-red-300'}`}>
                          {attempt.status === 'correct' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {attempt.wordText}
                        </span>
                      ))}
                    </div>
                  ) : entry.errors?.length ? (
                    <p className="mt-4 text-xs text-red-300">Missed: {entry.errors.join(', ')}</p>
                  ) : null}
                  {entry.notes && (
                    <div className="mt-4 border-t border-stone-700 pt-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-1">Teacher Notes</p>
                      <p className="text-xs leading-relaxed text-stone-300 whitespace-pre-wrap">{entry.notes}</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
      />
    </div>
  );
};

export default NinjasView;
