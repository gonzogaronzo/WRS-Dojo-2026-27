import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Edit, FileUp, Printer, Trash2 } from 'lucide-react';
import type { GroupProfile, Lesson, StudentProfile } from '../types';
import MissionCard from './MissionCard';
import ConfirmModal from './ConfirmModal';
import LessonLoader from './LessonLoader';
import {
  arrangeGroupLessons, formatLessonDate, LibraryLessonRecord, localDateString, substepLabel
} from '../lessonLibrary';
import { useLessonLibraryContext } from '../useLessonLibrary';

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
  const [showEarlier, setShowEarlier] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<LibraryLessonRecord | null>(null);
  const [removeError, setRemoveError] = useState('');
  const today = localDateString();
  const records = library?.records;
  const { upcoming, earlier } = useMemo(
    () => arrangeGroupLessons(records || [], group.id, today),
    [records, group.id, today]
  );

  if (!library) return null;

  const renderCard = (record: LibraryLessonRecord) => (
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
    />
  );

  const confirmRemoval = async () => {
    const target = pendingRemoval;
    if (!target) return;
    setRemoveError('');
    const result = await library.removeLesson(target.id);
    if (!result.ok) setRemoveError(`${target.title} was not removed. ${result.message}`);
  };

  const isEmpty = library.status === 'ready' && upcoming.length === 0 && earlier.length === 0;

  return (
    <section className="space-y-4" aria-label="Loaded lessons">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-900">Loaded Lessons</h3>
          <p className="mt-0.5 text-[10px] font-bold text-emerald-800/70">Lesson files for {group.name}, soonest first.</p>
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

      {upcoming.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{upcoming.map(renderCard)}</div>
      )}

      {earlier.length > 0 && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setShowEarlier(value => !value)}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-stone-500 hover:text-stone-900"
          >
            {showEarlier ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Earlier lessons ({earlier.length})
          </button>
          {showEarlier && <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{earlier.map(renderCard)}</div>}
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
