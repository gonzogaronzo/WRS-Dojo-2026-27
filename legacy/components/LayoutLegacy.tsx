import React from 'react';
import { GroupProfile, Lesson, LESSON_PARTS, LessonPart, StudentProfile } from '../types';
import {
  Grid, BookOpen, Layers, List, AlignLeft, RotateCcw, PenTool, Edit3, FileText, Headphones,
  Menu, X, Home, Scroll, Map as MapIcon, Download, Edit, Printer, MonitorUp, Maximize2, Eye, EyeOff,
  Save, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';
import Timer from './interactive/Timer';
import LessonStage from './LessonStage';
import { nextLessonPart, normalizePlannedParts, previousLessonPart } from '../lessonRules';
import { PresenterConnectionStatus } from '../presenterMode';

interface LayoutProps {
  lesson: Lesson;
  currentPart: LessonPart;
  onChangePart: (part: LessonPart) => void;
  onExit: () => void;
  onDashboard?: () => void;
  onExport?: () => void;
  onPrint?: () => void;
  notes?: string;
  activeGroup?: GroupProfile | null;
  noteStudents?: StudentProfile[];
  onSaveQuickNote?: (note: { content: string; studentIds: string[] }) => Promise<boolean> | boolean;
  isStudentView?: boolean;
  presenterStatus?: PresenterConnectionStatus;
  onOpenStudentDisplay?: () => void;
  onCloseStudentDisplay?: () => void;
  showDrawingsOnStudentDisplay?: boolean;
  onToggleDrawingsOnStudentDisplay?: () => void;
  onResyncStudentDisplay?: () => void;
  children: React.ReactNode;
}

const IconMap: Record<string, React.FC<any>> = {
  Grid, BookOpen, Layers, List, AlignLeft, RotateCcw, PenTool, Edit3, FileText, Headphones, Map: MapIcon
};

const Layout: React.FC<LayoutProps> = ({
  lesson, currentPart, onChangePart, onExit, onDashboard, onExport, onPrint,
  notes = '', activeGroup, noteStudents = [], onSaveQuickNote, isStudentView = false, presenterStatus = 'closed',
  onOpenStudentDisplay, onCloseStudentDisplay, showDrawingsOnStudentDisplay = true,
  onToggleDrawingsOnStudentDisplay, onResyncStudentDisplay, children
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isNotesOpen, setIsNotesOpen] = React.useState(false);
  const [isSidebarHidden, setIsSidebarHidden] = React.useState(false);
  const [isNavHidden, setIsNavHidden] = React.useState(false);
  const [notesSaveStatus, setNotesSaveStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [quickNoteText, setQuickNoteText] = React.useState('');
  const [quickNoteStudentIds, setQuickNoteStudentIds] = React.useState<string[]>([]);

  const toggleNotes = () => {
    setIsNotesOpen(open => !open);
    setNotesSaveStatus('idle');
  };

  const handleNotesChange = (value: string) => {
    setQuickNoteText(value);
    setNotesSaveStatus('idle');
  };

  const handleSaveNotes = async () => {
    if (notesSaveStatus === 'saving') return;
    setNotesSaveStatus('saving');
    try {
      if (!quickNoteText.trim() || !activeGroup) {
        setNotesSaveStatus('error');
        return;
      }
      const saved = await onSaveQuickNote?.({ content: quickNoteText, studentIds: quickNoteStudentIds });
      if (saved === false) {
        setNotesSaveStatus('error');
        return;
      }
      setNotesSaveStatus('saved');
      setQuickNoteText('');
      setQuickNoteStudentIds([]);
    } catch {
      setNotesSaveStatus('error');
    }
  };

  const studentDisplayLabel = presenterStatus === 'connected'
    ? 'Student Display Live'
    : presenterStatus === 'lagging'
      ? 'Student Display Lagging'
    : presenterStatus === 'connecting'
      ? 'Opening Student Display…'
      : presenterStatus === 'blocked'
        ? 'Pop-up Blocked — Retry'
        : 'Open Student Display';

  const plannedParts = React.useMemo(
    () => normalizePlannedParts(lesson.plannedParts),
    [lesson.plannedParts]
  );
  const plannedPartIds = React.useMemo(() => new Set<number>(plannedParts), [plannedParts]);
  const visibleLessonParts = React.useMemo(
    () => LESSON_PARTS.filter(part => part.id === LessonPart.Briefing || plannedPartIds.has(part.id)),
    [plannedPartIds]
  );
  const currentPlannedIndex = plannedParts.indexOf(currentPart);
  const previousPlannedPart = previousLessonPart(currentPart, lesson.plannedParts);
  const nextPlannedPart = nextLessonPart(currentPart, lesson.plannedParts);

  return (
    <div className="h-full w-full flex flex-col md:flex-row bg-[#fcfbf9] overflow-hidden font-sans text-stone-900">

      {/* Floating Toggle Controls */}
      {!isStudentView && (
        <div className="fixed bottom-16 right-6 z-[60] flex flex-col gap-2">
           <button
             onClick={toggleNotes}
             className={`p-3 rounded-full shadow-lg backdrop-blur-md transition-all active:scale-90 flex items-center justify-center ${isNotesOpen ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-stone-400 border border-stone-200 hover:text-stone-900'} ${notes && !isNotesOpen ? 'ring-2 ring-amber-400 ring-offset-2' : ''} border-2`}
             title={isNotesOpen ? "Close Quick Notes" : "Open Quick Notes"}
             aria-label={isNotesOpen ? "Close Quick Notes" : "Open Quick Notes"}
           >
             <Edit3 size={20} />
           </button>
           <button
             onClick={() => setIsSidebarHidden(!isSidebarHidden)}
             className={`p-3 rounded-full shadow-lg backdrop-blur-md transition-all active:scale-90 flex items-center justify-center border-2 ${isSidebarHidden ? 'bg-stone-900 text-white border-stone-800' : 'bg-white text-stone-400 border-stone-200 hover:text-stone-900'}`}
             title={isSidebarHidden ? "Show Sidebar" : "Hide Sidebar"}
           >
             {isSidebarHidden ? <Menu size={20} /> : <X size={20} />}
           </button>
           {currentPart !== LessonPart.Briefing && (
             <button
               onClick={() => setIsNavHidden(!isNavHidden)}
               className={`p-3 rounded-full shadow-lg backdrop-blur-md transition-all active:scale-90 flex items-center justify-center border-2 ${isNavHidden ? 'bg-red-800 text-white border-red-900' : 'bg-white text-stone-400 border-stone-200 hover:text-stone-900'}`}
               title={isNavHidden ? "Show Navigation" : "Hide Navigation"}
             >
               <Layers size={20} />
             </button>
           )}
        </div>
      )}

      {/* Mobile Header */}
      {!isStudentView && (
        <div className="md:hidden h-12 bg-white border-b border-stone-200 flex items-center justify-between px-4 z-20 text-stone-900 shrink-0">
          <div className="flex items-center gap-2">
             <span className="font-bold font-serif text-[10px] uppercase truncate max-w-[120px]">{lesson.title}</span>
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Cloud Synced" />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenStudentDisplay}
              className={`p-1 transition-colors ${presenterStatus === 'connected' ? 'text-emerald-600' : presenterStatus === 'blocked' ? 'text-red-700' : 'text-stone-500 hover:text-emerald-500'}`}
              title={studentDisplayLabel}
              aria-label={studentDisplayLabel}
            >
              <MonitorUp size={18} />
            </button>
            {(presenterStatus === 'connected' || presenterStatus === 'lagging') && (
              <button
                type="button"
                onClick={onResyncStudentDisplay}
                className={`p-1 transition-colors ${presenterStatus === 'lagging' ? 'text-red-700' : 'text-emerald-600'}`}
                title="Resync current student screen"
                aria-label="Resync current student screen"
              >
                <RefreshCw size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={onToggleDrawingsOnStudentDisplay}
              className={`p-1 transition-colors ${showDrawingsOnStudentDisplay ? 'text-emerald-600' : 'text-stone-400'}`}
              title={showDrawingsOnStudentDisplay ? 'Drawings are visible to students' : 'Drawings are hidden from students'}
              aria-label={showDrawingsOnStudentDisplay ? 'Hide drawings from students' : 'Show drawings to students'}
              aria-pressed={showDrawingsOnStudentDisplay}
            >
              {showDrawingsOnStudentDisplay ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
            <button
              onClick={toggleNotes}
              className={`p-1 ${notes ? 'text-amber-500' : 'text-stone-500'}`}
              aria-label={isNotesOpen ? 'Close Quick Notes' : 'Open Quick Notes'}
              title={isNotesOpen ? 'Close Quick Notes' : 'Open Quick Notes'}
            >
              <Edit3 size={18} />
            </button>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1">
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      )}

      {/* Sidebar - Tightened gaps */}
      {!isStudentView && !isSidebarHidden && (
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-56 bg-white text-stone-500 transform transition-transform duration-300 ease-out
          md:relative md:translate-x-0 flex flex-col border-r border-stone-200 shrink-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="h-14 flex items-center justify-between px-6 border-b border-stone-100 bg-white">
            <h1 className="font-black text-stone-900 text-[10px] tracking-widest uppercase font-serif">Dojo Mission</h1>
            <div className="flex items-center gap-1.5">
               <div className={`h-1.5 w-1.5 rounded-full ${presenterStatus === 'connected' ? 'bg-emerald-500' : presenterStatus === 'lagging' ? 'bg-red-500' : 'bg-stone-300'}`} />
               <span className="text-[7px] font-black text-stone-300 uppercase tracking-widest">{presenterStatus === 'connected' ? 'Display Live' : presenterStatus === 'lagging' ? 'Display Delayed' : 'Display Offline'}</span>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-1 space-y-0 custom-scrollbar bg-[#fcfbf9]">
            {visibleLessonParts.map((part) => {
              const Icon = IconMap[part.icon];
              const isActive = currentPart === part.id;
              return (
                <button
                  key={part.id}
                  onClick={() => {
                    onChangePart(part.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-5 py-2.5 text-[9px] font-black transition-all group relative
                    ${isActive
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-400 hover:bg-stone-50 hover:text-stone-600'
                    }`}
                >
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-700"></div>}
                  {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-red-700' : 'text-stone-300 group-hover:text-stone-400'}`} />}
                  <span className="uppercase tracking-[0.15em] truncate">
                     {part.id === LessonPart.Briefing ? "Briefing" : part.title.split('. ')[1]}
                  </span>
                </button>
              );
            })}
          </nav>

          <Timer variant="docked" />

          <div className="p-2 border-t border-stone-100 bg-white space-y-0.5">
            <button
              onClick={onOpenStudentDisplay}
              className={`flex items-center gap-2 text-[8px] w-full px-4 py-2 font-black uppercase tracking-widest transition-colors ${
                presenterStatus === 'connected'
                  ? 'text-emerald-700 bg-emerald-50'
                  : presenterStatus === 'lagging'
                    ? 'text-red-700 bg-red-50'
                  : presenterStatus === 'blocked'
                    ? 'text-red-700 bg-red-50'
                    : 'text-stone-400 hover:text-emerald-600'
              }`}
              aria-label={studentDisplayLabel}
            >
              <MonitorUp size={12} /> {studentDisplayLabel}
              {presenterStatus === 'connected' && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />}
            </button>
            {(presenterStatus === 'connected' || presenterStatus === 'lagging') && (
              <button
                type="button"
                onClick={onResyncStudentDisplay}
                className={`flex w-full items-center gap-2 px-4 py-2 text-[8px] font-black uppercase tracking-widest ${presenterStatus === 'lagging' ? 'bg-red-50 text-red-700' : 'text-emerald-700 hover:bg-emerald-50'}`}
              >
                <RefreshCw size={12} /> Resync Student Screen
              </button>
            )}
            <button
              type="button"
              onClick={onToggleDrawingsOnStudentDisplay}
              className={`flex items-center gap-2 text-[8px] w-full px-4 py-2 font-black uppercase tracking-widest transition-colors ${showDrawingsOnStudentDisplay ? 'text-emerald-700 bg-emerald-50' : 'text-stone-400 hover:text-stone-600'}`}
              aria-pressed={showDrawingsOnStudentDisplay}
              aria-label={showDrawingsOnStudentDisplay ? 'Hide drawings from students' : 'Show drawings to students'}
            >
              {showDrawingsOnStudentDisplay ? <Eye size={12} /> : <EyeOff size={12} />}
              {showDrawingsOnStudentDisplay ? 'Drawings Visible' : 'Drawings Hidden'}
            </button>
            <button
              onClick={toggleNotes}
              className={`flex items-center gap-2 text-[8px] w-full px-4 py-2 font-black uppercase tracking-widest transition-colors ${isNotesOpen ? 'text-amber-600 bg-amber-50' : 'text-stone-400 hover:text-stone-600'}`}
              aria-expanded={isNotesOpen}
              aria-controls="teacher-quick-notes"
            >
              <Edit3 size={12} /> {isNotesOpen ? 'Close Quick Notes' : 'Quick Notes'}
              {notes && !isNotesOpen && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-auto" />}
            </button>
            <button onClick={onPrint} className="flex items-center gap-2 text-stone-400 hover:text-stone-600 text-[8px] w-full px-4 py-2 font-black uppercase tracking-widest transition-colors">
              <Printer size={12} /> Print Lesson
            </button>
            <button onClick={onExit} className="flex items-center gap-2 text-stone-400 hover:text-stone-600 text-[8px] w-full px-4 py-2 font-black uppercase tracking-widest transition-colors">
              <Edit size={12} /> Edit Lesson
            </button>
            <button onClick={onDashboard} className="flex items-center gap-2 text-stone-300 hover:text-stone-900 text-[8px] w-full px-4 py-2 font-black uppercase tracking-widest transition-colors">
              <Home size={12} /> Exit Dojo
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row relative overflow-hidden bg-[#fcfbf9]">
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <div className="flex-1 overflow-hidden relative">
            <LessonStage>{children}</LessonStage>

            {/* Subtle floating exit for Student View */}
            {isStudentView && (
              <div className="absolute top-4 right-4 z-50 flex gap-2 opacity-20 hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => document.documentElement.requestFullscreen?.()}
                  className="p-3 bg-stone-900/80 hover:bg-stone-950 text-white rounded-full transition-all shadow-lg backdrop-blur-sm"
                  title="Full Screen"
                  aria-label="Full Screen"
                >
                  <Maximize2 size={18} />
                </button>
                <button
                  onClick={onCloseStudentDisplay}
                  className="p-3 bg-stone-900/80 hover:bg-red-900 text-white rounded-full transition-all group shadow-lg backdrop-blur-sm"
                  title="Close Student Display"
                  aria-label="Close Student Display"
                >
                  <X size={18} className="group-hover:scale-110 transition-transform" />
                </button>
              </div>
            )}
          </div>

          {!isStudentView && currentPart !== LessonPart.Briefing && !isNavHidden && (
            <div className="h-12 bg-[#fdf6e3] border-t border-stone-200 flex items-center justify-between px-6 text-stone-600 shrink-0 z-10 shadow-lg">
               <button
                 onClick={() => onChangePart(previousPlannedPart)}
                 className="text-[8px] font-black uppercase tracking-[0.2em] hover:text-red-800 transition-colors"
               >
                 &larr; Back
               </button>
               <div className="text-[9px] font-black text-stone-300 uppercase tracking-[0.3em]">
                 {currentPlannedIndex >= 0 ? `${currentPlannedIndex + 1} / ${plannedParts.length}` : `Part ${currentPart}`}
               </div>
               <button
                 onClick={() => onChangePart(nextPlannedPart)}
                 disabled={nextPlannedPart === currentPart}
                 className="text-[8px] font-black uppercase tracking-[0.2em] hover:text-red-800 disabled:opacity-10 transition-colors"
               >
                 Next &rarr;
               </button>
            </div>
          )}
        </div>

        {/* Session Notes Panel */}
        {!isStudentView && isNotesOpen && (
          <div id="teacher-quick-notes" className="fixed inset-y-0 right-0 z-50 w-[92%] max-w-md bg-white border-l border-stone-200 flex flex-col animate-in slide-in-from-right-4 duration-300 md:relative md:w-96" role="dialog" aria-modal="false" aria-labelledby="teacher-quick-notes-title">
            <div className="h-14 bg-white border-b border-stone-100 flex items-center justify-between px-6 shrink-0">
               <div className="flex items-center gap-2">
                 <Edit3 className="w-4 h-4 text-amber-500" />
                 <div>
                   <span id="teacher-quick-notes-title" className="block text-[10px] font-black text-stone-900 uppercase tracking-widest">Quick Notes</span>
                   <span className="block text-[8px] font-bold uppercase tracking-widest text-stone-400">{activeGroup?.name || 'Choose a group first'}</span>
                 </div>
               </div>
               <button onClick={() => setIsNotesOpen(false)} className="text-stone-300 hover:text-stone-900" aria-label="Close Quick Notes">
                 <X size={16} />
               </button>
            </div>
            <div className="flex-1 p-4 flex flex-col">
               <div className="mb-3">
                 <p className="mb-2 text-[8px] font-black uppercase tracking-[0.18em] text-stone-400">Applies to</p>
                 <div className="flex flex-wrap gap-2">
                   <button
                     type="button"
                     onClick={() => setQuickNoteStudentIds([])}
                     className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${quickNoteStudentIds.length === 0 ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-stone-200 bg-white text-stone-500'}`}
                     aria-pressed={quickNoteStudentIds.length === 0}
                   >
                     Whole Group
                   </button>
                   {noteStudents.map(student => {
                     if (!student?.id) return null;
                     const selected = quickNoteStudentIds.includes(student.id);
                     return (
                       <button
                         key={student.id}
                         type="button"
                         onClick={() => setQuickNoteStudentIds(current => selected ? current.filter(id => id !== student.id) : [...current, student.id])}
                         className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${selected ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-stone-200 bg-white text-stone-500'}`}
                         aria-pressed={selected}
                       >
                         {student.name}
                       </button>
                     );
                   })}
                 </div>
               </div>
               <textarea
                 value={quickNoteText}
                 onChange={(e) => handleNotesChange(e.target.value)}
                 onKeyDown={(event) => {
                   if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
                     event.preventDefault();
                     void handleSaveNotes();
                   }
                 }}
                 placeholder="Jot down errors, observations, focus areas, or student breakthroughs..."
                 aria-label="Teacher quick notes"
                 className="flex-1 w-full bg-white border-2 border-stone-200 rounded-2xl p-4 text-xs font-medium focus:outline-none focus:border-red-800 transition-colors resize-none font-serif leading-relaxed shadow-inner"
               />
               <div className="mt-4 flex items-center gap-3">
                 <button
                   type="button"
                   onClick={() => void handleSaveNotes()}
                 disabled={notesSaveStatus === 'saving' || !activeGroup || !quickNoteText.trim()}
                   className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-red-800 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
                 >
                   {notesSaveStatus === 'saving' ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} className="text-amber-400" />}
                   {notesSaveStatus === 'saving' ? 'Saving…' : 'Save Note'}
                 </button>
                 <span className="text-[8px] font-black uppercase tracking-widest text-stone-400" title="Keyboard shortcut">
                   Ctrl/⌘ S
                 </span>
               </div>
               <div className="mt-3 min-h-5" aria-live="polite">
                 {notesSaveStatus === 'saved' && (
                   <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-700">
                     <CheckCircle2 size={13} /> Saved to {activeGroup?.name || 'group notes'}
                   </p>
                 )}
                 {notesSaveStatus === 'error' && (
                   <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-red-700" role="alert">
                     <AlertCircle size={13} /> Could not save — please try again
                   </p>
                 )}
               </div>
               <div className="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-[9px] font-bold text-amber-800 uppercase tracking-widest leading-tight">
                    Teacher only. Students never see these notes. Each entry is filed under this group and any selected students.
                  </p>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Layout;
