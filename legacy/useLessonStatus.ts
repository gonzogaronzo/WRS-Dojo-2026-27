import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { LESSON_LIBRARY_COLLECTION, TAUGHT_MARKS_KIND, localDateString } from './lessonLibrary';
import type { GroupSpotMap } from './groupSpots';
import type { GroupProfile } from './types';
import type { SpotRemote } from './spotStore';
import {
  LessonStatusContext, Runway, TaughtMarksMap, mergeTaughtMarks, normalizeTaughtMarks, readLocalTaughtMarks,
  runwaysByGroup, setLessonTaught, taughtMarksKey
} from './lessonStatus';
import { describeFirestoreError, useLessonLibraryContext } from './useLessonLibrary';

export interface LessonStatusData {
  /** True once finished missions and taught marks have been read (or there is no cloud). */
  ready: boolean;
  error: string;
  completedLessonIds: ReadonlySet<string>;
  contextFor: (groupId: string) => LessonStatusContext;
  markTaught: (groupId: string, lessonId: string) => Promise<void>;
  putBackOnDeck: (groupId: string, lessonId: string) => Promise<void>;
}

const deviceStorage = () => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

const setKey = (ids: ReadonlySet<string>) => [...ids].sort().join('|');

/**
 * Everything the lesson list and dashboard need to tell Taught, In progress and
 * On deck apart. Reads finished missions (never writes them) and keeps the
 * teacher's hand-set marks. Only unchanged-on-screen data is ever published,
 * so a snapshot that changes nothing re-renders nothing.
 */
export const useLessonStatusData = (user: User | null, groups: GroupProfile[], spots: GroupSpotMap): LessonStatusData => {
  const teacherId = user && user.uid !== 'guest-sensei' ? user.uid : '';
  const [missionIds, setMissionIds] = useState<ReadonlySet<string>>(() => new Set());
  const [cloudMarks, setCloudMarks] = useState<TaughtMarksMap>({});
  const [localMarks, setLocalMarks] = useState<TaughtMarksMap>({});
  const [missionsReady, setMissionsReady] = useState(false);
  const [marksReady, setMarksReady] = useState(false);
  const [error, setError] = useState('');
  const marksRef = useRef<TaughtMarksMap>({});

  useEffect(() => {
    setLocalMarks(readLocalTaughtMarks(teacherId, deviceStorage()));
    setCloudMarks({});
    setMissionIds(new Set());
    setError('');
    if (!teacherId) {
      setMissionsReady(true);
      setMarksReady(true);
      return;
    }
    setMissionsReady(false);
    setMarksReady(false);
    // Read-only: a listener never writes, so it cannot reach the Google Sheets log.
    const stopMissions = onSnapshot(
      query(collection(db, 'missions'), where('teacherId', '==', teacherId)),
      snapshot => {
        const next = new Set<string>();
        snapshot.docs.forEach(snapshotDoc => {
          const lessonId = snapshotDoc.data().lessonId;
          if (typeof lessonId === 'string' && lessonId) next.add(lessonId);
        });
        setMissionIds(current => setKey(current) === setKey(next) ? current : next);
        setMissionsReady(true);
      },
      listenError => {
        console.error('Finished lessons could not be read from the cloud', listenError);
        setError(describeFirestoreError(listenError));
        setMissionsReady(true);
      }
    );
    const stopMarks = onSnapshot(
      query(collection(db, LESSON_LIBRARY_COLLECTION), where('teacherId', '==', teacherId), where('kind', '==', TAUGHT_MARKS_KIND)),
      snapshot => {
        const next: TaughtMarksMap = {};
        snapshot.docs.forEach(snapshotDoc => {
          const marks = normalizeTaughtMarks(snapshotDoc.data());
          if (marks) next[marks.groupId] = marks;
        });
        setCloudMarks(current => taughtMarksKey(current) === taughtMarksKey(next) ? current : next);
        setMarksReady(true);
      },
      listenError => {
        console.error('Taught marks could not be read from the cloud', listenError);
        setError(describeFirestoreError(listenError));
        setMarksReady(true);
      }
    );
    return () => { stopMissions(); stopMarks(); };
  }, [teacherId]);

  // A lesson a group has finished is already recorded in its history, which
  // arrives with the group itself: this makes Taught appear at once, and also
  // covers guest mode, where missions are kept on the device.
  const historyKey = groups.map(group => (group.history || []).map(entry => `${group.id}:${entry.lessonId}`).join(',')).join('|');
  const historyIds = useMemo(() => {
    const ids = new Set<string>();
    groups.forEach(group => (group.history || []).forEach(entry => { if (entry.lessonId) ids.add(entry.lessonId); }));
    return ids;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyKey]);

  const completedLessonIds = useMemo<ReadonlySet<string>>(
    () => new Set([...missionIds, ...historyIds]),
    [missionIds, historyIds]
  );

  const marks = useMemo(() => mergeTaughtMarks(localMarks, cloudMarks), [localMarks, cloudMarks]);
  marksRef.current = marks;

  const remote = useMemo<SpotRemote | null>(() => teacherId ? {
    set: (collectionName, documentId, data) =>
      setDoc(doc(db, collectionName, documentId), { ...data, teacherId, lastUpdated: serverTimestamp() }),
    remove: (collectionName, documentId) => deleteDoc(doc(db, collectionName, documentId))
  } : null, [teacherId]);

  const change = useCallback(async (groupId: string, lessonId: string, taught: boolean) => {
    const current = marksRef.current[groupId]?.lessonIds || [];
    // Shown at once; the cloud catches up behind it.
    const pending = await setLessonTaught(
      teacherId, groupId, current, lessonId, taught, new Date().toISOString(), null, deviceStorage()
    );
    marksRef.current = { ...marksRef.current, [groupId]: pending.marks };
    setLocalMarks(existing => ({ ...existing, [groupId]: pending.marks }));
    if (!remote) return;
    const result = await setLessonTaught(
      teacherId, groupId, current, lessonId, taught, pending.marks.savedAt, remote, null
    );
    setError(result.cloud ? '' : `That change is kept on this computer only. ${result.message}`);
  }, [remote, teacherId]);

  const markTaught = useCallback((groupId: string, lessonId: string) => change(groupId, lessonId, true), [change]);
  const putBackOnDeck = useCallback((groupId: string, lessonId: string) => change(groupId, lessonId, false), [change]);

  const contextFor = useCallback((groupId: string): LessonStatusContext => ({
    completedLessonIds,
    markedTaughtIds: new Set(marks[groupId]?.lessonIds || []),
    spotLessonId: spots[groupId]?.lessonId
  }), [completedLessonIds, marks, spots]);

  const ready = missionsReady && marksReady;
  return useMemo(
    () => ({ ready, error, completedLessonIds, contextFor, markTaught, putBackOnDeck }),
    [ready, error, completedLessonIds, contextFor, markTaught, putBackOnDeck]
  );
};

const LessonStatusContext_ = createContext<LessonStatusData | null>(null);
export const LessonStatusProvider = LessonStatusContext_.Provider;
export const useLessonStatusContext = () => useContext(LessonStatusContext_);

/**
 * On-deck runway for every group, or null until the library and the status data
 * are both loaded (so a slow load never flashes a false "Nothing on deck").
 */
export const useRunways = (groups: GroupProfile[]): Record<string, Runway> | null => {
  const library = useLessonLibraryContext();
  const status = useLessonStatusContext();
  const records = library?.records;
  const libraryReady = library?.status === 'ready';
  const statusReady = Boolean(status?.ready);
  const contextFor = status?.contextFor;
  const groupKey = groups.map(group => group.id).join('|');
  return useMemo(() => {
    if (!records || !libraryReady || !statusReady || !contextFor) return null;
    return runwaysByGroup(records, groups.map(group => group.id), contextFor, localDateString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, libraryReady, statusReady, contextFor, groupKey]);
};
