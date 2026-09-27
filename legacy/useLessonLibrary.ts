import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  collection, deleteDoc, doc, getDocFromServer, onSnapshot, query, serverTimestamp, setDoc, where
} from 'firebase/firestore';
import { db } from './firebase';
import type { Lesson } from './types';
import {
  LESSON_LIBRARY_COLLECTION,
  LibraryLessonRecord,
  lessonStorageProblem,
  normalizeLibraryRecord,
  recordForLessonEdit
} from './lessonLibrary';

export type LessonLibraryStatus = 'signed-out' | 'loading' | 'ready' | 'error';

export interface LessonWriteResult {
  id: string;
  ok: boolean;
  message: string;
}

export interface LessonLibrary {
  status: LessonLibraryStatus;
  error: string | null;
  teacherId: string;
  records: LibraryLessonRecord[];
  ids: ReadonlySet<string>;
  isLibraryLesson: (lessonId: string) => boolean;
  /** Writes each record in turn, reading it back from the server to confirm. */
  saveRecords: (records: LibraryLessonRecord[]) => Promise<LessonWriteResult[]>;
  /** Saves an edit made in the app to a loaded lesson. */
  updateLesson: (lesson: Lesson) => Promise<LessonWriteResult>;
  removeLesson: (lessonId: string) => Promise<LessonWriteResult>;
}

const RULES_MESSAGE =
  'The lesson library is not switched on in Firestore yet. Publish the updated security rules ' +
  '(the "lessons" block) in the Firebase console, then reload the page.';

export const describeFirestoreError = (error: unknown): string => {
  const code = (error as { code?: string } | null)?.code;
  if (code === 'permission-denied') return RULES_MESSAGE;
  if (code === 'unavailable') return 'The app could not reach the cloud. Check the connection and try again.';
  return error instanceof Error ? error.message : String(error);
};

export const useLessonLibrary = (user: User | null): LessonLibrary => {
  const teacherId = user && user.uid !== 'guest-sensei' ? user.uid : '';
  const [records, setRecords] = useState<LibraryLessonRecord[]>([]);
  const [status, setStatus] = useState<LessonLibraryStatus>('signed-out');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRecords([]);
    setError(null);
    if (!teacherId) {
      setStatus('signed-out');
      return;
    }
    setStatus('loading');
    const lessonsQuery = query(collection(db, LESSON_LIBRARY_COLLECTION), where('teacherId', '==', teacherId));
    return onSnapshot(lessonsQuery, snapshot => {
      setRecords(snapshot.docs.flatMap(snapshotDoc => {
        const record = normalizeLibraryRecord(snapshotDoc.id, snapshotDoc.data());
        return record ? [record] : [];
      }));
      setStatus('ready');
      setError(null);
    }, listenError => {
      console.error('Lesson library sync failed', listenError);
      setStatus('error');
      setError(describeFirestoreError(listenError));
    });
  }, [teacherId]);

  const writeRecord = useCallback(async (record: LibraryLessonRecord): Promise<LessonWriteResult> => {
    if (!teacherId) return { id: record.id, ok: false, message: 'Sign in before loading lessons.' };
    const problem = lessonStorageProblem(record.lesson);
    if (problem) return { id: record.id, ok: false, message: problem };
    try {
      const lessonRef = doc(db, LESSON_LIBRARY_COLLECTION, record.id);
      await setDoc(lessonRef, { ...record, teacherId, lastUpdated: serverTimestamp() });
      // Confirm against the server, not the local cache.
      const saved = await getDocFromServer(lessonRef);
      if (!saved.exists() || saved.data().savedAt !== record.savedAt) {
        return { id: record.id, ok: false, message: 'The save could not be confirmed when read back from the cloud.' };
      }
      return { id: record.id, ok: true, message: 'Saved and confirmed.' };
    } catch (writeError) {
      console.error(`Lesson ${record.sourceFileName || record.id} could not be saved`, writeError);
      return { id: record.id, ok: false, message: describeFirestoreError(writeError) };
    }
  }, [teacherId]);

  const saveRecords = useCallback(async (list: LibraryLessonRecord[]) => {
    const results: LessonWriteResult[] = [];
    for (const record of list) results.push(await writeRecord(record));
    return results;
  }, [writeRecord]);

  const updateLesson = useCallback(async (lesson: Lesson): Promise<LessonWriteResult> => {
    const record = records.find(candidate => candidate.id === lesson.id);
    if (!record) return { id: lesson.id, ok: false, message: 'This lesson is no longer in the lesson library.' };
    return writeRecord(recordForLessonEdit(record, lesson, new Date().toISOString()));
  }, [records, writeRecord]);

  const removeLesson = useCallback(async (lessonId: string): Promise<LessonWriteResult> => {
    try {
      await deleteDoc(doc(db, LESSON_LIBRARY_COLLECTION, lessonId));
      return { id: lessonId, ok: true, message: 'Removed.' };
    } catch (removeError) {
      console.error(`Lesson ${lessonId} could not be removed`, removeError);
      return { id: lessonId, ok: false, message: describeFirestoreError(removeError) };
    }
  }, []);

  const ids = useMemo(() => new Set(records.map(record => record.id)), [records]);
  const isLibraryLesson = useCallback((lessonId: string) => ids.has(lessonId), [ids]);

  return useMemo(() => ({
    status, error, teacherId, records, ids, isLibraryLesson, saveRecords, updateLesson, removeLesson
  }), [status, error, teacherId, records, ids, isLibraryLesson, saveRecords, updateLesson, removeLesson]);
};

const LessonLibraryContext = createContext<LessonLibrary | null>(null);

export const LessonLibraryProvider = LessonLibraryContext.Provider;

export const useLessonLibraryContext = () => useContext(LessonLibraryContext);
