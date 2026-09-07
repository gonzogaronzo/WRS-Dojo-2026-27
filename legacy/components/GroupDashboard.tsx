import React, { useState } from 'react';
import { GroupNote, GroupProfile, Lesson, StudentProfile } from '../types';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { generateId } from '../utils';
import MissionLogs from './MissionLogs';
import SquadsView from './SquadsView';
import NinjasView from './NinjasView';
import CurriculumView from './CurriculumView';
import StudentReports from './StudentReports';
import StudentScreenJoinDialog from './StudentScreenJoinDialog';
import GroupNotes from './GroupNotes';

import DailyNotes from './DailyNotes';
import { RecoverableSession } from '../sessionRecovery';
import type { CloudCheckResult } from '../useMasterData';
import { 
  Users, Plus, X, RefreshCw, Sparkles, LogIn, LogOut, AlertTriangle, AlertCircle, Copy, Globe, Download,
  UserPlus, BookOpen, History, Calendar, Play, Trash2, CheckCircle2, Database, ShieldCheck,
  BarChart3, MonitorUp
} from 'lucide-react';

interface GroupDashboardProps {
  groups: GroupProfile[];
  students: StudentProfile[];
  archivedGroups?: GroupProfile[];
  archivedStudents?: StudentProfile[];
  groupNotes?: GroupNote[];
  currentRosterReady?: boolean;
  activeGroup: GroupProfile | null;
  onSelectGroup: (group: GroupProfile | null) => void;
  onUpdateGroups: (groups: GroupProfile[]) => void;
  onUpdateGroup?: (group: GroupProfile) => Promise<boolean>;
  onUpdateStudents: (students: StudentProfile[]) => void;
  onLaunchLesson: (lesson: Lesson) => void;
  onEditLesson: (lesson: Lesson) => void;
  onPrintLesson: (lesson: Lesson) => void;
  onCreateLesson: () => void;
  onDeleteGroup?: (id: string) => void;
  onDeleteStudent?: (id: string) => void;
  cloudStatus?: 'online' | 'syncing' | 'offline' | 'unconfigured' | 'error' | 'unauthenticated';
  cloudError?: string | null;
  lastCloudSaveAt?: string | null;
  lastCloudCheckAt?: string | null;
  hasLocalData?: boolean;
  onResetToMaster?: () => void;
  onMigrateLocalData?: () => Promise<boolean>;
  onVerifyCloudPersistence?: () => Promise<CloudCheckResult>;
  recoverableSession?: RecoverableSession | null;
  onResumeSession?: (session: RecoverableSession) => void;
  onDiscardSession?: () => void;
  onJoinStudentDisplay?: (code: string) => void;
  user?: any;
}

const GroupDashboard: React.FC<GroupDashboardProps> = ({ 
  groups, students, archivedGroups = [], archivedStudents = [], groupNotes = [], currentRosterReady = false, activeGroup, onSelectGroup, onUpdateGroups, onUpdateGroup, onUpdateStudents,
  onLaunchLesson, onEditLesson, onPrintLesson, onCreateLesson, onDeleteGroup, onDeleteStudent, cloudStatus, onResetToMaster, onMigrateLocalData,
  cloudError, lastCloudSaveAt, lastCloudCheckAt, hasLocalData, onVerifyCloudPersistence,
  recoverableSession, onResumeSession, onDiscardSession, onJoinStudentDisplay, user
}) => {
  const [view, setView] = useState<'roster' | 'library' | 'archives'>('roster');
  const [subView, setSubView] = useState<string>('squads');
  const [loginError, setLoginError] = useState<{ code: string; message: string; domain?: string } | null>(null);
  const [showSyncDebug, setShowSyncDebug] = useState(false);
  const [isCheckingCloud, setIsCheckingCloud] = useState(false);
  const [cloudCheckResult, setCloudCheckResult] = useState<CloudCheckResult | null>(null);
  const [reportStudentId, setReportStudentId] = useState<string | null>(null);
  const [showStudentScreenJoin, setShowStudentScreenJoin] = useState(false);
  const [pastGroupId, setPastGroupId] = useState<string | null>(null);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const formatTimestamp = (value?: string | null) => value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : 'Not yet confirmed in this browser session';

  const handleCloudCheck = async () => {
    if (!onVerifyCloudPersistence) return;
    setIsCheckingCloud(true);
    setCloudCheckResult(null);
    try {
      setCloudCheckResult(await onVerifyCloudPersistence());
    } finally {
      setIsCheckingCloud(false);
    }
  };

  const handleLogin = async () => {
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Auth Failure Detail:", err);
      
      // Attempt robust domain detection for whitelisting
      let detectedDomain = window.location.hostname;
      
      // Check for common 'empty' or 'useless' domain strings in sandboxed iframes
      if (!detectedDomain || detectedDomain === 'localhost' || detectedDomain === '127.0.0.1' || detectedDomain === 'null' || detectedDomain === '') {
        try {
          // Try to extract from current URL if hostname is missing
          const url = new URL(window.location.href);
          if (url.hostname && url.hostname !== 'null') {
            detectedDomain = url.hostname;
          } else {
            // Fallback to origin if hostname is still empty
            detectedDomain = window.origin?.replace(/^https?:\/\//, '') || "";
          }
        } catch(e) {
          detectedDomain = "";
        }
      }

      if (err.code === 'auth/unauthorized-domain' || err.message?.toLowerCase().includes('unauthorized')) {
        setLoginError({ 
          code: err.code, 
          message: "UNAUTHORIZED DOMAIN: Firebase is blocking this request.",
          domain: detectedDomain || "Check browser address bar"
        });
      } else {
        setLoginError({ 
          code: err.code || 'unknown', 
          message: err.message || "The Cloud Temple rejected the connection." 
        });
      }
    }
  };

  const handleLogout = () => signOut(auth);

  const handleBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ groups, students }, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `wrs_dojo_backup.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleAddGroup = () => {
    setNewGroupName('');
    setShowAddGroup(true);
  };

  const createGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    const newGroup: GroupProfile = {
      id: generateId(),
      name,
      studentIds: [],
      savedLessons: [],
      lastLessonDate: '',
      inventory: { learnedSounds: [], learnedHFW: [] },
      history: []
    };
    onUpdateGroups([...groups, newGroup]);
    onSelectGroup(newGroup);
    setShowAddGroup(false);
    setNewGroupName('');
  };

  const handleAddStudent = (name?: string) => {
    const finalName = name || prompt("Enter Student Name:");
    if (finalName) {
      const newStudent: StudentProfile = {
        id: generateId(),
        name: finalName,
        masteredSounds: [],
        masteredHFW: [],
        attendanceCount: 0,
        notes: '',
        history: []
      };
      onUpdateStudents([...students, newStudent]);
    }
  };

  const handleAddStudentToGroup = (name: string) => {
    if (!activeGroup) return;
    const newStudent: StudentProfile = {
      id: generateId(),
      name,
      masteredSounds: [],
      masteredHFW: [],
      attendanceCount: 0,
      notes: '',
      history: []
    };
    const updatedStudents = [...students, newStudent];
    const updatedGroup = {
      ...activeGroup,
      studentIds: [...activeGroup.studentIds, newStudent.id]
    };
    onUpdateStudents(updatedStudents);
    onUpdateGroups(groups.map(g => g.id === activeGroup.id ? updatedGroup : g));
  };

  const SubNav: React.FC<{ active: string; onChange: (id: string) => void; options: { id: string; label: string; icon: any }[] }> = ({ active, onChange, options }) => (
    <div className="flex items-center gap-2 mb-8 bg-white p-1.5 rounded-2xl border border-stone-200 w-fit shadow-sm">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            active === opt.id 
              ? 'bg-stone-900 text-white shadow-md' 
              : 'text-stone-400 hover:text-stone-900 hover:bg-stone-50'
          }`}
        >
          <opt.icon className={`w-3.5 h-3.5 ${active === opt.id ? 'text-white' : 'text-stone-300'}`} />
          {opt.label}
        </button>
      ))}
    </div>
  );

  const toggleStudentInGroup = (studentId: string) => {
    if (!activeGroup) return;
    const isMember = activeGroup.studentIds.includes(studentId);
    const updatedIds = isMember 
      ? activeGroup.studentIds.filter(id => id !== studentId)
      : [...activeGroup.studentIds, studentId];
    
    onUpdateGroups(groups.map(g => g.id === activeGroup.id ? { ...g, studentIds: updatedIds } : g));
  };

  if (cloudStatus === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#fcfbf9] flex items-center justify-center p-4">
        <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-sm border border-stone-200 max-w-lg w-full text-center animate-in zoom-in duration-700">
           <div className="bg-red-800 w-20 h-20 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-sm">
             <span className="text-3xl font-serif font-black text-white">道</span>
           </div>
           <h1 className="text-3xl font-serif font-black text-stone-950 uppercase tracking-tighter mb-2">WRS Dojo</h1>
           <p className="text-stone-400 italic font-serif mb-8 text-sm">"The Master must identify themselves to the Temple."</p>
           
           {loginError && (
             <div className="mb-8 p-6 bg-red-50 border-2 border-red-100 rounded-[2rem] text-left animate-in slide-in-from-top-4">
                <div className="flex items-start gap-4 mb-4">
                  <div className="bg-red-600 p-2 rounded-full text-white">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-red-900 uppercase tracking-tight leading-tight">{loginError.message}</p>
                    <p className="text-[10px] font-mono text-red-400 mt-1">{loginError.code}</p>
                  </div>
                </div>
                
                {loginError.domain && (
                  <div className="mt-4 bg-white p-4 rounded-2xl border-2 border-red-100 shadow-sm ring-4 ring-red-50">
                    <p className="text-[10px] font-black uppercase text-stone-400 mb-3 flex items-center gap-2 tracking-[0.1em]">
                       <Globe className="w-3.5 h-3.5 text-red-500" /> COPY THIS STRING:
                    </p>
                    <div className="flex items-center gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
                      <code className="text-[11px] font-mono font-black text-red-600 truncate flex-1 select-all break-all">
                        {loginError.domain}
                      </code>
                      <button 
                        onClick={() => {
                          if (loginError.domain && loginError.domain !== "Check browser address bar") {
                            navigator.clipboard.writeText(loginError.domain);
                            alert("DOMAIN COPIED!\n\n1. Go to Firebase Console\n2. Auth > Settings > Authorized Domains\n3. Click 'Add Domain' and paste this.");
                          } else {
                            alert("Please copy the domain from your browser address bar manually (e.g. something.googleusercontent.com)");
                          }
                        }}
                        className="p-2 bg-red-100 text-red-700 hover:bg-red-600 hover:text-white rounded-lg transition-all shrink-0"
                        title="Copy to Clipboard"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="mt-4 text-[9px] text-stone-400 font-bold leading-tight border-t pt-3 border-stone-100">
                      Note: If the string above is "Check browser address bar", manually copy the domain from your URL bar (ending in .googleusercontent.com) and add it to your Firebase Authorized Domains list.
                    </p>
                  </div>
                )}
             </div>
           )}

           <button 
             onClick={handleLogin}
             className="w-full bg-stone-950 text-white py-6 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-red-900 transition-all shadow-xl active:scale-95 group mb-4"
           >
              <LogIn className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              Sensei Login
           </button>
           
           <p className="text-[9px] font-black text-stone-300 uppercase tracking-widest">Secured by Google Identity & Cloud Firestore</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#fcfbf9] text-stone-900 flex flex-col items-center overflow-x-hidden overflow-y-auto font-sans custom-scrollbar">
      <StudentScreenJoinDialog
        open={showStudentScreenJoin}
        onClose={() => setShowStudentScreenJoin(false)}
        onJoin={code => onJoinStudentDisplay?.(code)}
      />
      {['offline', 'error', 'unconfigured'].includes(cloudStatus || '') && (
        <div className="w-full flex flex-col">
          <div className="w-full bg-amber-50 mx-auto max-w-5xl my-2 rounded-xl border border-amber-200/50 py-2 px-4 flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-amber-800">
              {cloudStatus === 'error' ? (cloudError || 'Connection Error: Cloud Temple is unreachable.') : 'Guest Mode: Data is saved to this browser only.'}
            </span>
            <button 
              onClick={handleLogin}
              className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-amber-200 transition-colors"
            >
              Connect Cloud
            </button>
          </div>
          
          {loginError && (
            <div className="w-full bg-red-900 text-white p-4 border-b border-red-800 animate-in slide-in-from-top-4">
              <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest">Login Blocked by Firebase</p>
                    <p className="text-xs font-bold opacity-80">{loginError.message}</p>
                  </div>
                </div>
                {loginError.domain && (
                  <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg border border-white/10">
                    <code className="text-[9px] font-mono">{loginError.domain}</code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(loginError.domain!);
                        alert("Domain copied! Add this to 'Authorized Domains' in Firebase Console.");
                      }}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <button onClick={() => setLoginError(null)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {cloudStatus === 'online' && hasLocalData && (
        <div className="w-full bg-emerald-50 border-b border-emerald-200 py-2 px-4 flex items-center justify-center gap-3">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-900">
            Found Guest Mode records, including any saved mission history or unfinished lesson.
          </span>
          <button 
            onClick={onMigrateLocalData}
            className="bg-emerald-500 text-stone-900 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-colors"
          >
            Migrate to Cloud
          </button>
        </div>
      )}

      <div className="w-full px-4 py-3 flex items-center justify-between gap-4 border-b border-stone-100 shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-50">
         <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-red-800 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-red-800/10">
               <span className="text-lg font-serif font-black text-white">道</span>
            </div>
            <div>
               <h1 className="text-xs font-black font-serif uppercase tracking-widest text-stone-900">Dojo Records</h1>
               <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    cloudStatus === 'online' ? 'bg-emerald-500' : 
                    cloudStatus === 'syncing' ? 'bg-blue-500 animate-pulse' :
                    cloudStatus === 'error' ? 'bg-red-500' :
                    'bg-amber-500'
                  }`}></div>
                  <span className="text-[8px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                    {cloudStatus?.toUpperCase()} | {user?.uid === 'guest-sensei' ? 'GUEST' : 'AUTH'}
                  </span>
               </div>
            </div>
         </div>

         <div className="flex gap-1 bg-stone-50 p-0.5 rounded-lg border border-stone-200">
            <button 
              onClick={() => { setView('roster'); setSubView('squads'); onSelectGroup(null); }} 
              className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${view === 'roster' ? 'bg-white text-stone-900 shadow-sm border border-stone-200' : 'text-stone-400 hover:text-stone-600'}`}
            >
              Roster
            </button>
            <button 
              onClick={() => { setView('library'); setSubView('registry'); onSelectGroup(null); }} 
              className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${view === 'library' ? 'bg-white text-stone-900 shadow-sm border border-stone-200' : 'text-stone-400 hover:text-stone-600'}`}
            >
              Library
            </button>
            <button 
              onClick={() => { setView('archives'); setSubView('daily'); onSelectGroup(null); }} 
              className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${view === 'archives' ? 'bg-white text-stone-900 shadow-sm border border-stone-200' : 'text-stone-400 hover:text-stone-600'}`}
            >
              Archives
            </button>
         </div>

         <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowStudentScreenJoin(true)}
              disabled={user?.uid === 'guest-sensei'}
              className="flex items-center gap-2 text-stone-400 transition-colors hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30"
              title={user?.uid === 'guest-sensei' ? 'Sign in before connecting a student screen' : 'Connect this computer as the student screen'}
            >
              <MonitorUp className="w-4 h-4" />
              <span className="hidden text-[9px] font-black uppercase tracking-widest xl:inline">Student Screen</span>
            </button>
            <button onClick={() => window.location.reload()} className="text-stone-300 hover:text-stone-900 transition-colors" title="Reload"><RefreshCw className="w-4 h-4" /></button>
            <button 
              onClick={() => setShowSyncDebug(true)} 
              className={`transition-colors ${cloudStatus === 'online' ? 'text-emerald-500' : 'text-amber-500'}`} 
              title="Sync Status"
            >
              <Globe className="w-4 h-4" />
            </button>
            <button onClick={handleBackup} className="text-stone-300 hover:text-stone-900 transition-colors" title="Backup"><Download className="w-4 h-4" /></button>
            <div className="w-px h-6 bg-stone-100" />
            {['offline', 'error', 'unauthenticated', 'unconfigured'].includes(cloudStatus || '') ? (
               <button onClick={handleLogin} className="text-emerald-600 hover:text-emerald-500 transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                  <LogIn className="w-4 h-4" /> Connect Cloud
               </button>
            ) : (
               <button onClick={handleLogout} className="text-stone-400 hover:text-red-600 transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                  <LogOut className="w-4 h-4" /> Logout
               </button>
            )}
         </div>
      </div>

      {recoverableSession && (
        <section className="w-full border-b border-emerald-200 bg-emerald-50 px-4 py-3" aria-label="Unfinished lesson">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-700 p-2 text-white shadow-sm">
                <Play className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700">Unfinished lesson saved</p>
                <h2 className="font-serif text-base font-black text-stone-900">{recoverableSession.lesson.title}</h2>
                <p className="mt-0.5 text-[10px] font-bold text-stone-500">
                  Part {recoverableSession.currentPart} of 10 · Saved {new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(recoverableSession.savedAt))}
                </p>
              </div>
            </div>
            <div className="flex gap-2 pl-11 sm:pl-0">
              <button
                onClick={() => onDiscardSession?.()}
                className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-stone-500 hover:border-red-200 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Discard
              </button>
              <button
                onClick={() => onResumeSession?.(recoverableSession)}
                className="flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-[9px] font-black uppercase tracking-widest text-white shadow-sm hover:bg-emerald-600"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" /> Resume Lesson
              </button>
            </div>
          </div>
        </section>
      )}

      {showAddGroup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="add-group-title">
          <form
            className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-7 shadow-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              createGroup();
            }}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-700">Roster setup</p>
                <h2 id="add-group-title" className="mt-1 font-serif text-2xl font-black text-stone-900">Create a new group</h2>
              </div>
              <button type="button" onClick={() => setShowAddGroup(false)} className="rounded-xl p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900" aria-label="Close create group dialog">
                <X className="h-5 w-5" />
              </button>
            </div>
            <label htmlFor="new-group-name" className="mb-2 block text-xs font-black uppercase tracking-widest text-stone-700">Group name</label>
            <input
              id="new-group-name"
              autoFocus
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              placeholder="Example: Charting Test"
              className="w-full rounded-2xl border-2 border-stone-300 bg-white px-4 py-3 text-base font-bold text-stone-900 outline-none transition focus:border-red-700 focus:ring-4 focus:ring-red-100"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowAddGroup(false)} className="rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest text-stone-600 hover:bg-stone-100">Cancel</button>
              <button type="submit" disabled={!newGroupName.trim()} className="rounded-xl bg-red-800 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40">Create Group</button>
            </div>
          </form>
        </div>
      )}

      {/* Sync Debug Modal */}
      {showSyncDebug && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/20 backdrop-blur-md">
          <div className="max-h-[90vh] overflow-y-auto bg-white border border-stone-200 rounded-[2.5rem] p-8 max-w-md w-full shadow-[0_20px_50px_rgba(0,0,0,0.1)] animate-in zoom-in-95 duration-200 custom-scrollbar">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black uppercase tracking-tighter text-stone-900 flex items-center gap-3">
                <RefreshCw className={`w-5 h-5 text-stone-300 ${cloudStatus === 'syncing' ? 'animate-spin' : ''}`} />
                Cloud Readiness
              </h2>
              <button onClick={() => setShowSyncDebug(false)} className="p-2 hover:bg-stone-50 rounded-full text-stone-300 hover:text-stone-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Connection Status</p>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${cloudStatus === 'online' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="text-sm font-bold text-stone-900 uppercase tracking-tight">{cloudStatus?.toUpperCase()}</span>
                </div>
              </div>

              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Last Confirmed Cloud Save</p>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className={`mt-0.5 h-5 w-5 shrink-0 ${lastCloudSaveAt ? 'text-emerald-600' : 'text-stone-300'}`} />
                  <div>
                    <p className="text-xs font-black text-stone-900">{formatTimestamp(lastCloudSaveAt)}</p>
                    <p className="mt-1 text-[9px] font-bold text-stone-400">A roster, lesson, mission, migration, or verification write updates this time.</p>
                  </div>
                </div>
              </div>

              {cloudError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-700">Most Recent Save Error</p>
                  <p className="mt-2 text-xs font-bold leading-relaxed text-red-900">{cloudError}</p>
                </div>
              )}

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-700" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Save Coverage</p>
                    <p className="text-[9px] font-bold text-emerald-700/70">Roster, groups, mission scores, exact missed words, notes, and unfinished lessons</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloudCheck}
                  disabled={isCheckingCloud || user?.uid === 'guest-sensei'}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCheckingCloud ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  {isCheckingCloud ? 'Checking…' : 'Run Cloud Save Check'}
                </button>
                {(cloudCheckResult || lastCloudCheckAt) && (
                  <div className={`mt-3 rounded-xl border p-3 ${cloudCheckResult?.ok ? 'border-emerald-200 bg-white text-emerald-800' : cloudCheckResult ? 'border-red-200 bg-red-50 text-red-800' : 'border-stone-200 bg-white text-stone-500'}`}>
                    <p className="text-[10px] font-black leading-relaxed">
                      {cloudCheckResult?.message || `Last check: ${formatTimestamp(lastCloudCheckAt)}`}
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Identity Profile</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-800/10 rounded-xl flex items-center justify-center border border-red-800/5">
                    <Users className="w-5 h-5 text-red-800" />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-xs font-black text-stone-900 truncate">{user?.displayName || 'Guest Sensei'}</span>
                    <span className="text-[9px] font-mono text-stone-400 truncate">{user?.uid || 'no-uid'}</span>
                  </div>
                </div>
                {user?.uid === 'guest-sensei' && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-[10px] text-amber-800 font-bold leading-tight">
                      ⚠️ YOU ARE IN GUEST MODE. Real-time syncing between devices is DISABLED. Please log in to the same account on both screens.
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800">
                <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-3">Troubleshooting Steps</p>
                <ul className="space-y-2">
                  <li className="text-[10px] text-stone-400 flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0" />
                    <span>Ensure <strong>BOTH</strong> screens show the <strong>SAME UID</strong> above.</span>
                  </li>
                  <li className="text-[10px] text-stone-400 flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0" />
                    <span>Check if "Authorized Domains" in Firebase Console includes this URL.</span>
                  </li>
                  <li className="text-[10px] text-stone-400 flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0" />
                    <span>Refresh both pages if the connection light is not green.</span>
                  </li>
                </ul>
              </div>
            </div>

            <button 
              onClick={() => setShowSyncDebug(false)}
              className="w-full mt-8 bg-stone-800 hover:bg-stone-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="w-full flex-1 p-4 max-w-5xl">
        {view === 'roster' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SubNav 
              active={subView} 
              onChange={setSubView}
              options={[
                { id: 'squads', label: 'Active Groups', icon: Users },
                { id: 'ninjas', label: 'Student Registry', icon: UserPlus }
              ]}
            />
            
            {subView === 'squads' ? (
              <SquadsView 
                groups={groups}
                students={students}
                activeGroup={activeGroup}
                onSelectGroup={onSelectGroup}
                onUpdateGroups={onUpdateGroups}
                onUpdateGroup={onUpdateGroup}
                onAddGroup={handleAddGroup}
                onDeleteGroup={onDeleteGroup || (() => {})}
                onLaunchLesson={onLaunchLesson}
                onEditLesson={onEditLesson}
                onPrintLesson={onPrintLesson}
                onCreateLesson={onCreateLesson}
                cloudStatus={cloudStatus || 'offline'}
                user={user}
                handleLogin={handleLogin}
                onResetToMaster={onResetToMaster}
                onQuickRecruit={handleAddStudentToGroup}
                groupNotes={groupNotes}
                currentRosterReady={currentRosterReady}
                setView={(v: any) => {
                  if (v === 'students') {
                    setView('roster');
                    setSubView('ninjas');
                  } else if (v === 'decks') {
                    setView('library');
                    setSubView('decks');
                  } else if (v === 'curriculum') {
                    setView('library');
                    setSubView('registry');
                  } else if (v === 'records') {
                    setView('archives');
                    setSubView('missions');
                  } else if (v === 'daily-log') {
                    setView('archives');
                    setSubView('daily');
                  }
                }}
              />
            ) : (
              <NinjasView 
                students={students}
                activeGroup={activeGroup}
                onUpdateStudents={onUpdateStudents}
                onAddStudent={handleAddStudent}
                onDeleteStudent={onDeleteStudent || (() => {})}
                onToggleStudentInGroup={toggleStudentInGroup}
                onOpenReport={studentId => {
                  setReportStudentId(studentId);
                  setView('archives');
                  setSubView('reports');
                  onSelectGroup(null);
                }}
              />
            )}
          </div>
        )}

        {view === 'archives' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SubNav 
              active={subView} 
              onChange={setSubView}
              options={[
                { id: 'daily', label: 'Daily Log', icon: Calendar },
                { id: 'missions', label: 'Mission History', icon: History },
                { id: 'reports', label: 'Student Reports', icon: BarChart3 },
                { id: 'past-groups', label: 'Past Groups', icon: Users }
              ]}
            />

            {subView === 'daily' ? (
              <DailyNotes userId={user?.uid || ''} />
            ) : subView === 'missions' ? (
              <MissionLogs 
                teacherId={user?.uid || ''} 
                groups={[...groups, ...archivedGroups]}
                students={[...students, ...archivedStudents]}
              />
            ) : subView === 'reports' ? (
              <StudentReports students={[...students, ...archivedStudents]} groups={[...groups, ...archivedGroups]} initialStudentId={reportStudentId} />
            ) : (
              <div className="space-y-4">
                <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">Preserved History</p>
                  <h2 className="mt-1 font-serif text-2xl font-black text-stone-900">Past Groups</h2>
                  <p className="mt-2 text-xs text-stone-500">These groups are archived, not deleted. Their lesson history and student records remain available in Mission History and Student Reports.</p>
                </div>
                {pastGroupId && archivedGroups.some(group => group.id === pastGroupId) ? (
                  <div className="space-y-3">
                    <button type="button" onClick={() => setPastGroupId(null)} className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-[9px] font-black uppercase tracking-widest text-stone-500 hover:text-red-800">← All Past Groups</button>
                    <GroupNotes
                      group={archivedGroups.find(group => group.id === pastGroupId)!}
                      notes={groupNotes}
                      students={[...students, ...archivedStudents]}
                    />
                  </div>
                ) : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {archivedGroups.map(group => (
                    <button type="button" key={group.id} onClick={() => setPastGroupId(group.id)} className="rounded-3xl border border-stone-200 bg-[#fdf6e3] p-6 text-left shadow-sm transition hover:border-red-800">
                      <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">{group.schoolYear || 'Previous year'}</p>
                      <h3 className="mt-1 font-serif text-xl font-black text-stone-900">{group.name}</h3>
                      <p className="mt-2 text-xs font-bold text-stone-500">{group.studentIds.length} students · {group.history?.length || 0} saved lessons</p>
                      <p className="mt-4 text-[9px] font-black uppercase tracking-widest text-red-800">Open Group Notes →</p>
                    </button>
                  ))}
                  {archivedGroups.length === 0 && <p className="text-sm text-stone-500">No groups have been archived yet.</p>}
                </div>}
              </div>
            )}
          </div>
        )}

        {view === 'library' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SubNav 
              active={subView} 
              onChange={setSubView}
              options={[{ id: 'registry', label: 'Master Registry', icon: BookOpen }]}
            />

            <CurriculumView 
              groups={groups}
              activeGroup={activeGroup}
              onSelectGroup={onSelectGroup}
              onUpdateGroups={onUpdateGroups}
              onLaunchLesson={onLaunchLesson}
              onPrintLesson={onPrintLesson}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupDashboard;
