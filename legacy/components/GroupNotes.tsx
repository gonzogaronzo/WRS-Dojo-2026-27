import React, { useMemo, useState } from 'react';
import { BookOpen, Calendar, Filter, User } from 'lucide-react';
import { GroupNote, GroupProfile, StudentProfile } from '../types';

interface GroupNotesProps {
  group: GroupProfile;
  notes: GroupNote[];
  students: StudentProfile[];
}

const GroupNotes: React.FC<GroupNotesProps> = ({ group, notes, students }) => {
  const [studentFilter, setStudentFilter] = useState('all');
  const groupNotes = useMemo(() => notes
    .filter(note => note && note.groupId === group.id)
    .filter(note => studentFilter === 'all' || (studentFilter === 'group'
      ? (note.studentIds || []).length === 0
      : (note.studentIds || []).includes(studentFilter)))
    .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || ''))), [group.id, notes, studentFilter]);
  const groupStudents = group.studentIds
    .map(studentId => students.find(student => student.id === studentId))
    .filter((student): student is StudentProfile => Boolean(student));

  return (
    <section className="rounded-[2.5rem] border-4 border-stone-800 bg-[#fdf6e3] p-6 text-stone-900 shadow-2xl md:p-8" aria-labelledby="group-notes-title">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-stone-900 p-2"><BookOpen className="h-5 w-5 text-amber-500" /></div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">{group.schoolYear || 'Group history'}</p>
            <h3 id="group-notes-title" className="font-serif text-lg font-black">Notes: {group.name}</h3>
          </div>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[9px] font-black uppercase tracking-widest text-stone-500">
          <Filter className="h-3.5 w-3.5" />
          <span className="sr-only">Filter group notes</span>
          <select value={studentFilter} onChange={event => setStudentFilter(event.target.value)} className="bg-transparent outline-none">
            <option value="all">All notes</option>
            <option value="group">Whole group only</option>
            {groupStudents.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}
          </select>
        </label>
      </div>

      {groupNotes.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-white/50 px-6 py-12 text-center">
          <BookOpen className="mx-auto mb-3 h-9 w-9 text-stone-300" />
          <p className="text-sm font-black text-stone-700">No matching notes yet.</p>
          <p className="mt-1 text-xs text-stone-500">Notes saved during a lesson will collect here automatically.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupNotes.map(note => (
            <article key={note.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-widest text-stone-400">
                  <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {note.createdAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(note.createdAt)) : 'Saved note'}</span>
                  {note.lessonTitle && <span>• {note.lessonTitle}</span>}
                  {note.step && <span>• Step {note.step}{note.substep ? `.${note.substep}` : ''}</span>}
                </div>
                <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${(note.studentIds || []).length ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  <User className="h-3 w-3" /> {(note.studentNames || []).length ? note.studentNames.join(', ') : 'Whole Group'}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap font-serif text-sm leading-relaxed text-stone-700">{note.content}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default GroupNotes;
