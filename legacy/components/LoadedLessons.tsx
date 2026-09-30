import React, { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Edit, FileUp, Printer, Trash2, Undo2 } from 'lucide-react';
import type { GroupProfile, Lesson, StudentProfile } from '../types';
import MissionCard from './MissionCard';
import ConfirmModal from './ConfirmModal';
import LessonLoader from './LessonLoader';
import { formatLessonDate, LibraryLessonRecord, localDateString, substepLabel } from '../lessonLibrary';
import { LessonStatusEntry, arrangeByStatus } from '../lessonStatus';
import { useLessonLibraryContext } from '../useLessonLibrary';
import { useLessonStatusContext } from '../useLessonStatus';

const loadButtonClass =
  'flex items-center gap-2 rounded-xl bg-red-800 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg ' +
  'hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40';

/** Dashboard entry point: load every lesson file at once, for any group. */
export const LoadLessonsButton: React.FC<{ groups: GroupProfile[]; students: StudentProfile[] }> = ({ groups, students }) => {
  const library = useLessonLibraryContext();
  const [open, setOpen] = useState(false);
  if (!library) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} disabled={library.status === 'signed-out'} className={loadButtonClass}>
        <FileUp className="h-4 w-4" /> Load Lessons
      </button>
      <LessonLoader open={open} onClose={() => setOpen(false)} groups={groups} students={students} />
    </>
  );
};

interface LoadedLessonsProps {
  group: GroupProfile;
  groups: GroupProfile[];
  students: StudentProfile[];
  onLaunchLesson: (lesson: Lesson) => void;
  onEditLesson: (lesson: Lesson) => void;
  onPrintLesson: (lesson: Lesson) => void;
}

const LoadedLessons: React.FC<LoadedLessonsProps> = ({
  group, groups, students, onLaunchLesson, onEditLesson, onPrintLesson
}) => {
  const library = useLessonLibraryContext();
  const [loaderOpen, setLoaderOpen] = useState(false);
  const [showTaught, setShowTaught] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<LibraryLessonRecord | null>(null);
  const [removeError, setRemoveError] = useState('');
  const today = localDateString();
  const records = library?.records;
  const status = useLessonStatusContext();
  const contextFor = status?.contextFor;
  const { inProgress, onDeck, taught } = useMemo(
    () => arrangeByStatus(
      records || [],
      group.id,
      contextFor ? contextFor(group.id) : { completedLessonIds: new Set<string>(), markedTaughtIds: new Set<string>() },
      today
    ),
    [records, group.id, today, contextFor]
  );

  if (!library) return null;

  const renderCard = ({ record, status: lessonStatus, manuallyTaught, putBackByYou, plannedFor }: LessonStatusEntry) => (
    <MissionCard
      key={record.id}
      title={record.title}
      badge={`Step ${substepLabel(record.step, record.substep)}`}
      subtitle={record.lessonDate === today ? `Today · ${formatLessonDate(record.lessonDate)}` : formatLessonDate(record.lessonDate)}
      onPrimaryAction={() => onLaunchLesson(record.lesson)}
      secondaryActions={[
        { icon: Printer, title: 'Print Scroll', onClick: () => onPrintLesson(record.lesson) },
        { icon: Edit, title: 'Edit Scroll', onClick: () => onEditLesson(record.lesson) },
        { icon: Trash2, title: 'Remove Lesson', variant: 'danger', onClick: () => setPendingRemoval(record) }
      ]}
    >
      <div className="space-y-2">
        {lessonStatus === 'in-progress' && (
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-800">In progress · saved spot</p>
        )}
        {lessonStatus === 'taught' && (
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Taught{manuallyTaught ? ' · marked by you' : ''}
          </p>
        )}
        {putBackByYou && (
          <p className="text-[10px] font-bold text-stone-500">Put back by you</p>
        )}
        {plannedFor && (
          <p className="text-[10px] font-bold text-stone-500">Planned for {formatLessonDate(plannedFor)}</p>
        )}
        {status && lessonStatus !== 'taught' && (
          <button
            type="button"
            onClick={() => { void status.markTaught(group.id, record.id); }}
            className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-stone-700 hover:border-emerald-700 hover:text-emerald-800"
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Mark as taught
          </button>
        )}
        {status && lessonStatus === 'taught' && (
          <button
            type="button"
            onClick={() => { void status.putBackOnDeck(group.id, record.id); }}
            className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-stone-700 hover:border-red-700 hover:text-red-800"
          >
            <Undo2 className="h-3.5 w-3.5" aria-hidden="true" /> Put back on deck
          </button>
        )}
      </div>
    </MissionCard>
  );

  const confirmRemoval = async () => {
    const target = pendingRemoval;
    if (!target) return;
    setRemoveError('');
    const result = await library.removeLesson(target.id);
    if (!result.ok) setRemoveError(`${target.title} was not removed. ${result.message}`);
  };

  const isEmpty = library.status === 'ready' && inProgress.length === 0 && onDeck.length === 0 && taught.length === 0;

  return (
    <section className="space-y-4" aria-label="Loaded lessons">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-900">Loaded Lessons</h3>
          <p className="mt-0.5 text-[10px] font-bold text-emerald-800/70">Lesson files for {group.name}: in progress, then on deck in date order.</p>
        </div>
        <button type="button" onClick={() => setLoaderOpen(true)} disabled={library.status === 'signed-out'} className={loadButtonClass}>
          <FileUp className="h-4 w-4" /> Load Lessons
        </button>
      </div>

      {library.status === 'signed-out' && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900">Sign in to the Cloud to use loaded lessons.</p>
      )}
      {library.error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-900">{library.error}</div>
      )}
      {removeError && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-900">{removeError}</div>
      )}
      {library.status === 'loading' && <p className="text-xs font-bold text-stone-400">Loading lessons…</p>}

      {isEmpty && (
        <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-white px-6 py-8 text-center">
          <p className="text-sm font-black text-stone-800">No lesson files loaded for {group.name} yet.</p>
          <p className="mt-1 text-xs text-stone-500">Use Load Lessons to add this week's JSON files. You can load every group's files at once.</p>
        </div>
      )}

      {inProgress.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-800">In progress ({inProgress.length})</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{inProgress.map(renderCard)}</div>
        </div>
      )}

      {(onDeck.length > 0 || inProgress.length > 0 || taught.length > 0) && (
        <div className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-600">On deck ({onDeck.length})</h4>
          {onDeck.length === 0
            ? <p className="text-xs font-bold text-red-800">Nothing on deck. Load more lessons for {group.name}.</p>
            : <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{onDeck.map(renderCard)}</div>}
        </div>
      )}

      {taught.length > 0 && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setShowTaught(value => !value)}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-stone-500 hover:text-stone-900"
          >
            {showTaught ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Show older lessons · Taught ({taught.length})
          </button>
          {showTaught && <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{taught.map(renderCard)}</div>}
        </div>
      )}

      <LessonLoader open={loaderOpen} onClose={() => setLoaderOpen(false)} groups={groups} students={students} />
      <ConfirmModal
        isOpen={Boolean(pendingRemoval)}
        onClose={() => setPendingRemoval(null)}
        onConfirm={() => { void confirmRemoval(); }}
        title="Remove Lesson"
        message={pendingRemoval ? `Remove ${pendingRemoval.title} from ${group.name}? You can load the file again later.` : ''}
      />
    </section>
  );
};

export default LoadedLessons;
