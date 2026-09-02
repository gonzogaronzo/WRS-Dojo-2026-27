import React, { useEffect, useMemo, useState } from 'react';
import { Check, Cloud, Loader2, RotateCcw, Save, Scroll, X } from 'lucide-react';
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Lesson, StudentProfile, WordCard, WordlistScore } from '../../types';
import {
  buildPart4ChartingAttempt,
  chartingInstanceId,
  historyEntryFromPart4Attempt,
  Part4ScoredItem,
  Part4SourceContext,
  Part4SourceList,
  resolvePart4SourceContext,
  upsertPart4History
} from '../../part4Charting';
import { WordInstance } from '../../wordDistribution';

interface WordlistReadingProps {
  cards: WordCard[];
  students: StudentProfile[];
  scores: WordlistScore[];
  onUpdateScores: (scores: WordlistScore[]) => void;
  isStudentView?: boolean;
  distribution: WordInstance[][];
  onUpdateDistribution: (dist: WordInstance[][]) => void;
  page: number;
  onUpdatePage: (page: number) => void;
}

interface CloudLessonContext {
  lesson: Lesson;
  groupId: string;
  groupName: string;
  sessionId: string;
  sessionDate: string;
  sources: Part4SourceContext;
}

interface SyncedPart4State {
  version: 1;
  phase: 'practice' | 'charting';
  practiceList?: Part4SourceList;
  chartingList?: Part4SourceList;
  selectedStudentId: string;
  errorNotes: Record<string, string>;
  teacherNotes: string;
  savedAttemptId?: string;
  savedResults?: Part4ScoredItem[];
}

const STATE_INSTANCE_ID = '__part4_state_v1__';
const STATE_STUDENT_ID = '__part4__';

const defaultState = (): SyncedPart4State => ({
  version: 1,
  phase: 'practice',
  selectedStudentId: '',
  errorNotes: {},
  teacherNotes: ''
});

const parseState = (scores: WordlistScore[]): SyncedPart4State => {
  const record = scores.find(score => score.instanceId === STATE_INSTANCE_ID && score.studentId === STATE_STUDENT_ID);
  if (!record?.wordText) return defaultState();
  try {
    const parsed = JSON.parse(record.wordText) as SyncedPart4State;
    return parsed?.version === 1 ? { ...defaultState(), ...parsed } : defaultState();
  } catch {
    return defaultState();
  }
};

const stateScore = (state: SyncedPart4State): WordlistScore => ({
  studentId: STATE_STUDENT_ID,
  instanceId: STATE_INSTANCE_ID,
  wordText: JSON.stringify(state),
  status: 'none'
});

const sourceCaption = (list?: Part4SourceList) => list
  ? `${list.sourceLabel}${list.locator ? ` · ${list.locator}` : ''}`
  : 'No source selected';

const WordlistReading: React.FC<WordlistReadingProps> = ({
  cards, students = [], scores, onUpdateScores, isStudentView,
  distribution, onUpdateDistribution, page, onUpdatePage
}) => {
  // These legacy props remain accepted so Part 4 can change without disturbing
  // the existing lesson engine or presenter contract.
  void cards;
  void distribution;
  void onUpdateDistribution;
  void page;
  void onUpdatePage;

  const syncedState = useMemo(() => parseState(scores), [scores]);
  const [cloudContext, setCloudContext] = useState<CloudLessonContext | null>(null);
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(!isStudentView);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const writeState = (next: SyncedPart4State, nextScores = scores) => {
    onUpdateScores([
      ...nextScores.filter(score => score.instanceId !== STATE_INSTANCE_ID),
      stateScore(next)
    ]);
  };

  const loadSourceContext = async () => {
    if (isStudentView) return;
    const teacher = auth.currentUser;
    if (!teacher) {
      setLoadError('Connect the teacher Cloud account to use source-backed Part 4 charting.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError('');
    try {
      const sessionSnapshot = await getDoc(doc(db, 'active_sessions', teacher.uid));
      if (!sessionSnapshot.exists()) throw new Error('The current lesson session has not reached the Cloud yet. Try Refresh Source.');
      const data = sessionSnapshot.data();
      const lesson = data.lesson as Lesson | undefined;
      const groupId = typeof data.groupId === 'string' ? data.groupId : '';
      const sessionId = typeof data.sessionId === 'string' ? data.sessionId : '';
      const sessionDate = typeof data.sessionDate === 'string' ? data.sessionDate : new Date().toISOString().slice(0, 10);
      if (!lesson?.id || !groupId || !sessionId) throw new Error('The active lesson is missing its lesson, group, or session identity.');
      const groupSnapshot = await getDoc(doc(db, 'squads', groupId));
      const groupName = groupSnapshot.exists() && typeof groupSnapshot.data().name === 'string'
        ? groupSnapshot.data().name
        : groupId;
      const sources = resolvePart4SourceContext(lesson);
      setCloudContext({ lesson, groupId, groupName, sessionId, sessionDate, sources });

      if (!syncedState.practiceList && sources.practiceLists[0]) {
        writeState({
          ...syncedState,
          practiceList: sources.practiceLists[0],
          chartingList: syncedState.chartingList || sources.chartingLists[0]
        });
      } else if (!syncedState.chartingList && sources.chartingLists[0]) {
        writeState({ ...syncedState, chartingList: sources.chartingLists[0] });
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSourceContext();
    // Source context is deliberately loaded once per Part 4 mount. The durable
    // lesson session remains the governing source if the browser reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStudentView]);

  const activeList = syncedState.phase === 'practice' ? syncedState.practiceList : syncedState.chartingList;
  const selectedStudent = students.find(student => student.id === syncedState.selectedStudentId) || null;
  const activeChartingList = syncedState.chartingList;
  const scoredItems = useMemo(() => {
    if (!activeChartingList || !selectedStudent) return [];
    return activeChartingList.words.map((word, index) => {
      const instanceId = chartingInstanceId(activeChartingList.listId, index);
      const saved = syncedState.savedResults?.find(item => item.instanceId === instanceId);
      const score = scores.find(candidate => candidate.studentId === selectedStudent.id && candidate.instanceId === instanceId);
      const status = saved?.status || (score?.status === 'correct' || score?.status === 'error' ? score.status : null);
      return { index, word, instanceId, status };
    });
  }, [activeChartingList, scores, selectedStudent, syncedState.savedResults]);
  const completedCount = scoredItems.filter(item => item.status).length;
  const canSave = Boolean(
    cloudContext && selectedStudent && activeChartingList &&
    activeChartingList.words.length === 15 && completedCount === activeChartingList.words.length &&
    !syncedState.savedAttemptId
  );

  const setPhase = (phase: SyncedPart4State['phase']) => {
    setSaveMessage('');
    writeState({ ...syncedState, phase });
  };

  const selectPracticeList = (listId: string) => {
    const list = cloudContext?.sources.practiceLists.find(candidate => candidate.listId === listId);
    if (list) writeState({ ...syncedState, practiceList: list, phase: 'practice' });
  };

  const selectChartingList = (listId: string) => {
    const list = cloudContext?.sources.chartingLists.find(candidate => candidate.listId === listId);
    if (!list) return;
    const cleared = scores.filter(score => score.instanceId === STATE_INSTANCE_ID || score.studentId !== syncedState.selectedStudentId);
    writeState({
      ...syncedState,
      chartingList: list,
      selectedStudentId: '',
      errorNotes: {},
      teacherNotes: '',
      savedAttemptId: undefined,
      savedResults: undefined,
      phase: 'charting'
    }, cleared);
  };

  const selectStudent = (studentId: string) => {
    const previousStudentId = syncedState.selectedStudentId;
    const cleared = scores.filter(score => score.instanceId === STATE_INSTANCE_ID || score.studentId !== previousStudentId);
    writeState({
      ...syncedState,
      selectedStudentId: studentId,
      errorNotes: {},
      teacherNotes: '',
      savedAttemptId: undefined,
      savedResults: undefined,
      phase: 'charting'
    }, cleared);
    setSaveMessage('');
  };

  const scoreItem = (index: number, status: 'correct' | 'error') => {
    if (!selectedStudent || !activeChartingList || syncedState.savedAttemptId) return;
    const instanceId = chartingInstanceId(activeChartingList.listId, index);
    const nextScore: WordlistScore = {
      studentId: selectedStudent.id,
      instanceId,
      wordText: activeChartingList.words[index],
      status
    };
    const nextScores = [
      ...scores.filter(score => !(score.studentId === selectedStudent.id && score.instanceId === instanceId)),
      nextScore
    ];
    const nextNotes = status === 'correct'
      ? Object.fromEntries(Object.entries(syncedState.errorNotes).filter(([key]) => key !== instanceId))
      : syncedState.errorNotes;
    writeState({ ...syncedState, errorNotes: nextNotes }, nextScores);
  };

  useEffect(() => {
    if (isStudentView || syncedState.phase !== 'charting' || syncedState.savedAttemptId) return;
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT') return;
      const next = scoredItems.find(item => !item.status);
      if (!next) return;
      if (event.key.toLowerCase() === 'c' || event.key === '1') {
        event.preventDefault();
        scoreItem(next.index, 'correct');
      }
      if (event.key.toLowerCase() === 'x' || event.key === '0') {
        event.preventDefault();
        scoreItem(next.index, 'error');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const saveAttempt = async () => {
    const teacher = auth.currentUser;
    if (!teacher || !cloudContext || !selectedStudent || !activeChartingList || !canSave) return;
    setIsSaving(true);
    setSaveMessage('');
    try {
      const itemResults: Part4ScoredItem[] = scoredItems.map(item => ({
        instanceId: item.instanceId,
        index: item.index,
        wordText: item.word,
        status: item.status as 'correct' | 'error',
        ...(syncedState.errorNotes[item.instanceId]?.trim()
          ? { errorNote: syncedState.errorNotes[item.instanceId].trim() }
          : {})
      }));
      const attempt = buildPart4ChartingAttempt({
        teacherId: teacher.uid,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        groupId: cloudContext.groupId,
        groupName: cloudContext.groupName,
        lesson: cloudContext.lesson,
        sessionId: cloudContext.sessionId,
        completedAt: new Date().toISOString(),
        list: activeChartingList,
        itemResults,
        teacherNotes: syncedState.teacherNotes
      });
      const attemptRef = doc(db, 'missions', attempt.id);
      const studentRef = doc(db, 'students', selectedStudent.id);
      const existingAttempt = await getDoc(attemptRef);
      const studentSnapshot = await getDoc(studentRef);
      const currentHistory = studentSnapshot.exists() && Array.isArray(studentSnapshot.data().history)
        ? studentSnapshot.data().history
        : selectedStudent.history;
      const historyEntry = historyEntryFromPart4Attempt(
        existingAttempt.exists() && existingAttempt.data().recordType === 'part4-charting'
          ? existingAttempt.data() as unknown as typeof attempt
          : attempt
      );

      const batch = writeBatch(db);
      if (!existingAttempt.exists()) {
        const attempts = attempt.itemResults.map(item => ({
          instanceId: item.instanceId,
          wordText: item.wordText,
          status: item.status
        }));
        batch.set(attemptRef, {
          ...attempt,
          squadId: attempt.groupId,
          squadName: attempt.groupName,
          lessonStep: `${attempt.step}.${attempt.substep}`,
          notes: attempt.teacherNotes,
          timestamp: attempt.completedAt,
          results: [{
            studentId: attempt.studentId,
            studentName: attempt.studentName,
            correctCount: attempt.correctCount,
            errorCount: attempt.incorrectCount,
            totalCount: attempt.totalItems,
            accuracy: attempt.accuracy,
            attempts,
            errors: attempt.incorrectItems
          }],
          attendance: [],
          lastUpdated: serverTimestamp()
        });
      }
      batch.set(studentRef, {
        teacherId: teacher.uid,
        history: upsertPart4History(currentHistory, historyEntry),
        lastUpdated: serverTimestamp()
      }, { merge: true });
      await batch.commit();

      // Keep the finished result in the synced Part 4 metadata, but remove the
      // temporary scoring rows so the end-of-lesson mission archive does not
      // count this separately saved charting attempt a second time.
      const withoutTemporaryScores = scores.filter(score =>
        score.instanceId === STATE_INSTANCE_ID || score.studentId !== selectedStudent.id
      );
      writeState({
        ...syncedState,
        savedAttemptId: attempt.id,
        savedResults: itemResults
      }, withoutTemporaryScores);
      setSaveMessage(existingAttempt.exists() ? 'Already saved. History was verified.' : 'Saved to student history.');
    } catch (error) {
      setSaveMessage(error instanceof Error ? `Save failed: ${error.message}` : `Save failed: ${String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const startAnotherStudent = () => {
    writeState({
      ...syncedState,
      selectedStudentId: '',
      errorNotes: {},
      teacherNotes: '',
      savedAttemptId: undefined,
      savedResults: undefined,
      phase: 'charting'
    });
    setSaveMessage('');
  };

  if (isStudentView) {
    if (!activeList?.words.length) {
      return <div className="h-full flex items-center justify-center bg-[#fcfbf9] text-stone-400 font-serif text-2xl">Waiting for the teacher…</div>;
    }
    const charting = syncedState.phase === 'charting';
    return (
      <div className="h-full overflow-auto bg-[#fcfbf9] p-8 md:p-12 text-stone-950">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-8 text-center font-serif text-3xl font-black">Wordlist Reading</h2>
          <div className={charting ? 'grid grid-cols-3 gap-x-12 gap-y-7' : 'mx-auto flex max-w-2xl flex-col gap-8'}>
            {activeList.words.map((word, index) => (
              <div key={`${activeList.listId}-${index}`} className="text-center font-serif text-[clamp(1.8rem,4vw,3.6rem)] font-bold leading-tight">
                {word}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="h-full flex items-center justify-center gap-3 text-stone-400"><Loader2 className="h-6 w-6 animate-spin" /> Loading source-backed Part 4 material…</div>;
  }

  if (loadError || !cloudContext) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[#fcfbf9]">
        <Cloud className="h-12 w-12 text-stone-300 mb-4" />
        <h2 className="font-serif text-2xl font-black mb-2">Part 4 source is not ready</h2>
        <p className="max-w-xl text-sm font-bold text-stone-500 mb-5">{loadError || 'No current Cloud lesson context is available.'}</p>
        <button onClick={() => void loadSourceContext()} className="rounded-xl bg-stone-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-white">Refresh Source</button>
      </div>
    );
  }

  const sourceGap = cloudContext.sources.gap;

  return (
    <div className="min-h-full bg-[#fcfbf9] text-stone-900">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white px-5 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-red-800">Part 4</p>
            <h2 className="font-serif text-2xl font-black">Wordlist Reading</h2>
          </div>
          <div className="flex rounded-xl border border-stone-200 bg-stone-50 p-1">
            <button onClick={() => setPhase('practice')} className={`rounded-lg px-5 py-2 text-[10px] font-black uppercase tracking-widest ${syncedState.phase === 'practice' ? 'bg-stone-900 text-white' : 'text-stone-500'}`}>Practice</button>
            <button onClick={() => setPhase('charting')} className={`rounded-lg px-5 py-2 text-[10px] font-black uppercase tracking-widest ${syncedState.phase === 'charting' ? 'bg-red-800 text-white' : 'text-stone-500'}`}>Charting</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-5 md:p-8">
        {sourceGap && (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5">
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-800">Source gap · fail closed</p>
            <p className="mt-1 text-sm font-bold text-amber-950">{sourceGap}</p>
          </div>
        )}

        {syncedState.phase === 'practice' ? (
          <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <aside className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-stone-400">Practice list</p>
              <select value={syncedState.practiceList?.listId || ''} onChange={event => selectPracticeList(event.target.value)} className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-xs font-bold" disabled={!cloudContext.sources.practiceLists.length}>
                {!cloudContext.sources.practiceLists.length && <option value="">No verified list</option>}
                {cloudContext.sources.practiceLists.map(list => <option key={list.listId} value={list.listId}>{sourceCaption(list)}</option>)}
              </select>
              <p className="mt-3 text-[10px] font-bold leading-relaxed text-stone-500">Practice is not charting data. No score is recorded here.</p>
              <p className="mt-4 break-words text-[9px] font-mono text-stone-400">{syncedState.practiceList?.listId}</p>
            </aside>
            <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
              {syncedState.practiceList?.words.length ? (
                <div className="flex min-h-[420px] flex-col items-center justify-evenly gap-6">
                  {syncedState.practiceList.words.map((word, index) => <div key={`${syncedState.practiceList?.listId}-${index}`} className="font-serif text-4xl font-black">{word}</div>)}
                </div>
              ) : <div className="flex min-h-[420px] items-center justify-center text-stone-400"><Scroll className="mr-3 h-6 w-6" /> No source-backed practice list attached.</div>}
            </div>
          </section>
        ) : (
          <section className="space-y-5">
            <div className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:grid-cols-2">
              <label>
                <span className="mb-2 block text-[9px] font-black uppercase tracking-widest text-stone-400">Charting list</span>
                <select value={syncedState.chartingList?.listId || ''} onChange={event => selectChartingList(event.target.value)} className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-xs font-bold" disabled={!cloudContext.sources.chartingLists.length || Boolean(syncedState.savedAttemptId)}>
                  {!cloudContext.sources.chartingLists.length && <option value="">No verified list</option>}
                  {cloudContext.sources.chartingLists.map(list => <option key={list.listId} value={list.listId}>{sourceCaption(list)}</option>)}
                </select>
                <p className="mt-2 break-words text-[9px] font-mono text-stone-400">{syncedState.chartingList?.listId}</p>
              </label>
              <label>
                <span className="mb-2 block text-[9px] font-black uppercase tracking-widest text-stone-400">Student being charted</span>
                <select value={syncedState.selectedStudentId} onChange={event => selectStudent(event.target.value)} className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-xs font-bold" disabled={!activeChartingList || Boolean(sourceGap) || Boolean(syncedState.savedAttemptId)}>
                  <option value="">Select student…</option>
                  {students.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}
                </select>
              </label>
            </div>

            {selectedStudent && activeChartingList && !sourceGap ? (
              <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                <div className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">{selectedStudent.name}</p>
                      <p className="font-mono text-lg font-black">{completedCount} / {activeChartingList.words.length} scored</p>
                    </div>
                    <p className="text-[9px] font-bold text-stone-400">Keyboard: C/1 correct · X/0 incorrect</p>
                  </div>
                  <div className="divide-y divide-stone-100">
                    {scoredItems.map(item => (
                      <div key={item.instanceId} className={`grid grid-cols-[44px_1fr_auto] items-center gap-3 px-4 py-3 ${item.status === 'correct' ? 'bg-emerald-50/60' : item.status === 'error' ? 'bg-red-50/60' : ''}`}>
                        <span className="font-mono text-xs font-black text-stone-300">{item.index + 1}</span>
                        <div>
                          <p className="font-serif text-2xl font-black">{item.word}</p>
                          {item.status === 'error' && (
                            <input value={syncedState.errorNotes[item.instanceId] || ''} onChange={event => writeState({ ...syncedState, errorNotes: { ...syncedState.errorNotes, [item.instanceId]: event.target.value } })} placeholder="Optional error note" className="mt-1 w-full border-0 bg-transparent p-0 text-[10px] font-bold text-red-800 outline-none placeholder:text-red-300" />
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => scoreItem(item.index, 'correct')} disabled={Boolean(syncedState.savedAttemptId)} aria-label={`${item.word} correct`} className={`flex h-10 w-10 items-center justify-center rounded-xl border ${item.status === 'correct' ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-stone-200 bg-white text-stone-300 hover:text-emerald-700'}`}><Check className="h-5 w-5" /></button>
                          <button onClick={() => scoreItem(item.index, 'error')} disabled={Boolean(syncedState.savedAttemptId)} aria-label={`${item.word} incorrect`} className={`flex h-10 w-10 items-center justify-center rounded-xl border ${item.status === 'error' ? 'border-red-800 bg-red-800 text-white' : 'border-stone-200 bg-white text-stone-300 hover:text-red-800'}`}><X className="h-5 w-5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
                  <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">Attempt</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full bg-red-800 transition-all" style={{ width: `${activeChartingList.words.length ? (completedCount / activeChartingList.words.length) * 100 : 0}%` }} /></div>
                  <p className="mt-3 text-xs font-bold text-stone-500">{sourceCaption(activeChartingList)}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-stone-400">Type: {activeChartingList.chartingType}</p>
                  <textarea value={syncedState.teacherNotes} onChange={event => writeState({ ...syncedState, teacherNotes: event.target.value })} disabled={Boolean(syncedState.savedAttemptId)} rows={4} placeholder="Optional attempt note" className="mt-5 w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs font-bold outline-none focus:border-stone-400" />
                  {syncedState.savedAttemptId ? (
                    <>
                      <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-black text-emerald-800">Saved · {syncedState.savedAttemptId}</div>
                      <button onClick={startAnotherStudent} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-3 text-[10px] font-black uppercase tracking-widest"><RotateCcw className="h-4 w-4" /> Chart another student</button>
                    </>
                  ) : (
                    <button onClick={() => void saveAttempt()} disabled={!canSave || isSaving} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-800 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-30">
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save completed attempt
                    </button>
                  )}
                  {saveMessage && <p className={`mt-3 text-[10px] font-bold ${saveMessage.startsWith('Save failed') ? 'text-red-800' : 'text-emerald-700'}`}>{saveMessage}</p>}
                </aside>
              </div>
            ) : (
              <div className="rounded-[2rem] border-2 border-dashed border-stone-300 bg-white p-12 text-center text-sm font-bold text-stone-400">Select a verified charting list and a student to begin.</div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default WordlistReading;
