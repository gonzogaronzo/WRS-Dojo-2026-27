import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { LESSON_LIBRARY_COLLECTION, PAUSED_SPOT_KIND } from './lessonLibrary';
import {
  GroupSpot, GroupSpotMap, mergeSpotMaps, normalizeSpot, readLocalSpots, spotListKey
} from './groupSpots';
import { clearSpotEverywhere, saveSpotEverywhere, SpotRemote, SpotSaveResult } from './spotStore';
import { describeFirestoreError } from './useLessonLibrary';

export interface GroupSpots {
  /** Every group's saved spot. Re-renders only when a row of the dashboard list would change. */
  spots: GroupSpotMap;
  /** True once the cloud copy has been read (or right away when there is no cloud). */
  ready: boolean;
  /** The latest full copy of a group's spot, straight from memory. Never stale, never re-renders. */
  getSpot: (groupId: string) => GroupSpot | null;
  saveSpot: (spot: GroupSpot) => Promise<SpotSaveResult>;
  clearSpot: (groupId: string) => Promise<void>;
  error: string;
}

const deviceStorage = () => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

export const useGroupSpots = (user: User | null): GroupSpots => {
  const teacherId = user && user.uid !== 'guest-sensei' ? user.uid : '';
  const localRef = useRef<GroupSpotMap>({});
  const cloudRef = useRef<GroupSpotMap>({});
  const mergedRef = useRef<GroupSpotMap>({});
  const shownKey = useRef('');
  const [spots, setSpots] = useState<GroupSpotMap>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  const publish = useCallback(() => {
    mergedRef.current = mergeSpotMaps(localRef.current, cloudRef.current);
    const key = spotListKey(mergedRef.current);
    if (key !== shownKey.current) {
      shownKey.current = key;
      setSpots(mergedRef.current);
    }
  }, []);

  useEffect(() => {
    localRef.current = readLocalSpots(teacherId);
    cloudRef.current = {};
    shownKey.current = '';
    setError('');
    if (!teacherId) {
      publish();
      setReady(true);
      return;
    }
    setReady(false);
    publish();
    const spotsQuery = query(
      collection(db, LESSON_LIBRARY_COLLECTION),
      where('teacherId', '==', teacherId),
      where('kind', '==', PAUSED_SPOT_KIND)
    );
    return onSnapshot(spotsQuery, snapshot => {
      const next: GroupSpotMap = {};
      snapshot.docs.forEach(snapshotDoc => {
        const spot = normalizeSpot(snapshotDoc.id, snapshotDoc.data());
        if (spot) next[spot.groupId] = spot;
      });
      cloudRef.current = next;
      publish();
      setReady(true);
    }, listenError => {
      console.error('Unfinished lessons could not be read from the cloud', listenError);
      setError(describeFirestoreError(listenError));
      setReady(true);
    });
  }, [publish, teacherId]);

  const remote = useMemo<SpotRemote | null>(() => teacherId ? {
    set: (collectionName, documentId, data) =>
      setDoc(doc(db, collectionName, documentId), { ...data, teacherId, lastUpdated: serverTimestamp() }),
    remove: (collectionName, documentId) => deleteDoc(doc(db, collectionName, documentId))
  } : null, [teacherId]);

  const getSpot = useCallback((groupId: string) => mergedRef.current[groupId] || null, []);

  const saveSpot = useCallback(async (spot: GroupSpot): Promise<SpotSaveResult> => {
    // Memory and device first, synchronously: this must survive a tab closing mid-save.
    localRef.current = { ...localRef.current, [spot.groupId]: spot };
    publish();
    const result = await saveSpotEverywhere(spot, remote, deviceStorage(), describeFirestoreError);
    setError(current => {
      const next = result.cloud || !remote ? '' : result.message;
      return current === next ? current : next;
    });
    if (!result.cloud && remote) console.warn(`Unfinished lesson not saved to the cloud: ${result.message}`);
    return result;
  }, [publish, remote]);

  const clearSpot = useCallback(async (groupId: string) => {
    const localRest = { ...localRef.current };
    delete localRest[groupId];
    const cloudRest = { ...cloudRef.current };
    delete cloudRest[groupId];
    localRef.current = localRest;
    cloudRef.current = cloudRest;
    publish();
    try {
      await clearSpotEverywhere(teacherId, groupId, remote, deviceStorage());
    } catch (clearError) {
      console.error('The cloud copy of the unfinished lesson could not be removed', clearError);
      setError(describeFirestoreError(clearError));
    }
  }, [publish, remote, teacherId]);

  return useMemo(() => ({ spots, ready, getSpot, saveSpot, clearSpot, error }), [spots, ready, getSpot, saveSpot, clearSpot, error]);
};
