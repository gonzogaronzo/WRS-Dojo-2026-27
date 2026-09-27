import React, { useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Upload, X } from 'lucide-react';
import type { GroupProfile, StudentProfile } from '../types';
import {
  formatLessonDate,
  LessonFileReading,
  LessonWritePlan,
  matchGroupForLabel,
  planLessonWrite,
  readLessonFile,
  substepLabel
} from '../lessonLibrary';
import { LessonWriteResult, useLessonLibraryContext } from '../useLessonLibrary';

interface LoaderRow {
  key: string;
  reading: LessonFileReading;
  groupId: string;
}

interface LessonLoaderProps {
  open: boolean;
  onClose: () => void;
  groups: GroupProfile[];
  students: StudentProfile[];
}

const planRows = (
  rows: LoaderRow[],
  groups: GroupProfile[],
  teacherId: string,
  existingIds: ReadonlySet<string>,
  savedAt: string
): LessonWritePlan[] => {
  const plans = rows.map(row => planLessonWrite(
    row.reading, groups.find(group => group.id === row.groupId), teacherId, existingIds, savedAt
  ));
  // Two files that resolve to the same lesson (e.g. "X.json" and "X (1).json")
  // would overwrite each other; keep the first and flag the rest.
  const seen = new Set<string>();
  return plans.map(plan => {
    if (!plan.record) return plan;
    if (seen.has(plan.record.id)) {
      return { status: 'error', message: 'Same lesson as another file in this list.', record: null };
    }
    seen.add(plan.record.id);
    return plan;
  });
};

const isWritable = (plan: LessonWritePlan) => plan.status === 'ready' || plan.status === 'replace';

const LessonLoader: React.FC<LessonLoaderProps> = ({ open, onClose, groups, students }) => {
  const library = useLessonLibraryContext();
  const [rows, setRows] = useState<LoaderRow[]>([]);
  const [results, setResults] = useState<Record<string, LessonWriteResult>>({});
  const [skippedCount, setSkippedCount] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const teacherId = library?.teacherId || '';
  const existingIds = library?.ids || new Set<string>();
  const plans = useMemo(
    () => planRows(rows, groups, teacherId, existingIds, ''),
    [rows, groups, teacherId, existingIds]
  );

  if (!open) return null;

  // Failed rows stay loadable so a retry (for example after publishing the
  // Firestore rules) needs no re-picking.
  const pending = rows.filter((row, index) => isWritable(plans[index]) && !results[row.key]?.ok);
  const savedCount = rows.filter(row => results[row.key]?.ok).length;
  const failedCount = rows.filter(row => results[row.key] && !results[row.key].ok).length;
  const freshCount = pending.length - failedCount;
  const attentionCount = rows.filter((row, index) => !isWritable(plans[index]) && !results[row.key]?.ok).length;
  const canLoad = Boolean(library && library.status === 'ready' && pending.length && !isSaving && !isReading);

  const addFiles = async (files: File[]) => {
    const jsonFiles = files.filter(file => /\.json$/i.test(file.name));
    setSkippedCount(count => count + files.length - jsonFiles.length);
    if (!jsonFiles.length) return;
    setIsReading(true);
    try {
      const readings = await Promise.all(jsonFiles.map(async file => readLessonFile(file.name, await file.text())));
      setRows(current => {
        const known = new Set(current.map(row => row.key));
        const added = readings
          .filter(reading => !known.has(reading.fileName))
          .map(reading => ({
            key: reading.fileName,
            reading,
            groupId: matchGroupForLabel(reading.name.groupLabel, groups, students)?.id || ''
          }));
        return [...current, ...added].sort((a, b) => a.key.localeCompare(b.key));
      });
    } finally {
      setIsReading(false);
    }
  };

  const setRowGroup = (key: string, groupId: string) => {
    setRows(current => current.map(row => row.key === key ? { ...row, groupId } : row));
    setResults(current => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const removeRow = (key: string) => setRows(current => current.filter(row => row.key !== key));

  const load = async () => {
    if (!library || !canLoad) return;
    setIsSaving(true);
    try {
      const savedAt = new Date().toISOString();
      const finalPlans = planRows(rows, groups, teacherId, library.ids, savedAt);
      const targets = rows
        .map((row, index) => ({ row, plan: finalPlans[index] }))
        .filter(({ row, plan }) => isWritable(plan) && plan.record && !results[row.key]?.ok);
      const written = await library.saveRecords(targets.map(({ plan }) => plan.record!));
      setResults(current => {
        const next = { ...current };
        targets.forEach(({ row }, index) => { next[row.key] = written[index]; });
        return next;
      });
    } finally {
      setIsSaving(false);
    }
  };

  const close = () => {
    if (isSaving) return;
    setRows([]);
    setResults({});
    setSkippedCount(0);
    onClose();
  };

  const statusChip = (row: LoaderRow, plan: LessonWritePlan) => {
    const result = results[row.key];
    if (result?.ok) {
      return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-800"><CheckCircle2 className="h-3 w-3" /> Saved</span>;
    }
    if (result) {
      return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-red-800"><AlertTriangle className="h-3 w-3" /> Not saved</span>;
    }
    const styles: Record<LessonWritePlan['status'], [string, string]> = {
      ready: ['bg-emerald-50 text-emerald-700', 'Ready'],
      replace: ['bg-amber-50 text-amber-800', 'Replaces copy'],
      'needs-group': ['bg-amber-100 text-amber-900', 'Pick a group'],
      error: ['bg-red-100 text-red-800', "Can't load"]
    };
    const [style, label] = styles[plan.status];
    return <span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${style}`}>{label}</span>;
  };

  const detailFor = (row: LoaderRow, plan: LessonWritePlan) => {
    const result = results[row.key];
    if (result && !result.ok) return result.message;
    if (result?.ok) return '';
    return plan.status === 'ready' ? '' : plan.message;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="lesson-loader-title">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white text-stone-900 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 bg-stone-50 px-7 py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-700">Lesson files</p>
            <h2 id="lesson-loader-title" className="mt-1 font-serif text-2xl font-black">Load Lessons</h2>
            <p className="mt-1 text-xs text-stone-500">Each file goes to the group named in its file name. Check the list, then load.</p>
          </div>
          <button type="button" onClick={close} disabled={isSaving} className="rounded-xl p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-40" aria-label="Close Load Lessons">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-7 py-6">
          {(!library || library.status === 'signed-out') && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">Sign in to the Cloud before loading lessons.</div>
          )}
          {library?.error && (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-900">{library.error}</div>
          )}

          <div
            onDragOver={event => { event.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={event => { event.preventDefault(); setIsDragging(false); void addFiles(Array.from(event.dataTransfer.files)); }}
            className={`rounded-2xl border-2 border-dashed px-6 py-7 text-center transition-colors ${isDragging ? 'border-red-800 bg-red-50' : 'border-stone-300 bg-stone-50'}`}
          >
            <Upload className="mx-auto mb-3 h-7 w-7 text-stone-400" />
            <p className="text-sm font-bold text-stone-700">Drag lesson files here, or</p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isSaving}
              className="mt-3 rounded-xl bg-stone-900 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-red-900 disabled:opacity-40"
            >
              Choose Files
            </button>
            <p className="mt-3 text-[11px] text-stone-500">In the file picker, open Downloads and press Ctrl+A to select every lesson file, or Ctrl-click to pick several.</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".json,application/json"
              className="hidden"
              onChange={event => {
                void addFiles(Array.from(event.target.files || []));
                event.target.value = '';
              }}
            />
          </div>

          {isReading && <p className="flex items-center gap-2 text-xs font-bold text-stone-500"><RefreshCw className="h-4 w-4 animate-spin" /> Reading files…</p>}
          {skippedCount > 0 && <p className="text-xs font-bold text-stone-500">Skipped {skippedCount} file{skippedCount === 1 ? '' : 's'} that {skippedCount === 1 ? "isn't" : "aren't"} .json (the PDFs, for example).</p>}

          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-stone-200">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-stone-50 text-[9px] font-black uppercase tracking-widest text-stone-400">
                  <tr>
                    <th className="px-4 py-3">File</th>
                    <th className="px-4 py-3">Group</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Lesson</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-2 py-3"><span className="sr-only">Remove</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {rows.map((row, index) => {
                    const plan = plans[index];
                    const lesson = row.reading.lesson;
                    const detail = detailFor(row, plan);
                    return (
                      <tr key={row.key} className="align-top">
                        <td className="max-w-[220px] px-4 py-3">
                          <p className="break-all font-mono text-[11px] font-bold text-stone-800">{row.key}</p>
                          {row.reading.warnings.map(warning => (
                            <p key={warning} className="mt-1 text-[10px] font-bold text-amber-700">{warning}</p>
                          ))}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={row.groupId}
                            onChange={event => setRowGroup(row.key, event.target.value)}
                            disabled={isSaving || !row.reading.ok || Boolean(results[row.key]?.ok)}
                            aria-label={`Group for ${row.key}`}
                            className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs font-bold text-stone-900 outline-none focus:border-red-800 disabled:bg-stone-50 disabled:text-stone-400"
                          >
                            <option value="">Pick a group…</option>
                            {groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
                          </select>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-bold text-stone-600">{row.reading.name.date ? formatLessonDate(row.reading.name.date) : '—'}</td>
                        <td className="px-4 py-3">
                          {lesson ? (
                            <>
                              <p className="text-[9px] font-black uppercase tracking-widest text-red-800">Step {substepLabel(lesson.step, lesson.substep)}</p>
                              <p className="mt-0.5 font-bold text-stone-800">{lesson.title}</p>
                            </>
                          ) : <span className="text-stone-400">—</span>}
                        </td>
                        <td className="max-w-[240px] px-4 py-3">
                          {statusChip(row, plan)}
                          {detail && <p className={`mt-1.5 text-[10px] font-bold leading-snug ${results[row.key] || plan.status === 'error' ? 'text-red-800' : 'text-stone-500'}`}>{detail}</p>}
                        </td>
                        <td className="px-2 py-3">
                          <button type="button" onClick={() => removeRow(row.key)} disabled={isSaving} className="rounded-lg p-1.5 text-stone-300 hover:bg-stone-100 hover:text-red-700 disabled:opacity-40" aria-label={`Remove ${row.key} from the list`}>
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-stone-100 bg-stone-50 px-7 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold text-stone-600">
            {rows.length === 0
              ? 'No files chosen yet.'
              : [
                  freshCount ? `${freshCount} ready to load` : '',
                  savedCount ? `${savedCount} saved and confirmed` : '',
                  failedCount ? `${failedCount} failed (Load again to retry)` : '',
                  attentionCount ? `${attentionCount} need${attentionCount === 1 ? 's' : ''} attention` : ''
                ].filter(Boolean).join(' · ')}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={close} disabled={isSaving} className="rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-stone-600 hover:bg-stone-100 disabled:opacity-40">
              {savedCount ? 'Done' : 'Cancel'}
            </button>
            <button type="button" onClick={() => void load()} disabled={!canLoad} className="flex items-center gap-2 rounded-xl bg-red-800 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40">
              {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {isSaving ? 'Loading…' : `Load ${pending.length || ''} Lesson${pending.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonLoader;
