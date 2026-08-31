import React, { useMemo, useState } from 'react';
import { GroupInstructionalProfile, GroupNote, GroupProfile, Lesson, StudentProfile } from '../types';
import MissionCard from './MissionCard';
import ConfirmModal from './ConfirmModal';
import { 
  Users, Plus, Trash2, Scroll, ArrowRight, X, Edit, 
  ShieldCheck, BookOpen, Printer, UserPlus, Save, RefreshCw, Search, CalendarDays
} from 'lucide-react';

import { generateId } from '../utils';
import GroupNotes from './GroupNotes';
import GroupInstructionalProfilePanel from './GroupInstructionalProfile';

interface SquadsViewProps {
  groups: GroupProfile[];
  students: StudentProfile[];
  activeGroup: GroupProfile | null;
  onSelectGroup: (group: GroupProfile | null) => void;
  onUpdateGroups: (groups: GroupProfile[]) => void;
  onUpdateGroup?: (group: GroupProfile) => Promise<boolean>;
  onAddGroup: () => void;
  onDeleteGroup: (id: string) => void;
  onLaunchLesson: (lesson: Lesson) => void;
  onEditLesson: (lesson: Lesson) => void;
  onPrintLesson: (lesson: Lesson) => void;
  onCreateLesson: () => void;
  cloudStatus: string;
  user: any;
  handleLogin: () => void;
  onResetToMaster?: () => void;
  setView: (view: any) => void;
  onQuickRecruit?: (name: string) => void;
  groupNotes: GroupNote[];
  currentRosterReady?: boolean;
}

const QuickRecruit: React.FC<{ onRecruit: (name: string) => void }> = ({ onRecruit }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onRecruit(name.trim());
      setName('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="relative">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Quick Recruit (Name + Enter)"
          className="w-full bg-white border-2 border-stone-100 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-red-800 transition-all pr-10"
        />
        <button 
          type="submit"
          aria-label="Add student"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-stone-900 text-white rounded-lg hover:bg-red-800 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  );
};

const SquadsView: React.FC<SquadsViewProps> = ({
  groups, students, activeGroup, onSelectGroup, onUpdateGroups, onAddGroup, onDeleteGroup,
  onUpdateGroup,
  onLaunchLesson, onEditLesson, onPrintLesson, onCreateLesson, cloudStatus, user, handleLogin, onResetToMaster, setView, onQuickRecruit,
  groupNotes, currentRosterReady = false
}) => {
  const [showJournal, setShowJournal] = useState(false);
  const [squadQuery, setSquadQuery] = useState('');
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

  const visibleGroups = useMemo(() => {
    const query = squadQuery.trim().toLowerCase();
    return [...groups]
      .filter(group => !query || group.name.toLowerCase().includes(query))
      .sort((a, b) => (b.lastLessonDate || '').localeCompare(a.lastLessonDate || ''));
  }, [groups, squadQuery]);
  const savedLessons = useMemo(
    () => (activeGroup?.savedLessons || []).filter((lesson): lesson is Lesson => Boolean(lesson?.id)),
    [activeGroup]
  );

  const formatLastLesson = (value?: string) => {
    if (!value) return 'No missions yet';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
  };

  const toggleStudentInGroup = (studentId: string) => {
    if (!activeGroup) return;
    const isMember = activeGroup.studentIds.includes(studentId);
    const updatedIds = isMember 
      ? activeGroup.studentIds.filter(id => id !== studentId)
      : [...activeGroup.studentIds, studentId];
    
    onUpdateGroups(groups.map(g => g.id === activeGroup.id ? { ...g, studentIds: updatedIds } : g));
  };

  const saveInstructionalProfile = async (instructionalProfile: GroupInstructionalProfile) => {
    if (!activeGroup) return false;
    const updatedGroup = { ...activeGroup, instructionalProfile };

    if (onUpdateGroup) {
      const saved = await onUpdateGroup(updatedGroup);
      if (saved) onSelectGroup(updatedGroup);
      return saved;
    }

    onUpdateGroups(groups.map(group => group.id === activeGroup.id ? updatedGroup : group));
    onSelectGroup(updatedGroup);
    return true;
  };

  if (!activeGroup) {
    return (
      <div className="flex flex-col gap-4">
        <div className="bg-white p-5 rounded-3xl border border-stone-200 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-950/40 rounded-2xl">
              <ShieldCheck className="w-6 h-6 text-red-800" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-1">{cloudStatus === 'offline' ? 'Guest Mode (Local Only)' : 'Authenticated Master'}</span>
              <span className="text-sm font-bold text-stone-900">{cloudStatus === 'offline' ? 'Guest Sensei' : (user?.displayName || 'Dojo Sensei')}</span>
            </div>
          </div>
          {cloudStatus === 'offline' ? (
            <button onClick={handleLogin} className="px-6 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
              <Plus className="w-4 h-4" /> Connect to Cloud
            </button>
          ) : (
            <button onClick={onResetToMaster} disabled={currentRosterReady} className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:bg-emerald-50 disabled:text-emerald-700 disabled:border disabled:border-emerald-200">
              {currentRosterReady ? '2026–27 Roster Active' : 'Apply Roster + WRS Baselines'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" aria-label="Dojo overview">
          {[
            ['Groups', groups.length],
            ['Students', students.length],
            ['Lessons', groups.reduce((total, group) => total + group.savedLessons.length, 0)],
            ['Cloud', cloudStatus === 'online' ? 'Ready' : 'Local']
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <div className="text-lg font-black text-stone-900">{value}</div>
              <div className="text-[8px] font-black uppercase tracking-[0.18em] text-stone-400">{label}</div>
            </div>
          ))}
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-300" aria-hidden="true" />
          <input
            type="search"
            value={squadQuery}
            onChange={(event) => setSquadQuery(event.target.value)}
            placeholder="Find a group…"
            aria-label="Find a group"
            className="w-full rounded-2xl border border-stone-200 bg-white py-3 pl-11 pr-4 text-sm font-bold text-stone-900 shadow-sm outline-none transition focus:border-red-800 focus:ring-4 focus:ring-red-800/10"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button onClick={onAddGroup} className="h-40 bg-stone-800/30 rounded-[2rem] border-4 border-dashed border-stone-700 flex flex-col items-center justify-center gap-2 hover:border-red-900/50 text-stone-500 transition-all group">
            <Plus className="w-8 h-8 group-hover:scale-110 transition-transform" />
            <span className="uppercase text-[10px] font-black tracking-[0.2em]">Create New Group</span>
          </button>
          {visibleGroups.map(g => (
            <div key={g.id} className="relative group/card">
              <div onClick={() => onSelectGroup(g)} className="bg-[#fdf6e3] text-stone-900 p-8 rounded-[2rem] border-4 border-stone-800 shadow-xl cursor-pointer hover:border-red-800 transition-all group relative overflow-hidden h-40 flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Users className="w-24 h-24" />
                </div>
                <div>
                  <h2 className="text-xl font-black font-serif leading-tight">{g.name}</h2>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{g.studentIds.length} Students · {g.savedLessons.length} Lessons</p>
                  {g.schedule && <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-red-800">{g.schedule}</p>}
                </div>
                <div className="flex justify-between items-center text-red-800">
                  <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-stone-500">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> {formatLastLesson(g.lastLessonDate)}
                  </span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setConfirmConfig({
                    isOpen: true,
                    title: 'Delete Group',
                    message: `Are you sure you want to delete ${g.name}? This action cannot be undone.`,
                    onConfirm: () => onDeleteGroup(g.id)
                  });
                }}
                className="absolute top-4 right-4 p-2 bg-red-100 text-red-800 rounded-lg opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-red-800 hover:text-white z-10"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        {visibleGroups.length === 0 && squadQuery && (
          <div className="rounded-3xl border-2 border-dashed border-stone-200 bg-white px-6 py-12 text-center">
            <p className="text-sm font-black text-stone-800">No group matches “{squadQuery}.”</p>
            <button onClick={() => setSquadQuery('')} className="mt-3 text-[10px] font-black uppercase tracking-widest text-red-800 hover:text-red-600">Clear search</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in slide-in-from-left-4">
      <div className="w-full lg:w-72 shrink-0">
        <div className="bg-[#fdf6e3] text-stone-900 p-6 rounded-[2.5rem] border-4 border-stone-800 shadow-2xl sticky top-24">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-black font-serif uppercase truncate pr-2">{activeGroup.name}</h2>
            <button onClick={() => onSelectGroup(null)} className="text-stone-300 hover:text-red-800"><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-2">
            {activeGroup.studentIds.map(sid => {
              const s = students.find(st => st.id === sid);
              return s ? (
                <div key={sid} className="bg-white px-4 py-3 rounded-xl border-2 border-stone-100 flex justify-between items-center group/ninja">
                  <span className="font-bold text-xs text-stone-800 truncate">{s.name}</span>
                  <button 
                    onClick={() => toggleStudentInGroup(sid)}
                    className="p-1 text-stone-200 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : null;
            })}
          </div>
          <button 
            onClick={() => setView('students')}
            className="w-full mt-6 py-3 border-2 border-dashed border-stone-300 text-stone-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-red-800 hover:text-red-800 transition-all flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> Manage Students
          </button>
          {onQuickRecruit && <QuickRecruit onRecruit={onQuickRecruit} />}
          <button 
            onClick={() => setShowJournal(!showJournal)}
            className={`w-full mt-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm ${showJournal ? 'bg-red-800 text-white' : 'bg-stone-900 text-white hover:bg-stone-800'}`}
          >
            <BookOpen className="w-4 h-4" /> {showJournal ? 'Close Group Notes' : 'Group Notes'}
          </button>
        </div>
      </div>
      <div className="flex-1 space-y-4">
        {showJournal ? (
          <GroupNotes group={activeGroup} notes={groupNotes} students={students} />
        ) : (
          <>
            <GroupInstructionalProfilePanel group={activeGroup} onSave={saveInstructionalProfile} />
            <div className="flex justify-between items-center bg-stone-800/50 p-4 rounded-2xl border border-stone-700">
              <h3 className="font-black uppercase tracking-widest text-[10px] text-stone-500">Ancient Scrolls (Custom Lessons)</h3>
              <button onClick={onCreateLesson} className="px-6 py-2 bg-red-800 text-white rounded-xl font-black uppercase text-[10px] flex items-center gap-2 shadow-lg hover:bg-red-700 active:scale-95"><Plus className="w-4 h-4" /> Forge New Scroll</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedLessons.map(lesson => (
                <MissionCard 
                  key={lesson.id}
                  title={lesson.title}
                  badge={`Step ${lesson.step}.${lesson.substep}`}
                  onPrimaryAction={() => onLaunchLesson(lesson)}
                  secondaryActions={[
                    {
                      icon: Printer,
                      title: 'Print Scroll',
                      onClick: () => onPrintLesson(lesson)
                    },
                    {
                      icon: Edit,
                      title: 'Edit Scroll',
                      onClick: () => onEditLesson(lesson)
                    },
                    {
                      icon: Trash2,
                      title: 'Remove from Group',
                      variant: 'danger',
                      onClick: () => {
                        setConfirmConfig({
                          isOpen: true,
                          title: 'Remove Lesson',
                          message: `Remove ${lesson.title} from this group's lesson list?`,
                          onConfirm: () => {
                            const updated = { ...activeGroup, savedLessons: savedLessons.filter(l => l.id !== lesson.id) };
                            onUpdateGroups(groups.map(g => g.id === activeGroup.id ? updated : g));
                          }
                        });
                      }
                    }
                  ]}
                />
              ))}
            </div>

            {savedLessons.length === 0 && (
              <div className="rounded-[2rem] border-2 border-dashed border-stone-200 bg-white px-6 py-12 text-center shadow-sm">
                <BookOpen className="mx-auto mb-4 h-9 w-9 text-stone-300" />
                <h4 className="font-serif text-xl font-black text-stone-900">This group needs its first lesson.</h4>
                <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-stone-500">Choose a ready-made WRS lesson from the master library, or build a custom scroll for this group.</p>
                <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                  <button onClick={() => setView('curriculum')} className="rounded-xl bg-stone-900 px-5 py-3 text-[9px] font-black uppercase tracking-widest text-white hover:bg-stone-800">Open Master Library</button>
                  <button onClick={onCreateLesson} className="rounded-xl border border-stone-200 bg-white px-5 py-3 text-[9px] font-black uppercase tracking-widest text-stone-700 hover:border-red-800 hover:text-red-800">Forge Custom Lesson</button>
                </div>
              </div>
            )}

          </>
        )}
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
      />
    </div>
    </div>
  );
};

export default SquadsView;
